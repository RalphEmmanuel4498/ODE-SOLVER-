"""
Homotopy Perturbation Method (HPM) Module
=========================================

Implements Ji-Huan He's Homotopy Perturbation Method (1999, 2003):
- Homotopy construction: H(v, p) = (1 - p)[L(v) - L(u_0)] + p[A(v) - f(r)] = 0
- Perturbation series expansion: v(t; p) = sum_{k=0}^M p^k * v_k(t)
- Collecting like powers of the artificial embedding parameter p
- Evaluation at p = 1: u_approx(t) = sum_{k=0}^M v_k(t)
- Distinct from HAM (no auxiliary h-bar parameter or non-unity auxiliary functions)
"""

import time
from dataclasses import dataclass, field
from typing import List, Callable, Dict, Any
import numpy as np
import sympy as sp
from .problems import BenchmarkProblem


@dataclass
class HPMResult:
    method: str = "HPM"
    problem_id: str = ""
    order: int = 1
    terms: List[Callable[[np.ndarray], np.ndarray]] = field(default_factory=list)
    term_expressions: List[str] = field(default_factory=list)
    homotopy_equations: List[str] = field(default_factory=list)
    t_eval: np.ndarray = field(default_factory=lambda: np.zeros(0))
    u_approx: np.ndarray = field(default_factory=lambda: np.zeros(0))
    wall_time_sec: float = 0.0
    convergence_flag: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    def evaluate(self, t: np.ndarray) -> np.ndarray:
        res = np.zeros_like(t, dtype=np.float64)
        for term_fn in self.terms:
            res += term_fn(t)
        return res


def solve_hpm(problem: BenchmarkProblem, order: int = 5) -> HPMResult:
    """
    Solve benchmark problem using Homotopy Perturbation Method up to specified order.
    """
    start_time = time.perf_counter()
    t_sym = sp.Symbol("t", real=True)
    p_sym = sp.Symbol("p", real=True)
    pid = problem.id

    t_eval = np.linspace(problem.t_span[0], problem.t_span[1], 101)
    terms_sym: List[sp.Expr] = []
    homotopy_eqs: List[str] = []

    if pid == "riccati_ivp":
        # Equation: u' + u^2 - 1 = 0, u(0) = 0
        # Homotopy: (1 - p) v' + p [v' + v^2 - 1] = 0 => v' = p (1 - v^2)
        # v = v_0 + p v_1 + p^2 v_2 + ...
        # p^0: v_0' = 0, v_0(0) = 0 => v_0(t) = 0
        # Wait, if v_0 = 0, p^1: v_1' = 1 - v_0^2 = 1 => v_1(t) = t
        # Alternatively, take standard initial approximation v_0(t) = t (from initial slope u'(0)=1).
        # Homotopy: (1-p)(v' - 1) + p(v' + v^2 - 1) = 0 => v' - 1 + p v^2 = 0
        # p^0: v_0' = 1 => v_0(t) = t
        # p^1: v_1' = - v_0^2 = - t^2 => v_1(t) = - t^3 / 3
        # p^2: v_2' = - 2 v_0 v_1 = - 2 * t * (-t^3/3) = 2/3 t^4 => v_2(t) = 2/15 t^5
        # p^3: v_3' = - (v_1^2 + 2 v_0 v_2) => v_3(t) = - 17/315 t^7
        homotopy_eqs.append("H(v, p) = (1 - p)(v' - 1) + p(v' + v^2 - 1) = 0")
        v0 = t_sym
        terms_sym.append(v0)

        # For higher orders, v_k' = - [coeff of p^(k-1) in (sum v_j p^j)^2]
        for k in range(1, order + 1):
            v_sum = sum(terms_sym[j] * (p_sym ** j) for j in range(k))
            v_sq = sp.expand(v_sum ** 2)
            # coefficient of p^(k-1)
            rhs_k = - sp.diff(v_sq, p_sym, k - 1).subs(p_sym, 0) / sp.factorial(k - 1)
            vk = sp.integrate(rhs_k, (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(vk))

    elif pid == "lane_emden":
        # Lane-Emden: u'' + (2/t)u' + u^5 = 0, u(0)=1, u'(0)=0
        # Homotopy: (1 - p)[ (t^2 v')' ] + p [ (t^2 v')' + t^2 v^5 ] = 0
        # (t^2 v')' = - p t^2 v^5
        # p^0: v_0(t) = 1
        # p^1: (t^2 v_1')' = - t^2 v_0^5 = - t^2 => t^2 v_1' = - t^3 / 3 => v_1' = - t/3 => v_1(t) = - t^2 / 6
        # p^k: (t^2 v_k')' = - t^2 * [coeff of p^(k-1) in (sum v_j p^j)^5]
        homotopy_eqs.append("H(v, p) = (1 - p)[(t^2 v')'] + p[(t^2 v')' + t^2 v^5] = 0")
        terms_sym.append(sp.Integer(1))
        tau = sp.Symbol("tau", real=True)
        s = sp.Symbol("s", real=True)

        for k in range(1, order + 1):
            v_sum = sum(terms_sym[j] * (p_sym ** j) for j in range(k))
            v_5 = sp.expand(v_sum ** 5)
            coeff_km1 = sp.diff(v_5, p_sym, k - 1).subs(p_sym, 0) / sp.factorial(k - 1)
            # Integrate: v_k(t) = - \int_0^t (1/s^2) \int_0^s tau^2 * coeff(tau) dtau ds
            c_tau = coeff_km1.subs(t_sym, tau)
            inner = sp.integrate((tau ** 2) * c_tau, (tau, 0, s))
            outer = sp.integrate((1 / (s ** 2)) * inner, (s, 0, t_sym))
            vk = - outer
            terms_sym.append(sp.expand(vk))

    elif pid == "duffing_oscillator":
        # u'' + u + alpha u^3 = 0, u(0)=A, u'(0)=0
        # Homotopy: (1 - p)[v'' + v] + p [v'' + v + alpha v^3] = 0 => v'' + v = - p alpha v^3
        # p^0: v_0'' + v_0 = 0, v_0(0)=A, v_0'(0)=0 => v_0(t) = A cos(t)
        # Note: v_0 is trigonometric, which produces secular terms in standard perturbation!
        # This is a classic result in nonlinear oscillations (revealing secular limitation of uncorrected HPM).
        alpha = problem.parameters.get("alpha", 0.5)
        A_val = problem.parameters.get("A", 1.0)
        homotopy_eqs.append("H(v, p) = (1 - p)(v'' + v) + p(v'' + v + alpha v^3) = 0")

        # Taylor expansion around 0 for unified polynomial benchmark:
        # Alternatively, exact harmonic solver or Taylor in t:
        v0 = A_val - (A_val * (1 + alpha * A_val**2) / 2.0) * (t_sym ** 2)
        terms_sym.append(sp.Float(A_val))
        tau1 = sp.Symbol("tau1", real=True)
        tau2 = sp.Symbol("tau2", real=True)

        for k in range(1, order + 1):
            v_sum = sum(terms_sym[j] * (p_sym ** j) for j in range(k))
            v_cube = sp.expand(v_sum ** 3)
            rhs_k = - (terms_sym[k - 1] + alpha * (sp.diff(v_cube, p_sym, k - 1).subs(p_sym, 0) / sp.factorial(k - 1)))
            rhs_tau = rhs_k.subs(t_sym, tau2)
            i1 = sp.integrate(rhs_tau, (tau2, 0, tau1))
            vk = sp.integrate(i1, (tau1, 0, t_sym))
            terms_sym.append(sp.expand(vk))

    elif pid == "coupled_system":
        # u' = -u + u^2, u(0)=0.5
        # Homotopy: (1 - p) v' + p [v' + v - v^2] = 0 => v' = - p (v - v^2)
        # With v_0 = 0.5:
        # p^1: v_1' = - (v_0 - v_0^2) = - (0.5 - 0.25) = -0.25 => v_1 = -0.25 t
        homotopy_eqs.append("H(v, p) = (1 - p) v' + p [v' + v - v^2] = 0")
        terms_sym.append(sp.Rational(1, 2))

        for k in range(1, order + 1):
            v_sum = sum(terms_sym[j] * (p_sym ** j) for j in range(k))
            rhs_poly = - (v_sum - v_sum ** 2)
            rhs_k = sp.diff(rhs_poly, p_sym, k).subs(p_sym, 0) / sp.factorial(k)
            vk = sp.integrate(rhs_k, (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(vk))

    elif pid == "logistic_population":
        # u' = r u (1 - u/K), u(0)=u0
        r = problem.parameters.get("r", 1.5)
        K = problem.parameters.get("K", 2.0)
        u0 = problem.parameters.get("u0", 0.5)
        homotopy_eqs.append("H(v, p) = (1 - p) v' + p [v' - r v (1 - v/K)] = 0")

        terms_sym.append(sp.Float(u0))
        for k in range(1, order + 1):
            v_sum = sum(terms_sym[j] * (p_sym ** j) for j in range(k))
            rhs_poly = r * v_sum * (1.0 - v_sum / K)
            rhs_k = sp.diff(rhs_poly, p_sym, k).subs(p_sym, 0) / sp.factorial(k)
            vk = sp.integrate(rhs_k, (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(vk))

    elif pid == "epidemiological_sir":
        beta = problem.parameters.get("beta", 1.2)
        gamma = problem.parameters.get("gamma", 0.4)
        S0, I0, R0 = problem.initial_conditions

        S_terms: List[sp.Expr] = [sp.Float(S0)]
        I_terms: List[sp.Expr] = [sp.Float(I0)]
        homotopy_eqs.append("H_S(v, p) = (1 - p) S' + p(S' + beta S I) = 0")

        for k in range(1, order + 1):
            S_sum = sum(S_terms[j] * (p_sym ** j) for j in range(k))
            I_sum = sum(I_terms[j] * (p_sym ** j) for j in range(k))
            rhs_S = - beta * S_sum * I_sum
            rhs_I = beta * S_sum * I_sum - gamma * I_sum

            S_k = sp.integrate(sp.diff(rhs_S, p_sym, k).subs(p_sym, 0) / sp.factorial(k), (t_sym, 0, t_sym))
            I_k = sp.integrate(sp.diff(rhs_I, p_sym, k).subs(p_sym, 0) / sp.factorial(k), (t_sym, 0, t_sym))
            S_terms.append(sp.expand(S_k))
            I_terms.append(sp.expand(I_k))
        terms_sym = I_terms

    elif pid == "rapid_transition":
        k_val = problem.parameters.get("k", 4.0)
        u0 = problem.initial_conditions[0]
        homotopy_eqs.append("H(v, p) = (1 - p) v' + p [v' - k v^2 (1 - v)] = 0")
        terms_sym.append(sp.Float(u0))

        for m in range(1, order + 1):
            v_sum = sum(terms_sym[j] * (p_sym ** j) for j in range(m))
            rhs_poly = k_val * (v_sum ** 2) * (1.0 - v_sum)
            rhs_m = sp.diff(rhs_poly, p_sym, m).subs(p_sym, 0) / sp.factorial(m)
            vm = sp.integrate(rhs_m, (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(vm))

    elif pid == "stiff_relaxation":
        lam = problem.parameters.get("lambda", 50.0)
        homotopy_eqs.append("H(v, p) = (1 - p) v' + p [v' + lambda(v - t^2) - 2t] = 0")
        # v_0 = 1.0
        terms_sym.append(sp.Float(1.0))
        for m in range(1, order + 1):
            v_sum = sum(terms_sym[j] * (p_sym ** j) for j in range(m))
            rhs_poly = - lam * (v_sum - t_sym ** 2) + 2.0 * t_sym
            rhs_m = sp.diff(rhs_poly, p_sym, m).subs(p_sym, 0) / sp.factorial(m)
            vm = sp.integrate(rhs_m, (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(vm))
    else:
        raise ValueError(f"HPM not configured for problem {pid}")

    term_callables: List[Callable[[np.ndarray], np.ndarray]] = []
    term_expr_strs: List[str] = []
    for expr in terms_sym:
        term_expr_strs.append(sp.sstr(expr))
        fn = sp.lambdify(t_sym, expr, modules=["numpy"])
        term_callables.append(fn)

    u_approx = np.zeros_like(t_eval, dtype=np.float64)
    for fn in term_callables:
        term_vals = fn(t_eval)
        if np.isscalar(term_vals):
            term_vals = np.full_like(t_eval, float(term_vals), dtype=np.float64)
        else:
            term_vals = np.asarray(term_vals, dtype=np.float64)
        u_approx += term_vals

    wall_time = time.perf_counter() - start_time
    is_convergent = not (np.any(np.isnan(u_approx)) or np.any(np.isinf(u_approx)) or np.max(np.abs(u_approx)) > 1e10)

    return HPMResult(
        problem_id=pid,
        order=order,
        terms=term_callables,
        term_expressions=term_expr_strs,
        homotopy_equations=homotopy_eqs,
        t_eval=t_eval,
        u_approx=u_approx,
        wall_time_sec=wall_time,
        convergence_flag=is_convergent,
        metadata={"num_terms": len(terms_sym)},
    )
