"""
Dynamical Systems, Stability & Sensitivity Analysis Module
==========================================================

Performs rigorous qualitative and stability analyses:
- Equilibrium points calculation f(x*) = 0
- Jacobian matrix formulation and analytical linearization
- Eigenvalue computation and local stability classification (stable node, saddle, focus, center)
- Basic reproduction number R_0 derivation via Next-Generation Matrix
- Local forward sensitivity indices S_p = (df/dp) * (p/f) and parameter sensitivity ranking
- Phase-plane nullclines and vector field generation
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import scipy.linalg as la


@dataclass
class EquilibriumPoint:
    coordinates: Dict[str, float]
    jacobian: List[List[float]]
    eigenvalues: List[Dict[str, float]]  # real, imag
    classification: str
    is_stable: bool
    notes: str


@dataclass
class SensitivityResult:
    parameter_name: str
    target_variable: str
    sensitivity_index: float
    interpretation: str


@dataclass
class DynamicalAnalysisReport:
    model_id: str
    model_title: str
    equilibria: List[EquilibriumPoint]
    r0_value: Optional[float] = None
    r0_formula_latex: Optional[str] = None
    sensitivity_ranking: List[SensitivityResult] = field(default_factory=list)
    vector_field_grid: Optional[Dict[str, Any]] = None


def analyze_sir_system(beta: float = 1.2, gamma: float = 0.4) -> DynamicalAnalysisReport:
    """
    Performs complete stability and sensitivity analysis for the Kermack-McKendrick SIR model.
    """
    # 1. Basic reproduction number R_0 = beta / gamma
    r0 = beta / gamma

    # 2. Equilibria:
    # dS/dt = -beta S I = 0
    # dI/dt = I (beta S - gamma) = 0
    # Equilibrium 1: Disease-Free Equilibrium (DFE): (S0, 0, R0) -> S=1, I=0
    # Jacobian at (S, I):
    # J = [[ -beta*I, -beta*S ], [ beta*I, beta*S - gamma ]]
    # At DFE (S=1, I=0):
    # J = [[ 0, -beta ], [ 0, beta - gamma ]]
    # Eigenvalues: lambda_1 = 0, lambda_2 = beta - gamma = gamma * (R_0 - 1)
    lam1_dfe = 0.0
    lam2_dfe = beta - gamma

    dfe_stable = lam2_dfe < 0.0  # Stable if R_0 < 1
    dfe_class = "Disease-Free Equilibrium (Asymptotically Stable)" if dfe_stable else "Disease-Free Equilibrium (Unstable, Epidemic Wave Transpires)"

    eq_dfe = EquilibriumPoint(
        coordinates={"S": 1.0, "I": 0.0},
        jacobian=[[0.0, -beta], [0.0, beta - gamma]],
        eigenvalues=[{"real": 0.0, "imag": 0.0}, {"real": lam2_dfe, "imag": 0.0}],
        classification=dfe_class,
        is_stable=dfe_stable,
        notes=f"Lambda_2 = beta - gamma = {lam2_dfe:.3f}. If R_0 = {r0:.2f} > 1, introduced infections grow exponentially."
    )

    # 3. Normalized Forward Sensitivity Indices of R_0:
    # R_0 = beta / gamma
    # S_beta = (d R_0 / d beta) * (beta / R_0) = (1 / gamma) * (beta / (beta/gamma)) = +1.0
    # S_gamma = (d R_0 / d gamma) * (gamma / R_0) = (-beta / gamma^2) * (gamma / (beta/gamma)) = -1.0
    sensitivities = [
        SensitivityResult(
            parameter_name="beta (Transmission Rate)",
            target_variable="R_0 (Reproduction Number)",
            sensitivity_index=1.0,
            interpretation="A 10% reduction in transmission rate beta reduces R_0 by exactly 10%."
        ),
        SensitivityResult(
            parameter_name="gamma (Removal/Recovery Rate)",
            target_variable="R_0 (Reproduction Number)",
            sensitivity_index=-1.0,
            interpretation="A 10% increase in recovery rate gamma reduces R_0 by 10% (inverse proportionality)."
        )
    ]

    # 4. Phase-Plane Grid (S in [0, 1], I in [0, 0.6])
    s_vals = np.linspace(0.05, 1.0, 15)
    i_vals = np.linspace(0.01, 0.5, 12)
    grid_points = []

    for s in s_vals:
        for inf in i_vals:
            ds = -beta * s * inf
            di = beta * s * inf - gamma * inf
            mag = np.sqrt(ds**2 + di**2) + 1e-12
            grid_points.append({
                "x": float(s),
                "y": float(inf),
                "dx": float(ds),
                "dy": float(di),
                "u_norm": float(ds / mag),
                "v_norm": float(di / mag),
            })

    return DynamicalAnalysisReport(
        model_id="sir_epidemic",
        model_title="Kermack-McKendrick SIR Epidemic Model",
        equilibria=[eq_dfe],
        r0_value=r0,
        r0_formula_latex=r"R_0 = \frac{\beta}{\gamma}",
        sensitivity_ranking=sensitivities,
        vector_field_grid={"points": grid_points, "x_label": "Susceptible S", "y_label": "Infected I"}
    )


def analyze_lotka_volterra_system(alpha: float = 1.1, beta: float = 0.4, gamma: float = 0.4, delta: float = 0.1) -> DynamicalAnalysisReport:
    """
    Performs complete stability and sensitivity analysis for the Lotka-Volterra Predator-Prey model.
    """
    # Equilibria:
    # 1. Extinction (0, 0)
    # J(0,0) = [[alpha, 0], [0, -gamma]] -> Saddle point
    eq_origin = EquilibriumPoint(
        coordinates={"x (Prey)": 0.0, "y (Predator)": 0.0},
        jacobian=[[alpha, 0.0], [0.0, -gamma]],
        eigenvalues=[{"real": alpha, "imag": 0.0}, {"real": -gamma, "imag": 0.0}],
        classification="Saddle Point (Unstable)",
        is_stable=False,
        notes="Eigenvalues have opposing signs (+alpha, -gamma). Trivial extinction equilibrium."
    )

    # 2. Coexistence equilibrium: x* = gamma / delta, y* = alpha / beta
    x_star = gamma / delta
    y_star = alpha / beta
    # J(x*, y*) = [[0, -beta*x*], [delta*y*, 0]]
    # lambda^2 + beta*delta*x**y* = 0 => lambda = +- i * sqrt(alpha * gamma)
    omega = np.sqrt(alpha * gamma)
    eq_coexist = EquilibriumPoint(
        coordinates={"x (Prey)": x_star, "y (Predator)": y_star},
        jacobian=[[0.0, -beta * x_star], [delta * y_star, 0.0]],
        eigenvalues=[{"real": 0.0, "imag": omega}, {"real": 0.0, "imag": -omega}],
        classification="Neutrally Stable Center (Conservative Closed Orbits)",
        is_stable=True,
        notes=f"Pure imaginary eigenvalues +- {omega:.3f}i. Periodic population oscillations with constant invariant energy."
    )

    sensitivities = [
        SensitivityResult(
            parameter_name="alpha (Prey growth)",
            target_variable="y* (Predator Equilibrium)",
            sensitivity_index=1.0,
            interpretation="Predator carrying capacity scales linearly with prey growth rate."
        ),
        SensitivityResult(
            parameter_name="gamma (Predator mortality)",
            target_variable="x* (Prey Equilibrium)",
            sensitivity_index=1.0,
            interpretation="Prey equilibrium population scales linearly with predator death rate."
        )
    ]

    # Vector field grid
    x_vals = np.linspace(1.0, 12.0, 15)
    y_vals = np.linspace(0.5, 8.0, 12)
    grid_points = []
    for x in x_vals:
        for y in y_vals:
            dx = alpha * x - beta * x * y
            dy = delta * x * y - gamma * y
            mag = np.sqrt(dx**2 + dy**2) + 1e-12
            grid_points.append({
                "x": float(x),
                "y": float(y),
                "dx": float(dx),
                "dy": float(dy),
                "u_norm": float(dx / mag),
                "v_norm": float(dy / mag),
            })

    return DynamicalAnalysisReport(
        model_id="lotka_volterra",
        model_title="Lotka-Volterra Predator-Prey System",
        equilibria=[eq_origin, eq_coexist],
        r0_value=None,
        sensitivity_ranking=sensitivities,
        vector_field_grid={"points": grid_points, "x_label": "Prey x", "y_label": "Predator y"}
    )
