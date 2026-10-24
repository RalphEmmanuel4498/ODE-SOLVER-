"""
Variational Iteration Method (VIM) Module
=========================================

Implements Ji-Huan He's Variational Iteration Method (1999, 2007):
- Correction functional:
    u_{n+1}(t) = u_n(t) + int_0^t lambda(tau) * [ L(u_n)(tau) + N(tilde{u}_n)(tau) - g(tau) ] dtau
- Identification of optimal Lagrange multiplier lambda(tau) via variational theory
  * 1st-order: lambda(tau) = -1
  * 2nd-order: lambda(tau) = tau - t
- Restricted variation delta(tilde{u}_n) = 0
- Successive iterate computation and convergence validation
"""

import time
from dataclasses import dataclass, field
from typing import List, Callable, Dict, Any, Tuple
import numpy as np
import sympy as sp
from .problems import BenchmarkProblem


@dataclass
class VIMResult:
    method: str = "VIM"
    problem_id: str = ""
    order: int = 1
    lagrange_multiplier_str: str = ""
    iterates: List[Callable[[np.ndarray], np.ndarray]] = field(default_factory=list)
    iterate_expressions: List[str] = field(default_factory=list)
    t_eval: np.ndarray = field(default_factory=lambda: np.zeros(0))
    u_approx: np.ndarray = field(default_factory=lambda: np.zeros(0))
    wall_time_sec: float = 0.0
    convergence_flag: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    def evaluate(self, t: np.ndarray) -> np.ndarray:
        return self.iterates[-1](t)


def solve_vim(problem: BenchmarkProblem, order: int = 4) -> VIMResult:
    """
    Solve benchmark problem using Variational Iteration Method up to specified iteration count.
    """
    start_time = time.perf_counter()
    t_sym = sp.Symbol("t", real=True)
    tau_sym = sp.Symbol("tau", real=True)
    pid = problem.id

    t_eval = np.linspace(problem.t_span[0], problem.t_span[1], 101)
    iterates_sym: List[sp.Expr] = []
    lagrange_str: str = ""

    if pid == "riccati_ivp":
        # u' + u^2 - 1 = 0, u(0) = 0
        # 1st-order: lambda(tau) = -1
        # u_{n+1}(t) = u_n(t) - \int_0^t [ u_n'(tau) + u_n^2(tau) - 1 ] dtau
        # u_0(t) = 0 (or u_0 = t)
        # Using u_0(t) = t:
        lagrange_str = "lambda(tau) = -1"
        u_curr = t_sym
        iterates_sym.append(u_curr)

        for n in range(order):
            # Evaluate integrand at tau
            u_tau = u_curr.subs(t_sym, tau_sym)
            integrand = sp.diff(u_tau, tau_sym) + (u_tau ** 2) - 1
            correction = - sp.integrate(integrand, (tau_sym, 0, t_sym))
            u_next = sp.expand(u_curr + correction)
            iterates_sym.append(u_next)
            u_curr = u_next

    elif pid == "lane_emden":
        # Lane-Emden: u'' + (2/t)u' + u^5 = 0, u(0)=1, u'(0)=0
        # Multiplier for singular operator (t^2 u')': lambda(tau) = tau - (tau^2 / t)
        # Or standard second-order lambda(tau) = tau - t:
        # u_{n+1}(t) = u_n(t) + \int_0^t (tau - t) [ u_n''(tau) + (2/tau) u_n'(tau) + u_n^5(tau) ] dtau
        lagrange_str = "lambda(tau) = tau - t"
        u_curr = sp.Integer(1)
        iterates_sym.append(u_curr)

        for n in range(order):
            u_tau = u_curr.subs(t_sym, tau_sym)
            diff1 = sp.diff(u_tau, tau_sym)
            diff2 = sp.diff(u_tau, tau_sym, 2)
            # Handle 2/tau * diff1: since u_tau is even polynomial, diff1 = c * tau + ...
            # so (2/tau)*diff1 is non-singular
            integrand = (tau_sym - t_sym) * (diff2 + (2 / tau_sym) * diff1 + (u_tau ** 5))
            correction = sp.integrate(sp.expand(integrand), (tau_sym, 0, t_sym))
            u_next = sp.expand(u_curr + correction)
            iterates_sym.append(u_next)
            u_curr = u_next

    elif pid == "duffing_oscillator":
        # u'' + u + alpha u^3 = 0, u(0)=A, u'(0)=0
        # 2nd-order Lagrange multiplier: lambda(tau) = tau - t
        # u_{n+1}(t) = u_n(t) + \int_0^t (tau - t) [ u_n''(tau) + u_n(tau) + alpha * u_n^3(tau) ] dtau
        alpha = problem.parameters.get("alpha", 0.5)
        A_val = problem.parameters.get("A", 1.0)
        lagrange_str = "lambda(tau) = tau - t (or -sin(t - tau) for exact harmonic linear operator)"

        u_curr = sp.Float(A_val)
        iterates_sym.append(u_curr)

        for n in range(order):
            u_tau = u_curr.subs(t_sym, tau_sym)
            diff2 = sp.diff(u_tau, tau_sym, 2)
            integrand = (tau_sym - t_sym) * (diff2 + u_tau + alpha * (u_tau ** 3))
            correction = sp.integrate(sp.expand(integrand), (tau_sym, 0, t_sym))
            u_next = sp.expand(u_curr + correction)
            iterates_sym.append(u_next)
            u_curr = u_next

    elif pid == "coupled_system":
        # u' = -u + u^2, u(0)=0.5
        lagrange_str = "lambda(tau) = -1"
        u_curr = sp.Rational(1, 2)
        iterates_sym.append(u_curr)

        for n in range(order):
            u_tau = u_curr.subs(t_sym, tau_sym)
            integrand = sp.diff(u_tau, tau_sym) + u_tau - (u_tau ** 2)
            correction = - sp.integrate(sp.expand(integrand), (tau_sym, 0, t_sym))
            u_next = sp.expand(u_curr + correction)
            iterates_sym.append(u_next)
            u_curr = u_next

    elif pid == "logistic_population":
        # u' = r u (1 - u/K), u(0)=u0
        r = problem.parameters.get("r", 1.5)
        K = problem.parameters.get("K", 2.0)
        u0 = problem.parameters.get("u0", 0.5)
        lagrange_str = "lambda(tau) = -1 (or -exp(-r*(t-tau)) for linearized operator)"

        u_curr = sp.Float(u0)
        iterates_sym.append(u_curr)

        for n in range(order):
            u_tau = u_curr.subs(t_sym, tau_sym)
            integrand = sp.diff(u_tau, tau_sym) - r * u_tau * (1.0 - u_tau / K)
            correction = - sp.integrate(sp.expand(integrand), (tau_sym, 0, t_sym))
            u_next = sp.expand(u_curr + correction)
            iterates_sym.append(u_next)
            u_curr = u_next

    elif pid == "epidemiological_sir":
        beta = problem.parameters.get("beta", 1.2)
        gamma = problem.parameters.get("gamma", 0.4)
        S0, I0, R0 = problem.initial_conditions
        lagrange_str = "lambda(tau) = -1"

        S_curr = sp.Float(S0)
        I_curr = sp.Float(I0)
        iterates_sym.append(I_curr)

        for n in range(order):
            S_tau = S_curr.subs(t_sym, tau_sym)
            I_tau = I_curr.subs(t_sym, tau_sym)
            int_S = sp.diff(S_tau, tau_sym) + beta * S_tau * I_tau
            int_I = sp.diff(I_tau, tau_sym) - beta * S_tau * I_tau + gamma * I_tau

            S_next = sp.expand(S_curr - sp.integrate(int_S, (tau_sym, 0, t_sym)))
            I_next = sp.expand(I_curr - sp.integrate(int_I, (tau_sym, 0, t_sym)))

            iterates_sym.append(I_next)
            S_curr, I_curr = S_next, I_next

    elif pid == "rapid_transition":
        k_val = problem.parameters.get("k", 4.0)
        u0 = problem.initial_conditions[0]
        lagrange_str = "lambda(tau) = -1"

        u_curr = sp.Float(u0)
        iterates_sym.append(u_curr)

        for n in range(order):
            u_tau = u_curr.subs(t_sym, tau_sym)
            integrand = sp.diff(u_tau, tau_sym) - k_val * (u_tau ** 2) * (1.0 - u_tau)
            correction = - sp.integrate(sp.expand(integrand), (tau_sym, 0, t_sym))
            u_next = sp.expand(u_curr + correction)
            iterates_sym.append(u_next)
            u_curr = u_next

    elif pid == "stiff_relaxation":
        lam = problem.parameters.get("lambda", 50.0)
        lagrange_str = "lambda(tau) = -1 (standard) or -exp(lambda*(tau-t)) (linearized stiff)"
        # Note: Using lambda(tau) = -1 on stiff problem reveals classic VIM oscillation
        u_curr = sp.Float(1.0)
        iterates_sym.append(u_curr)

        for n in range(order):
            u_tau = u_curr.subs(t_sym, tau_sym)
            integrand = sp.diff(u_tau, tau_sym) + lam * (u_tau - tau_sym**2) - 2.0 * tau_sym
            correction = - sp.integrate(sp.expand(integrand), (tau_sym, 0, t_sym))
            u_next = sp.expand(u_curr + correction)
            iterates_sym.append(u_next)
            u_curr = u_next
    else:
        raise ValueError(f"VIM not configured for problem {pid}")

    iterate_callables: List[Callable[[np.ndarray], np.ndarray]] = []
    iterate_expr_strs: List[str] = []
    for expr in iterates_sym:
        iterate_expr_strs.append(sp.sstr(expr))
        fn = sp.lambdify(t_sym, expr, modules=["numpy"])
        iterate_callables.append(fn)

    # Evaluate final iterate
    final_fn = iterate_callables[-1]
    raw_val = final_fn(t_eval)
    if np.isscalar(raw_val):
        u_approx = np.full_like(t_eval, float(raw_val), dtype=np.float64)
    else:
        u_approx = np.asarray(raw_val, dtype=np.float64)

    wall_time = time.perf_counter() - start_time
    is_convergent = not (np.any(np.isnan(u_approx)) or np.any(np.isinf(u_approx)) or np.max(np.abs(u_approx)) > 1e10)

    return VIMResult(
        problem_id=pid,
        order=order,
        lagrange_multiplier_str=lagrange_str,
        iterates=iterate_callables,
        iterate_expressions=iterate_expr_strs,
        t_eval=t_eval,
        u_approx=u_approx,
        wall_time_sec=wall_time,
        convergence_flag=is_convergent,
        metadata={"num_iterates": len(iterates_sym)},
    )
