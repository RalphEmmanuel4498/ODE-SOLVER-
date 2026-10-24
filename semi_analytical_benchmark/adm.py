"""
Adomian Decomposition Method (ADM) Module
=========================================

Implements George Adomian's decomposition method (1984, 1994) for nonlinear ODEs:
- Canonical operator formulation: L(u) + R(u) + N(u) = g(t)
- Inverse operator L^(-1) as m-fold definite integral
- Algorithmic and symbolic derivation of Adomian polynomials A_n
- Successive approximation series S_M(t) = sum_{k=0}^M u_k(t)
- Residual evaluation and convergence monitoring
"""

import time
from dataclasses import dataclass, field
from typing import List, Callable, Dict, Any, Tuple
import numpy as np
import sympy as sp
from .problems import BenchmarkProblem


@dataclass
class ADMResult:
    method: str = "ADM"
    problem_id: str = ""
    order: int = 1
    terms: List[Callable[[np.ndarray], np.ndarray]] = field(default_factory=list)
    term_expressions: List[str] = field(default_factory=list)
    adomian_polynomials: List[str] = field(default_factory=list)
    t_eval: np.ndarray = field(default_factory=lambda: np.zeros(0))
    u_approx: np.ndarray = field(default_factory=lambda: np.zeros(0))
    wall_time_sec: float = 0.0
    convergence_flag: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    def evaluate(self, t: np.ndarray) -> np.ndarray:
        """Evaluate truncated series sum_{k=0}^M u_k(t)."""
        res = np.zeros_like(t, dtype=np.float64)
        for term_fn in self.terms:
            res += term_fn(t)
        return res


def compute_adomian_polynomials(nonlinear_expr_str: str, num_terms: int) -> List[sp.Expr]:
    """
    Rigorously derive Adomian polynomials A_0, ..., A_{num_terms-1} for a nonlinear operator N(u).
    
    Mathematical formula:
        A_n = (1 / n!) * d^n / d(lambda)^n [ N( sum_{k=0}^n lambda^k u_k ) ] at lambda = 0
    """
    lam = sp.Symbol("lambda", real=True)
    u_syms = [sp.Symbol(f"u_{i}", real=True) for i in range(num_terms)]
    
    # Construct series u(lambda) = sum_{k=0}^(num_terms-1) lambda^k * u_k
    u_lam = sum(lam**k * u_syms[k] for k in range(num_terms))
    
    u = sp.Symbol("u", real=True)
    parsed_expr = sp.sympify(nonlinear_expr_str, locals={"u": u})
    
    # Substitute u with u(lambda)
    N_u_lam = parsed_expr.subs(u, u_lam)
    
    A_list: List[sp.Expr] = []
    for n in range(num_terms):
        diff_n = sp.diff(N_u_lam, lam, n)
        val_at_zero = diff_n.subs(lam, 0)
        A_n = sp.simplify(val_at_zero / sp.factorial(n))
        A_list.append(A_n)
        
    return A_list


def solve_adm(problem: BenchmarkProblem, order: int = 5) -> ADMResult:
    """
    Solve benchmark problem using Adomian Decomposition Method up to specified order.
    """
    start_time = time.perf_counter()
    t_sym = sp.Symbol("t", real=True)
    pid = problem.id

    t_eval = np.linspace(problem.t_span[0], problem.t_span[1], 101)
    terms_sym: List[sp.Expr] = []
    adomian_polys_str: List[str] = []

    if pid == "riccati_ivp":
        # Riccati: u' + u^2 = 1, u(0) = 0
        # L = d/dt, L^-1 = \int_0^t dt
        # N(u) = u^2, g(t) = 1
        # u_0 = u(0) + L^-1(1) = t
        # u_{n+1} = - L^-1[ A_n ]
        # Adomian polynomials for u^2: A_0 = u_0^2, A_1 = 2 u_0 u_1, A_2 = u_1^2 + 2 u_0 u_2, etc.
        u_syms = [sp.Symbol(f"u_{i}", real=True) for i in range(order + 1)]
        A_syms = compute_adomian_polynomials("u**2", order + 1)
        adomian_polys_str = [sp.sstr(A) for A in A_syms]

        u0_expr = t_sym
        terms_sym.append(u0_expr)

        for n in range(order):
            # Substitute computed terms into A_n
            subs_dict = {u_syms[k]: terms_sym[k] for k in range(n + 1)}
            An_val = sp.expand(A_syms[n].subs(subs_dict))
            u_next = - sp.integrate(An_val, (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(u_next))

    elif pid == "lane_emden":
        # Lane-Emden: u'' + (2/t)u' + u^5 = 0, u(0)=1, u'(0)=0
        # Rewrite as (t^2 u')' = - t^2 u^5 => L = d/dt(t^2 d/dt)
        # L^-1(.) = \int_0^t (1/s^2) \int_0^s tau^2 (.) dtau ds
        # u_0 = 1
        # u_{n+1} = - L^-1[ A_n ], where A_n is Adomian polynomial of u^5
        u_syms = [sp.Symbol(f"u_{i}", real=True) for i in range(order + 1)]
        A_syms = compute_adomian_polynomials("u**5", order + 1)
        adomian_polys_str = [sp.sstr(A) for A in A_syms]

        terms_sym.append(sp.Integer(1))
        s_sym = sp.Symbol("s", real=True)
        tau_sym = sp.Symbol("tau", real=True)

        for n in range(order):
            subs_dict = {u_syms[k]: terms_sym[k] for k in range(n + 1)}
            An_val = sp.expand(A_syms[n].subs(subs_dict))
            # inner integral: \int_0^s tau^2 * An(tau) dtau
            An_tau = An_val.subs(t_sym, tau_sym)
            inner = sp.integrate((tau_sym ** 2) * An_tau, (tau_sym, 0, s_sym))
            outer = sp.integrate((1 / (s_sym ** 2)) * inner, (s_sym, 0, t_sym))
            u_next = - outer
            terms_sym.append(sp.expand(u_next))

    elif pid == "duffing_oscillator":
        # u'' + u + alpha u^3 = 0, u(0)=A, u'(0)=0
        # L = d^2/dt^2, L^-1 = \int_0^t \int_0^t (.)
        # R(u) = u, N(u) = alpha u^3
        # u_0 = A
        # u_{n+1} = - L^-1[ u_n + alpha A_n ]
        alpha = problem.parameters.get("alpha", 0.5)
        A_val = problem.parameters.get("A", 1.0)
        u_syms = [sp.Symbol(f"u_{i}", real=True) for i in range(order + 1)]
        A_syms = compute_adomian_polynomials("u**3", order + 1)
        adomian_polys_str = [sp.sstr(A) for A in A_syms]

        terms_sym.append(sp.Float(A_val))
        tau1 = sp.Symbol("tau1", real=True)
        tau2 = sp.Symbol("tau2", real=True)

        for n in range(order):
            subs_dict = {u_syms[k]: terms_sym[k] for k in range(n + 1)}
            An_val = sp.expand(A_syms[n].subs(subs_dict))
            integrand = terms_sym[n] + alpha * An_val
            # double integral \int_0^t \int_0^{tau1} integrand(tau2) dtau2 dtau1
            integrand_tau = integrand.subs(t_sym, tau2)
            i1 = sp.integrate(integrand_tau, (tau2, 0, tau1))
            u_next = - sp.integrate(i1, (tau1, 0, t_sym))
            terms_sym.append(sp.expand(u_next))

    elif pid == "coupled_system":
        # u' = -u + v^2, v' = -v + u^2, u(0)=0.5, v(0)=0.5
        # By symmetry u = v, so u' = -u + u^2, u(0)=0.5
        # L = d/dt, R(u) = -u, N(u) = -u^2
        # u_0 = 0.5
        # u_{n+1} = L^-1[ -u_n + A_n(u^2) ]
        u_syms = [sp.Symbol(f"u_{i}", real=True) for i in range(order + 1)]
        A_syms = compute_adomian_polynomials("u**2", order + 1)
        adomian_polys_str = [sp.sstr(A) for A in A_syms]

        terms_sym.append(sp.Rational(1, 2))
        for n in range(order):
            subs_dict = {u_syms[k]: terms_sym[k] for k in range(n + 1)}
            An_val = sp.expand(A_syms[n].subs(subs_dict))
            integrand = - terms_sym[n] + An_val
            u_next = sp.integrate(integrand, (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(u_next))

    elif pid == "logistic_population":
        # u' = r u - (r/K) u^2, u(0)=u0
        # L = d/dt, R(u) = - r u, N(u) = (r/K) u^2
        # u_0 = u0
        # u_{n+1} = L^-1[ r u_n - (r/K) A_n(u^2) ]
        r = problem.parameters.get("r", 1.5)
        K = problem.parameters.get("K", 2.0)
        u0 = problem.parameters.get("u0", 0.5)

        u_syms = [sp.Symbol(f"u_{i}", real=True) for i in range(order + 1)]
        A_syms = compute_adomian_polynomials("u**2", order + 1)
        adomian_polys_str = [sp.sstr(A) for A in A_syms]

        terms_sym.append(sp.Float(u0))
        for n in range(order):
            subs_dict = {u_syms[k]: terms_sym[k] for k in range(n + 1)}
            An_val = sp.expand(A_syms[n].subs(subs_dict))
            integrand = r * terms_sym[n] - (r / K) * An_val
            u_next = sp.integrate(integrand, (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(u_next))

    elif pid == "epidemiological_sir":
        # S' = -beta S I, I' = beta S I - gamma I, R' = gamma I
        # Adomian polynomial for cross-term S*I
        # Let W = S*I: A_n(S, I) = sum_{k=0}^n S_k * I_{n-k}
        beta = problem.parameters.get("beta", 1.2)
        gamma = problem.parameters.get("gamma", 0.4)
        S0, I0, R0 = problem.initial_conditions

        S_terms: List[sp.Expr] = [sp.Float(S0)]
        I_terms: List[sp.Expr] = [sp.Float(I0)]
        adomian_polys_str = ["A_n(S, I) = sum_{k=0}^n S_k * I_{n-k}"]

        for n in range(order):
            # A_n for product S*I
            An_SI = sum(S_terms[k] * I_terms[n - k] for k in range(n + 1))
            S_next = - beta * sp.integrate(An_SI, (t_sym, 0, t_sym))
            I_next = sp.integrate(beta * An_SI - gamma * I_terms[n], (t_sym, 0, t_sym))
            S_terms.append(sp.expand(S_next))
            I_terms.append(sp.expand(I_next))
        # Total solution evaluated for I(t) (or S(t))
        terms_sym = I_terms

    elif pid == "rapid_transition":
        # u' = k u^2 (1 - u) = k u^2 - k u^3, u(0)=0.1
        k = problem.parameters.get("k", 4.0)
        u0 = problem.initial_conditions[0]
        u_syms = [sp.Symbol(f"u_{i}", real=True) for i in range(order + 1)]
        A_u2 = compute_adomian_polynomials("u**2", order + 1)
        A_u3 = compute_adomian_polynomials("u**3", order + 1)
        adomian_polys_str = [f"A_n(u^2 - u^3): A_n[u^2]={sp.sstr(A_u2[i])}, A_n[u^3]={sp.sstr(A_u3[i])}" for i in range(min(4, order+1))]

        terms_sym.append(sp.Float(u0))
        for n in range(order):
            subs_dict = {u_syms[m]: terms_sym[m] for m in range(n + 1)}
            An_val = k * A_u2[n].subs(subs_dict) - k * A_u3[n].subs(subs_dict)
            u_next = sp.integrate(An_val, (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(u_next))

    elif pid == "stiff_relaxation":
        # u' = -lambda u + lambda t^2 + 2t, u(0)=1
        lam = problem.parameters.get("lambda", 50.0)
        # Standard ADM: L = d/dt, R = 0, g(t) = lambda t^2 + 2t - lambda u
        # u_0 = 1 + L^-1(lambda t^2 + 2t) = 1 + lambda t^3 / 3 + t^2
        # u_{n+1} = - lambda \int_0^t u_n(tau) dtau
        u0_expr = 1.0 + (lam / 3.0) * (t_sym ** 3) + (t_sym ** 2)
        terms_sym.append(u0_expr)
        adomian_polys_str = ["Linear term: N(u) = 0, R(u) = lambda * u"]

        for n in range(order):
            u_next = - lam * sp.integrate(terms_sym[n], (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(u_next))
    else:
        raise ValueError(f"ADM not configured for problem {pid}")

    # Build numeric evaluators
    term_callables: List[Callable[[np.ndarray], np.ndarray]] = []
    term_expr_strs: List[str] = []
    for expr in terms_sym:
        term_expr_strs.append(sp.sstr(expr))
        fn = sp.lambdify(t_sym, expr, modules=["numpy"])
        term_callables.append(fn)

    # Calculate approximation
    u_approx = np.zeros_like(t_eval, dtype=np.float64)
    for fn in term_callables:
        term_vals = fn(t_eval)
        if np.isscalar(term_vals):
            term_vals = np.full_like(t_eval, float(term_vals), dtype=np.float64)
        else:
            term_vals = np.asarray(term_vals, dtype=np.float64)
        u_approx += term_vals

    wall_time = time.perf_counter() - start_time
    # Check for NaN / Inf
    is_convergent = not (np.any(np.isnan(u_approx)) or np.any(np.isinf(u_approx)) or np.max(np.abs(u_approx)) > 1e10)

    return ADMResult(
        problem_id=pid,
        order=order,
        terms=term_callables,
        term_expressions=term_expr_strs,
        adomian_polynomials=adomian_polys_str,
        t_eval=t_eval,
        u_approx=u_approx,
        wall_time_sec=wall_time,
        convergence_flag=is_convergent,
        metadata={"num_terms": len(terms_sym)},
    )
