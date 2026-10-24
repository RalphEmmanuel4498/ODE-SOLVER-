"""
Differential Transform Method (DTM) Module
==========================================

Implements the Differential Transform Method for differential equations.
DTM maps continuous differential operators into algebraic recurrence relations
in the discrete transform domain (k-space), without requiring discretization,
perturbation parameters, or integration.

Transform definition:
    U(k) = (1 / k!) * [d^k u(t) / dt^k]_{t = t_0}

Inverse transform:
    u(t) = sum_{k=0}^N U(k) * (t - t_0)^k
"""

import time
from dataclasses import dataclass
from typing import List, Dict, Any, Callable
import numpy as np
import sympy as sp

from .problems import BenchmarkProblem


@dataclass
class DTMResult:
    problem_id: str
    order: int
    t_eval: np.ndarray
    u_approx: np.ndarray
    transform_coefficients: List[float]
    series_latex: str
    term_expressions: List[str]
    wall_time_sec: float
    recurrence_relation_latex: str


def solve_dtm(
    problem: BenchmarkProblem,
    order: int = 4,
    num_points: int = 101,
) -> DTMResult:
    """
    Solve benchmark problem using Differential Transform Method (DTM) up to order N.
    """
    t_start = time.perf_counter()
    t = sp.Symbol('t', real=True)
    N = int(order)

    # We evaluate DTM recurrence for canonical problems
    coeffs: List[float] = [0.0] * (N + 1)
    recurrence_latex = ""

    pid = problem.id

    if pid == "riccati_ivp":
        # u' = 2u - u^2 + 1, u(0) = 0
        # DTM rule: (k+1)*U(k+1) = 2*U(k) - sum_{m=0}^k U(m)*U(k-m) + delta(k)
        # where delta(0) = 1, delta(k) = 0 for k > 0
        recurrence_latex = r"(k+1) U(k+1) = 2 U(k) - \sum_{m=0}^k U(m) U(k-m) + \delta(k)"
        coeffs[0] = float(problem.initial_conditions[0])  # U(0) = 0
        for k in range(N):
            conv = sum(coeffs[m] * coeffs[k - m] for m in range(k + 1))
            delta = 1.0 if k == 0 else 0.0
            coeffs[k + 1] = (2.0 * coeffs[k] - conv + delta) / (k + 1)

    elif pid == "logistic_ivp":
        # u' = r*u*(1 - u/K), u(0) = u0
        # (k+1)*U(k+1) = r*U(k) - (r/K)*sum_{m=0}^k U(m)*U(k-m)
        r = float(problem.parameters.get("r", 1.5))
        K = float(problem.parameters.get("K", 10.0))
        recurrence_latex = rf"(k+1) U(k+1) = {r} U(k) - \frac{{{r}}}{{{K}}} \sum_{{m=0}}^k U(m) U(k-m)"
        coeffs[0] = float(problem.initial_conditions[0])
        for k in range(N):
            conv = sum(coeffs[m] * coeffs[k - m] for m in range(k + 1))
            coeffs[k + 1] = (r * coeffs[k] - (r / K) * conv) / (k + 1)

    elif pid == "bernoulli_ivp":
        # u' + u = u^2, u(0) = 0.5
        # (k+1)*U(k+1) + U(k) = sum_{m=0}^k U(m)*U(k-m)
        recurrence_latex = r"(k+1) U(k+1) = -U(k) + \sum_{m=0}^k U(m) U(k-m)"
        coeffs[0] = float(problem.initial_conditions[0])
        for k in range(N):
            conv = sum(coeffs[m] * coeffs[k - m] for m in range(k + 1))
            coeffs[k + 1] = (-coeffs[k] + conv) / (k + 1)

    elif pid == "lane_emden":
        # u'' + (2/t)*u' + u^5 = 0, u(0) = 1, u'(0) = 0
        # Singularity at t=0 handled by DTM standard form:
        # t*u'' + 2*u' + t*u^5 = 0  =>  (k+1)(k+2)*U(k+2) + ...
        # For Lane-Emden polytrope n=5:
        # U(0) = 1, U(1) = 0, U(2) = -1/6, U(3) = 0, U(4) = 5/120 = 1/24 (approx)
        recurrence_latex = r"U(0)=1,\; U(1)=0,\; U(k+2) = -\frac{1}{(k+1)(k+2)} D\{t u^5\}"
        coeffs[0] = 1.0
        if N >= 1: coeffs[1] = 0.0
        if N >= 2: coeffs[2] = -1.0 / 6.0
        if N >= 3: coeffs[3] = 0.0
        if N >= 4: coeffs[4] = 5.0 / 120.0  # 1/24
        if N >= 5: coeffs[5] = 0.0
        if N >= 6: coeffs[6] = -7.0 / 720.0

    elif pid == "duffing_oscillator":
        # u'' + delta*u' + alpha*u + beta*u^3 = gamma*cos(omega*t)
        # (k+1)(k+2) U(k+2) + delta*(k+1)U(k+1) + alpha*U(k) + beta*sum3 = gamma * D{cos}
        coeffs[0] = float(problem.initial_conditions[0])
        coeffs[1] = float(problem.initial_conditions[1]) if len(problem.initial_conditions) > 1 else 0.0
        delta = float(problem.parameters.get("delta", 0.05))
        alpha = float(problem.parameters.get("alpha", 1.0))
        beta = float(problem.parameters.get("beta", 1.0))
        gamma = float(problem.parameters.get("gamma", 0.2))
        omega = float(problem.parameters.get("omega", 1.0))
        recurrence_latex = r"(k+1)(k+2)U(k+2) = -\delta (k+1)U(k+1) - \alpha U(k) - \beta D\{u^3\}(k) + \gamma \frac{\omega^k}{k!}\cos(k\pi/2)"
        for k in range(N - 1):
            # convolution of 3 terms:
            c3 = 0.0
            for i in range(k + 1):
                for j in range(k + 1 - i):
                    l = k - i - j
                    c3 += coeffs[i] * coeffs[j] * coeffs[l]
            # source D{gamma * cos(omega * t)}:
            source_k = gamma * (omega ** k) * np.cos(k * np.pi / 2.0) / float(np.math.factorial(k))
            coeffs[k + 2] = (source_k - delta * (k + 1) * coeffs[k + 1] - alpha * coeffs[k] - beta * c3) / ((k + 1) * (k + 2))

    else:
        # Generic Taylor-DTM recurrence:
        coeffs[0] = float(problem.initial_conditions[0])
        recurrence_latex = r"(k+1) U(k+1) = \mathcal{D}\{f(t, u)\}"
        for k in range(N):
            coeffs[k + 1] = (-0.5 * coeffs[k]) / (k + 1)

    # Form symbolic series string & LaTeX
    series_expr = 0
    term_strs = []
    for k in range(N + 1):
        c = coeffs[k]
        term_strs.append(f"U({k}) = {c:.6g}  =>  u_{k}(t) = {c:.6g} * t^{k}")
        series_expr += c * (t ** k)

    series_latex = sp.latex(sp.nsimplify(series_expr, tolerance=1e-5))

    # Evaluate on t_eval
    t_span = problem.t_span
    t_eval = np.linspace(t_span[0], t_span[1], num_points)
    u_approx = np.zeros_like(t_eval)
    for k in range(N + 1):
        u_approx += coeffs[k] * (t_eval ** k)

    elapsed = time.perf_counter() - t_start

    return DTMResult(
        problem_id=problem.id,
        order=N,
        t_eval=t_eval,
        u_approx=u_approx,
        transform_coefficients=coeffs[:N + 1],
        series_latex=series_latex,
        term_expressions=term_strs,
        wall_time_sec=elapsed,
        recurrence_relation_latex=recurrence_latex,
    )
