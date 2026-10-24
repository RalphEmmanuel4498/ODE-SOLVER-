"""
Interactive Example & Tutorial Script
====================================

Demonstrates the standard workflow:
1. Load a benchmark problem
2. Run HAM, HPM, ADM, VIM up to order 4
3. Compare against DOP853 numerical reference
4. Generate publication-quality figures
5. Perform HAM h-bar curve analysis
6. Query the autonomy capability engine
"""

import os
import sys

# Ensure repository root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import numpy as np
from semi_analytical_benchmark.problems import load_problem
from semi_analytical_benchmark.adm import solve_adm, compute_adomian_polynomials
from semi_analytical_benchmark.hpm import solve_hpm
from semi_analytical_benchmark.ham import solve_ham, compute_hbar_curve
from semi_analytical_benchmark.vim import solve_vim
from semi_analytical_benchmark.numerical_solvers import compute_reference_solution
from semi_analytical_benchmark.metrics import compute_metrics
from semi_analytical_benchmark.visualization import plot_solution_comparison, plot_hbar_curve
from semi_analytical_benchmark.autonomy import query_autonomy


def main():
    print("=" * 70)
    print("Semi-Analytical Benchmark Framework: Tutorial & Verification")
    print("=" * 70)

    # 1. Load Riccati IVP
    problem = load_problem("riccati_ivp")
    print(f"\n[Problem]: {problem.name}")
    print(f"Equation:  {problem.equation_latex}")
    print(f"Domain:    t in [{problem.t_span[0]}, {problem.t_span[1]}]")

    # 2. Reference Solution (Exact: tanh(t))
    ref = compute_reference_solution(problem)
    print(f"Reference: {ref.solver_name}")

    # 3. Solve using each method at Order 4
    order = 4
    print(f"\n--- Solving at Order {order} ---")
    solutions = {}

    # ADM
    res_adm = solve_adm(problem, order=order)
    m_adm = compute_metrics(problem, "ADM", res_adm.u_approx, res_adm.t_eval, ref.u_ref, order, res_adm.wall_time_sec)
    solutions["ADM"] = res_adm.u_approx
    print(f"ADM: RMSE = {m_adm.rmse:.3e}, Time = {m_adm.wall_time_sec*1000:.1f}ms")

    # HPM
    res_hpm = solve_hpm(problem, order=order)
    m_hpm = compute_metrics(problem, "HPM", res_hpm.u_approx, res_hpm.t_eval, ref.u_ref, order, res_hpm.wall_time_sec)
    solutions["HPM"] = res_hpm.u_approx
    print(f"HPM: RMSE = {m_hpm.rmse:.3e}, Time = {m_hpm.wall_time_sec*1000:.1f}ms")

    # HAM with hbar = -1.0
    res_ham = solve_ham(problem, order=order, hbar=-1.0)
    m_ham = compute_metrics(problem, "HAM", res_ham.u_approx, res_ham.t_eval, ref.u_ref, order, res_ham.wall_time_sec, hbar=-1.0)
    solutions["HAM"] = res_ham.u_approx
    print(f"HAM: RMSE = {m_ham.rmse:.3e}, Time = {m_ham.wall_time_sec*1000:.1f}ms")

    # VIM
    res_vim = solve_vim(problem, order=order)
    m_vim = compute_metrics(problem, "VIM", res_vim.u_approx, res_vim.t_eval, ref.u_ref, order, res_vim.wall_time_sec)
    solutions["VIM"] = res_vim.u_approx
    print(f"VIM: RMSE = {m_vim.rmse:.3e}, Time = {m_vim.wall_time_sec*1000:.1f}ms")

    # 4. Generate comparison figure
    os.makedirs("results/figures", exist_ok=True)
    fig_path = plot_solution_comparison(
        problem_name=problem.name,
        t_eval=ref.t_eval,
        u_ref=ref.u_ref,
        method_solutions=solutions,
        save_path="results/figures/tutorial_riccati_comparison.png",
    )
    print(f"\n[Figure Generated]: {fig_path}")

    # 5. HAM h-bar curve analysis
    print("\n--- HAM h-bar Curve Analysis ---")
    hbar_data = compute_hbar_curve(problem, order=4, hbar_range=(-2.0, 0.0), num_points=35)
    print(f"Identified Optimal h-bar*: {hbar_data['optimal_hbar']:.3f}")
    print(f"Flat Convergence Region:   [{hbar_data['flat_region'][0]:.3f}, {hbar_data['flat_region'][1]:.3f}]")

    hbar_fig = plot_hbar_curve(hbar_data, problem.name, save_path="results/figures/tutorial_hbar_curve.png")
    print(f"[Figure Generated]: {hbar_fig}")

    # 6. Query Autonomy Engine
    print("\n--- Autonomy System Query ---")
    auto_ans = query_autonomy("What can this app do?")
    print(f"Topic: {auto_ans['headline']}")
    print(f"Summary: {auto_ans['summary'][:150]}...")
    print("\nTutorial completed successfully!")


if __name__ == "__main__":
    main()
