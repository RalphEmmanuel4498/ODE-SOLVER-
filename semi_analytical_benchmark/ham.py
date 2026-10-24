"""
Homotopy Analysis Method (HAM) Module
=====================================

Implements Shijun Liao's Homotopy Analysis Method (1992, 2003, 2012):
- Zeroth-order deformation equation:
    (1 - q) * L[ phi(t; q) - u_0(t) ] = q * hbar * H(t) * N[ phi(t; q) ]
- Embedding parameter q in [0, 1] vs convergence-control parameter hbar != 0
- m-th order deformation equation:
    L[ u_m(t) - chi_m * u_{m-1}(t) ] = hbar * H(t) * R_m(vec(u)_{m-1}, t)
  where chi_m = 0 for m <= 1, chi_m = 1 for m > 1.
- hbar-curve analysis to discover valid convergence intervals (horizontal plateaus)
- Calculation of residual errors and detection of numerical divergence
"""

import time
from dataclasses import dataclass, field
from typing import List, Callable, Dict, Any, Tuple, Optional
import numpy as np
import sympy as sp
from .problems import BenchmarkProblem


@dataclass
class HAMResult:
    method: str = "HAM"
    problem_id: str = ""
    order: int = 1
    hbar: float = -1.0
    terms: List[Callable[[np.ndarray], np.ndarray]] = field(default_factory=list)
    term_expressions: List[str] = field(default_factory=list)
    t_eval: np.ndarray = field(default_factory=lambda: np.zeros(0))
    u_approx: np.ndarray = field(default_factory=lambda: np.zeros(0))
    wall_time_sec: float = 0.0
    convergence_flag: bool = True
    residual_norm: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def evaluate(self, t: np.ndarray) -> np.ndarray:
        res = np.zeros_like(t, dtype=np.float64)
        for term_fn in self.terms:
            res += term_fn(t)
        return res


def compute_Rm_nonlinear(N_sym_fn: Callable[[sp.Expr], sp.Expr], terms: List[sp.Expr], m: int) -> sp.Expr:
    """
    Compute R_m(vec{u}_{m-1}) = (1 / (m-1)!) * d^(m-1)/dq^(m-1) [ N(sum_{i=0}^{m-1} u_i q^i) ] at q=0.
    """
    q_sym = sp.Symbol("q", real=True)
    phi_sum = sum(terms[i] * (q_sym ** i) for i in range(m))
    N_phi = N_sym_fn(phi_sum)
    diff_val = sp.diff(N_phi, q_sym, m - 1)
    val_at_0 = diff_val.subs(q_sym, 0)
    return sp.expand(val_at_0 / sp.factorial(m - 1))


def solve_ham(problem: BenchmarkProblem, order: int = 4, hbar: float = -1.0, H_t: float = 1.0) -> HAMResult:
    """
    Solve benchmark problem using Homotopy Analysis Method up to specified deformation order and hbar.
    """
    start_time = time.perf_counter()
    t_sym = sp.Symbol("t", real=True)
    hbar_sym = sp.Symbol("hbar", real=True)
    pid = problem.id

    t_eval = np.linspace(problem.t_span[0], problem.t_span[1], 101)
    terms_sym: List[sp.Expr] = []

    if pid == "riccati_ivp":
        # Riccati: u' + u^2 - 1 = 0, u(0) = 0
        # Choose L[u] = u', initial guess u_0(t) = t (satisfies u(0)=0 and u'(0)=1)
        # N[u] = u' + u^2 - 1
        # m-th order deformation:
        # L[u_m - chi_m u_{m-1}] = hbar * H(t) * R_m
        # For m=1: u_1' = hbar * R_1, where R_1 = N[u_0] = u_0' + u_0^2 - 1 = 1 + t^2 - 1 = t^2
        # u_1(t) = hbar \int_0^t t^2 dt = hbar * t^3 / 3
        # For m > 1:
        # u_m' = u_{m-1}' + hbar * R_m
        # R_m = u_{m-1}' + [coeff of q^(m-1) in (sum u_i q^i)^2]
        u0 = t_sym
        terms_sym.append(u0)

        for m in range(1, order + 1):
            # calculate R_m
            # Nonlinear part of N[phi]: phi' + phi^2 - 1
            # R_m = u_{m-1}' + sum_{i=0}^{m-1} u_i * u_{m-1-i}
            nonlinear_sum = sum(terms_sym[i] * terms_sym[m - 1 - i] for i in range(m))
            Rm = sp.diff(terms_sym[m - 1], t_sym) + nonlinear_sum
            if m == 1:
                Rm = Rm - 1
                rhs = hbar_sym * sp.integrate(Rm, (t_sym, 0, t_sym))
            else:
                rhs = terms_sym[m - 1] + hbar_sym * sp.integrate(Rm, (t_sym, 0, t_sym))
            terms_sym.append(sp.expand(rhs))

    elif pid == "lane_emden":
        # Lane-Emden: u'' + 2/t u' + u^5 = 0, u(0)=1, u'(0)=0
        # L = d/dt(t^2 d/dt)
        # Initial guess u_0(t) = 1
        # N[u] = (t^2 u')' + t^2 u^5
        # m=1: (t^2 u_1')' = hbar * t^2 * u_0^5 = hbar * t^2 => u_1 = hbar * t^2 / 6
        terms_sym.append(sp.Integer(1))
        tau = sp.Symbol("tau", real=True)
        s = sp.Symbol("s", real=True)
        q_sym = sp.Symbol("q", real=True)

        for m in range(1, order + 1):
            phi_sum = sum(terms_sym[i] * (q_sym ** i) for i in range(m))
            phi_5 = sp.expand(phi_sum ** 5)
            N_part = sp.diff(phi_5, q_sym, m - 1).subs(q_sym, 0) / sp.factorial(m - 1)
            Rm = N_part
            # integrate: \int_0^t (1/s^2) \int_0^s tau^2 Rm(tau) dtau ds
            c_tau = Rm.subs(t_sym, tau)
            inner = sp.integrate((tau ** 2) * c_tau, (tau, 0, s))
            outer = sp.integrate((1 / (s ** 2)) * inner, (s, 0, t_sym))
            if m == 1:
                um = hbar_sym * outer
            else:
                um = terms_sym[m - 1] + hbar_sym * outer
            terms_sym.append(sp.expand(um))

    elif pid == "duffing_oscillator":
        # u'' + u + alpha u^3 = 0, u(0)=A, u'(0)=0
        alpha = problem.parameters.get("alpha", 0.5)
        A_val = problem.parameters.get("A", 1.0)
        u0 = sp.Float(A_val)
        terms_sym.append(u0)
        tau1 = sp.Symbol("tau1", real=True)
        tau2 = sp.Symbol("tau2", real=True)
        q_sym = sp.Symbol("q", real=True)

        for m in range(1, order + 1):
            phi_sum = sum(terms_sym[i] * (q_sym ** i) for i in range(m))
            phi_3 = sp.expand(phi_sum ** 3)
            cubic_term = sp.diff(phi_3, q_sym, m - 1).subs(q_sym, 0) / sp.factorial(m - 1)
            # R_m = u_{m-1}'' + u_{m-1} + alpha * cubic_term
            Rm = sp.diff(terms_sym[m - 1], t_sym, 2) + terms_sym[m - 1] + alpha * cubic_term
            # L^-1(Rm) = \int_0^t \int_0^{tau1} Rm(tau2) dtau2 dtau1
            Rm_tau = Rm.subs(t_sym, tau2)
            i1 = sp.integrate(Rm_tau, (tau2, 0, tau1))
            L_inv = sp.integrate(i1, (tau1, 0, t_sym))
            if m == 1:
                um = hbar_sym * L_inv
            else:
                um = terms_sym[m - 1] + hbar_sym * L_inv
            terms_sym.append(sp.expand(um))

    elif pid == "coupled_system":
        # u' = -u + u^2, u(0)=0.5
        terms_sym.append(sp.Rational(1, 2))
        q_sym = sp.Symbol("q", real=True)

        for m in range(1, order + 1):
            phi_sum = sum(terms_sym[i] * (q_sym ** i) for i in range(m))
            sq_part = sp.diff(phi_sum ** 2, q_sym, m - 1).subs(q_sym, 0) / sp.factorial(m - 1)
            Rm = sp.diff(terms_sym[m - 1], t_sym) + terms_sym[m - 1] - sq_part
            L_inv = sp.integrate(Rm, (t_sym, 0, t_sym))
            if m == 1:
                um = hbar_sym * L_inv
            else:
                um = terms_sym[m - 1] + hbar_sym * L_inv
            terms_sym.append(sp.expand(um))

    elif pid == "logistic_population":
        r = problem.parameters.get("r", 1.5)
        K = problem.parameters.get("K", 2.0)
        u0 = problem.parameters.get("u0", 0.5)
        terms_sym.append(sp.Float(u0))
        q_sym = sp.Symbol("q", real=True)

        for m in range(1, order + 1):
            phi_sum = sum(terms_sym[i] * (q_sym ** i) for i in range(m))
            sq_part = sp.diff(phi_sum ** 2, q_sym, m - 1).subs(q_sym, 0) / sp.factorial(m - 1)
            Rm = sp.diff(terms_sym[m - 1], t_sym) - r * terms_sym[m - 1] + (r / K) * sq_part
            L_inv = sp.integrate(Rm, (t_sym, 0, t_sym))
            if m == 1:
                um = hbar_sym * L_inv
            else:
                um = terms_sym[m - 1] + hbar_sym * L_inv
            terms_sym.append(sp.expand(um))

    elif pid == "epidemiological_sir":
        beta = problem.parameters.get("beta", 1.2)
        gamma = problem.parameters.get("gamma", 0.4)
        S0, I0, R0 = problem.initial_conditions
        S_terms: List[sp.Expr] = [sp.Float(S0)]
        I_terms: List[sp.Expr] = [sp.Float(I0)]
        q_sym = sp.Symbol("q", real=True)

        for m in range(1, order + 1):
            S_sum = sum(S_terms[i] * (q_sym ** i) for i in range(m))
            I_sum = sum(I_terms[i] * (q_sym ** i) for i in range(m))
            cross = sp.diff(S_sum * I_sum, q_sym, m - 1).subs(q_sym, 0) / sp.factorial(m - 1)
            Rm_S = sp.diff(S_terms[m - 1], t_sym) + beta * cross
            Rm_I = sp.diff(I_terms[m - 1], t_sym) - beta * cross + gamma * I_terms[m - 1]

            L_inv_S = sp.integrate(Rm_S, (t_sym, 0, t_sym))
            L_inv_I = sp.integrate(Rm_I, (t_sym, 0, t_sym))

            if m == 1:
                Sm = hbar_sym * L_inv_S
                Im = hbar_sym * L_inv_I
            else:
                Sm = S_terms[m - 1] + hbar_sym * L_inv_S
                Im = I_terms[m - 1] + hbar_sym * L_inv_I
            S_terms.append(sp.expand(Sm))
            I_terms.append(sp.expand(Im))
        terms_sym = I_terms

    elif pid == "rapid_transition":
        k_val = problem.parameters.get("k", 4.0)
        u0 = problem.initial_conditions[0]
        terms_sym.append(sp.Float(u0))
        q_sym = sp.Symbol("q", real=True)

        for m in range(1, order + 1):
            phi_sum = sum(terms_sym[i] * (q_sym ** i) for i in range(m))
            nonlin = k_val * (phi_sum ** 2) * (1.0 - phi_sum)
            nonlin_m = sp.diff(nonlin, q_sym, m - 1).subs(q_sym, 0) / sp.factorial(m - 1)
            Rm = sp.diff(terms_sym[m - 1], t_sym) - nonlin_m
            L_inv = sp.integrate(Rm, (t_sym, 0, t_sym))
            if m == 1:
                um = hbar_sym * L_inv
            else:
                um = terms_sym[m - 1] + hbar_sym * L_inv
            terms_sym.append(sp.expand(um))

    elif pid == "stiff_relaxation":
        lam = problem.parameters.get("lambda", 50.0)
        terms_sym.append(sp.Float(1.0))
        for m in range(1, order + 1):
            Rm = sp.diff(terms_sym[m - 1], t_sym) + lam * (terms_sym[m - 1] - t_sym**2) - 2.0 * t_sym
            L_inv = sp.integrate(Rm, (t_sym, 0, t_sym))
            if m == 1:
                um = hbar_sym * L_inv
            else:
                um = terms_sym[m - 1] + hbar_sym * L_inv
            terms_sym.append(sp.expand(um))
    else:
        raise ValueError(f"HAM not configured for problem {pid}")

    # Substitute specific hbar value into symbolic expressions
    subbed_terms_sym: List[sp.Expr] = []
    term_callables: List[Callable[[np.ndarray], np.ndarray]] = []
    term_expr_strs: List[str] = []

    for expr in terms_sym:
        val_expr = sp.expand(expr.subs(hbar_sym, hbar))
        subbed_terms_sym.append(val_expr)
        term_expr_strs.append(sp.sstr(val_expr))
        fn = sp.lambdify(t_sym, val_expr, modules=["numpy"])
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

    # Compute maximum absolute residual if possible
    residual_norm = 0.0
    if problem.f_rhs is not None and is_convergent and len(t_eval) > 2:
        dt = t_eval[1] - t_eval[0]
        du_dt = np.gradient(u_approx, dt)
        if problem.order == 1:
            rhs_vals = np.zeros_like(u_approx)
            n_dims = len(problem.initial_conditions)
            for i, (ti, ui) in enumerate(zip(t_eval, u_approx)):
                y_vec = np.full(n_dims, ui, dtype=np.float64)
                rhs_vals[i] = problem.f_rhs(ti, y_vec)[0]
            residual_norm = float(np.max(np.abs(du_dt - rhs_vals)))

    return HAMResult(
        problem_id=pid,
        order=order,
        hbar=hbar,
        terms=term_callables,
        term_expressions=term_expr_strs,
        t_eval=t_eval,
        u_approx=u_approx,
        wall_time_sec=wall_time,
        convergence_flag=is_convergent,
        residual_norm=residual_norm,
        metadata={"num_terms": len(terms_sym)},
    )


def compute_hbar_curve(
    problem: BenchmarkProblem,
    order: int = 4,
    hbar_range: Tuple[float, float] = (-2.0, 0.2),
    num_points: int = 45,
    sample_t: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Generate hbar-curve data to locate the flat horizontal plateau where d(u)/d(hbar) ~ 0.
    """
    if sample_t is None:
        sample_t = float(problem.t_span[0] + 0.5 * (problem.t_span[1] - problem.t_span[0]))

    hbars = np.linspace(hbar_range[0], hbar_range[1], num_points)
    u_vals = []
    residuals = []
    valid_hbars = []

    for h in hbars:
        try:
            res = solve_ham(problem, order=order, hbar=float(h))
            if res.convergence_flag:
                idx = np.argmin(np.abs(res.t_eval - sample_t))
                u_val = float(res.u_approx[idx])
                u_vals.append(u_val)
                residuals.append(res.residual_norm)
                valid_hbars.append(float(h))
        except Exception:
            continue

    # Find optimal plateau region: where finite difference slope |du/dhbar| is minimized
    optimal_hbar = -1.0
    flat_region = (-1.2, -0.6)
    if len(u_vals) > 5:
        slopes = np.abs(np.gradient(u_vals, valid_hbars))
        min_idx = int(np.argmin(slopes))
        optimal_hbar = valid_hbars[min_idx]
        flat_mask = slopes < (np.median(slopes) * 0.5)
        if np.any(flat_mask):
            flat_hbars = np.array(valid_hbars)[flat_mask]
            flat_region = (float(np.min(flat_hbars)), float(np.max(flat_hbars)))

    return {
        "problem_id": problem.id,
        "order": order,
        "sample_t": sample_t,
        "hbars": valid_hbars,
        "u_values": u_vals,
        "residuals": residuals,
        "optimal_hbar": optimal_hbar,
        "flat_region": flat_region,
    }
