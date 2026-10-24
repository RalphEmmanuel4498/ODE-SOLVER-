"""
Benchmark Experiments Module
============================

Executes reproducible computational experiments across all 4 semi-analytical methods:
- Truncation order sweeps (Order 1 to 6)
- Comparison across all 8 benchmark differential equations
- Systematic recording of E_inf, RMSE, max residual, IC error, and wall-clock execution time
- Export of benchmark results to structured CSV tables
"""

import os
import csv
import time
from typing import List, Dict, Any, Optional
import numpy as np

from .problems import BENCHMARK_REGISTRY, BenchmarkProblem, load_problem, list_problems
from .numerical_solvers import compute_reference_solution
from .adm import solve_adm
from .hpm import solve_hpm
from .ham import solve_ham, compute_hbar_curve
from .vim import solve_vim
from .dtm import solve_dtm
from .oham import solve_oham
from .metrics import compute_metrics, MethodMetrics


def run_single_experiment(
    problem_id: str,
    method_name: str,
    order: int = 4,
    hbar: float = -1.0,
    c_constants: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """
    Run an individual experiment with a chosen problem, method, and order.
    Returns metrics, approximation vectors, and ground truth reference.
    """
    problem = load_problem(problem_id)
    ref = compute_reference_solution(problem)

    meth = method_name.upper()
    if meth == "ADM":
        res = solve_adm(problem, order=order)
        m = compute_metrics(problem, "ADM", res.u_approx, res.t_eval, ref.u_ref, order, res.wall_time_sec)
        terms_info = res.term_expressions
        extra_info = {"adomian_polynomials": res.adomian_polynomials}

    elif meth == "HPM":
        res = solve_hpm(problem, order=order)
        m = compute_metrics(problem, "HPM", res.u_approx, res.t_eval, ref.u_ref, order, res.wall_time_sec)
        terms_info = res.term_expressions
        extra_info = {"homotopy_equations": res.homotopy_equations}

    elif meth == "HAM":
        res = solve_ham(problem, order=order, hbar=hbar)
        m = compute_metrics(problem, "HAM", res.u_approx, res.t_eval, ref.u_ref, order, res.wall_time_sec, hbar=hbar)
        terms_info = res.term_expressions
        extra_info = {"hbar": hbar}

    elif meth == "VIM":
        res = solve_vim(problem, order=order)
        m = compute_metrics(problem, "VIM", res.u_approx, res.t_eval, ref.u_ref, order, res.wall_time_sec)
        terms_info = res.iterate_expressions
        extra_info = {"lagrange_multiplier": res.lagrange_multiplier_str}

    elif meth == "DTM":
        res = solve_dtm(problem, order=order)
        m = compute_metrics(problem, "DTM", res.u_approx, res.t_eval, ref.u_ref, order, res.wall_time_sec)
        terms_info = res.term_expressions
        extra_info = {
            "transform_coefficients": res.transform_coefficients,
            "recurrence_relation_latex": res.recurrence_relation_latex,
            "series_latex": res.series_latex,
        }

    elif meth == "OHAM":
        res = solve_oham(problem, order=order, c_initial=c_constants)
        m = compute_metrics(problem, "OHAM", res.u_approx, res.t_eval, ref.u_ref, order, res.wall_time_sec)
        terms_info = res.term_expressions
        extra_info = {
            "c_constants": res.c_constants,
            "homotopy_formulation_latex": res.homotopy_formulation_latex,
            "algorithmic_steps": res.algorithmic_steps,
            "optimization_method": res.optimization_method,
            "series_latex": res.series_latex,
        }

    else:
        raise ValueError(f"Unknown method '{method_name}'. Choose from HAM, HPM, ADM, VIM, DTM, OHAM.")

    return {
        "metrics": m.to_dict(),
        "t_eval": ref.t_eval.tolist(),
        "u_ref": ref.u_ref.tolist(),
        "u_approx": m.u_approx.tolist(),
        "error_curve": m.error_curve.tolist(),
        "reference_solver": ref.solver_name,
        "is_exact_reference": ref.is_exact,
        "terms_or_iterates": terms_info,
        "extra_info": extra_info,
    }


def run_full_benchmark_suite(
    orders: List[int] = [1, 2, 3, 4, 5],
    selected_problems: Optional[List[str]] = None,
    output_csv_path: str = "results/benchmark_results.csv",
) -> List[Dict[str, Any]]:
    """
    Run full cross-method benchmark matrix across problems and orders.
    Saves results to CSV and returns summary records.
    """
    if selected_problems is None:
        selected_problems = list(BENCHMARK_REGISTRY.keys())

    methods = ["HAM", "HPM", "ADM", "VIM"]
    results_records: List[Dict[str, Any]] = []

    os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)

    print(f"Executing Full Semi-Analytical Benchmark Matrix...")
    print(f"Problems: {len(selected_problems)}, Methods: {len(methods)}, Orders: {orders}")

    for pid in selected_problems:
        prob = load_problem(pid)
        ref = compute_reference_solution(prob)

        for method in methods:
            prev_rmse = None
            for order in orders:
                try:
                    hbar_val = -1.0
                    # For stiff relaxation, optimal hbar from hbar-curve is around -0.05
                    if pid == "stiff_relaxation" and method == "HAM":
                        hbar_val = -0.05

                    if method == "HAM":
                        res = solve_ham(prob, order=order, hbar=hbar_val)
                    elif method == "HPM":
                        res = solve_hpm(prob, order=order)
                    elif method == "ADM":
                        res = solve_adm(prob, order=order)
                    elif method == "VIM":
                        res = solve_vim(prob, order=order)

                    m = compute_metrics(
                        problem=prob,
                        method_name=method,
                        u_approx=res.u_approx,
                        t_eval=res.t_eval,
                        u_ref=ref.u_ref,
                        order=order,
                        wall_time_sec=res.wall_time_sec,
                        hbar=hbar_val if method == "HAM" else None,
                        prev_rmse=prev_rmse,
                    )
                    prev_rmse = m.rmse if m.converged else None

                    rec = m.to_dict()
                    rec["problem_name"] = prob.name
                    rec["category"] = prob.category
                    rec["has_exact"] = prob.has_exact_solution
                    results_records.append(rec)
                    print(f"  [{prob.id:20s}] {method:4s} Ord={order} -> RMSE={m.rmse:.2e}, Time={m.wall_time_sec*1000:.1f}ms")
                except Exception as ex:
                    print(f"  [ERROR] {prob.id} {method} order {order}: {ex}")
                    results_records.append({
                        "method": method,
                        "problem_id": prob.id,
                        "problem_name": prob.name,
                        "category": prob.category,
                        "order": order,
                        "hbar": -1.0 if method == "HAM" else None,
                        "e_inf": float("nan"),
                        "rmse": float("nan"),
                        "residual_max": float("nan"),
                        "ic_error": float("nan"),
                        "reduction_rate": None,
                        "wall_time_sec": 0.0,
                        "converged": False,
                        "failure_reason": str(ex),
                        "has_exact": prob.has_exact_solution,
                    })

    # Save to CSV
    if results_records:
        fieldnames = list(results_records[0].keys())
        with open(output_csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in results_records:
                writer.writerow(r)
        print(f"Benchmark results successfully exported to {output_csv_path}")

    return results_records
