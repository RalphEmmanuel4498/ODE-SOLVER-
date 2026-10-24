/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Activity,
  Compass,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Info,
  Maximize2,
  ChevronRight,
  TrendingUp,
  Layers,
  ArrowRight,
  Target,
  Zap
} from "lucide-react";
import { MathView } from "./MathView";

export interface EquilibriumPoint {
  x: number;
  y: number;
  tau: number;       // Trace of Jacobian
  delta: number;     // Determinant of Jacobian
  discriminant: number; // tau^2 - 4*delta
  classification: string;
  isStable: boolean;
  eigenvalues: string;
  notes: string;
}

export interface ModelSystem {
  id: string;
  name: string;
  category: string;
  description: string;
  varX: string;
  varY: string;
  latexEquations: string[];
  paramDefaults: Record<string, number>;
  paramRanges: Record<string, { min: number; max: number; step: number; label: string }>;
  xDomain: [number, number];
  yDomain: [number, number];
  f: (x: number, y: number, params: Record<string, number>) => number; // dx/dt
  g: (x: number, y: number, params: Record<string, number>) => number; // dy/dt
  computeEquilibria: (params: Record<string, number>) => EquilibriumPoint[];
  bifurcationParam?: string;
  bifurcationDescription?: string;
}

export const CANONICAL_PHASE_SYSTEMS: ModelSystem[] = [
  {
    id: "lotka_volterra",
    name: "Lotka-Volterra Predator-Prey System",
    category: "Ecology & Conservative Dynamics",
    description: "Classical non-linear trophic interaction between prey (x) and predators (y). Displays neutrally stable center surrounded by invariant periodic closed orbits.",
    varX: "x (Prey)",
    varY: "y (Predator)",
    latexEquations: [
      "\\frac{dx}{dt} = \\alpha x - \\beta x y",
      "\\frac{dy}{dt} = \\delta x y - \\gamma y"
    ],
    paramDefaults: { alpha: 1.2, beta: 0.6, gamma: 0.8, delta: 0.3 },
    paramRanges: {
      alpha: { min: 0.2, max: 3.0, step: 0.1, label: "Prey growth rate (alpha)" },
      beta: { min: 0.1, max: 2.0, step: 0.05, label: "Predation coefficient (beta)" },
      gamma: { min: 0.2, max: 2.5, step: 0.05, label: "Predator mortality (gamma)" },
      delta: { min: 0.05, max: 1.0, step: 0.05, label: "Biomass conversion efficiency (delta)" }
    },
    xDomain: [0.0, 8.0],
    yDomain: [0.0, 5.0],
    f: (x, y, p) => p.alpha * x - p.beta * x * y,
    g: (x, y, p) => p.delta * x * y - p.gamma * y,
    computeEquilibria: (p) => {
      // 1. Trivial origin (0, 0)
      const J00 = [[p.alpha, 0], [0, -p.gamma]];
      const tau0 = p.alpha - p.gamma;
      const delta0 = -p.alpha * p.gamma;
      const disc0 = tau0 * tau0 - 4 * delta0;
      // 2. Coexistence (gamma/delta, alpha/beta)
      const xStar = p.gamma / p.delta;
      const yStar = p.alpha / p.beta;
      const deltaStar = p.alpha * p.gamma;
      const omega = Math.sqrt(deltaStar);

      return [
        {
          x: 0,
          y: 0,
          tau: tau0,
          delta: delta0,
          discriminant: disc0,
          classification: "Saddle Point (Unstable)",
          isStable: false,
          eigenvalues: `\\lambda_1 = +${p.alpha.toFixed(2)}, \\; \\lambda_2 = -${p.gamma.toFixed(2)}`,
          notes: "Eigenvalues of opposing signs create invariant stable and unstable manifold axes."
        },
        {
          x: xStar,
          y: yStar,
          tau: 0.0,
          delta: deltaStar,
          discriminant: -4 * deltaStar,
          classification: "Neutrally Stable Center (Poincaré Center)",
          isStable: true,
          eigenvalues: `\\lambda_{1,2} = \\pm ${omega.toFixed(3)} i`,
          notes: "Pure imaginary eigenvalues generate a continuum of concentric periodic closed orbits with conserved first integral."
        }
      ];
    },
    bifurcationParam: "alpha",
    bifurcationDescription: "Varying alpha expands the predator carrying capacity y* = alpha / beta vertically."
  },
  {
    id: "van_der_pol",
    name: "Van der Pol Oscillator (Hopf Limit Cycle)",
    category: "Nonlinear Mechanics & Limit Cycles",
    description: "Self-excited oscillator with nonlinear damping. When mu > 0, an unstable origin undergoes a Supercritical Hopf Bifurcation, birthing a stable attracting limit cycle.",
    varX: "x (Position)",
    varY: "y (Velocity)",
    latexEquations: [
      "\\frac{dx}{dt} = y",
      "\\frac{dy}{dt} = \\mu (1 - x^2) y - x"
    ],
    paramDefaults: { mu: 1.0 },
    paramRanges: {
      mu: { min: -1.5, max: 4.0, step: 0.1, label: "Nonlinear damping parameter (mu)" }
    },
    xDomain: [-3.5, 3.5],
    yDomain: [-3.5, 3.5],
    f: (x, y, p) => y,
    g: (x, y, p) => p.mu * (1.0 - x * x) * y - x,
    computeEquilibria: (p) => {
      // J(0,0) = [[0, 1], [-1, mu]]
      // tau = mu, delta = 1, disc = mu^2 - 4
      const tau = p.mu;
      const delta = 1.0;
      const disc = tau * tau - 4.0;
      let classification = "";
      let isStable = false;
      let ev = "";

      if (p.mu < 0) {
        isStable = true;
        if (disc < 0) {
          classification = "Stable Spiral / Focus";
          ev = `\\lambda = ${((p.mu / 2)).toFixed(2)} \\pm ${(Math.sqrt(Math.abs(disc)) / 2).toFixed(2)} i`;
        } else {
          classification = "Stable Node (Sink)";
          ev = `\\lambda_1 = ${((p.mu + Math.sqrt(disc)) / 2).toFixed(2)}, \\; \\lambda_2 = ${((p.mu - Math.sqrt(disc)) / 2).toFixed(2)}`;
        }
      } else if (p.mu === 0) {
        classification = "Linear Center (Harmonic Oscillator)";
        isStable = true;
        ev = "\\lambda = \\pm i";
      } else {
        isStable = false;
        if (disc < 0) {
          classification = "Unstable Spiral (Surrounded by Stable Limit Cycle)";
          ev = `\\lambda = +${((p.mu / 2)).toFixed(2)} \\pm ${(Math.sqrt(Math.abs(disc)) / 2).toFixed(2)} i`;
        } else {
          classification = "Unstable Node";
          ev = `\\lambda_1 = +${((p.mu + Math.sqrt(disc)) / 2).toFixed(2)}, \\; \\lambda_2 = +${((p.mu - Math.sqrt(disc)) / 2).toFixed(2)}`;
        }
      }

      return [
        {
          x: 0,
          y: 0,
          tau,
          delta,
          discriminant: disc,
          classification,
          isStable,
          eigenvalues: ev,
          notes: p.mu > 0
            ? "Supercritical Hopf Bifurcation at mu=0: Origin repels all trajectories toward the isolated closed periodic limit cycle!"
            : "Negative damping dissipates mechanical energy toward the origin."
        }
      ];
    },
    bifurcationParam: "mu",
    bifurcationDescription: "At mu = 0, eigenvalues cross the imaginary axis (Re(lambda)=0), triggering a Supercritical Hopf Bifurcation."
  },
  {
    id: "sir_phase",
    name: "Kermack-McKendrick Epidemic Phase Plane",
    category: "Epidemiology & Threshold Dynamics",
    description: "Susceptible (S) vs Infected (I) trajectory phase portrait. The epidemic peak occurs along the vertical nullcline S = gamma / beta = 1 / R_0.",
    varX: "S (Susceptible)",
    varY: "I (Infected)",
    latexEquations: [
      "\\frac{dS}{dt} = -\\beta S I",
      "\\frac{dI}{dt} = \\beta S I - \\gamma I"
    ],
    paramDefaults: { beta: 1.4, gamma: 0.4 },
    paramRanges: {
      beta: { min: 0.2, max: 3.0, step: 0.1, label: "Effective contact transmission rate (beta)" },
      gamma: { min: 0.1, max: 1.5, step: 0.05, label: "Recovery/removal rate (gamma)" }
    },
    xDomain: [0.0, 1.0],
    yDomain: [0.0, 0.6],
    f: (x, y, p) => -p.beta * x * y,
    g: (x, y, p) => p.beta * x * y - p.gamma * y,
    computeEquilibria: (p) => {
      const r0 = p.beta / p.gamma;
      const sThreshold = p.gamma / p.beta;
      return [
        {
          x: 1.0,
          y: 0.0,
          tau: p.beta - p.gamma,
          delta: 0.0,
          discriminant: (p.beta - p.gamma) ** 2,
          classification: r0 > 1 ? "Disease-Free Equilibrium (Transcritical Outbreak Regime)" : "Disease-Free Equilibrium (Stable)",
          isStable: r0 <= 1,
          eigenvalues: `\\lambda_1 = 0, \\quad \\lambda_2 = ${(p.beta - p.gamma).toFixed(2)}`,
          notes: `Basic reproduction ratio R_0 = ${r0.toFixed(2)}. Outbreak peaks precisely when S passes threshold S_c = gamma/beta = ${sThreshold.toFixed(2)}.`
        }
      ];
    },
    bifurcationParam: "beta",
    bifurcationDescription: "When beta > gamma (R_0 > 1), introduced infectious cases grow initially, producing an epidemic surge before herd immunity."
  },
  {
    id: "duffing_phase",
    name: "Duffing Double-Well Oscillator",
    category: "Nonlinear Dynamics & Chaos Foundation",
    description: "Two-well potential V(x) = -x^2/2 + x^4/4. Exhibits bistability with two stable spiral sinks and a central saddle barrier.",
    varX: "x (Position)",
    varY: "y (Velocity)",
    latexEquations: [
      "\\frac{dx}{dt} = y",
      "\\frac{dy}{dt} = x - x^3 - \\delta y"
    ],
    paramDefaults: { delta: 0.25 },
    paramRanges: {
      delta: { min: 0.0, max: 1.5, step: 0.05, label: "Damping coefficient (delta)" }
    },
    xDomain: [-2.5, 2.5],
    yDomain: [-2.5, 2.5],
    f: (x, y, p) => y,
    g: (x, y, p) => x - x * x * x - p.delta * y,
    computeEquilibria: (p) => {
      // 1. Center saddle at (0, 0)
      // J = [[0, 1], [1, -delta]] -> tau = -delta, delta = -1 => saddle!
      // 2. Wells at (+1, 0) and (-1, 0)
      // J = [[0, 1], [-2, -delta]] -> tau = -delta, delta = 2, disc = delta^2 - 8
      const tauSaddle = -p.delta;
      const deltaSaddle = -1.0;

      const tauWell = -p.delta;
      const deltaWell = 2.0;
      const discWell = p.delta * p.delta - 8.0;

      return [
        {
          x: 0,
          y: 0,
          tau: tauSaddle,
          delta: deltaSaddle,
          discriminant: p.delta * p.delta + 4.0,
          classification: "Saddle Point (Potential Barrier)",
          isStable: false,
          eigenvalues: "\\lambda_1 > 0, \\; \\lambda_2 < 0",
          notes: "Separatrix divides state space into basins of attraction for left and right wells."
        },
        {
          x: 1.0,
          y: 0.0,
          tau: tauWell,
          delta: deltaWell,
          discriminant: discWell,
          classification: "Right Potential Well (Stable Spiral)",
          isStable: true,
          eigenvalues: `\\lambda = ${(-p.delta / 2).toFixed(2)} \\pm ${(Math.sqrt(Math.abs(discWell)) / 2).toFixed(2)} i`,
          notes: "Attracting stable equilibrium in right potential well."
        },
        {
          x: -1.0,
          y: 0.0,
          tau: tauWell,
          delta: deltaWell,
          discriminant: discWell,
          classification: "Left Potential Well (Stable Spiral)",
          isStable: true,
          eigenvalues: `\\lambda = ${(-p.delta / 2).toFixed(2)} \\pm ${(Math.sqrt(Math.abs(discWell)) / 2).toFixed(2)} i`,
          notes: "Attracting stable equilibrium in left potential well."
        }
      ];
    },
    bifurcationParam: "delta",
    bifurcationDescription: "Damping delta controls how rapidly trajectories spiral into the bottom of either potential well."
  }
];

export const PhasePortraitStudio: React.FC = () => {
  const [selectedSystemId, setSelectedSystemId] = useState<string>("lotka_volterra");
  const system = useMemo(() => {
    return CANONICAL_PHASE_SYSTEMS.find(s => s.id === selectedSystemId) || CANONICAL_PHASE_SYSTEMS[0];
  }, [selectedSystemId]);

  // Parameters state
  const [params, setParams] = useState<Record<string, number>>(system.paramDefaults);
  useEffect(() => {
    setParams(system.paramDefaults);
  }, [system]);

  // View settings
  const [showNullclines, setShowNullclines] = useState(true);
  const [showEquilibria, setShowEquilibria] = useState(true);
  const [vectorDensity, setVectorDensity] = useState(16);

  // User-clicked trajectories
  const [userSeeds, setUserSeeds] = useState<Array<{ x: number; y: number }>>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Default seeds for each system
  useEffect(() => {
    if (system.id === "lotka_volterra") {
      setUserSeeds([
        { x: 1.0, y: 1.0 },
        { x: 2.0, y: 0.8 },
        { x: 3.5, y: 1.5 },
        { x: 5.0, y: 2.0 }
      ]);
    } else if (system.id === "van_der_pol") {
      setUserSeeds([
        { x: 0.2, y: 0.2 },
        { x: 2.5, y: 2.0 },
        { x: -2.5, y: -1.5 }
      ]);
    } else if (system.id === "sir_phase") {
      setUserSeeds([
        { x: 0.99, y: 0.01 },
        { x: 0.80, y: 0.05 },
        { x: 0.60, y: 0.10 }
      ]);
    } else if (system.id === "duffing_phase") {
      setUserSeeds([
        { x: 1.8, y: 0.5 },
        { x: -1.8, y: -0.5 },
        { x: 0.1, y: 1.5 },
        { x: -0.1, y: -1.5 }
      ]);
    }
  }, [system.id]);

  // Computed equilibria
  const equilibria = useMemo(() => {
    return system.computeEquilibria(params);
  }, [system, params]);

  // RK4 trajectory integrator
  const integrateTrajectory = (
    x0: number,
    y0: number,
    dt: number,
    steps: number,
    p: Record<string, number>,
    f: (x: number, y: number, p: Record<string, number>) => number,
    g: (x: number, y: number, p: Record<string, number>) => number
  ): Array<{ x: number; y: number }> => {
    const pts: Array<{ x: number; y: number }> = [{ x: x0, y: y0 }];
    let cx = x0;
    let cy = y0;

    for (let i = 0; i < steps; i++) {
      const k1x = f(cx, cy, p);
      const k1y = g(cx, cy, p);

      const k2x = f(cx + 0.5 * dt * k1x, cy + 0.5 * dt * k1y, p);
      const k2y = g(cx + 0.5 * dt * k1x, cy + 0.5 * dt * k1y, p);

      const k3x = f(cx + 0.5 * dt * k2x, cy + 0.5 * dt * k2y, p);
      const k3y = g(cx + 0.5 * dt * k2x, cy + 0.5 * dt * k2y, p);

      const k4x = f(cx + dt * k3x, cy + dt * k3y, p);
      const k4y = g(cx + dt * k3x, cy + dt * k3y, p);

      cx += (dt / 6.0) * (k1x + 2 * k2x + 2 * k3x + k4x);
      cy += (dt / 6.0) * (k1y + 2 * k2y + 2 * k3y + k4y);

      // Boundaries guard
      if (isNaN(cx) || isNaN(cy) || Math.abs(cx) > 100 || Math.abs(cy) > 100) break;
      pts.push({ x: cx, y: cy });
    }
    return pts;
  };

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    const [xMin, xMax] = system.xDomain;
    const [yMin, yMax] = system.yDomain;

    const toCanvasX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
    const toCanvasY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);
    const fromCanvasX = (cx: number) => xMin + ((cx - padding) / (width - 2 * padding)) * (xMax - xMin);
    const fromCanvasY = (cy: number) => yMin + ((height - padding - cy) / (height - 2 * padding)) * (yMax - yMin);

    // 1. Background
    ctx.fillStyle = "#020617"; // dark slate 950
    ctx.fillRect(0, 0, width, height);

    // 2. Coordinate Grid
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    const xTicks = 8;
    for (let i = 0; i <= xTicks; i++) {
      const val = xMin + (i / xTicks) * (xMax - xMin);
      const cx = toCanvasX(val);
      ctx.beginPath();
      ctx.moveTo(cx, padding);
      ctx.lineTo(cx, height - padding);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(val.toFixed(1), cx, height - padding + 18);
    }

    const yTicks = 6;
    for (let i = 0; i <= yTicks; i++) {
      const val = yMin + (i / yTicks) * (yMax - yMin);
      const cy = toCanvasY(val);
      ctx.beginPath();
      ctx.moveTo(padding, cy);
      ctx.lineTo(width - padding, cy);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.textAlign = "right";
      ctx.fillText(val.toFixed(1), padding - 8, cy + 3);
    }
    ctx.setLineDash([]);

    // 3. Vector Field Grid
    const numX = vectorDensity;
    const numY = Math.round(vectorDensity * 0.7);

    for (let i = 0; i < numX; i++) {
      for (let j = 0; j < numY; j++) {
        const xVal = xMin + (i + 0.5) * ((xMax - xMin) / numX);
        const yVal = yMin + (j + 0.5) * ((yMax - yMin) / numY);

        const dx = system.f(xVal, yVal, params);
        const dy = system.g(xVal, yVal, params);
        const mag = Math.sqrt(dx * dx + dy * dy);

        if (mag > 1e-9) {
          const uNorm = dx / mag;
          const vNorm = dy / mag;
          const arrowLen = 14;

          const startX = toCanvasX(xVal);
          const startY = toCanvasY(yVal);
          const endX = startX + uNorm * arrowLen;
          const endY = startY - vNorm * arrowLen;

          // Velocity-colored hue (cyan to violet)
          const normSpeed = Math.min(1.0, mag / 3.0);
          ctx.strokeStyle = `rgba(${Math.round(56 + normSpeed * 150)}, ${Math.round(189 - normSpeed * 80)}, ${Math.round(248)}, 0.4)`;
          ctx.lineWidth = 1.2;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
          const headAngle = Math.atan2(-(endY - startY), endX - startX);
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - 4 * Math.cos(headAngle - Math.PI / 6),
            endY + 4 * Math.sin(headAngle - Math.PI / 6)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - 4 * Math.cos(headAngle + Math.PI / 6),
            endY + 4 * Math.sin(headAngle + Math.PI / 6)
          );
          ctx.stroke();
        }
      }
    }

    // 4. Nullclines
    if (showNullclines) {
      // Nullcline 1: dx/dt = 0 (Vertical flow nullcline - blue)
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = "#38bdf8"; // sky blue

      if (system.id === "lotka_volterra") {
        // x = 0 or y = alpha / beta
        const yStar = params.alpha / params.beta;
        const cy = toCanvasY(yStar);
        ctx.beginPath();
        ctx.moveTo(padding, cy);
        ctx.lineTo(width - padding, cy);
        ctx.stroke();
      } else if (system.id === "van_der_pol") {
        // dx/dt = y = 0
        const cy0 = toCanvasY(0);
        ctx.beginPath();
        ctx.moveTo(padding, cy0);
        ctx.lineTo(width - padding, cy0);
        ctx.stroke();
      } else if (system.id === "sir_phase") {
        // S = 0 or I = 0
        const cy0 = toCanvasY(0);
        ctx.beginPath();
        ctx.moveTo(padding, cy0);
        ctx.lineTo(width - padding, cy0);
        ctx.stroke();
      } else if (system.id === "duffing_phase") {
        // y = 0
        const cy0 = toCanvasY(0);
        ctx.beginPath();
        ctx.moveTo(padding, cy0);
        ctx.lineTo(width - padding, cy0);
        ctx.stroke();
      }

      // Nullcline 2: dy/dt = 0 (Horizontal flow nullcline - amber)
      ctx.strokeStyle = "#fbbf24"; // amber 400
      if (system.id === "lotka_volterra") {
        // y = 0 or x = gamma / delta
        const xStar = params.gamma / params.delta;
        const cx = toCanvasX(xStar);
        ctx.beginPath();
        ctx.moveTo(cx, padding);
        ctx.lineTo(cx, height - padding);
        ctx.stroke();
      } else if (system.id === "van_der_pol") {
        // y = x / (mu * (1 - x^2))
        ctx.beginPath();
        let first = true;
        for (let px = padding; px <= width - padding; px += 2) {
          const xVal = fromCanvasX(px);
          const denom = params.mu * (1.0 - xVal * xVal);
          if (Math.abs(denom) > 0.05) {
            const yVal = xVal / denom;
            if (yVal >= yMin - 1 && yVal <= yMax + 1) {
              const cy = toCanvasY(yVal);
              if (first) {
                ctx.moveTo(px, cy);
                first = false;
              } else {
                ctx.lineTo(px, cy);
              }
            } else {
              first = true;
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      } else if (system.id === "sir_phase") {
        // dy/dt = I (beta S - gamma) = 0 => S = gamma / beta (critical epidemic threshold)
        const sCrit = params.gamma / params.beta;
        const cx = toCanvasX(sCrit);
        ctx.beginPath();
        ctx.moveTo(cx, padding);
        ctx.lineTo(cx, height - padding);
        ctx.stroke();
      } else if (system.id === "duffing_phase") {
        // y = (x - x^3) / delta
        ctx.beginPath();
        for (let px = padding; px <= width - padding; px += 2) {
          const xVal = fromCanvasX(px);
          const yVal = (xVal - xVal ** 3) / Math.max(0.01, params.delta);
          const cy = toCanvasY(yVal);
          if (px === padding) ctx.moveTo(px, cy);
          else ctx.lineTo(px, cy);
        }
        ctx.stroke();
      }
    }

    // 5. User-Seeded & Attractor Trajectories
    userSeeds.forEach((seed, idx) => {
      // Forward integration
      const fwd = integrateTrajectory(seed.x, seed.y, 0.02, 350, params, system.f, system.g);
      // Backward integration (for conservative orbits / limit cycles)
      const bwd = integrateTrajectory(seed.x, seed.y, -0.02, 200, params, system.f, system.g);

      const colorPalette = ["#818cf8", "#34d399", "#f472b6", "#a78bfa", "#f87171", "#38bdf8"];
      const trajColor = colorPalette[idx % colorPalette.length];

      ctx.lineWidth = 2.0;
      ctx.strokeStyle = trajColor;

      // Draw backward trace
      ctx.beginPath();
      bwd.forEach((pt, pIdx) => {
        const cx = toCanvasX(pt.x);
        const cy = toCanvasY(pt.y);
        if (pIdx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // Draw forward trace
      ctx.beginPath();
      fwd.forEach((pt, pIdx) => {
        const cx = toCanvasX(pt.x);
        const cy = toCanvasY(pt.y);
        if (pIdx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // Seed marker dot
      const sx = toCanvasX(seed.x);
      const sy = toCanvasY(seed.y);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = trajColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 6. Fixed Points (Equilibria) Markers
    if (showEquilibria) {
      equilibria.forEach((eq, eqIdx) => {
        if (eq.x >= xMin && eq.x <= xMax && eq.y >= yMin && eq.y <= yMax) {
          const cx = toCanvasX(eq.x);
          const cy = toCanvasY(eq.y);

          ctx.fillStyle = eq.isStable ? "#10b981" : "#f43f5e"; // Emerald if stable, Rose if saddle/unstable
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Text Badge
          ctx.fillStyle = "#f8fafc";
          ctx.font = "bold 11px Plus Jakarta Sans, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`E_${eqIdx + 1} (${eq.x.toFixed(2)}, ${eq.y.toFixed(2)})`, cx + 10, cy - 8);
        }
      });
    }

    // 7. Outer Frame
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padding, padding, width - 2 * padding, height - 2 * padding);
  }, [system, params, showNullclines, showEquilibria, vectorDensity, userSeeds, equilibria]);

  // Click on canvas to drop new trajectory seed
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const padding = 50;
    const [xMin, xMax] = system.xDomain;
    const [yMin, yMax] = system.yDomain;

    const xVal = xMin + ((clickX - padding) / (canvas.width - 2 * padding)) * (xMax - xMin);
    const yVal = yMin + ((canvas.height - padding - clickY) / (canvas.height - 2 * padding)) * (yMax - yMin);

    if (xVal >= xMin && xVal <= xMax && yVal >= yMin && yVal <= yMax) {
      setUserSeeds(prev => [...prev, { x: xVal, y: yVal }]);
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
                Dynamical Systems & Poincaré Geometry
              </span>
              <span>•</span>
              <span className="font-mono text-cyan-400">Interactive Phase Portraits</span>
              <span>•</span>
              <span className="text-slate-400">Nullclines & Bifurcations</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Phase Plane & Poincaré Fixed Point Studio
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Explore nonlinear vector fields, shoot trajectories by clicking directly on the phase plane, 
              inspect nullclines, and classify equilibria on the classical Trace-Determinant parabola (τ vs Δ).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUserSeeds([])}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors border border-slate-700 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Trajectories</span>
            </button>
          </div>
        </div>

        {/* System Selector Ribbon */}
        <div className="mt-4 flex flex-wrap gap-2">
          {CANONICAL_PHASE_SYSTEMS.map(sys => (
            <button
              key={sys.id}
              onClick={() => setSelectedSystemId(sys.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedSystemId === sys.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {sys.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Grid: Left Canvas, Right Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Phase Portrait Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">
                Phase Plane Vector Field ({system.varX} vs {system.varY})
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showNullclines}
                  onChange={e => setShowNullclines(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600"
                />
                <span>Nullclines</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showEquilibria}
                  onChange={e => setShowEquilibria(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600"
                />
                <span>Equilibria</span>
              </label>
            </div>
          </div>

          {/* Interactive Canvas */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <canvas
              ref={canvasRef}
              width={700}
              height={480}
              onClick={handleCanvasClick}
              className="w-full h-auto cursor-crosshair select-none"
            />
            {/* Click-to-seed instruction tooltip overlay */}
            <div className="absolute bottom-3 left-4 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 shadow-md backdrop-blur-sm pointer-events-none">
              Click anywhere on the phase portrait to drop a trajectory seed.
            </div>
          </div>

          {/* Legend and Nullcline Equation Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-3.5 h-0.5 bg-sky-400 inline-block" />
                <span>x-Nullcline (dx/dt = 0)</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-3.5 h-0.5 bg-amber-400 inline-block" />
                <span>y-Nullcline (dy/dt = 0)</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Stable Equilibrium</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Saddle / Unstable</span>
              </span>
            </div>
          </div>

          {/* Parameter Sliders */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dynamic Parameter Tuning & Real-Time Stability Response</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Bifurcation parameter: {system.bifurcationParam}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(system.paramRanges).map(([pName, pConfig]) => (
                <div key={pName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{pConfig.label}</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {params[pName]?.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={pConfig.min}
                    max={pConfig.max}
                    step={pConfig.step}
                    value={params[pName] ?? system.paramDefaults[pName]}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setParams(prev => ({ ...prev, [pName]: val }));
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>
              ))}
            </div>
            {system.bifurcationDescription && (
              <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2 italic">
                {system.bifurcationDescription}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Mathematical Diagnostics & Trace-Determinant Parabola (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Mathematical Equations Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Governing Vector Differential Equations
            </h4>
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 overflow-x-auto text-xs text-white">
              {system.latexEquations.map((eq, i) => (
                <div key={i} className="py-0.5">
                  <MathView math={eq} displayMode={true} />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {system.description}
            </p>
          </div>

          {/* Trace-Determinant Poincaré Diagram (tau vs Delta) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>Poincaré Trace-Determinant ($\tau - \Delta$) Diagram</span>
              </h4>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                $\tau^2 - 4\Delta = 0$
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every 2D linear system maps to a coordinate on the (&tau;, &Delta;) plane. 
              The critical parabola &tau;&sup2; - 4&Delta; = 0 separates nodes from spirals.
            </p>

            {/* SVG Trace-Determinant Plane */}
            <div className="h-48 bg-slate-950/90 rounded-xl border border-slate-800 relative p-2">
              <svg viewBox="-5 -3 10 6" className="w-full h-full select-none">
                {/* Axes */}
                <line x1="-5" y1="0" x2="5" y2="0" stroke="#334155" strokeWidth="0.08" />
                <line x1="0" y1="-3" x2="0" y2="3" stroke="#334155" strokeWidth="0.08" />

                {/* Parabola: Delta = tau^2 / 4 */}
                <path
                  d={Array.from({ length: 41 }, (_, i) => {
                    const tauVal = -4 + (i / 40) * 8;
                    const deltaVal = (tauVal * tauVal) / 4.0;
                    // Flip y for SVG coordinates
                    return `${i === 0 ? "M" : "L"} ${tauVal} ${-deltaVal}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="0.12"
                  strokeDasharray="0.2 0.2"
                />

                {/* Region Shading Labels */}
                <text x="2.5" y="-1.5" fill="#f43f5e" fontSize="0.4" fontFamily="monospace">Unstable Spiral</text>
                <text x="-4.2" y="-1.5" fill="#10b981" fontSize="0.4" fontFamily="monospace">Stable Spiral</text>
                <text x="-4.5" y="1.5" fill="#e2e8f0" fontSize="0.4" fontFamily="monospace">Saddle (Δ &lt; 0)</text>

                {/* Plot Current System Equilibria Points */}
                {equilibria.map((eq, i) => {
                  const plotTau = Math.max(-4.5, Math.min(4.5, eq.tau));
                  const plotDelta = Math.max(-2.5, Math.min(2.5, eq.delta));
                  return (
                    <g key={i}>
                      <circle
                        cx={plotTau}
                        cy={-plotDelta}
                        r="0.25"
                        fill={eq.isStable ? "#10b981" : "#f43f5e"}
                        stroke="#ffffff"
                        strokeWidth="0.06"
                      />
                      <text
                        x={plotTau + 0.3}
                        y={-plotDelta - 0.2}
                        fill="#ffffff"
                        fontSize="0.4"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        E_{i + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Equilibria Classification Dossier */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Local Linearization & Eigenvalues ($J(x^*)$)
            </h4>
            <div className="space-y-3">
              {equilibria.map((eq, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      Equilibrium #{idx + 1} ({eq.x.toFixed(2)}, {eq.y.toFixed(2)})
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        eq.isStable
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                          : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                      }`}
                    >
                      {eq.classification}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-cyan-300 py-0.5">
                    <MathView math={eq.eigenvalues} />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1 mt-1">
                    <span>Trace τ = {eq.tau.toFixed(2)}</span>
                    <span>•</span>
                    <span>Det Δ = {eq.delta.toFixed(2)}</span>
                    <span>•</span>
                    <span>τ² - 4Δ = {eq.discriminant.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug pt-1">
                    {eq.notes}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
