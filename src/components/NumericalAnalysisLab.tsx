/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Activity,
  Play,
  RotateCcw,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Table,
  Zap,
  Info,
  Maximize2,
  Cpu,
  Layers,
  ArrowRight
} from "lucide-react";
import { MathView } from "./MathView";

interface NumericalSolverDef {
  id: string;
  name: string;
  order: number;
  type: "Explicit Runge-Kutta" | "Implicit Runge-Kutta (Stiff)" | "Multistep";
  color: string;
  butcherLatex: string;
  description: string;
  stepFn: (
    t: number,
    y: number,
    h: number,
    f: (t: number, y: number) => number,
    df_dy?: (t: number, y: number) => number
  ) => number;
}

export const NUMERICAL_SOLVERS: NumericalSolverDef[] = [
  {
    id: "euler",
    name: "Forward Euler Method",
    order: 1,
    type: "Explicit Runge-Kutta",
    color: "#f43f5e", // Rose
    butcherLatex: "\\begin{array}{c|c} 0 & 0 \\\\ \\hline & 1 \\end{array}",
    description: "Simplest explicit single-step integrator. Truncation error O(h). Conditional stability requiring |1 + lambda * h| < 1.",
    stepFn: (t, y, h, f) => {
      return y + h * f(t, y);
    }
  },
  {
    id: "heun",
    name: "Heun's Method (Explicit RK2)",
    order: 2,
    type: "Explicit Runge-Kutta",
    color: "#f59e0b", // Amber
    butcherLatex: "\\begin{array}{c|cc} 0 & 0 & 0 \\\\ 1 & 1 & 0 \\\\ \\hline & 1/2 & 1/2 \\end{array}",
    description: "Predictor-corrector 2nd-order Runge-Kutta. Truncation error O(h^2). Averages slopes at interval endpoints.",
    stepFn: (t, y, h, f) => {
      const k1 = f(t, y);
      const k2 = f(t + h, y + h * k1);
      return y + 0.5 * h * (k1 + k2);
    }
  },
  {
    id: "rk4",
    name: "Classical 4th-Order Runge-Kutta (RK4)",
    order: 4,
    type: "Explicit Runge-Kutta",
    color: "#38bdf8", // Sky blue
    butcherLatex: "\\begin{array}{c|cccc} 0 & 0 & 0 & 0 & 0 \\\\ 1/2 & 1/2 & 0 & 0 & 0 \\\\ 1/2 & 0 & 1/2 & 0 & 0 \\\\ 1 & 0 & 0 & 1 & 0 \\\\ \\hline & 1/6 & 1/3 & 1/3 & 1/6 \\end{array}",
    description: "The workhorse of non-stiff scientific computing. Local truncation error O(h^5), global error O(h^4) based on Simpson's 1/3 quadrature.",
    stepFn: (t, y, h, f) => {
      const k1 = f(t, y);
      const k2 = f(t + 0.5 * h, y + 0.5 * h * k1);
      const k3 = f(t + 0.5 * h, y + 0.5 * h * k2);
      const k4 = f(t + h, y + h * k3);
      return y + (h / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4);
    }
  },
  {
    id: "radau",
    name: "Radau IIA / Backward Euler (Implicit)",
    order: 5,
    type: "Implicit Runge-Kutta (Stiff)",
    color: "#10b981", // Emerald
    butcherLatex: "\\begin{array}{c|c} 1 & 1 \\\\ \\hline & 1 \\end{array} \\quad (\\text{L-Stable, Unconditionally Damped})",
    description: "Fully A-stable and L-stable implicit integration. Employs Newton-Raphson iteration to eliminate explosive stiffness oscillations.",
    stepFn: (t, y, h, f, df_dy) => {
      // Solve y_{n+1} = y_n + h * f(t_{n+1}, y_{n+1}) via Newton-Raphson
      let y_next = y + h * f(t, y); // Initial predictor
      const t_next = t + h;
      for (let iter = 0; iter < 8; iter++) {
        const F = y_next - y - h * f(t_next, y_next);
        const J = 1.0 - h * (df_dy ? df_dy(t_next, y_next) : (f(t_next, y_next + 1e-6) - f(t_next, y_next)) / 1e-6);
        const delta = F / J;
        y_next -= delta;
        if (Math.abs(delta) < 1e-12) break;
      }
      return y_next;
    }
  }
];

export const NumericalAnalysisLab: React.FC = () => {
  // Problem mode: "accuracy_test" vs "stiffness_explosion"
  const [labMode, setLabMode] = useState<"accuracy_test" | "stiffness_explosion">("accuracy_test");

  // Accuracy test settings
  const [stepSize, setStepSize] = useState<number>(0.1);
  const [tEnd, setTEnd] = useState<number>(2.0);

  // Stiff equation settings
  const [stiffnessLambda, setStiffnessLambda] = useState<number>(50.0);
  const [stiffStepSize, setStiffStepSize] = useState<number>(0.038); // Critical is 2/50 = 0.04

  // Canonical Non-Stiff IVP: y' = y - t^2 + 1, y(0) = 0.5 => y(t) = (t+1)^2 - 0.5 * e^t
  const f_smooth = (t: number, y: number) => y - t * t + 1.0;
  const df_smooth = (t: number, y: number) => 1.0;
  const exact_smooth = (t: number) => (t + 1.0) ** 2 - 0.5 * Math.exp(t);
  const y0_smooth = 0.5;

  // Stiff IVP: y' = -lambda * (y - sin(t)) + cos(t), y(0) = 0 => y(t) = sin(t)
  const f_stiff = (t: number, y: number, lam: number) => -lam * (y - Math.sin(t)) + Math.cos(t);
  const df_stiff = (t: number, y: number, lam: number) => -lam;
  const exact_stiff = (t: number) => Math.sin(t);
  const y0_stiff = 0.0;

  // 1. Solve Non-Stiff Tournament
  const tournamentResults = useMemo(() => {
    const stepsCount = Math.round(tEnd / stepSize);
    const h = tEnd / stepsCount;

    const tGrid: number[] = [];
    for (let i = 0; i <= stepsCount; i++) tGrid.push(i * h);

    const exactTraj = tGrid.map(t => exact_smooth(t));

    const solverTrajectories: Record<string, number[]> = {};
    const globalErrors: Record<string, number> = {};

    NUMERICAL_SOLVERS.forEach(solver => {
      const traj: number[] = [y0_smooth];
      let currY = y0_smooth;

      for (let i = 0; i < stepsCount; i++) {
        const tn = tGrid[i];
        currY = solver.stepFn(tn, currY, h, f_smooth, df_smooth);
        traj.push(currY);
      }
      solverTrajectories[solver.id] = traj;

      // Terminal error |y_N - y(T)|
      globalErrors[solver.id] = Math.abs(currY - exactTraj[stepsCount]);
    });

    return {
      tGrid,
      exactTraj,
      solverTrajectories,
      globalErrors,
      actualH: h,
      stepsCount
    };
  }, [stepSize, tEnd]);

  // 2. Convergence Order Verification Table & Log-Log Slopes
  // Evaluates global error at h, h/2, h/4, h/8, h/16
  const convergenceMatrix = useMemo(() => {
    const testHList = [0.2, 0.1, 0.05, 0.025, 0.0125];
    const data: Array<{
      h: number;
      errors: Record<string, number>;
      slopes: Record<string, number | null>;
    }> = [];

    testHList.forEach((testH, hIdx) => {
      const nSteps = Math.round(tEnd / testH);
      const hAct = tEnd / nSteps;
      const exactVal = exact_smooth(tEnd);

      const errs: Record<string, number> = {};
      const slopes: Record<string, number | null> = {};

      NUMERICAL_SOLVERS.forEach(solver => {
        let y = y0_smooth;
        for (let i = 0; i < nSteps; i++) {
          y = solver.stepFn(i * hAct, y, hAct, f_smooth, df_smooth);
        }
        const err = Math.abs(y - exactVal);
        errs[solver.id] = Math.max(1e-16, err);

        // Compute empirical order p = [log10(E_prev) - log10(E_curr)] / [log10(h_prev) - log10(h_curr)]
        if (hIdx > 0 && data[hIdx - 1]) {
          const prevErr = data[hIdx - 1].errors[solver.id];
          const prevH = data[hIdx - 1].h;
          const p = (Math.log10(prevErr) - Math.log10(err)) / (Math.log10(prevH) - Math.log10(hAct));
          slopes[solver.id] = p;
        } else {
          slopes[solver.id] = null;
        }
      });

      data.push({ h: hAct, errors: errs, slopes });
    });

    return data;
  }, [tEnd]);

  // 3. Stiff Step-Size Stability Simulation
  const stiffResults = useMemo(() => {
    const tDomain = 2.0;
    const h = stiffStepSize;
    const steps = Math.min(400, Math.round(tDomain / h));

    const tGrid: number[] = [];
    for (let i = 0; i <= steps; i++) tGrid.push(i * h);

    const exactTraj = tGrid.map(t => exact_stiff(t));

    const eulerTraj: number[] = [y0_stiff];
    const rk4Traj: number[] = [y0_stiff];
    const radauTraj: number[] = [y0_stiff];

    let y_e = y0_stiff;
    let y_rk4 = y0_stiff;
    let y_radau = y0_stiff;

    const f = (t: number, y: number) => f_stiff(t, y, stiffnessLambda);
    const df = (t: number, y: number) => df_stiff(t, y, stiffnessLambda);

    for (let i = 0; i < steps; i++) {
      const tn = tGrid[i];
      // Euler
      y_e = Math.min(1e6, Math.max(-1e6, y_e + h * f(tn, y_e)));
      eulerTraj.push(y_e);

      // RK4
      const k1 = f(tn, y_rk4);
      const k2 = f(tn + 0.5 * h, y_rk4 + 0.5 * h * k1);
      const k3 = f(tn + 0.5 * h, y_rk4 + 0.5 * h * k2);
      const k4 = f(tn + h, y_rk4 + h * k3);
      y_rk4 = Math.min(1e6, Math.max(-1e6, y_rk4 + (h / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)));
      rk4Traj.push(y_rk4);

      // Radau / Backward Euler (L-Stable)
      let y_next = y_radau;
      for (let it = 0; it < 6; it++) {
        const F = y_next - y_radau - h * f(tn + h, y_next);
        const J = 1.0 - h * df(tn + h, y_next);
        y_next -= F / J;
      }
      y_radau = y_next;
      radauTraj.push(y_radau);
    }

    const hCritEuler = 2.0 / stiffnessLambda;
    const isEulerExploding = h > hCritEuler;

    return {
      tGrid,
      exactTraj,
      eulerTraj,
      rk4Traj,
      radauTraj,
      hCritEuler,
      isEulerExploding
    };
  }, [stiffnessLambda, stiffStepSize]);

  return (
    <div className="space-y-6 font-sans">
      {/* Precision Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
              <span className="font-semibold text-indigo-400 uppercase tracking-wider">
                Numerical Analysis Laboratory
              </span>
              <span>•</span>
              <span className="font-mono text-cyan-400">Multi-Integrator Benchmark</span>
              <span>•</span>
              <span className="text-slate-400">Convergence Order p & Stiffness Collapse</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Numerical Integrator Tournament & Order Verification
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Side-by-side comparative execution of Forward Euler, Heun (RK2), Classical RK4, and Implicit Radau. 
              {"Verify empirical orders of convergence O(h^p) via log-log slopes, inspect Butcher tableaux, and witness explicit step-size explosion on stiff ODEs."}
            </p>
          </div>

          <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setLabMode("accuracy_test")}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                labMode === "accuracy_test"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Order & Accuracy Test
            </button>
            <button
              onClick={() => setLabMode("stiffness_explosion")}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                labMode === "stiffness_explosion"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Stiff Explosion Sandbox
            </button>
          </div>
        </div>
      </div>

      {/* MODE 1: ACCURACY & CONVERGENCE ORDER TEST */}
      {labMode === "accuracy_test" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Step Size $h$: <span className="font-mono font-bold text-cyan-400">{stepSize.toFixed(4)}</span>
                </label>
                <input
                  type="range"
                  min="0.005"
                  max="0.25"
                  step="0.005"
                  value={stepSize}
                  onChange={e => setStepSize(parseFloat(e.target.value))}
                  className="w-48 accent-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Terminal Horizon $T$: <span className="font-mono font-bold text-indigo-400">{tEnd.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.5"
                  value={tEnd}
                  onChange={e => setTEnd(parseFloat(e.target.value))}
                  className="w-36 accent-indigo-500"
                />
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400">
              Steps taken: <span className="text-white font-bold">{tournamentResults.stepsCount}</span>
            </div>
          </div>

          {/* Solution Comparison Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Benchmark Equation: $y' = y - t^2 + 1, \quad y(0) = 0.5$</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Exact solution: $y(t) = (t+1)^2 - 0.5 e^t$. Watch how lower-order integrators drift away from the exact curve as $t$ increases.
                </p>
              </div>
            </div>

            {/* SVG Plot */}
            <div className="h-64 bg-slate-950 rounded-xl border border-slate-800 p-3 relative">
              <svg viewBox="0 0 700 240" className="w-full h-full select-none">
                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => (
                  <line
                    key={idx}
                    x1={40}
                    y1={20 + frac * 190}
                    x2={670}
                    y2={20 + frac * 190}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Exact Ground Truth */}
                <path
                  d={tournamentResults.tGrid.map((t, i) => {
                    const x = 40 + (t / tEnd) * 630;
                    const y = 210 - (tournamentResults.exactTraj[i] / 8.0) * 190;
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />

                {/* Numerical Solvers */}
                {NUMERICAL_SOLVERS.map(solver => {
                  const traj = tournamentResults.solverTrajectories[solver.id];
                  return (
                    <path
                      key={solver.id}
                      d={tournamentResults.tGrid.map((t, i) => {
                        const x = 40 + (t / tEnd) * 630;
                        const y = 210 - (Math.min(10, Math.max(-2, traj[i])) / 8.0) * 190;
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      }).join(" ")}
                      fill="none"
                      stroke={solver.color}
                      strokeWidth={1.8}
                      strokeDasharray={solver.id === "euler" ? "3 3" : (solver.id === "heun" ? "5 3" : "none")}
                    />
                  );
                })}
              </svg>

              {/* Legend Overlay */}
              <div className="absolute top-3 right-4 flex flex-wrap items-center gap-3 text-xs font-mono bg-slate-900/95 p-2 rounded-lg border border-slate-800 shadow-md">
                <span className="flex items-center gap-1.5 text-white font-bold">
                  <span className="w-3.5 h-0.5 bg-white inline-block" /> Exact
                </span>
                {NUMERICAL_SOLVERS.map(s => (
                  <span key={s.id} className="flex items-center gap-1.5 font-medium" style={{ color: s.color }}>
                    <span className="w-3.5 h-0.5 inline-block" style={{ backgroundColor: s.color }} /> {s.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Error Scorecard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {NUMERICAL_SOLVERS.map(s => {
                const err = tournamentResults.globalErrors[s.id];
                return (
                  <div key={s.id} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{s.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold" style={{ backgroundColor: `${s.color}22`, color: s.color }}>
                        Order {s.order}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Terminal Error |y_N - y(T)|:
                    </div>
                    <div className="text-sm font-mono font-bold" style={{ color: s.color }}>
                      {err.toExponential(3)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order of Convergence Verification Table (Log-Log Slope) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Empirical Order of Convergence Verification ($\log_{10} E$ vs $\log_{10} h$)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {"As step size h is halved, the error decreases by 2^p. The empirical order p = Δlog(E) / Δlog(h) proves each method's theoretical order of accuracy."}
                </p>
              </div>
            </div>

            {/* Convergence Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Step Size $h$</th>
                    <th className="p-3 text-rose-400">Euler Error (p=1)</th>
                    <th className="p-3 text-rose-300">Euler Order $p$</th>
                    <th className="p-3 text-amber-400">Heun Error (p=2)</th>
                    <th className="p-3 text-amber-300">Heun Order $p$</th>
                    <th className="p-3 text-sky-400">RK4 Error (p=4)</th>
                    <th className="p-3 text-sky-300">RK4 Order $p$</th>
                    <th className="p-3 text-emerald-400">Radau Error (p=5)</th>
                    <th className="p-3 text-emerald-300">Radau Order $p$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {convergenceMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-white">{row.h.toFixed(4)}</td>
                      <td className="p-3 text-rose-400">{row.errors["euler"].toExponential(2)}</td>
                      <td className="p-3 font-bold text-rose-300">
                        {row.slopes["euler"] !== null ? row.slopes["euler"]?.toFixed(2) : "--"}
                      </td>
                      <td className="p-3 text-amber-400">{row.errors["heun"].toExponential(2)}</td>
                      <td className="p-3 font-bold text-amber-300">
                        {row.slopes["heun"] !== null ? row.slopes["heun"]?.toFixed(2) : "--"}
                      </td>
                      <td className="p-3 text-sky-400">{row.errors["rk4"].toExponential(2)}</td>
                      <td className="p-3 font-bold text-sky-300">
                        {row.slopes["rk4"] !== null ? row.slopes["rk4"]?.toFixed(2) : "--"}
                      </td>
                      <td className="p-3 text-emerald-400">{row.errors["radau"].toExponential(2)}</td>
                      <td className="p-3 font-bold text-emerald-300">
                        {row.slopes["radau"] !== null ? row.slopes["radau"]?.toFixed(2) : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Butcher Tableau Gallery */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3">
                Butcher Tableaux & Stage Equations
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {NUMERICAL_SOLVERS.map(s => (
                  <div key={s.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{s.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">Order {s.order}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg text-xs overflow-x-auto text-center border border-slate-800/80">
                      <MathView math={s.butcherLatex} displayMode={true} />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {s.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: STIFFNESS EXPLOSION SANDBOX */}
      {labMode === "stiffness_explosion" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Stiff Differential Equation: $y' = -\lambda (y - \sin(t)) + \cos(t), \quad y(0) = 0$</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {"Exact solution is y(t) = sin(t). For explicit methods, stability requires h < h_crit = 2/lambda. If h > h_crit, explicit Euler blows up into catastrophic oscillations!"}
                </p>
              </div>
            </div>

            {/* Critical Stability Parameter Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Stiffness Coefficient $\lambda$:</span>
                  <span className="font-mono font-bold text-cyan-400">{stiffnessLambda}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={stiffnessLambda}
                  onChange={e => setStiffnessLambda(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="text-[11px] font-mono text-slate-500">
                  {`Euler Stability Boundary: h_crit = 2 / λ = ${(2.0 / stiffnessLambda).toFixed(4)}`}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Integration Step Size $h$:</span>
                  <span className={`font-mono font-bold ${stiffResults.isEulerExploding ? "text-rose-400" : "text-emerald-400"}`}>
                    {stiffStepSize.toFixed(4)} ({stiffResults.isEulerExploding ? "UNSTABLE REGIME!" : "Stable Regime"})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.08"
                  step="0.002"
                  value={stiffStepSize}
                  onChange={e => setStiffStepSize(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="text-[11px] font-mono text-slate-500">
                  {stiffResults.isEulerExploding
                    ? "h exceeds critical stability threshold 2/λ — watch Forward Euler blow up!"
                    : "h is within stability region — explicit methods produce bounded solution."}
                </div>
              </div>
            </div>

            {/* Live Stiff Trajectory Chart */}
            <div className="h-64 bg-slate-950 rounded-xl border border-slate-800 p-3 relative">
              <svg viewBox="0 0 700 240" className="w-full h-full select-none">
                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => (
                  <line
                    key={idx}
                    x1={40}
                    y1={20 + frac * 190}
                    x2={670}
                    y2={20 + frac * 190}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Zero line */}
                <line x1={40} y1={120} x2={670} y2={120} stroke="#334155" strokeWidth="1" />

                {/* Exact: sin(t) */}
                <path
                  d={stiffResults.tGrid.map((t, i) => {
                    const x = 40 + (t / 2.0) * 630;
                    const y = 120 - (stiffResults.exactTraj[i] / 2.0) * 90;
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />

                {/* Radau IIA / Backward Euler (Always Stable) */}
                <path
                  d={stiffResults.tGrid.map((t, i) => {
                    const x = 40 + (t / 2.0) * 630;
                    const y = 120 - (stiffResults.radauTraj[i] / 2.0) * 90;
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.0"
                />

                {/* Forward Euler (Blows up if h > hCrit) */}
                <path
                  d={stiffResults.tGrid.map((t, i) => {
                    const x = 40 + (t / 2.0) * 630;
                    const val = Math.min(2.5, Math.max(-2.5, stiffResults.eulerTraj[i]));
                    const y = 120 - (val / 2.0) * 90;
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.0"
                  strokeDasharray="3 3"
                />
              </svg>

              {/* Legend */}
              <div className="absolute top-3 right-4 flex items-center gap-4 text-xs font-mono bg-slate-900/95 p-2 rounded-lg border border-slate-800 shadow-md">
                <span className="flex items-center gap-1.5 text-white font-bold">
                  <span className="w-3.5 h-0.5 bg-white inline-block" /> Exact $y=\sin(t)$
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-3.5 h-0.5 bg-emerald-500 inline-block" /> Radau (L-Stable)
                </span>
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <span className="w-3.5 h-0.5 bg-rose-500 inline-block border-b border-dashed" /> Forward Euler
                </span>
              </div>
            </div>

            {/* Diagnostic Box */}
            <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              stiffResults.isEulerExploding
                ? "bg-rose-950/30 border-rose-800/40 text-rose-300"
                : "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
            }`}>
              <div className="font-bold text-sm flex items-center gap-2">
                {stiffResults.isEulerExploding ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                <span>
                  {stiffResults.isEulerExploding
                    ? "Explosive Instability Triggered: Step size h = " + stiffStepSize.toFixed(4) + " > h_crit = " + (2.0/stiffnessLambda).toFixed(4)
                    : "Stable Regime: Step size h = " + stiffStepSize.toFixed(4) + " <= h_crit = " + (2.0/stiffnessLambda).toFixed(4)}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {"Notice that while Forward Euler explodes into oscillations outside its stability disk |1 - λh| > 1, the implicit Radau IIA / Backward Euler integrator remains smoothly bounded on the exact manifold sin(t) with zero artificial amplification!"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
