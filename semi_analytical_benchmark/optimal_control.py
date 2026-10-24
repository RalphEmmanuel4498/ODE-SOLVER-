"""
Optimal Control & Optimization Module
=====================================

Implements Pontryagin's Maximum Principle and numerical optimal control:
- Hamiltonian construction: H(x, u, lambda, t) = L(x, u, t) + lambda^T * f(x, u, t)
- Adjoint costate differential equations: d(lambda)/dt = - dH/dx
- Transversality boundary conditions: lambda(T) = d(Phi)/dx
- Control bounds enforcement: u(t) in [u_min, u_max]
- Forward-Backward Sweep Method (FBSM) with convex relaxation
- Controlled vs uncontrolled trajectory evaluation and objective cost J(u) computation
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Tuple, Callable, Optional
import numpy as np
from scipy.integrate import solve_ivp


@dataclass
class OptimalControlResult:
    problem_title: str
    t_eval: np.ndarray
    state_names: List[str]
    controlled_states: Dict[str, np.ndarray]
    uncontrolled_states: Dict[str, np.ndarray]
    optimal_control: np.ndarray
    costates: Dict[str, np.ndarray]
    hamiltonian_latex: str
    adjoint_equations_latex: List[str]
    optimality_condition_latex: str
    cost_controlled: float
    cost_uncontrolled: float
    cost_reduction_percent: float
    iterations: int
    converged: bool
    status_message: str


def solve_optimal_control_sir(
    beta: float = 1.4,
    gamma: float = 0.4,
    B: float = 2.0,
    u_max: float = 0.8,
    T: float = 20.0,
    num_points: int = 151,
    max_iter: int = 50,
    tol: float = 1e-4,
    omega: float = 0.5,
) -> OptimalControlResult:
    """
    Solves optimal vaccination control for SIR epidemic model:
      dS/dt = -beta*S*I - u*S
      dI/dt = beta*S*I - gamma*I
      dR/dt = gamma*I + u*S
    
    Objective Functional:
      min_u J(u) = int_0^T [ A1 * I(t) + (B/2) * u(t)^2 ] dt
    
    Hamiltonian:
      H = I + (B/2)*u^2 + lambda_1*(-beta*S*I - u*S) + lambda_2*(beta*S*I - gamma*I) + lambda_3*(gamma*I + u*S)
    
    Adjoint Equations:
      d(lambda_1)/dt = (lambda_1 - lambda_2)*beta*I + (lambda_1 - lambda_3)*u
      d(lambda_2)/dt = -1 + (lambda_1 - lambda_2)*beta*S + (lambda_2 - lambda_3)*gamma
      d(lambda_3)/dt = 0  => lambda_3(t) = 0
    
    Optimality Condition:
      dH/du = B*u - (lambda_1 - lambda_3)*S = 0 => u* = min(max(0, (lambda_1 - lambda_3)*S / B), u_max)
    """
    t_span = (0.0, T)
    t_eval = np.linspace(0.0, T, num_points)
    dt = t_eval[1] - t_eval[0]

    # Initial states
    S0, I0, R0 = 0.95, 0.05, 0.0
    y0 = np.array([S0, I0, R0])

    # 1. Uncontrolled Benchmark Run (u(t) = 0)
    def sir_uncontrolled(t, y):
        S, I, R = y
        return [-beta * S * I, beta * S * I - gamma * I, gamma * I]

    sol_uncontrolled = solve_ivp(sir_uncontrolled, t_span, y0, t_eval=t_eval, method="DOP853", rtol=1e-10, atol=1e-10)
    S_unctrl = sol_uncontrolled.y[0]
    I_unctrl = sol_uncontrolled.y[1]
    R_unctrl = sol_uncontrolled.y[2]
    # Cost uncontrolled: int I(t) dt
    cost_uncontrolled = float(np.trapz(I_unctrl, t_eval))

    # 2. Forward-Backward Sweep Iterations
    u = np.zeros(num_points)  # Initial control guess
    S = np.copy(S_unctrl)
    I = np.copy(I_unctrl)
    R = np.copy(R_unctrl)

    converged = False
    iterations = 0

    for it in range(max_iter):
        iterations = it + 1
        u_old = np.copy(u)

        # Forward solve state ODE with current u
        for i in range(num_points - 1):
            h = dt
            ti = t_eval[i]
            ui = u[i]
            # RK4 step for state
            def f_state(s_arr, u_val):
                s, inf, r = s_arr
                return np.array([-beta * s * inf - u_val * s, beta * s * inf - gamma * inf, gamma * inf + u_val * s])

            k1 = f_state(np.array([S[i], I[i], R[i]]), ui)
            k2 = f_state(np.array([S[i], I[i], R[i]]) + 0.5 * h * k1, 0.5 * (u[i] + u[i+1]))
            k3 = f_state(np.array([S[i], I[i], R[i]]) + 0.5 * h * k2, 0.5 * (u[i] + u[i+1]))
            k4 = f_state(np.array([S[i], I[i], R[i]]) + h * k3, u[i+1])
            y_next = np.array([S[i], I[i], R[i]]) + (h / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)
            S[i+1], I[i+1], R[i+1] = y_next

        # Backward solve adjoint equations (transversality lambda_1(T) = lambda_2(T) = lambda_3(T) = 0)
        lam1 = np.zeros(num_points)
        lam2 = np.zeros(num_points)
        lam3 = np.zeros(num_points)

        for i in range(num_points - 1, 0, -1):
            h = -dt
            # Adjoint ODEs:
            # d(lam1)/dt = (lam1 - lam2)*beta*I + (lam1 - lam3)*u
            # d(lam2)/dt = -1 + (lam1 - lam2)*beta*S + (lam2 - lam3)*gamma
            def f_adj(lam_arr, s_val, inf_val, u_val):
                l1, l2 = lam_arr[0], lam_arr[1]
                dl1 = (l1 - l2) * beta * inf_val + l1 * u_val
                dl2 = -1.0 + (l1 - l2) * beta * s_val + l2 * gamma
                return np.array([dl1, dl2])

            curr_lam = np.array([lam1[i], lam2[i]])
            ak1 = f_adj(curr_lam, S[i], I[i], u[i])
            ak2 = f_adj(curr_lam + 0.5 * h * ak1, 0.5 * (S[i] + S[i-1]), 0.5 * (I[i] + I[i-1]), 0.5 * (u[i] + u[i-1]))
            ak3 = f_adj(curr_lam + 0.5 * h * ak2, 0.5 * (S[i] + S[i-1]), 0.5 * (I[i] + I[i-1]), 0.5 * (u[i] + u[i-1]))
            ak4 = f_adj(curr_lam + h * ak3, S[i-1], I[i-1], u[i-1])
            lam_prev = curr_lam + (h / 6.0) * (ak1 + 2 * ak2 + 2 * ak3 + ak4)
            lam1[i-1], lam2[i-1] = lam_prev[0], lam_prev[1]

        # Optimality condition: u* = (lambda_1 - lambda_3)*S / B = lam1 * S / B
        u_star = (lam1 * S) / B
        u_star = np.clip(u_star, 0.0, u_max)

        # Convex relaxation update: u_new = omega * u_star + (1 - omega) * u_old
        u = omega * u_star + (1.0 - omega) * u_old

        # Check convergence
        rel_diff = np.sum(np.abs(u - u_old)) / (np.sum(np.abs(u)) + 1e-10)
        if rel_diff < tol:
            converged = True
            break

    # 3. Compute Controlled Cost: int [ I + (B/2)*u^2 ] dt
    cost_controlled = float(np.trapz(I + 0.5 * B * (u ** 2), t_eval))
    reduction_pct = float(max(0.0, (cost_uncontrolled - cost_controlled) / cost_uncontrolled * 100.0))

    return OptimalControlResult(
        problem_title="Epidemic Vaccination Optimal Control (SIR)",
        t_eval=t_eval,
        state_names=["Susceptible S(t)", "Infected I(t)", "Recovered R(t)"],
        controlled_states={"S": S, "I": I, "R": R},
        uncontrolled_states={"S": S_unctrl, "I": I_unctrl, "R": R_unctrl},
        optimal_control=u,
        costates={"lambda_1": lam1, "lambda_2": lam2},
        hamiltonian_latex=r"H = I + \frac{B}{2} u^2 + \lambda_1 (-\beta S I - u S) + \lambda_2 (\beta S I - \gamma I) + \lambda_3 (\gamma I + u S)",
        adjoint_equations_latex=[
            r"\dot{\lambda}_1 = (\lambda_1 - \lambda_2)\beta I + (\lambda_1 - \lambda_3) u",
            r"\dot{\lambda}_2 = -1 + (\lambda_1 - \lambda_2)\beta S + (\lambda_2 - \lambda_3)\gamma",
            r"\dot{\lambda}_3 = 0, \quad \lambda_i(T) = 0"
        ],
        optimality_condition_latex=r"u^*(t) = \min\left( \max\left( 0, \frac{(\lambda_1(t) - \lambda_3(t))S(t)}{B} \right), u_{\max} \right)",
        cost_controlled=cost_controlled,
        cost_uncontrolled=cost_uncontrolled,
        cost_reduction_percent=reduction_pct,
        iterations=iterations,
        converged=converged,
        status_message=f"Forward-Backward Sweep Method converged in {iterations} iterations." if converged else f"Reached maximum iterations ({max_iter})."
    )
