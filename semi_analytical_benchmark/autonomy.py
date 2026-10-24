"""
Autonomy Engine & Capability Oracle
===================================

Provides an autonomous intelligence layer that answers:
- "What can this app do?" (Full structured capability matrix)
- "Which method should I choose for my nonlinear equation?" (Expert recommender)
- "How do I determine and interpret the h-bar curve in HAM?" (Mathematical advisor)
- "What is the difference between HPM and HAM?" (Theoretical analysis)
- "Show me how Adomian polynomials are derived" (Symbolic derivation breakdown)
- "Why does a method diverge on stiff or singular ODEs?" (Numerical diagnostics)
- Execution triggers and live automated action dispatch.
"""

from typing import Dict, Any, List, Optional
import re
from .problems import BENCHMARK_REGISTRY, list_problems


CAPABILITIES_DIRECTORY = {
    "methods": [
        {
            "id": "HAM",
            "name": "Homotopy Analysis Method",
            "pioneer": "Shijun Liao (1992, 2003, 2012)",
            "governing_equation": "(1 - q) L[phi(t; q) - u_0(t)] = q * hbar * H(t) * N[phi(t; q)]",
            "key_features": [
                "Embedding parameter q in [0, 1] connects initial guess u_0(t) to exact solution u(t).",
                "Non-zero auxiliary convergence-control parameter h-bar allows arbitrary adjustment of convergence region.",
                "hbar-curve diagnostic plots solution or residual vs hbar to identify horizontal plateau where d(u)/d(hbar) ~ 0.",
                "Freedom to choose auxiliary linear operator L and auxiliary function H(t).",
                "Capable of enforcing convergence even when standard perturbation series diverge."
            ],
            "strengths": "Greatest convergence flexibility; handles stiff & oscillatory problems via h-bar tuning.",
            "weaknesses": "Higher algebraic cost per deformation order due to parameter tracking."
        },
        {
            "id": "HPM",
            "name": "Homotopy Perturbation Method",
            "pioneer": "Ji-Huan He (1999, 2003)",
            "governing_equation": "H(v, p) = (1 - p)[L(v) - L(u_0)] + p[A(v) - f(r)] = 0",
            "key_features": [
                "Perturbation expansion v(t; p) = sum_{k=0}^M p^k * v_k(t) with artificial parameter p.",
                "Evaluates solution series at p = 1.",
                "Does not require physical small perturbation parameter.",
                "Corresponds to the special case of HAM where hbar = -1 and H(t) = 1 under identical linear operator."
            ],
            "strengths": "Simple and intuitive formulation; fast term computation.",
            "weaknesses": "No convergence-control parameter; diverges if radius of convergence is exceeded."
        },
        {
            "id": "ADM",
            "name": "Adomian Decomposition Method",
            "pioneer": "George Adomian (1984, 1994)",
            "governing_equation": "u(t) = Phi_0(t) + L^(-1)[g(t)] - L^(-1)[R(u)] - L^(-1)[N(u)]",
            "key_features": [
                "Decomposes nonlinear operator N(u) = sum_{n=0}^infty A_n into Adomian polynomials.",
                "Rigorous formula: A_n = (1/n!) * d^n/d(lambda)^n [ N( sum lambda^k u_k ) ] at lambda = 0.",
                "No perturbation parameter or artificial embedding equation needed.",
                "Inverse differential operator L^(-1) implemented as m-fold definite integral."
            ],
            "strengths": "Zero artificial parameters; explicit Adomian polynomials for any smooth nonlinearity.",
            "weaknesses": "Convergence radius bounded by complex singularities of analytical solution."
        },
        {
            "id": "VIM",
            "name": "Variational Iteration Method",
            "pioneer": "Ji-Huan He (1999, 2007)",
            "governing_equation": "u_{n+1}(t) = u_n(t) + int_0^t lambda(tau) [ L u_n(tau) + N tilde{u}_n(tau) - g(tau) ] dtau",
            "key_features": [
                "Correction functional with generalized Lagrange multiplier lambda(tau).",
                "Optimal lambda determined variationally: lambda(tau) = -1 for 1st-order; lambda(tau) = tau - t for 2nd-order.",
                "Uses restricted variation delta(tilde{u}_n) = 0 for nonlinear terms.",
                "Each iteration absorbs lower-order terms directly into a global function."
            ],
            "strengths": "Rapid initial convergence in 2-3 iterations; variational optimality.",
            "weaknesses": "Symbolic integration expression swell for high iteration counts."
        },
        {
            "id": "DTM",
            "name": "Differential Transform Method",
            "pioneer": "Zhou (1986), Chen & Ho (1999)",
            "governing_equation": "U(k) = (1/k!) [d^k u(t)/dt^k]_{t=0}, u(t) = sum_{k=0}^N U(k) t^k",
            "key_features": [
                "Maps continuous differential equations into discrete algebraic recurrence relations in k-space.",
                "Nonlinear operations transformed via discrete convolution: D{u^2} = sum_{r=0}^k U(r) U(k-r).",
                "Completely circumvents symbolic quadrature and integration errors.",
                "Convergence parameters: truncation order N, expansion domain H, and Padé [M/N] post-accelerators."
            ],
            "strengths": "Ultra-fast algebraic recurrence; zero quadratures; direct boundary value handling.",
            "weaknesses": "Limited by Taylor series convergence horizon unless accelerated with Padé rational approximants."
        },
        {
            "id": "OHAM",
            "name": "Optimal Homotopy Asymptotic Method",
            "pioneer": "Vasile Marinca & Nicolae Herisanu (2008)",
            "governing_equation": "(1 - p)[L(phi) + g(t)] = H(t, p)[L(phi) + g(t) + N(phi)]",
            "key_features": [
                "Deformation equation using auxiliary polynomial convergence-control function H(t, p) = sum_{i=1}^m p^i C_i.",
                "Convergence parameters: auxiliary constants C_1, C_2, ..., C_m.",
                "Optimality criterion: rigorously minimizes the functional residual integral J(C_1, ..., C_m) = int_0^T R^2(t; C_i) dt -> min.",
                "Stationary conditions dJ/dC_i = 0 yield optimal constants ensuring minimal residual error."
            ],
            "strengths": "Optimal convergence control without manual trial-and-error; robust error bounds.",
            "weaknesses": "Requires solving an auxiliary least-squares nonlinear optimization problem for C_i."
        },
        {
            "id": "FROBENIUS",
            "name": "Frobenius Series Method",
            "pioneer": "Ferdinand Georg Frobenius (1873)",
            "governing_equation": "y(x) = x^r sum_{n=0}^infty a_n x^n",
            "key_features": [
                "Solves linear ODEs around regular singular points (e.g. Bessel, Legendre, Laguerre equations).",
                "Determines characteristic indicial equation F(r) = 0 for the roots r_1, r_2.",
                "Handles logarithmic branch cuts when roots differ by an integer."
            ],
            "strengths": "Exact analytical series near coordinate singularities.",
            "weaknesses": "Requires regular singularity; higher-order terms algebraically tedious."
        },
        {
            "id": "RADAU_IIA",
            "name": "Radau IIA Implicit Runge-Kutta",
            "pioneer": "Hairer & Wanner (1996)",
            "governing_equation": "u_{n+1} = u_n + h sum b_i f(t_n + c_i h, Z_i)",
            "key_features": [
                "Fully implicit 5th-order Runge-Kutta integrator with Radau quadrature collocation nodes.",
                "Unconditionally A-stable and L-stable: damps infinitely stiff modes instantaneously.",
                "Solves Differential-Algebraic Equations (DAEs) of index 1, 2, and 3 without step collapse."
            ],
            "strengths": "Gold standard for stiff chemical kinetics and constrained multi-body systems.",
            "weaknesses": "Requires solving nonlinear system of algebraic equations via Newton iteration at each step."
        }
    ],
    "problems": [
        {
            "id": "riccati_ivp",
            "name": "Riccati First-Order IVP",
            "latex": "u' + u^2 = 1, u(0) = 0",
            "exact": "u(t) = tanh(t)",
            "class": "1st-Order Quadratic Nonlinear IVP",
            "significance": "Canonical polynomial expansion baseline; poles at t = +- i*pi/2 determine convergence radius."
        },
        {
            "id": "lane_emden",
            "name": "Lane-Emden Equation (Polytrope n=5)",
            "latex": "u'' + (2/t)u' + u^5 = 0, u(0)=1, u'(0)=0",
            "exact": "u(t) = 1 / sqrt(1 + t^2/3)",
            "class": "2nd-Order Singular ODE (Astrophysics)",
            "significance": "Tests coordinate singularity handling at origin t=0 using transformed inverse operators."
        },
        {
            "id": "duffing_oscillator",
            "name": "Duffing Nonlinear Oscillator",
            "latex": "u'' + u + alpha*u^3 = 0, u(0)=A, u'(0)=0",
            "exact": "Jacobi elliptic function cn(omega*t, m)",
            "class": "Nonlinear Conservative Oscillator",
            "significance": "Reveals secular term accumulation in uncorrected perturbation series vs HAM."
        },
        {
            "id": "coupled_system",
            "name": "Coupled Nonlinear System",
            "latex": "u' = -u + v^2, v' = -v + u^2, u(0)=v(0)=0.5",
            "exact": "u(t) = v(t) = 1 / (1 + e^t)",
            "class": "Coupled Multi-variable System",
            "significance": "Validates multi-variable decomposition with exact symmetric analytical ground truth."
        },
        {
            "id": "logistic_population",
            "name": "Logistic Population Dynamics",
            "latex": "u' = r*u*(1 - u/K), u(0)=u_0",
            "exact": "u(t) = K*u_0*e^(rt) / [K + u_0*(e^(rt)-1)]",
            "class": "Population Biology / Saturation",
            "significance": "Examines approximation behavior across inflection points and carrying capacity saturation."
        },
        {
            "id": "epidemiological_sir",
            "name": "Epidemiological SIR Model",
            "latex": "S' = -beta*S*I, I' = beta*S*I - gamma*I, R' = gamma*I",
            "exact": "SciPy DOP853 Numerical Ground Truth",
            "class": "Epidemiology / Conservation System",
            "significance": "Verifies conservation of total population S(t) + I(t) + R(t) = 1 across series orders."
        },
        {
            "id": "rapid_transition",
            "name": "Rapid Transition Front",
            "latex": "u' = k*u^2*(1 - u), u(0)=0.1",
            "exact": "Implicit algebraic equation",
            "class": "Steep Gradient Front / Combustion",
            "significance": "Evaluates series behavior when rapid slope changes cause local radius breakdown."
        },
        {
            "id": "stiff_relaxation",
            "name": "Stiff Boundary Layer ODE",
            "latex": "u' = -lambda*(u - t^2) + 2t, u(0)=1, lambda=50",
            "exact": "u(t) = t^2 + e^(-lambda*t)",
            "class": "Stiff Differential Equation",
            "significance": "Demonstrates why standard HPM/ADM explode on stiff problems and how HAM hbar=-0.05 stabilizes convergence."
        }
    ],
    "metrics": [
        "Maximum Absolute Error (E_inf = max |u_approx - u_ref|)",
        "Root Mean Square Error (RMSE = sqrt( (1/N) sum (u_approx - u_ref)^2 ))",
        "Differential Equation Residual (max |L u + N u - g|)",
        "Initial Condition Defect (|u_approx(0) - u_0|)",
        "Order-by-order Error Reduction Rate (log10(RMSE_m / RMSE_{m-1}))",
        "Wall-clock Execution Time in milliseconds",
        "Divergence / Failure Diagnostics (NaN, Inf, overflow thresholds)",
        "HAM hbar-Curve Flat Plateau Analysis"
    ],
    "tools": [
        "Live interactive computation for any method & order 1-8",
        "hbar parameter slider with real-time plateau detection",
        "Adomian Polynomials Inspector (symbolic derivation for any power)",
        "Lagrange Multiplier Variational Derivation Viewer",
        "Full 8-problem x 4-method cross-comparison benchmark matrix",
        "Automated self-testing validation suite (test_riccati, test_lane_emden, etc.)",
        "Publication-quality Matplotlib figures export (PNG & SVG)",
        "Experimental results CSV data download",
        "Comprehensive Scientific Markdown Research Report generation"
    ]
}


def query_autonomy(query_str: str) -> Dict[str, Any]:
    """
    Intelligent natural language query engine that returns structured capability answers,
    mathematical explanations, recommended methods, and actionable triggers.
    """
    q = query_str.lower().strip()

    # Query 1: What can this app do? / Overview of capabilities
    if any(k in q for k in ["what can this app do", "capabilities", "features", "overview", "help", "what does this app do"]):
        return {
            "query": query_str,
            "topic": "system_capabilities",
            "headline": "Semi-Analytical ODE Benchmark Platform Capabilities",
            "summary": (
                "This platform is an open-source scientific computing framework that mathematically formulates, "
                "executes, and benchmarks four major semi-analytical methods (HAM, HPM, ADM, VIM) for nonlinear "
                "differential equations against ultra-precise numerical reference solvers (SciPy DOP853 & Radau) "
                "and exact analytical solutions."
            ),
            "sections": [
                {
                    "title": "1. Four Mathematical Methods Implemented",
                    "content": "• Homotopy Analysis Method (HAM) with auxiliary linear operator, H(t), and convergence-control parameter h-bar.\n"
                               "• Homotopy Perturbation Method (HPM) with He's homotopy perturbation series in p, evaluated at p=1.\n"
                               "• Adomian Decomposition Method (ADM) with exact symbolic generation of Adomian polynomials A_n.\n"
                               "• Variational Iteration Method (VIM) with variationally identified optimal Lagrange multipliers lambda(tau)."
                },
                {
                    "title": "2. Eight Diverse Benchmark Problems",
                    "content": "Covers Riccati (1st-order quadratic), Lane-Emden (singular polytrope n=5), Duffing oscillator (cubic stiffness), "
                               "coupled symmetric system, logistic population dynamics, epidemiological SIR model, rapid transition front, "
                               "and stiff boundary layer ODE (lambda=50)."
                },
                {
                    "title": "3. High-Precision Benchmarking & Error Metrics",
                    "content": "Calculates E_inf, RMSE, maximum residual of the governing ODE, initial condition error, order-reduction rates, "
                               "wall-clock time, and failure rates."
                },
                {
                    "title": "4. Advanced Analytical Tools",
                    "content": "• HAM h-bar curve analysis: sweeps h-bar to find horizontal plateaus where d(u)/d(hbar) vanishes.\n"
                               "• Adomian Polynomial Inspector: derives formulas for A_0, A_1, A_2, A_3, ... for any smooth nonlinearity.\n"
                               "• Automated Test Suite: self-validates mathematical correctness, IC adherence, and exact agreement.\n"
                               "• Publication Visualizations & CSV Export: generates figures (PNG/SVG) and structured data."
                }
            ],
            "recommended_actions": [
                {"label": "Run Riccati Benchmark (All 4 Methods)", "action": "run_benchmark", "problem_id": "riccati_ivp"},
                {"label": "Analyze HAM h-bar Curve", "action": "view_hbar", "problem_id": "riccati_ivp"},
                {"label": "Inspect Adomian Polynomials", "action": "view_adomian"},
                {"label": "Execute Full Benchmark Matrix", "action": "run_full_matrix"},
                {"label": "Run Automated Verification Tests", "action": "run_tests"}
            ]
        }

    # Query 2: Which method to choose? / Method recommendation
    elif any(k in q for k in ["which method", "recommend", "best method", "should i use", "selection"]):
        return {
            "query": query_str,
            "topic": "method_selection",
            "headline": "Semi-Analytical Method Selection Guide",
            "summary": "Selection depends on equation characteristics, stiffness, boundary conditions, and perturbation requirements:",
            "sections": [
                {
                    "title": "When to choose HAM (Homotopy Analysis Method)",
                    "content": "• Equations with large domains or stiff exponential decay where standard series diverge.\n"
                               "• When convergence control is needed: by tuning h-bar within the horizontal plateau of the h-bar curve, "
                               "you can guarantee series convergence even when ADM and HPM fail.\n"
                               "• Recommended for: Stiff ODEs, singular Lane-Emden, long-time oscillator integration."
                },
                {
                    "title": "When to choose ADM (Adomian Decomposition Method)",
                    "content": "• Non-stiff polynomial nonlinearities where you want zero artificial parameters.\n"
                               "• Fast, systematic algebraic terms via precomputed Adomian polynomials.\n"
                               "• Recommended for: Riccati IVPs, coupled non-stiff systems, logistic models on [0, 1]."
                },
                {
                    "title": "When to choose VIM (Variational Iteration Method)",
                    "content": "• When 1-3 iterations are sufficient to reach high accuracy without expanding into high-order series.\n"
                               "• Well-suited for 1st- and 2nd-order non-stiff initial/boundary value problems where optimal Lagrange "
                               "multipliers lambda(tau) = -1 or lambda(tau) = tau - t are easily integrated."
                },
                {
                    "title": "When to choose HPM (Homotopy Perturbation Method)",
                    "content": "• Ideal for classroom derivation and fast initial approximations when no physical small parameter exists.\n"
                               "• Mathematically equivalent to HAM at hbar = -1, but lacks convergence adjustment if the series diverges."
                }
            ],
            "recommended_actions": [
                {"label": "Test HAM on Stiff ODE", "action": "run_benchmark", "problem_id": "stiff_relaxation", "method": "HAM"},
                {"label": "Compare all 4 methods on Duffing Oscillator", "action": "run_benchmark", "problem_id": "duffing_oscillator"}
            ]
        }

    # Query 3: h-bar curve in HAM
    elif any(k in q for k in ["hbar", "h-bar", "convergence control", "plateau", "liao"]):
        return {
            "query": query_str,
            "topic": "hbar_curve_explanation",
            "headline": "Understanding the HAM h-bar Convergence-Control Parameter",
            "summary": (
                "In Liao's Homotopy Analysis Method, h-bar is NOT a physical small parameter. "
                "It is an auxiliary convergence-control parameter that governs the radius and rate of series convergence."
            ),
            "sections": [
                {
                    "title": "1. What is an h-bar curve?",
                    "content": "An h-bar curve is a plot of a solution observable (e.g. u(t_0; hbar) or residual norm) against h-bar. "
                               "According to Liao's fundamental theorem, as deformation order increases, there emerges a distinct "
                               "horizontal flat plateau where d(u)/d(hbar) ~ 0."
                },
                {
                    "title": "2. How to identify the valid convergence region?",
                    "content": "The horizontal plateau corresponds to the range of h-bar values where the series is convergent. "
                               "Any value of h-bar chosen within this plateau will yield a convergent series. Choosing the point where "
                               "the derivative |du/dhbar| is minimized yields optimal convergence rate."
                },
                {
                    "title": "3. What happens if h-bar is chosen outside the plateau?",
                    "content": "If h-bar is set too close to 0, convergence is excessively slow. If h-bar is outside the valid range, "
                               "the successive terms blow up to infinity (divergence)."
                }
            ],
            "recommended_actions": [
                {"label": "Generate h-bar Curve for Riccati IVP", "action": "view_hbar", "problem_id": "riccati_ivp"},
                {"label": "Generate h-bar Curve for Stiff ODE", "action": "view_hbar", "problem_id": "stiff_relaxation"}
            ]
        }

    # Query 4: Adomian polynomials
    elif any(k in q for k in ["adomian", "polynomial", "a_n", "decomposition"]):
        return {
            "query": query_str,
            "topic": "adomian_polynomials",
            "headline": "Adomian Polynomials Derivation and Mathematics",
            "summary": (
                "Adomian polynomials A_n decompose arbitrary nonlinear operators N(u) into series terms such that "
                "N(u) = sum_{n=0}^infty A_n(u_0, u_1, ..., u_n)."
            ),
            "sections": [
                {
                    "title": "Rigorously Derived Mathematical Formula",
                    "content": "A_n = (1 / n!) * [ d^n / d(lambda)^n [ N( sum_{k=0}^n lambda^k u_k ) ] ] evaluated at lambda = 0."
                },
                {
                    "title": "Concrete Examples Computed by the Engine",
                    "content": "For quadratic nonlinearity N(u) = u^2:\n"
                               "• A_0 = u_0^2\n"
                               "• A_1 = 2 * u_0 * u_1\n"
                               "• A_2 = u_1^2 + 2 * u_0 * u_2\n"
                               "• A_3 = 2 * u_1 * u_2 + 2 * u_0 * u_3\n"
                               "• A_4 = u_2^2 + 2 * u_1 * u_3 + 2 * u_0 * u_4\n\n"
                               "For cubic nonlinearity N(u) = u^3:\n"
                               "• A_0 = u_0^3\n"
                               "• A_1 = 3 * u_0^2 * u_1\n"
                               "• A_2 = 3 * u_0 * u_1^2 + 3 * u_0^2 * u_2"
                }
            ],
            "recommended_actions": [
                {"label": "Inspect Adomian Polynomials", "action": "view_adomian"},
                {"label": "Run ADM on Riccati IVP", "action": "run_benchmark", "problem_id": "riccati_ivp", "method": "ADM"}
            ]
        }

    # Query 5: Stiff differential equations
    elif any(k in q for k in ["stiff", "boundary layer", "relaxation"]):
        return {
            "query": query_str,
            "topic": "stiff_problems",
            "headline": "Performance on Stiff Differential Equations",
            "summary": "Stiff problems (such as u' = -lambda*(u - t^2) + 2t with lambda=50) expose fundamental limits of semi-analytical methods:",
            "sections": [
                {
                    "title": "Why Standard ADM and HPM Diverge on Stiff Scales",
                    "content": "Standard Taylor/Adomian expansions around t=0 produce powers (-lambda*t)^k / k!. When lambda*t > 1, "
                               "terms fluctuate wildly before cancelling, causing catastrophic floating-point cancellation and divergence."
                },
                {
                    "title": "How HAM Tames Stiffness",
                    "content": "By plotting the h-bar curve for the stiff equation, one discovers that the horizontal plateau shifts "
                               "from -1.0 to small negative values (e.g. hbar ~ -0.05). Setting hbar = -0.05 shrinks the deformation "
                               "operator step, dampening explosive eigenvalues and achieving smooth convergence across the boundary layer."
                }
            ],
            "recommended_actions": [
                {"label": "Run Stiff ODE Benchmark", "action": "run_benchmark", "problem_id": "stiff_relaxation"},
                {"label": "Inspect Stiff ODE h-bar Curve", "action": "view_hbar", "problem_id": "stiff_relaxation"}
            ]
        }

    # Query 6: Differential Transform Method (DTM)
    elif any(k in q for k in ["dtm", "differential transform"]):
        return {
            "query": query_str,
            "topic": "dtm_method",
            "headline": "Differential Transform Method (DTM) & Recurrence Relations",
            "summary": "DTM maps differential operators to algebraic recurrence relations in discrete k-space without quadratures.",
            "sections": [
                {
                    "title": "Fundamental Differential Transform",
                    "content": "Continuous function u(t) transforms to U(k) = (1/k!) * [d^k u(t) / dt^k]_{t=0}.\n"
                               "Inverse transform reconstructed as Taylor polynomial u(t) = sum_{k=0}^N U(k) t^k."
                },
                {
                    "title": "Discrete Nonlinear Transform Rules",
                    "content": "• Addition: u(t) +- v(t) <-> U(k) +- V(k)\n"
                               "• Derivative: d^m u / dt^m <-> (k+1)...(k+m) U(k+m)\n"
                               "• Nonlinear Product: u(t) * v(t) <-> sum_{r=0}^k U(r) * V(k-r) (Discrete Convolution)\n"
                               "• Quadratic Power: u^2(t) <-> sum_{r=0}^k U(r) * U(k-r)\n"
                               "• Cubic Power: u^3(t) <-> sum_{i=0}^k sum_{j=0}^{k-i} U(i) U(j) U(k-i-j)"
                },
                {
                    "title": "Convergence Parameters & Algorithmic Steps",
                    "content": "1. Truncation Order N (determines degree of expansion polynomial).\n"
                               "2. Domain Center t_0 (expansion origin).\n"
                               "3. Convergence horizon H (bounded by nearest complex pole; post-accelerated via Padé [M/N] approximants)."
                }
            ],
            "recommended_actions": [
                {"label": "Run DTM on Riccati IVP", "action": "run_dtm", "problem_id": "riccati_ivp"},
                {"label": "Run DTM on Duffing Oscillator", "action": "run_dtm", "problem_id": "duffing_oscillator"},
                {"label": "Open Method Catalog", "action": "view_catalog"}
            ]
        }

    # Query 7: Optimal Homotopy Asymptotic Method (OHAM)
    elif any(k in q for k in ["oham", "optimal homotopy", "marinca", "herisanu", "convergence parameters"]):
        return {
            "query": query_str,
            "topic": "oham_method",
            "headline": "Optimal Homotopy Asymptotic Method (OHAM) & Convergence Control",
            "summary": "OHAM provides optimal convergence control by minimizing the residual square integral functional J(C_1, ..., C_m).",
            "sections": [
                {
                    "title": "Continuous Homotopy Deformation",
                    "content": "(1 - p)[L(phi(t; p)) + g(t)] = H(t, p)[L(phi(t; p)) + g(t) + N(phi(t; p))]\n"
                               "Auxiliary function H(t, p) = sum_{i=1}^m p^i C_i parameterized by auxiliary constants C_1, C_2, ... C_m."
                },
                {
                    "title": "Order-by-Order Linear Decomposition",
                    "content": "• Zeroth-Order (p^0): L(v_0(t)) + g(t) = 0, B(v_0, v_0') = 0\n"
                               "• First-Order (p^1): L(v_1(t)) = C_1 * N_0(v_0(t)), B(v_1, v_1') = 0\n"
                               "• Second-Order (p^2): L(v_2) - (1 + C_1)L(v_1) = C_2 N_0(v_0) + C_1 N_1(v_0, v_1)\n"
                               "Approximation: u(t; C_1, ..., C_m) = v_0(t) + sum_{i=1}^m v_i(t; C_1, ... C_i)."
                },
                {
                    "title": "Optimal Residual Parameter Minimization",
                    "content": "Unlike HAM which relies on visual h-bar plateau inspection, OHAM rigorously computes optimal C_i:\n"
                               "J(C_1, ..., C_m) = int_0^T R^2(t; C_1, ..., C_m) dt -> min\n"
                               "Stationary conditions dJ/dC_i = 0 solved via Nelder-Mead or BFGS optimization."
                }
            ],
            "recommended_actions": [
                {"label": "Run OHAM on Riccati IVP", "action": "run_oham", "problem_id": "riccati_ivp"},
                {"label": "Inspect OHAM Convergence Parameters", "action": "view_oham_details"},
                {"label": "Compare OHAM vs HAM", "action": "compare_methods"}
            ]
        }

    # Query 8: 1937 Monograph Heritage & Differential Analyzer
    elif any(k in q for k in ["1937", "differential analyzer", "bell labs", "monograph", "heritage", "history", "alan turing"]):
        return {
            "query": query_str,
            "topic": "heritage_1937",
            "headline": "1937 Golden Age of Mathematical Mechanics & Computing",
            "summary": "Designed in the aesthetic of a 1937 Royal Philosophical Society monograph and Vannevar Bush's mechanical Differential Analyzer.",
            "sections": [
                {
                    "title": "1937 Milestones in Computation",
                    "content": "• 1936-1937: Alan Turing published 'On Computable Numbers', introducing the Universal Turing Machine.\n"
                               "• Vannevar Bush operated the mechanical wheel-and-disc Differential Analyzer at MIT, solving 6th-order nonlinear ODEs.\n"
                               "• Bell Telephone Laboratories built early electromagnetic relay computing machines."
                },
                {
                    "title": "1937 Monograph Features in this Platform",
                    "content": "• Hand-engraved styled plate diagrams and vector flow plots.\n"
                               "• Archival paper palette: laid cream rag, sepia iron gall ink, and wax seal cartouches.\n"
                               "• Exact mathematical typography with rendered LaTeX proofs and step derivations."
                }
            ],
            "recommended_actions": [
                {"label": "Explore Mathematical Modelling", "action": "view_modelling"},
                {"label": "Open Diagram Studio", "action": "view_diagrams"},
                {"label": "Generate LaTeX Monograph Paper", "action": "generate_report"}
            ]
        }

    # Default fallback: structured capability overview
    else:
        return {
            "query": query_str,
            "topic": "general_capabilities",
            "headline": "Platform Capabilities and Scientific Benchmark Suite",
            "summary": f"Your query '{query_str}' touches on the platform's semi-analytical benchmark capabilities. Here is what you can do right now:",
            "sections": [
                {
                    "title": "Available Methods",
                    "content": "Homotopy Analysis Method (HAM), Homotopy Perturbation Method (HPM), Adomian Decomposition Method (ADM), Variational Iteration Method (VIM)."
                },
                {
                    "title": "Available Benchmark Problems",
                    "content": "Riccati IVP, Lane-Emden (Polytrope n=5), Duffing Oscillator, Coupled System, Logistic Growth, SIR Model, Rapid Transition Front, Stiff Boundary Layer."
                },
                {
                    "title": "Diagnostic & Diagnostic Workflows",
                    "content": "Live solution comparison plots, error curves, order-by-order convergence rates, HAM h-bar plateau analysis, Adomian polynomial generator, and automated validation tests."
                }
            ],
            "recommended_actions": [
                {"label": "Run Benchmark Matrix", "action": "run_full_matrix"},
                {"label": "Ask 'What can this app do?'", "action": "ask_capabilities"},
                {"label": "Ask 'Which method should I use?'", "action": "ask_recommender"},
                {"label": "Run Automated Tests", "action": "run_tests"}
            ]
        }
