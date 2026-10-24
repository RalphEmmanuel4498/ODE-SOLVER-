"""
Visualization Module
====================

Generates publication-quality figures:
1. Approximations vs Reference Solution
2. Absolute Error Evolution Over Time: log10|u_approx(t) - u_ref(t)|
3. Error vs Approximation Order N: log10(RMSE) vs N
4. HAM hbar-Curve & Horizontal Convergence Plateau
5. Runtime vs Accuracy Pareto Trade-off
6. Cross-Method Performance Radar / Bar Summary
Saves figures in high-resolution PNG and SVG vector formats.
"""

import os
from typing import Dict, Any, List, Optional
import numpy as np

# Configure matplotlib headless backend
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


# Palette adhering to scientific publishing standards (colorblind-safe)
PALETTE = {
    "Exact/Ref": "#0F172A",    # Dark Slate
    "HAM": "#2563EB",          # Blue
    "HPM": "#D97706",          # Amber/Orange
    "ADM": "#059669",          # Emerald Green
    "VIM": "#9333EA",          # Purple
}


def plot_solution_comparison(
    problem_name: str,
    t_eval: np.ndarray,
    u_ref: np.ndarray,
    method_solutions: Dict[str, np.ndarray],
    save_path: str = "results/figures/solution_comparison.png",
) -> str:
    """
    Plot exact/reference solution against HAM, HPM, ADM, VIM approximations.
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 7), sharex=True, gridspec_kw={"height_ratios": [2.5, 1.2]})

    # Top: Solutions
    ax1.plot(t_eval, u_ref, "k-", linewidth=2.0, label="Reference (Exact/DOP853)", zorder=5)

    for method, u_approx in method_solutions.items():
        color = PALETTE.get(method, "#64748B")
        ax1.plot(t_eval, u_approx, linestyle="--", linewidth=1.6, color=color, label=f"{method} Approximation")

    ax1.set_ylabel("Solution $u(t)$", fontsize=11)
    ax1.set_title(f"Semi-Analytical Approximations vs Reference: {problem_name}", fontsize=12, fontweight="bold", pad=10)
    ax1.grid(True, linestyle=":", alpha=0.6)
    ax1.legend(frameon=True, facecolor="white", edgecolor="#E2E8F0", fontsize=9)

    # Bottom: Absolute Errors
    for method, u_approx in method_solutions.items():
        err = np.abs(u_approx - u_ref)
        color = PALETTE.get(method, "#64748B")
        ax2.semilogy(t_eval, np.maximum(err, 1e-16), linestyle="-", linewidth=1.4, color=color, label=f"{method} Error")

    ax2.set_xlabel("Time $t$", fontsize=11)
    ax2.set_ylabel(r"$|u - u_{\mathrm{ref}}|$", fontsize=11)
    ax2.grid(True, linestyle=":", alpha=0.6)

    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    svg_path = save_path.replace(".png", ".svg")
    plt.savefig(svg_path)
    plt.close(fig)
    return save_path


def plot_hbar_curve(
    hbar_data: Dict[str, Any],
    problem_name: str,
    save_path: str = "results/figures/hbar_curve.png",
) -> str:
    """
    Plot HAM hbar-curve showing horizontal plateau where d(u)/d(hbar) vanishes.
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    fig, ax1 = plt.subplots(figsize=(7, 4.5))

    hbars = np.array(hbar_data["hbars"])
    u_vals = np.array(hbar_data["u_values"])
    optimal_hbar = hbar_data.get("optimal_hbar", -1.0)
    flat_region = hbar_data.get("flat_region", (-1.2, -0.6))
    sample_t = hbar_data.get("sample_t", 1.0)

    # Plot u(t_0; hbar)
    ax1.plot(hbars, u_vals, "b.-", linewidth=1.5, markersize=4, label=f"$u(t={sample_t:.2f}; \\hbar)$")
    ax1.axvspan(flat_region[0], flat_region[1], color="lightblue", alpha=0.3, label="Identified Flat Plateau (Valid $\\hbar$)")
    ax1.axvline(optimal_hbar, color="red", linestyle="--", linewidth=1.5, label=f"Optimal $\\hbar^* = {optimal_hbar:.2f}$")

    ax1.set_xlabel(r"Convergence-Control Parameter $\hbar$", fontsize=11)
    ax1.set_ylabel(r"Solution Observable $u(t_0; \hbar)$", fontsize=11)
    ax1.set_title(f"HAM $\\hbar$-Curve Analysis: {problem_name} (Order {hbar_data.get('order', 4)})", fontsize=12, fontweight="bold")
    ax1.grid(True, linestyle=":", alpha=0.6)
    ax1.legend(frameon=True, facecolor="white", edgecolor="#E2E8F0", fontsize=9)

    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    svg_path = save_path.replace(".png", ".svg")
    plt.savefig(svg_path)
    plt.close(fig)
    return save_path


def plot_order_convergence(
    orders: List[int],
    method_rmses: Dict[str, List[float]],
    problem_name: str,
    save_path: str = "results/figures/order_convergence.png",
) -> str:
    """
    Plot log10(RMSE) vs Approximation Order N across methods.
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    fig, ax = plt.subplots(figsize=(7, 4.5))

    for method, rmses in method_rmses.items():
        color = PALETTE.get(method, "#64748B")
        ax.semilogy(orders, np.maximum(rmses, 1e-16), "o-", linewidth=1.8, color=color, label=f"{method}")

    ax.set_xlabel("Truncation Order $M$", fontsize=11)
    ax.set_ylabel("Root Mean Square Error (RMSE)", fontsize=11)
    ax.set_title(f"Convergence Rate vs Order: {problem_name}", fontsize=12, fontweight="bold")
    ax.grid(True, which="both", linestyle=":", alpha=0.6)
    ax.legend(frameon=True, facecolor="white", edgecolor="#E2E8F0", fontsize=9)

    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    svg_path = save_path.replace(".png", ".svg")
    plt.savefig(svg_path)
    plt.close(fig)
    return save_path
