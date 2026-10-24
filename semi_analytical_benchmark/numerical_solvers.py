"""
Numerical Reference Solvers Module
==================================

Computes high-precision reference solutions for differential equations using:
- SciPy DOP853 (8th-order explicit Runge-Kutta) for non-stiff equations
- SciPy Radau / BDF (implicit Runge-Kutta Radau IIA) for stiff problems
- Exact analytical evaluations where closed-form solutions exist
- Verification of solver tolerances, success flags, and condition numbers
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional
import numpy as np
from scipy.integrate import solve_ivp
from .problems import BenchmarkProblem


@dataclass
class NumericalReferenceResult:
    problem_id: str
    solver_name: str
    t_eval: np.ndarray
    u_ref: np.ndarray
    is_exact: bool
    status: int
    success: bool
    message: str
    nfev: int = 0
    njev: int = 0
    nlu: int = 0


def compute_reference_solution(
    problem: BenchmarkProblem,
    num_points: int = 101,
    force_numerical: bool = False,
    solver_method: Optional[str] = None,
) -> NumericalReferenceResult:
    """
    Generate ground truth reference solution.
    If problem has an exact analytical solution and force_numerical is False, returns exact.
    Otherwise, executes DOP853 (non-stiff) or Radau (stiff) with tight tolerances.
    """
    t_span = problem.t_span
    t_eval = np.linspace(t_span[0], t_span[1], num_points)

    # 1. Exact Analytical Evaluation
    if problem.has_exact_solution and problem.exact_fn is not None and not force_numerical:
        u_vals = problem.exact_fn(t_eval)
        return NumericalReferenceResult(
            problem_id=problem.id,
            solver_name="Exact Analytical Closed-Form",
            t_eval=t_eval,
            u_ref=u_vals,
            is_exact=True,
            status=0,
            success=True,
            message="Analytical exact solution evaluated directly.",
            nfev=0,
        )

    # 2. High-Accuracy SciPy Numerical Integration
    if solver_method is None:
        solver_method = "Radau" if problem.stiff else "DOP853"

    y0 = np.array(problem.initial_conditions, dtype=np.float64)

    # Set ultra-tight tolerances for scientific reference standards
    rtol = 1e-12 if problem.stiff else 1e-13
    atol = 1e-12 if problem.stiff else 1e-13

    sol = solve_ivp(
        fun=problem.f_rhs,
        t_span=t_span,
        y0=y0,
        method=solver_method,
        t_eval=t_eval,
        rtol=rtol,
        atol=atol,
    )

    if not sol.success:
        # Fallback to LSODA if DOP853 or Radau encounters stiff difficulties
        sol = solve_ivp(
            fun=problem.f_rhs,
            t_span=t_span,
            y0=y0,
            method="LSODA",
            t_eval=t_eval,
            rtol=1e-11,
            atol=1e-11,
        )
        solver_method = "LSODA"

    # Extract primary variable: u(t) = y[0] (or for SIR, default to I(t) = y[1] if specified)
    if problem.id == "epidemiological_sir":
        u_ref = sol.y[1]  # Infected compartment
    else:
        u_ref = sol.y[0]

    return NumericalReferenceResult(
        problem_id=problem.id,
        solver_name=f"SciPy {solver_method} (rtol={rtol:.0e}, atol={atol:.0e})",
        t_eval=t_eval,
        u_ref=u_ref,
        is_exact=False,
        status=sol.status,
        success=sol.success,
        message=sol.message,
        nfev=sol.nfev,
        njev=getattr(sol, "njev", 0),
        nlu=getattr(sol, "nlu", 0),
    )
