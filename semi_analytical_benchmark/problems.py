"""
Benchmark Problems Suite for Semi-Analytical Differential Equation Solvers
==========================================================================

Defines 8 canonical nonlinear differential equations spanning diverse mathematical classes:
1. Riccati IVP: 1st-order nonlinear ODE with exact analytical solution u(t) = tanh(t).
2. Lane-Emden Equation: 2nd-order nonlinear ODE with singularity at origin and exact solution.
3. Duffing Oscillator: 2nd-order nonlinear cubic oscillator.
4. Coupled Nonlinear System: Symmetric 2-variable ODE with exact analytical solution.
5. Logistic Population Growth: Sigmoidal saturation dynamics with exact solution.
6. Epidemiological SIR: 3-compartment conservation system (S + I + R = 1).
7. Rapid Transition Front: Steep gradient problem challenging standard perturbation radii.
8. Stiff Relaxation ODE: Stiff exponential boundary layer with exact analytical solution.
"""

from dataclasses import dataclass, field
from typing import Callable, Optional, Dict, Any, List, Tuple
import numpy as np


@dataclass
class BenchmarkProblem:
    id: str
    name: str
    category: str
    equation_latex: str
    description: str
    order: int
    t_span: Tuple[float, float]
    initial_conditions: List[float]
    parameters: Dict[str, float] = field(default_factory=dict)
    has_exact_solution: bool = True
    exact_solution_latex: str = ""
    stiff: bool = False
    notes: str = ""

    # Mathematical callbacks
    f_rhs: Optional[Callable[[float, np.ndarray], np.ndarray]] = None
    exact_fn: Optional[Callable[[np.ndarray], np.ndarray]] = None
    residual_fn: Optional[Callable[[Callable[[float], float], float], float]] = None


# ---------------------------------------------------------------------------
# Problem 1: Nonlinear First-Order Riccati IVP
# u'(t) + u(t)^2 = 1, u(0) = 0 => u(t) = tanh(t)
# ---------------------------------------------------------------------------
def _riccati_rhs(t: float, y: np.ndarray) -> np.ndarray:
    return np.array([1.0 - y[0] ** 2])

def _riccati_exact(t: np.ndarray) -> np.ndarray:
    return np.tanh(t)

def _riccati_residual(u_fn: Callable[[float], float], u_prime_fn: Callable[[float], float], t: float) -> float:
    u_val = u_fn(t)
    return float(u_prime_fn(t) + u_val**2 - 1.0)

problem_riccati = BenchmarkProblem(
    id="riccati_ivp",
    name="Riccati First-Order IVP",
    category="1st-Order Nonlinear IVP",
    equation_latex=r"u'(t) + u(t)^2 = 1, \quad u(0) = 0",
    description="Quadratic nonlinear first-order initial-value problem with closed-form tanh(t) solution.",
    order=1,
    t_span=(0.0, 1.0),
    initial_conditions=[0.0],
    parameters={"alpha": 1.0},
    has_exact_solution=True,
    exact_solution_latex=r"u(t) = \tanh(t)",
    stiff=False,
    notes="Ideal baseline for order-by-order Taylor and Adomian polynomial convergence analysis.",
    f_rhs=_riccati_rhs,
    exact_fn=_riccati_exact,
)


# ---------------------------------------------------------------------------
# Problem 2: Lane-Emden Astrophysical Polytrope (Index n=5)
# u''(t) + (2/t)u'(t) + u(t)^5 = 0, u(0)=1, u'(0)=0
# Exact solution: u(t) = (1 + t^2 / 3)^(-1/2)
# ---------------------------------------------------------------------------
def _lane_emden_rhs(t: float, y: np.ndarray) -> np.ndarray:
    u, v = y[0], y[1]
    # Handle singularity at t -> 0 using L'Hopital: 2/t * v -> 2 u'' => 3 u'' = -u^5 => u'' = -1/3
    if abs(t) < 1e-12:
        dv = - (u ** 5) / 3.0
    else:
        dv = - (2.0 / t) * v - (u ** 5)
    return np.array([v, dv])

def _lane_emden_exact(t: np.ndarray) -> np.ndarray:
    return 1.0 / np.sqrt(1.0 + (t ** 2) / 3.0)

problem_lane_emden = BenchmarkProblem(
    id="lane_emden",
    name="Lane-Emden Equation (Polytrope n=5)",
    category="2nd-Order Singular ODE",
    equation_latex=r"u''(t) + \frac{2}{t}u'(t) + u(t)^5 = 0, \quad u(0) = 1, \; u'(0) = 0",
    description="Second-order nonlinear ODE with regular singular point at t=0 modeling stellar hydrostatic equilibrium.",
    order=2,
    t_span=(0.0, 1.2),
    initial_conditions=[1.0, 0.0],
    parameters={"polytrope_n": 5.0},
    has_exact_solution=True,
    exact_solution_latex=r"u(t) = \frac{1}{\sqrt{1 + t^2/3}}",
    stiff=False,
    notes="Tests operator decomposition in the presence of coordinate singularities.",
    f_rhs=_lane_emden_rhs,
    exact_fn=_lane_emden_exact,
)


# ---------------------------------------------------------------------------
# Problem 3: Duffing Nonlinear Oscillator
# u''(t) + u(t) + alpha * u(t)^3 = 0, u(0)=A, u'(0)=0
# ---------------------------------------------------------------------------
def _duffing_rhs(t: float, y: np.ndarray, alpha: float = 0.5) -> np.ndarray:
    u, v = y[0], y[1]
    return np.array([v, -u - alpha * (u ** 3)])

problem_duffing = BenchmarkProblem(
    id="duffing_oscillator",
    name="Duffing Nonlinear Oscillator",
    category="Nonlinear Oscillator",
    equation_latex=r"u''(t) + u(t) + \alpha u(t)^3 = 0, \quad u(0) = A, \; u'(0) = 0",
    description="Conservative nonlinear oscillator with cubic stiffness and amplitude-dependent frequency shift.",
    order=2,
    t_span=(0.0, 2.5),
    initial_conditions=[1.0, 0.0],
    parameters={"alpha": 0.5, "A": 1.0},
    has_exact_solution=False,  # Reference computed via ultra-accurate DOP853 (tol 1e-13)
    exact_solution_latex=r"\text{Jacobi elliptic function } \text{cn}(\omega t, m)",
    stiff=False,
    notes="Reveals secular term accumulation in uncorrected perturbation series vs HAM/VIM.",
    f_rhs=lambda t, y: _duffing_rhs(t, y, alpha=0.5),
)


# ---------------------------------------------------------------------------
# Problem 4: Coupled Nonlinear System
# u' = -u + v^2, v' = -v + u^2, u(0)=0.5, v(0)=0.5
# Exact solution by symmetry u(t) = v(t) = 1 / (1 + e^t)
# ---------------------------------------------------------------------------
def _coupled_rhs(t: float, y: np.ndarray) -> np.ndarray:
    u, v = y[0], y[1]
    return np.array([-u + v**2, -v + u**2])

def _coupled_exact(t: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(t))

problem_coupled = BenchmarkProblem(
    id="coupled_system",
    name="Coupled Nonlinear System",
    category="Coupled Nonlinear ODE System",
    equation_latex=r"\begin{cases} u'(t) = -u(t) + v(t)^2, & u(0) = 0.5 \\ v'(t) = -v(t) + u(t)^2, & v(0) = 0.5 \end{cases}",
    description="Coupled quadratic differential system exhibiting invariant symmetric manifold u(t)=v(t).",
    order=1,
    t_span=(0.0, 1.5),
    initial_conditions=[0.5, 0.5],
    parameters={},
    has_exact_solution=True,
    exact_solution_latex=r"u(t) = v(t) = \frac{1}{1 + e^t}",
    stiff=False,
    notes="Enables multi-variable decomposition validation with independent exact ground truth.",
    f_rhs=_coupled_rhs,
    exact_fn=_coupled_exact,
)


# ---------------------------------------------------------------------------
# Problem 5: Logistic Population Dynamics
# u'(t) = r * u(t) * (1 - u(t) / K), u(0) = u0
# Exact: u(t) = K * u0 * exp(rt) / [K + u0 * (exp(rt) - 1)]
# ---------------------------------------------------------------------------
def _logistic_rhs(t: float, y: np.ndarray, r: float = 1.5, K: float = 2.0) -> np.ndarray:
    u = y[0]
    return np.array([r * u * (1.0 - u / K)])

def _logistic_exact(t: np.ndarray, r: float = 1.5, K: float = 2.0, u0: float = 0.5) -> np.ndarray:
    ert = np.exp(r * t)
    return (K * u0 * ert) / (K + u0 * (ert - 1.0))

problem_logistic = BenchmarkProblem(
    id="logistic_population",
    name="Logistic Population Dynamics",
    category="Population Dynamics",
    equation_latex=r"u'(t) = r\,u(t)\left(1 - \frac{u(t)}{K}\right), \quad u(0) = u_0",
    description="Verhulst sigmoidal population saturation model with environmental carrying capacity K.",
    order=1,
    t_span=(0.0, 2.0),
    initial_conditions=[0.5],
    parameters={"r": 1.5, "K": 2.0, "u0": 0.5},
    has_exact_solution=True,
    exact_solution_latex=r"u(t) = \frac{K u_0 e^{rt}}{K + u_0 (e^{rt} - 1)}",
    stiff=False,
    notes="Demonstrates performance near the carrying-capacity inflection zone.",
    f_rhs=lambda t, y: _logistic_rhs(t, y, r=1.5, K=2.0),
    exact_fn=lambda t: _logistic_exact(t, r=1.5, K=2.0, u0=0.5),
)


# ---------------------------------------------------------------------------
# Problem 6: Epidemiological SIR Model
# S' = -beta*S*I, I' = beta*S*I - gamma*I, R' = gamma*I
# Conservation: S(t) + I(t) + R(t) = 1
# ---------------------------------------------------------------------------
def _sir_rhs(t: float, y: np.ndarray, beta: float = 1.2, gamma: float = 0.4) -> np.ndarray:
    S, I, R = y[0], y[1], y[2]
    return np.array([
        -beta * S * I,
        beta * S * I - gamma * I,
        gamma * I
    ])

problem_sir = BenchmarkProblem(
    id="epidemiological_sir",
    name="Kermack-McKendrick SIR Model",
    category="Epidemiological System",
    equation_latex=r"\begin{cases} S' = -\beta S I, & S(0) = 0.99 \\ I' = \beta S I - \gamma I, & I(0) = 0.01 \\ R' = \gamma I, & R(0) = 0.00 \end{cases}",
    description="Three-compartment epidemic transmission model with reproduction number R_0 = beta / gamma.",
    order=1,
    t_span=(0.0, 2.5),
    initial_conditions=[0.99, 0.01, 0.0],
    parameters={"beta": 1.2, "gamma": 0.4, "R0": 3.0},
    has_exact_solution=False,
    exact_solution_latex=r"\text{High-order explicit DOP853 numerical reference}",
    stiff=False,
    notes="Evaluates conservation law preservation S_n(t) + I_n(t) + R_n(t) = 1 across approximation orders.",
    f_rhs=lambda t, y: _sir_rhs(t, y, beta=1.2, gamma=0.4),
)


# ---------------------------------------------------------------------------
# Problem 7: Rapid Transition Front
# u'(t) = k * u(t)^2 * (1 - u(t)), u(0) = 0.1
# ---------------------------------------------------------------------------
def _rapid_transition_rhs(t: float, y: np.ndarray, k: float = 4.0) -> np.ndarray:
    u = y[0]
    return np.array([k * (u ** 2) * (1.0 - u)])

problem_rapid_transition = BenchmarkProblem(
    id="rapid_transition",
    name="Rapid Transition Front",
    category="Steep Gradient Front",
    equation_latex=r"u'(t) = k\,u(t)^2 (1 - u(t)), \quad u(0) = 0.1",
    description="Combustion wave / autocatalytic reaction front with cubic nonlinearity and steep acceleration.",
    order=1,
    t_span=(0.0, 2.5),
    initial_conditions=[0.1],
    parameters={"k": 4.0},
    has_exact_solution=False,
    exact_solution_latex=r"\text{Implicit algebraic equation } -\frac{1}{u} + \ln\left(\frac{u}{1-u}\right) = kt + C",
    stiff=False,
    notes="Probes divergence beyond local radius of convergence for polynomial series approximations.",
    f_rhs=lambda t, y: _rapid_transition_rhs(t, y, k=4.0),
)


# ---------------------------------------------------------------------------
# Problem 8: Stiff Boundary Layer ODE
# u'(t) = -lambda * (u(t) - t^2) + 2t, u(0) = 1.0
# Exact solution: u(t) = t^2 + exp(-lambda * t)
# ---------------------------------------------------------------------------
def _stiff_rhs(t: float, y: np.ndarray, lam: float = 50.0) -> np.ndarray:
    u = y[0]
    return np.array([-lam * (u - t**2) + 2.0 * t])

def _stiff_exact(t: np.ndarray, lam: float = 50.0) -> np.ndarray:
    return t**2 + np.exp(-lam * t)

problem_stiff = BenchmarkProblem(
    id="stiff_relaxation",
    name="Stiff Boundary Layer ODE",
    category="Stiff Differential Equation",
    equation_latex=r"u'(t) = -\lambda (u(t) - t^2) + 2t, \quad u(0) = 1.0, \; \lambda = 50",
    description="Stiff singular-perturbation initial-value problem with rapid boundary layer at t=0 and algebraic manifold.",
    order=1,
    t_span=(0.0, 1.0),
    initial_conditions=[1.0],
    parameters={"lambda": 50.0},
    has_exact_solution=True,
    exact_solution_latex=r"u(t) = t^2 + e^{-\lambda t}",
    stiff=True,
    notes="Highlights catastrophic truncation breakdown of standard Taylor expansions on stiff scales without h-bar control.",
    f_rhs=lambda t, y: _stiff_rhs(t, y, lam=50.0),
    exact_fn=lambda t: _stiff_exact(t, lam=50.0),
)


BENCHMARK_REGISTRY: Dict[str, BenchmarkProblem] = {
    problem_riccati.id: problem_riccati,
    problem_lane_emden.id: problem_lane_emden,
    problem_duffing.id: problem_duffing,
    problem_coupled.id: problem_coupled,
    problem_logistic.id: problem_logistic,
    problem_sir.id: problem_sir,
    problem_rapid_transition.id: problem_rapid_transition,
    problem_stiff.id: problem_stiff,
}


def load_problem(problem_id: str) -> BenchmarkProblem:
    """Retrieve benchmark problem instance by ID with validation."""
    if problem_id not in BENCHMARK_REGISTRY:
        valid_ids = list(BENCHMARK_REGISTRY.keys())
        raise ValueError(f"Unknown problem '{problem_id}'. Available problems: {valid_ids}")
    return BENCHMARK_REGISTRY[problem_id]


def list_problems() -> List[BenchmarkProblem]:
    """Return all 8 benchmark problems in canonical order."""
    return list(BENCHMARK_REGISTRY.values())
