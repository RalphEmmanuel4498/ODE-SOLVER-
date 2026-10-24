"""
Benchmarking Metrics Module
===========================

Calculates comprehensive error and performance metrics for semi-analytical approximations:
1. Maximum absolute error E_inf = max_i |u_approx(t_i) - u_ref(t_i)|
2. Root mean square error RMSE = sqrt( (1/N) * sum_i (u_approx(t_i) - u_ref(t_i))^2 )
3. Maximum absolute differential equation residual
4. Initial condition / boundary condition error
5. Convergence rate between successive orders log10(E_m / E_{m-1})
6. Wall-clock execution time
7. Numerical divergence and failure detection
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
import numpy as np
from .problems import BenchmarkProblem


@dataclass
class MethodMetrics:
    method: str
    problem_id: str
    order: int
    hbar: Optional[float] = None
    e_inf: float = 0.0
    rmse: float = 0.0
    residual_max: float = 0.0
    ic_error: float = 0.0
    reduction_rate: Optional[float] = None
    wall_time_sec: float = 0.0
    converged: bool = True
    failure_reason: str = ""
    u_approx: np.ndarray = field(default_factory=lambda: np.zeros(0))
    t_eval: np.ndarray = field(default_factory=lambda: np.zeros(0))
    error_curve: np.ndarray = field(default_factory=lambda: np.zeros(0))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "method": self.method,
            "problem_id": self.problem_id,
            "order": self.order,
            "hbar": self.hbar,
            "e_inf": float(self.e_inf),
            "rmse": float(self.rmse),
            "residual_max": float(self.residual_max),
            "ic_error": float(self.ic_error),
            "reduction_rate": float(self.reduction_rate) if self.reduction_rate is not None else None,
            "wall_time_sec": float(self.wall_time_sec),
            "converged": bool(self.converged),
            "failure_reason": self.failure_reason,
        }


def compute_metrics(
    problem: BenchmarkProblem,
    method_name: str,
    u_approx: np.ndarray,
    t_eval: np.ndarray,
    u_ref: np.ndarray,
    order: int,
    wall_time_sec: float,
    hbar: Optional[float] = None,
    prev_rmse: Optional[float] = None,
) -> MethodMetrics:
    """
    Compute all standard benchmarking metrics comparing u_approx against u_ref.
    """
    # Check for NaN / Inf
    if np.any(np.isnan(u_approx)) or np.any(np.isinf(u_approx)):
        return MethodMetrics(
            method=method_name,
            problem_id=problem.id,
            order=order,
            hbar=hbar,
            e_inf=float("nan"),
            rmse=float("nan"),
            residual_max=float("nan"),
            ic_error=float("nan"),
            wall_time_sec=wall_time_sec,
            converged=False,
            failure_reason="Floating-point NaN/Inf encountered during evaluation.",
            u_approx=u_approx,
            t_eval=t_eval,
            error_curve=np.zeros_like(t_eval),
        )

    # Check for unbounded explosion
    max_val = np.max(np.abs(u_approx))
    if max_val > 1e12:
        return MethodMetrics(
            method=method_name,
            problem_id=problem.id,
            order=order,
            hbar=hbar,
            e_inf=float(max_val),
            rmse=float(max_val),
            residual_max=float(max_val),
            ic_error=float(np.abs(u_approx[0] - problem.initial_conditions[0])),
            wall_time_sec=wall_time_sec,
            converged=False,
            failure_reason=f"Numerical explosion: max magnitude {max_val:.2e} exceeds stability threshold.",
            u_approx=u_approx,
            t_eval=t_eval,
            error_curve=np.zeros_like(t_eval),
        )

    # 1. Error vector
    error_vec = np.abs(u_approx - u_ref)
    e_inf = float(np.max(error_vec))
    rmse = float(np.sqrt(np.mean(error_vec ** 2)))

    # 2. Initial condition error
    ic_expected = problem.initial_conditions[0] if problem.id != "epidemiological_sir" else problem.initial_conditions[1]
    ic_error = float(np.abs(u_approx[0] - ic_expected))

    # 3. Residual evaluation
    residual_max = 0.0
    if problem.f_rhs is not None and len(t_eval) > 2:
        dt = t_eval[1] - t_eval[0]
        du_dt = np.gradient(u_approx, dt)
        if problem.order == 1:
            rhs_vals = np.zeros_like(u_approx)
            n_dims = len(problem.initial_conditions)
            for i, (ti, ui) in enumerate(zip(t_eval, u_approx)):
                y_vec = np.full(n_dims, ui, dtype=np.float64)
                rhs_vals[i] = problem.f_rhs(ti, y_vec)[0]
            residual_max = float(np.max(np.abs(du_dt - rhs_vals)))
        elif problem.order == 2:
            d2u_dt2 = np.gradient(du_dt, dt)
            rhs_vals = np.zeros_like(u_approx)
            for i, (ti, ui, vi) in enumerate(zip(t_eval, u_approx, du_dt)):
                rhs_vals[i] = problem.f_rhs(ti, np.array([ui, vi]))[1]
            residual_max = float(np.max(np.abs(d2u_dt2 - rhs_vals)))

    # 4. Error reduction factor
    reduction_rate = None
    if prev_rmse is not None and prev_rmse > 1e-15 and rmse > 1e-15:
        reduction_rate = float(np.log10(rmse / prev_rmse))

    return MethodMetrics(
        method=method_name,
        problem_id=problem.id,
        order=order,
        hbar=hbar,
        e_inf=e_inf,
        rmse=rmse,
        residual_max=residual_max,
        ic_error=ic_error,
        reduction_rate=reduction_rate,
        wall_time_sec=wall_time_sec,
        converged=True,
        failure_reason="",
        u_approx=u_approx,
        t_eval=t_eval,
        error_curve=error_vec,
    )
