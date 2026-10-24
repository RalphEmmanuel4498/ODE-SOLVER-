/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Layers,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sparkles,
  Search,
  Filter,
  Cpu,
  TrendingUp,
  Activity,
  Sliders,
  RotateCcw,
  Check,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { MathView } from "./MathView";

export interface MethodInfo {
  id: string;
  name: string;
  pioneerYear: string;
  category: "Analytical Exact" | "Semi-Analytical" | "Perturbation & Asymptotic" | "Series Acceleration" | "High-Order Numerical";
  tagline: string;
  formulaLatex: string;
  description: string;
  strengths: string[];
  limitations: string[];
  idealProblems: string[];
  convergenceParameters?: {
    name: string;
    symbol: string;
    role: string;
    guideline: string;
  }[];
  algorithmicSteps?: {
    step: string;
    name: string;
    description: string;
    latex?: string;
  }[];
}

export const METHODS_CATALOG: MethodInfo[] = [
  // -------------------------------------------------------------------------
  // 1. Exact Analytical Methods
  // -------------------------------------------------------------------------
  {
    id: "sep_vars",
    name: "Separation of Variables",
    pioneerYear: "Johann Bernoulli (1695)",
    category: "Analytical Exact",
    tagline: "Factorial algebraic separation of differentials for first-order ODEs and separable PDEs",
    formulaLatex: "\\int \\frac{dy}{g(y)} = \\int f(x) \\, dx + C",
    description: "The foundational analytical technique for differential equations whose algebraic structure allows dependent and independent differentials to be segregated entirely onto opposing sides.",
    strengths: ["Exact closed-form solution", "Zero truncation or roundoff error", "Global domain validity"],
    limitations: ["Strictly inapplicable to coupled multi-variable systems", "Requires antiderivative integrability of g(y)"],
    idealProblems: ["Autonomous population growth", "Newton's cooling law", "1D Heat/Wave PDEs via Fourier series"]
  },
  {
    id: "integrating_factor",
    name: "Integrating Factor Method",
    pioneerYear: "Leonhard Euler (1739)",
    category: "Analytical Exact",
    tagline: "Multiplier transforming first-order linear equations into exact total differentials",
    formulaLatex: "\\mu(t) = \\exp\\left(\\int P(t)\\,dt\\right) \\implies \\frac{d}{dt}[\\mu(t) y] = \\mu(t) Q(t)",
    description: "Multiplies a linear ordinary differential equation by an exponential integrating factor mu(t) such that the left-hand side collapses into the exact derivative of a product.",
    strengths: ["Exact closed-form solution", "Handles arbitrary non-homogeneous source terms Q(t)", "Standard baseline for linear circuit & chemical analysis"],
    limitations: ["Strictly restricted to linear 1st-order equations", "Requires symbolic integrability of P(t)"],
    idealProblems: ["RL/RC electrical circuits", "Mixing tank concentration dynamics", "Linear decay cascades"]
  },
  {
    id: "frobenius_method",
    name: "Frobenius Series Method",
    pioneerYear: "Ferdinand Georg Frobenius (1873)",
    category: "Analytical Exact",
    tagline: "Generalized power series solution around regular singular points with indicial roots",
    formulaLatex: "y(x) = x^r \\sum_{n=0}^\\infty a_n x^n, \\quad F(r) = r(r-1) + p_0 r + q_0 = 0",
    description: "Expands differential equations around regular singular points x=0. Solves the quadratic indicial equation for characteristic exponents r1, r2, constructing independent Bessel, Legendre, or hypergeometric series.",
    strengths: ["Resolves physical coordinate singularities at origin", "Exact analytic series representations", "Generates special functions of mathematical physics"],
    limitations: ["Logarithmic branch cut terms arise when r1 - r2 is an integer", "Convergence radius bounded by adjacent singularity"],
    idealProblems: ["Bessel differential equation (cylindrical acoustics)", "Legendre equation (spherical harmonics)", "Lane-Emden stellar polytropes"]
  },
  {
    id: "laplace_transform",
    name: "Laplace Transform Technique",
    pioneerYear: "Pierre-Simon Laplace (1812)",
    category: "Analytical Exact",
    tagline: "Integral transformation mapping differential operators into s-domain algebraic systems",
    formulaLatex: "\\mathcal{L}\\{y^{(n)}(t)\\} = s^n Y(s) - \\sum_{k=1}^n s^{n-k} y^{(k-1)}(0)",
    description: "Maps continuous differential operators into algebraic polynomial operations in the complex frequency domain s. Natural choice for discontinuous piecewise forcing and initial-value problems.",
    strengths: ["Directly incorporates initial conditions", "Effortlessly handles Dirac delta impulses and Heaviside steps", "Solves linear coupled systems via Cramer's rule"],
    limitations: ["Cannot directly invert non-linear algebraic convolutions", "Requires existence of inverse Laplace contour"],
    idealProblems: ["Impulse-driven mechanical oscillators", "RLC transient circuit response", "Control systems transfer functions"]
  },
  {
    id: "greens_functions",
    name: "Green's Functions Method",
    pioneerYear: "George Green (1828)",
    category: "Analytical Exact",
    tagline: "Integral kernel representation expressing response to arbitrary distributed source distributions",
    formulaLatex: "L[G(x, \\xi)] = \\delta(x - \\xi) \\implies y(x) = \\int_a^b G(x, \\xi) f(\\xi) \\, d\\xi",
    description: "Constructs the fundamental impulse response kernel G(x, xi) of a linear differential operator satisfying boundary conditions, expressing particular solutions via one-dimensional integral quadratures.",
    strengths: ["Decouples operator boundary geometry from arbitrary forcing functions", "Fundamental in electrostatics, quantum mechanics, and elasticity"],
    limitations: ["Requires finding homogeneous fundamental solutions and Wronskian", "Restricted to linear boundary value problems"],
    idealProblems: ["Electrostatic Poisson equation", "Deflection of loaded elastic beams", "Sturm-Liouville boundary value problems"]
  },
  {
    id: "fourier_analysis",
    name: "Fourier Series & Transform",
    pioneerYear: "Joseph Fourier (1822)",
    category: "Analytical Exact",
    tagline: "Orthogonal trigonometric eigenfunction expansion for boundary-value and wave systems",
    formulaLatex: "f(x) = \\frac{a_0}{2} + \\sum_{n=1}^\\infty \\left[a_n \\cos\\left(\\frac{n\\pi x}{L}\\right) + b_n \\sin\\left(\\frac{n\\pi x}{L}\\right)\\right]",
    description: "Projects functions onto complete orthogonal bases of sines and cosines. Converts linear partial differential equations on bounded domains into infinite decoupled harmonic algebraic systems.",
    strengths: ["Exact frequency domain insight", "Orthogonality simplifies coefficient calculations", "Solves heat conduction and standing wave acoustics"],
    limitations: ["Gibbs phenomenon overshoot near jump discontinuities", "Restricted to linear systems"],
    idealProblems: ["Transient heat diffusion in cylinders", "Vibrating strings and membranes", "Spectral filtering in electrical signals"]
  },
  {
    id: "variation_parameters",
    name: "Variation of Parameters",
    pioneerYear: "Joseph-Louis Lagrange (1774)",
    category: "Analytical Exact",
    tagline: "Universal non-homogeneous particular solution via Wronskian determinants",
    formulaLatex: "y_p(t) = -y_1(t)\\int \\frac{y_2(t) g(t)}{W(t)}dt + y_2(t)\\int \\frac{y_1(t) g(t)}{W(t)}dt",
    description: "General method for finding particular solutions to linear differential equations where undetermined coefficients fails due to non-polynomial forcing functions (e.g., sec(t), tan(t)).",
    strengths: ["Applicable to arbitrary non-polynomial forcing functions", "Rigorous closed form via Wronskian W(t)"],
    limitations: ["Requires prior knowledge of homogeneous fundamental set {y1, y2}", "Integral quadratures can be non-elementary"],
    idealProblems: ["Driven harmonic oscillators with secular forcing", "Airy and Bessel differential equations"]
  },

  // -------------------------------------------------------------------------
  // 2. Semi-Analytical Methods (DTM & OHAM Highlighted)
  // -------------------------------------------------------------------------
  {
    id: "dtm",
    name: "Differential Transform Method (DTM)",
    pioneerYear: "J.K. Zhou (1986); Chen & Ho (1999)",
    category: "Semi-Analytical",
    tagline: "Maps differential operators into algebraic recurrence relations in discrete k-space without quadratures",
    formulaLatex: "U(k) = \\frac{1}{k!}\\left[\\frac{d^k u(t)}{dt^k}\\right]_{t=t_0} \\iff u(t) = \\sum_{k=0}^N U(k)(t-t_0)^k",
    description: "An elegant semi-analytical iterative technique based on Taylor series expansions that transforms differential equations into discrete algebraic recurrence formulas. Completely avoids symbolic integral quadratures, perturbation parameters, or discretization grids.",
    strengths: [
      "Purely algebraic recursive evaluation—zero numerical or symbolic integration required",
      "Remarkable computational velocity per expansion order (milliseconds)",
      "Exact discrete convolution rules transform nonlinearities u^2, u^3, u*v directly",
      "Seamlessly accelerated via Padé rational approximants to exceed convergence radius"
    ],
    limitations: [
      "Polynomial convergence horizon bounded by complex-plane singular poles unless Padé accelerated",
      "Requires equations with smooth analytic or polynomial nonlinear operators"
    ],
    idealProblems: [
      "Nonlinear Riccati IVP (u' + u^2 = 1)",
      "Duffing nonlinear oscillator with cubic stiffness",
      "Astrophysical Lane-Emden polytropic spheres",
      "Blasius and Falkner-Skan boundary layer fluid flows"
    ],
    convergenceParameters: [
      {
        name: "Truncation Order",
        symbol: "N",
        role: "Governs polynomial degree and spectral bandwidth of the reconstructed inverse transform.",
        guideline: "Standard range N = 3 to 10. Higher orders improve near-origin accuracy; pair with Padé [N/2, N/2] for large t."
      },
      {
        name: "Expansion Center",
        symbol: "t_0",
        role: "Point of expansion where initial conditions or boundary conditions are known.",
        guideline: "Typically t_0 = 0. For multi-interval domains, DTM can be chained as a piecewise multi-step DTM (MS-DTM)."
      },
      {
        name: "Convergence Radius",
        symbol: "H",
        role: "Maximum time horizon |t - t_0| < H before truncated Taylor series diverges.",
        guideline: "Determined by distance to nearest complex pole (e.g. H = pi/2 for Riccati u = tanh(t))."
      },
      {
        name: "Padé Post-Acceleration",
        symbol: "[M/N]",
        role: "Converts Taylor polynomial into rational approximant P_M(t)/Q_N(t) to suppress divergence.",
        guideline: "Recommended diagonal Padé [3/3] or [4/4] for infinite-domain asymptotes."
      }
    ],
    algorithmicSteps: [
      {
        step: "Step 1",
        name: "Transform Continuous Differential Equation",
        description: "Apply standard DTM transformation identities to continuous equation.",
        latex: "D\\left\\{\\frac{d^m u}{dt^m}\\right\\} = \\frac{(k+m)!}{k!} U(k+m), \\quad D\\{u^2\\} = \\sum_{r=0}^k U(r) U(k-r)"
      },
      {
        step: "Step 2",
        name: "Incorporate Initial / Boundary Conditions",
        description: "Map initial state values directly into initial transform coefficients.",
        latex: "u(0) = u_0 \\implies U(0) = u_0, \\quad u'(0) = v_0 \\implies U(1) = v_0"
      },
      {
        step: "Step 3",
        name: "Execute Discrete Algebraic Recurrence",
        description: "Iterate recurrence formula from k = 0 to N-1 to calculate U(1), U(2), ..., U(N) purely algebraically.",
        latex: "U(k+1) = \\frac{1}{k+1} \\left[ 2 U(k) - \\sum_{r=0}^k U(r)U(k-r) + \\delta(k) \\right]"
      },
      {
        step: "Step 4",
        name: "Inverse Differential Transform Reconstruction",
        description: "Reconstruct continuous time series as a polynomial sum.",
        latex: "u(t) = \\sum_{k=0}^N U(k) (t - t_0)^k"
      },
      {
        step: "Step 5",
        name: "Padé Post-Processing & Residual Verification",
        description: "Evaluate residual R(t) = L(u) + N(u) - g(t) and apply rational Padé quotient [M/N](t) if large t is required."
      }
    ]
  },
  {
    id: "oham",
    name: "Optimal Homotopy Asymptotic Method (OHAM)",
    pioneerYear: "V. Marinca & N. Herisanu (2008)",
    category: "Semi-Analytical",
    tagline: "Rigorous convergence-control via least-squares functional residual minimization of auxiliary constants",
    formulaLatex: "(1-p)[L(\\phi(t;p)) + g(t)] = H(t,p)[L(\\phi(t;p)) + g(t) + N(\\phi(t;p))]",
    description: "An advanced semi-analytical methodology developed by Marinca and Herisanu. OHAM overcomes the trial-and-error convergence search of HAM by introducing an auxiliary polynomial function H(t, p) = sum p^i C_i whose constants C_1, C_2, ... are determined via least-squares residual minimization.",
    strengths: [
      "Rigorous mathematical convergence control—no manual eyeballing of h-bar curves",
      "Explicitly minimizes square residual integral J(C1, C2, ...) over physical domain [0, T]",
      "Exceptional accuracy even at very low deformation orders (m = 1 or 2)",
      "Unconditionally stable for strongly nonlinear conservative and dissipative oscillators"
    ],
    limitations: [
      "Requires solving an auxiliary least-squares nonlinear optimization problem for constants C_i",
      "Expression growth in higher-order nonlinear operators N_m"
    ],
    idealProblems: [
      "Nonlinear quadratic Riccati IVP",
      "Saturating logistic growth with inflection",
      "Duffing oscillator under periodic harmonic forcing",
      "Non-Newtonian fluid boundary layers and heat transfer"
    ],
    convergenceParameters: [
      {
        name: "Auxiliary Constants",
        symbol: "C_1, C_2, \\dots, C_m",
        role: "Optimal convergence-control parameters embedded in the homotopy deformation.",
        guideline: "Determined uniquely by stationary condition dJ/dC_i = 0 of the square residual functional."
      },
      {
        name: "Auxiliary Function",
        symbol: "H(t, p)",
        role: "Polynomial or exponential deformation controller H(t, p) = p C_1 + p^2 C_2 + ...",
        guideline: "For finite domains, polynomial H(p) = sum p^i C_i suffices; for unbounded domains, use e^{-t} weighting."
      },
      {
        name: "Residual Error Functional",
        symbol: "J(C_1, \\dots, C_m)",
        role: "Objective function: L2 integral of differential equation residual over [0, T].",
        guideline: "J = int_0^T R^2(t; C_1, ...) dt -> min. Solved via Nelder-Mead simplex or BFGS."
      },
      {
        name: "Collocation Variant",
        symbol: "t_i",
        role: "Alternative to integral minimization: enforces zero residual at discrete collocation points.",
        guideline: "Choose m Chebyshev-distributed nodes t_i in [0, T] and solve algebraic system R(t_i; C_j) = 0."
      }
    ],
    algorithmicSteps: [
      {
        step: "Step 1",
        name: "Decomposition into Linear and Nonlinear Operators",
        description: "Partition the differential equation into linear operator L, source term g(t), and nonlinear operator N.",
        latex: "L(u(t)) + g(t) + N(u(t)) = 0, \\quad B(u, u') = 0"
      },
      {
        step: "Step 2",
        name: "Construct Continuous Homotopy Deformation",
        description: "Introduce embedding parameter p in [0, 1] and auxiliary convergence function H(t, p).",
        latex: "(1-p)[L(\\phi(t; p)) + g(t)] = H(t, p)[L(\\phi(t; p)) + g(t) + N(\\phi(t; p))], \\quad H(t, p) = \\sum_{i=1}^m p^i C_i"
      },
      {
        step: "Step 3",
        name: "Perturbation Series Expansion in Powers of p",
        description: "Expand phi(t; p) = v_0(t) + sum_{i=1}^m v_i(t; C_1, ..., C_i) p^i and equate like powers of p.",
        latex: "p^0: L(v_0) + g(t) = 0, \\quad p^1: L(v_1) = C_1 N_0(v_0), \\quad p^2: L(v_2) - (1+C_1)L(v_1) = C_2 N_0(v_0) + C_1 N_1"
      },
      {
        step: "Step 4",
        name: "Formulate m-th Order Approximate Solution",
        description: "Set p = 1 to recover physical solution parameterized by constants C_i.",
        latex: "\\tilde{u}(t; C_1, \\dots, C_m) = v_0(t) + \\sum_{i=1}^m v_i(t; C_1, \\dots, C_i)"
      },
      {
        step: "Step 5",
        name: "Functional Residual Minimization (Stationary Point)",
        description: "Compute residual R(t; C) and minimize square residual integral J(C) using Nelder-Mead or BFGS.",
        latex: "J(C_1, \\dots, C_m) = \\int_{0}^T R^2(t; C_1, \\dots, C_m) \\, dt \\implies \\frac{\\partial J}{\\partial C_i} = 0 \\quad (i=1,\\dots,m)"
      }
    ]
  },
  {
    id: "ham",
    name: "Homotopy Analysis Method (HAM)",
    pioneerYear: "Shijun Liao (1992, 2003, 2012)",
    category: "Semi-Analytical",
    tagline: "Universal convergence control via auxiliary linear operator L and parameter h-bar",
    formulaLatex: "(1-q)\\mathcal{L}[\\phi(t;q) - u_0(t)] = q\\,\\hbar\\,H(t)\\,\\mathcal{N}[\\phi(t;q)]",
    description: "Pioneered by Shijun Liao, HAM generalizes traditional perturbation methods by introducing the non-zero convergence-control parameter h-bar and auxiliary linear operator L, giving users the explicit power to adjust and ensure the convergence region of the series solution.",
    strengths: [
      "Rigorous convergence control via h-bar curve plateaus",
      "Works on strongly nonlinear equations where all other series diverge",
      "Supports non-polynomial auxiliary base functions"
    ],
    limitations: [
      "Requires h-bar optimization step",
      "Higher order terms require symbolic algebra"
    ],
    idealProblems: [
      "Stiff chemical kinetics with boundary layers",
      "Boundary layer flows over stretching sheets",
      "Nonlinear fractional diffusion"
    ],
    convergenceParameters: [
      {
        name: "Convergence-Control Parameter",
        symbol: "\\hbar",
        role: "Governs convergence region and rate of the homotopy deformation series.",
        guideline: "Identify flat horizontal plateau in h-bar curve where d(u)/d(hbar) ~ 0."
      },
      {
        name: "Auxiliary Linear Operator",
        symbol: "\\mathcal{L}",
        role: "Determines fundamental base functions (polynomial, exponential, trigonometric).",
        guideline: "Must possess simple inverse and satisfy initial boundary conditions."
      }
    ]
  },
  {
    id: "hpm",
    name: "Homotopy Perturbation Method (HPM)",
    pioneerYear: "Ji-Huan He (1999)",
    category: "Semi-Analytical",
    tagline: "Blends topology homotopy deformation with perturbation series expansion evaluated at p = 1",
    formulaLatex: "\\mathcal{H}(v, p) = (1-p)[L(v) - L(u_0)] + p[L(v) + N(v) - g(t)] = 0",
    description: "Introduces an artificial continuous embedding parameter p in [0, 1] deforming an easy initial linear problem into the targeted nonlinear problem. Freedom to choose initial approximation u0.",
    strengths: ["Highly intuitive homotopy interpretation", "Extremely rapid convergence for initial orders", "No need for small physical parameter"],
    limitations: ["Requires careful selection of linear operator L to avoid divergence", "Higher orders involve large polynomial expressions"],
    idealProblems: ["Duffing nonlinear oscillator", "Van der Pol limit cycles", "Thermal radiation conduction equations"]
  },
  {
    id: "adm",
    name: "Adomian Decomposition Method (ADM)",
    pioneerYear: "George Adomian (1984, 1994)",
    category: "Semi-Analytical",
    tagline: "Decomposes nonlinear operators into polynomials A_n without discretization",
    formulaLatex: "u(t) = \\sum_{n=0}^\\infty u_n(t), \\quad N(u) = \\sum_{n=0}^\\infty A_n(u_0, \\dots, u_n)",
    description: "Systematic decomposition separating differential equations into inverse linear integral operators and generalized Adomian polynomials A_n. Avoids perturbation parameters and spatial discretization.",
    strengths: ["No small or large perturbation parameter needed", "Pure symbolic recursive integration", "Handles strong algebraic and transcendental nonlinearities"],
    limitations: ["Convergence radius limited by complex-plane singularity poles", "Computational cost increases with order"],
    idealProblems: ["Riccati equations", "Nonlinear Lane-Emden polytropes", "Coupled predator-prey systems"]
  },
  {
    id: "vim",
    name: "Variational Iteration Method (VIM)",
    pioneerYear: "Ji-Huan He (1999, 2007)",
    category: "Semi-Analytical",
    tagline: "Constructs correction functionals using optimal variational Lagrange multipliers",
    formulaLatex: "u_{n+1}(t) = u_n(t) + \\int_0^t \\lambda(\\tau)\\left[L u_n(\\tau) + \\widetilde{N u_n(\\tau)} - g(\\tau)\\right]d\\tau",
    description: "Formulates a generalized variational correction functional where the optimal Lagrange multiplier lambda(tau) is determined via calculus of variations and stationary conditions.",
    strengths: ["Optimal Lagrange multiplier accelerates convergence", "Physical variational grounding", "Few iterations required for high accuracy"],
    limitations: ["Determining lambda for variable coefficient systems can be non-trivial", "Evaluation of restricted variational variations"],
    idealProblems: ["Thermoelasticity problems", "Nonlinear wave equations", "Helmut-Gelfand boundary value problems"]
  },

  // -------------------------------------------------------------------------
  // 3. Perturbation & Asymptotic Methods
  // -------------------------------------------------------------------------
  {
    id: "mms",
    name: "Method of Multiple Scales (MMS)",
    pioneerYear: "J. Cole & J. Kevorkian (1960s)",
    category: "Perturbation & Asymptotic",
    tagline: "Separates fast and slow time scales to eliminate resonant secular growth",
    formulaLatex: "T_0 = t, \\; T_1 = \\epsilon t, \\dots \\implies \\frac{d}{dt} = \\frac{\\partial}{\\partial T_0} + \\epsilon \\frac{\\partial}{\\partial T_1} + \\dots",
    description: "Powerful singular perturbation method designed for oscillatory dynamical systems where regular perturbation produces unphysical secular terms proportional to t*cos(omega*t).",
    strengths: ["Eliminates secular terms systematically", "Reveals slow modulation of amplitude and phase", "Captures limit cycle radii and bifurcation thresholds"],
    limitations: ["Requires small parameter epsilon << 1", "Demands algebraic skill in solvability conditions"],
    idealProblems: ["Van der Pol self-excited oscillator", "Duffing resonance and jump phenomena", "Parametrically excited pendulums"]
  },
  {
    id: "wkb",
    name: "WKB / Liouville-Green Approximation",
    pioneerYear: "Wentzel, Kramers, Brillouin (1926)",
    category: "Perturbation & Asymptotic",
    tagline: "Asymptotic solution for differential equations with rapidly varying coefficients",
    formulaLatex: "\\epsilon^2 \\frac{d^2 y}{dx^2} + Q(x) y = 0 \\implies y(x) \\sim Q(x)^{-1/4} \\exp\\left(\\pm \\frac{i}{\\epsilon}\\int \\sqrt{Q} dx\\right)",
    description: "Semiclassical asymptotic technique for linear differential equations where the highest derivative is multiplied by a small parameter epsilon^2, resulting in rapid spatial oscillations or exponential decay.",
    strengths: ["Global asymptotic accuracy for high frequency waves", "Unlocks quantum tunneling and connection formulas across turning points"],
    limitations: ["Breaks down at classical turning points Q(x) = 0 without Airy connection"],
    idealProblems: ["Quantum Schrödinger wave equation", "Acoustic wave propagation in stratified media", "High-frequency boundary layers"]
  },
  {
    id: "matched_asymptotics",
    name: "Matched Asymptotic Expansions",
    pioneerYear: "Ludwig Prandtl (1904); Kaplun & Lagerstrom",
    category: "Perturbation & Asymptotic",
    tagline: "Singular perturbation method matching inner boundary layers with outer inviscid flows",
    formulaLatex: "\\lim_{x \\to 0} y_{\\text{outer}}(x) = \\lim_{X \\to \\infty} y_{\\text{inner}}(X), \\quad X = \\frac{x}{\\epsilon^\\alpha}",
    description: "Solves singularly perturbed differential equations where small parameters multiply the highest derivative, generating narrow boundary layers where solution gradients blow up. Matches inner and outer expansions in an intermediate overlap zone.",
    strengths: ["Resolves extreme multi-scale stiffness", "Provides uniform composite analytical expansions"],
    limitations: ["Determining boundary layer scaling exponent alpha requires significant physical intuition"],
    idealProblems: ["Fluid dynamic boundary layers over airfoils", "Slow-fast relaxation chemical kinetics", "Membrane boundary stress concentrations"]
  },

  // -------------------------------------------------------------------------
  // 4. Series Acceleration
  // -------------------------------------------------------------------------
  {
    id: "pade",
    name: "Padé Rational Approximants [M/N]",
    pioneerYear: "Henri Padé (1892)",
    category: "Series Acceleration",
    tagline: "Rational transformation P_M(t)/Q_N(t) overcoming series divergence and complex poles",
    formulaLatex: "[M/N](t) = \\frac{\\sum_{i=0}^M p_i t^i}{1 + \\sum_{j=1}^N q_j t^j} = \\sum_{k=0}^{M+N} c_k t^k + \\mathcal{O}(t^{M+N+1})",
    description: "Transforms truncated power series into rational functions, placing poles in the complex plane to match non-physical singularities and drastically extending the convergence domain.",
    strengths: ["Vastly expands radius of convergence beyond Taylor horizon", "Correctly captures asymptotic horizontal limits as t -> infinity", "Eliminates secular runaway"],
    limitations: ["Spurious defects (Froissart doublets) if numerator and denominator share near-zeros"],
    idealProblems: ["Post-processing ADM/HPM/HAM/DTM power series", "Transcritical bifurcation asymptotes", "Boundary layer shear stress"]
  },

  // -------------------------------------------------------------------------
  // 5. High-Order Numerical Solvers
  // -------------------------------------------------------------------------
  {
    id: "dop853",
    name: "DOP853 (8th-Order Adaptive Runge-Kutta)",
    pioneerYear: "Dormand & Prince (1980)",
    category: "High-Order Numerical",
    tagline: "Dormand-Prince 8(5,3) explicit integrator for ultra-precise non-stiff scientific problems",
    formulaLatex: "u_{n+1} = u_n + h \\sum_{i=1}^{12} b_i k_i, \\quad \\text{Local Error} = \\mathcal{O}(h^9)",
    description: "State-of-the-art 8th-order explicit Runge-Kutta integrator with embedded 5th and 3rd order error estimators and continuous dense output interpolation. Gold standard for smooth celestial, molecular, and trajectory problems.",
    strengths: ["Ultra-tight error tolerances (1e-12 to 1e-15)", "Adaptive step-size control minimizes function evaluations", "Ultra-smooth dense output interpolation"],
    limitations: ["Undergoes severe step-size collapse on stiff differential equations"],
    idealProblems: ["N-body celestial mechanics", "Non-stiff chaotic attractors (Lorenz, Rössler)", "Molecular dynamics trajectories"]
  },
  {
    id: "radau_iia",
    name: "Radau IIA Implicit Runge-Kutta",
    pioneerYear: "E. Hairer & G. Wanner (1996)",
    category: "High-Order Numerical",
    tagline: "Fully A-stable and L-stable 5th-order implicit integrator for stiff systems & DAEs",
    formulaLatex: "u_{n+1} = u_n + h \\sum_{i=1}^s b_i f(t_n + c_i h, Z_i), \\quad Z_i = u_n + h\\sum_{j=1}^s a_{ij} f(t_n + c_j h, Z_j)",
    description: "Implicit Runge-Kutta method based on Radau quadrature points. Provides both A-stability and L-stability, ensuring extreme damping of stiff components without artificial numerical oscillations.",
    strengths: ["Unconditionally stable for stiff equations", "Solves Differential-Algebraic Equations (DAEs) of index 1, 2, and 3", "Handles rapid chemical kinetics with zero step collapse"],
    limitations: ["Requires Newton iterations with Jacobian matrix inversions at every step"],
    idealProblems: ["Robertson stiff chemical cascade", "Electrical power grid transients", "Constrained multibody mechanics"]
  },
  {
    id: "lsoda",
    name: "LSODA (Automatic Stiff / Non-Stiff Switching)",
    pioneerYear: "Petzold & Hindmarsh (1983)",
    category: "High-Order Numerical",
    tagline: "Dynamically switches between Adams-Moulton (non-stiff) and BDF (stiff) methods",
    formulaLatex: "\\text{If Stiff } \\implies \\sum_{i=0}^k \\alpha_i y_{n+1-i} = h \\beta_0 f(t_{n+1}, y_{n+1}) \\quad (\\text{BDF})",
    description: "Livermore Solver for Ordinary Differential Equations with Automatic method switching. Dynamically monitors stiffness ratio during integration and seamlessly alternates between explicit Adams predictor-corrector and implicit Gear BDF.",
    strengths: ["Optimal balance of speed and stability", "Requires zero manual guessing about problem stiffness", "Robust for systems that enter transient stiff regimes"],
    limitations: ["Step size overhead during method switching"],
    idealProblems: ["Combustion ignition delay fronts", "Atmospheric photochemistry", "Biological bursting neurons"]
  },
  {
    id: "symplectic_verlet",
    name: "Symplectic Störmer-Verlet Integrator",
    pioneerYear: "Carl Störmer (1907); Loup Verlet (1967)",
    category: "High-Order Numerical",
    tagline: "Geometric phase-space volume and Hamiltonian energy preserving integrator",
    formulaLatex: "p_{n+1/2} = p_n - \\frac{h}{2}\\nabla V(q_n), \\quad q_{n+1} = q_n + h p_{n+1/2}, \\quad p_{n+1} = p_{n+1/2} - \\frac{h}{2}\\nabla V(q_{n+1})",
    description: "Geometric numerical integrator for conservative Hamiltonian systems. Exactly preserves symplectic 2-forms, preventing artificial energy drift over astronomical simulation horizons.",
    strengths: ["Exact preservation of Poincaré phase-space invariants", "Bounded energy oscillations over millions of steps", "Time-reversible"],
    limitations: ["Restricted to Hamiltonian and separable conservative systems"],
    idealProblems: ["Planetary orbital longevity", "Molecular dynamics thermostats", "Conservative wave equations"]
  },
  {
    id: "spectral_collocation",
    name: "Chebyshev Spectral Collocation",
    pioneerYear: "Cornelius Lanczos (1938); Orszag (1971)",
    category: "High-Order Numerical",
    tagline: "Exponential (spectral) convergence for smooth differential boundary-value problems",
    formulaLatex: "x_j = \\cos\\left(\\frac{j\\pi}{N}\\right), \\quad u'(x_j) = \\sum_{k=0}^N D_{jk} u(x_k)",
    description: "Discretizes differential operators on Gauss-Lobatto-Chebyshev nodes using differentiation matrices D. Delivers spectral accuracy (error drops faster than any algebraic power N^-k) for smooth boundary-value problems.",
    strengths: ["Exponential convergence rate", "Requires far fewer mesh nodes than finite differences", "Exceptional for fluid stability and eigenvalue problems"],
    limitations: ["Dense matrix operators require O(N^3) solves", "Sensitive to domain geometry"],
    idealProblems: ["Hydrodynamic Orr-Sommerfeld stability", "Thermal convection Rayleigh-Bénard cells", "Quantum harmonic oscillators"]
  }
];

interface MethodCatalogProps {
  onSelectMethod?: (methodId: string) => void;
}

export const MethodCatalog: React.FC<MethodCatalogProps> = ({ onSelectMethod }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeMethodId, setActiveMethodId] = useState<string>("dtm");

  // Interactive Live Tester State
  const [testProblem, setTestProblem] = useState<string>("riccati_ivp");
  const [testOrder, setTestOrder] = useState<number>(4);
  const [testRunning, setTestRunning] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const categories = [
    "ALL",
    "Analytical Exact",
    "Semi-Analytical",
    "Perturbation & Asymptotic",
    "Series Acceleration",
    "High-Order Numerical"
  ];

  const filteredMethods = METHODS_CATALOG.filter(m => {
    const matchesCat = selectedCategory === "ALL" || m.category === selectedCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeMethod =
    METHODS_CATALOG.find(m => m.id === activeMethodId) || METHODS_CATALOG[0];

  // Execute interactive live runner for active method (DTM, OHAM, HAM, etc.)
  const handleRunLiveMethod = async () => {
    setTestRunning(true);
    setTestError(null);
    setTestResult(null);

    try {
      let endpoint = "/api/run-method";
      let payload: any = {
        problemId: testProblem,
        order: testOrder
      };

      if (activeMethod.id === "dtm") {
        endpoint = "/api/run-dtm";
      } else if (activeMethod.id === "oham") {
        endpoint = "/api/run-oham";
      } else {
        payload.method = activeMethod.id.toUpperCase();
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Execution error: ${res.statusText}`);
      }

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestError(err.message || "Failed to execute method computation.");
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Precision Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
              <span className="font-semibold text-indigo-400 uppercase tracking-wider">
                Comprehensive Mathematical Taxonomy
              </span>
              <span>·</span>
              <span className="font-mono text-slate-500">17 Operational Solvers</span>
              <span>·</span>
              <span className="text-slate-400">Analytical, Semi-Analytical & Numerical</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Universal Mathematical Method Taxonomy & Solver Catalog
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              A comprehensive treatise on analytical exact solutions, modern semi-analytical series deformations 
              (DTM, OHAM, HAM, HPM, ADM, VIM), asymptotic perturbation expansions, and high-order numerical integrators.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl text-center shadow-inner">
              <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                Canonical Differential Form
              </div>
              <div className="text-xs text-indigo-300 font-mono font-semibold mt-0.5">
                <MathView latex="\mathcal{L}(u) + \mathcal{N}(u) = g(t)" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar with clean segmented tabs */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-950/80 border border-slate-800 rounded-xl no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium transition-all rounded-lg whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search solvers or formulas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left method list, Right deep-dive inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Method List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[850px] overflow-y-auto pr-1">
          {filteredMethods.map(m => {
            const isActive = m.id === activeMethodId;
            return (
              <div
                key={m.id}
                onClick={() => setActiveMethodId(m.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isActive
                    ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/10"
                    : "bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                      {m.pioneerYear}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-[10px] font-semibold text-indigo-400">
                      {m.category}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-medium text-cyan-400 flex items-center gap-1">
                      <span>Selected</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-white mt-1.5">
                  {m.name}
                </h4>

                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {m.tagline}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 overflow-x-auto text-xs bg-slate-950/60 p-2 rounded-lg">
                  <MathView latex={m.formulaLatex} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Method Detailed Deep-Dive & Live Workbench */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            {/* Header */}
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                  Method Dossier · {activeMethod.category}
                </span>
                <span className="text-slate-500 font-mono">{activeMethod.pioneerYear}</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {activeMethod.name}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {activeMethod.tagline}
              </p>
            </div>

            {/* Mathematical Formula Plate */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-center shadow-inner">
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-2">
                Governing Formulation / Recurrence Operator
              </div>
              <div className="text-sm overflow-x-auto py-1">
                <MathView latex={activeMethod.formulaLatex} displayMode={true} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Theoretical Description & Mechanics
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeMethod.description}
              </p>
            </div>

            {/* Specific Convergence Parameters (DTM, OHAM, HAM) */}
            {activeMethod.convergenceParameters && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h5 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Convergence Parameters & Control Guidelines</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeMethod.convergenceParameters.map((param, pIdx) => (
                    <div
                      key={pIdx}
                      className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">
                          {param.name}
                        </span>
                        <span className="px-1.5 py-0.5 bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 font-mono text-[10px] rounded font-semibold">
                          ${param.symbol}$
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {param.role}
                      </p>
                      <div className="text-[10px] text-slate-500 font-mono border-t border-slate-800 pt-1.5 mt-1">
                        Rule: {param.guideline}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step-by-Step Algorithmic Steps */}
            {activeMethod.algorithmicSteps && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Algorithmic Execution Protocol</span>
                </h5>
                <div className="space-y-2.5">
                  {activeMethod.algorithmicSteps.map((step, sIdx) => (
                    <div
                      key={sIdx}
                      className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-1"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-indigo-400">
                          {step.step}:
                        </span>
                        <span className="font-semibold text-white">
                          {step.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {step.description}
                      </p>
                      {step.latex && (
                        <div className="mt-2 p-2 bg-slate-900 rounded-lg text-xs overflow-x-auto border border-slate-800">
                          <MathView latex={step.latex} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Limitations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div className="bg-emerald-950/20 border border-emerald-800/30 p-3.5 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Analytical Strengths</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 leading-snug list-disc list-inside">
                  {activeMethod.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-rose-950/20 border border-rose-800/30 p-3.5 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Mathematical Limitations</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 leading-snug list-disc list-inside">
                  {activeMethod.limitations.map((l, idx) => (
                    <li key={idx}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Ideal Benchmark Problems */}
            <div className="pt-3 border-t border-slate-800">
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-1.5">
                Exemplar Problem Classes:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeMethod.idealProblems.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs rounded-lg font-medium"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Live Solver Workbench */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-sm text-white">
                  Interactive {activeMethod.name} Testbench
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Live Computational Execution
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Execute this specific method on canonical benchmark equations to inspect order terms, convergence parameters, 
              and residual norms in real time.
            </p>

            <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Benchmark Problem
                </label>
                <select
                  value={testProblem}
                  onChange={e => setTestProblem(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="riccati_ivp">Riccati IVP (u' + u^2 = 1, u(0)=0)</option>
                  <option value="logistic_ivp">Logistic Growth (u' = r*u*(1-u/K))</option>
                  <option value="duffing_oscillator">Duffing Oscillator (u'' + delta*u' + u + u^3)</option>
                  <option value="lane_emden">Lane-Emden Polytrope (Astrophysics)</option>
                  <option value="stiff_relaxation">Stiff Boundary Layer ODE (lambda=50)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Truncation Order N
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={testOrder}
                  onChange={e => setTestOrder(Math.max(1, Math.min(6, parseInt(e.target.value) || 2)))}
                  className="w-20 bg-slate-900 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-lg font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleRunLiveMethod}
                  disabled={testRunning}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-semibold tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
                >
                  {testRunning ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Computing...</span>
                    </>
                  ) : (
                    <>
                      <span>Execute {activeMethod.id.toUpperCase()}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {testError && (
              <div className="p-3.5 bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 rounded-xl">
                {testError}
              </div>
            )}

            {testResult && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="text-xs font-bold text-emerald-400">
                    Computation Succeeded · Order {testResult.order}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Wall time: {(testResult.wall_time_sec * 1000).toFixed(2)} ms
                  </div>
                </div>

                {/* Series Solution */}
                {testResult.series_latex && (
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Analytical Solution Series $u(t)$:
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg text-xs overflow-x-auto border border-slate-800">
                      <MathView latex={testResult.series_latex} displayMode={true} />
                    </div>
                  </div>
                )}

                {/* Recurrence Relation (DTM) or Optimal Constants (OHAM) */}
                {testResult.recurrence_relation_latex && (
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">
                      DTM Recurrence Formula:
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg text-xs overflow-x-auto border border-slate-800">
                      <MathView latex={testResult.recurrence_relation_latex} displayMode={true} />
                    </div>
                  </div>
                )}

                {testResult.c_constants && (
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Optimal OHAM Convergence Constants (Least Squares Residual Minimization):
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-mono bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      {testResult.c_constants.map((cVal: number, idx: number) => (
                        <span key={idx} className="bg-slate-800 px-2.5 py-1 rounded-md text-cyan-300 font-bold border border-slate-700">
                          C_{idx + 1} = {cVal.toFixed(6)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Term Expressions */}
                {testResult.term_expressions && (
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Calculated Order Terms:
                    </div>
                    <div className="space-y-1 text-xs font-mono max-h-36 overflow-y-auto bg-slate-900/80 p-3 rounded-lg text-slate-300 border border-slate-800">
                      {testResult.term_expressions.map((term: string, idx: number) => (
                        <div key={idx} className="border-b border-slate-800/60 pb-1 last:border-0 last:pb-0">
                          {term}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Residual Norm */}
                {testResult.residual_norm !== undefined && (
                  <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-2 text-slate-300">
                    <span>Maximum Equation Residual $||R(t)||_\\infty$:</span>
                    <span className="font-mono font-bold text-indigo-400">
                      {testResult.residual_norm.toExponential(4)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
