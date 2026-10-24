/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Activity,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
  Info,
  Maximize2,
  Cpu,
  Layers,
  ArrowRight,
  Code2,
  Compass,
  TrendingUp,
  Download
} from "lucide-react";
import { MathView } from "./MathView";

interface CustomSystemPreset {
  id: string;
  name: string;
  discipline: string;
  description: string;
  latexEquations: string[];
  vars: string[];
  defaults: Record<string, number>;
  initialConditions: Record<string, number>;
  tDomain: [number, number];
  f1: (x: number, y: number, z: number, p: Record<string, number>) => number;
  f2: (x: number, y: number, z: number, p: Record<string, number>) => number;
  f3?: (x: number, y: number, z: number, p: Record<string, number>) => number;
}

export const CUSTOM_PRESETS: CustomSystemPreset[] = [
  {
    id: "lorenz",
    name: "Lorenz Strange Attractor (3D Chaos)",
    discipline: "Atmospheric Physics & Chaos Theory",
    description: "Edward Lorenz's 1963 convective fluid model displaying deterministic chaos, sensitive dependence on initial conditions, and fractal butterfly attractors.",
    latexEquations: [
      "\\frac{dx}{dt} = \\sigma (y - x)",
      "\\frac{dy}{dt} = x (\\rho - z) - y",
      "\\frac{dz}{dt} = x y - \\beta z"
    ],
    vars: ["x", "y", "z"],
    defaults: { sigma: 10.0, rho: 28.0, beta: 2.667 },
    initialConditions: { x: 1.0, y: 1.0, z: 1.0 },
    tDomain: [0.0, 25.0],
    f1: (x, y, z, p) => p.sigma * (y - x),
    f2: (x, y, z, p) => x * (p.rho - z) - y,
    f3: (x, y, z, p) => x * y - p.beta * z
  },
  {
    id: "selkov",
    name: "Sel'kov Glycolytic Biochemical Oscillator",
    discipline: "Biochemistry & Cellular Metabolism",
    description: "Models phosphofructokinase-catalyzed biochemical oscillations in yeast glycolysis with autonomous limit cycles.",
    latexEquations: [
      "\\frac{dx}{dt} = -x + a y + x^2 y",
      "\\frac{dy}{dt} = b - a y - x^2 y"
    ],
    vars: ["x (ADP)", "y (F6P)"],
    defaults: { a: 0.1, b: 0.6 },
    initialConditions: { x: 0.5, y: 0.5 },
    tDomain: [0.0, 40.0],
    f1: (x, y, z, p) => -x + p.a * y + x * x * y,
    f2: (x, y, z, p) => p.b - p.a * y - x * x * y
  },
  {
    id: "fitzhugh",
    name: "FitzHugh-Nagumo Action Potential Spike",
    discipline: "Neuroscience & Electrophysiology",
    description: "Two-dimensional reduction of the Hodgkin-Huxley squid giant axon model demonstrating threshold firing and refractory recovery.",
    latexEquations: [
      "\\frac{dv}{dt} = v - \\frac{v^3}{3} - w + I_{\\text{stim}}",
      "\\frac{dw}{dt} = \\epsilon (v + a - b w)"
    ],
    vars: ["v (Voltage)", "w (Recovery)"],
    defaults: { a: 0.7, b: 0.8, epsilon: 0.08, I_stim: 0.5 },
    initialConditions: { x: -1.0, y: 1.0 },
    tDomain: [0.0, 50.0],
    f1: (v, w, z, p) => v - (v ** 3) / 3.0 - w + p.I_stim,
    f2: (v, w, z, p) => p.epsilon * (v + p.a - p.b * w)
  },
  {
    id: "sir_waning",
    name: "SIRS Epidemic with Waning Immunity",
    discipline: "Epidemiology & Immunology",
    description: "Compartmental epidemic model with transmission, recovery, and waning immunity (R -> S transition) creating endemic damped oscillations.",
    latexEquations: [
      "\\frac{dS}{dt} = \\mu - \\beta S I - \\mu S + \\omega R",
      "\\frac{dI}{dt} = \\beta S I - (\\gamma + \\mu) I",
      "\\frac{dR}{dt} = \\gamma I - (\\omega + \\mu) R"
    ],
    vars: ["S", "I", "R"],
    defaults: { beta: 0.5, gamma: 0.15, mu: 0.01, omega: 0.05 },
    initialConditions: { x: 0.95, y: 0.05, z: 0.0 },
    tDomain: [0.0, 100.0],
    f1: (S, I, R, p) => p.mu - p.beta * S * I - p.mu * S + p.omega * R,
    f2: (S, I, R, p) => p.beta * S * I - (p.gamma + p.mu) * I,
    f3: (S, I, R, p) => p.gamma * I - (p.omega + p.mu) * R
  }
];

export const CustomDeSandbox: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("lorenz");
  const preset = useMemo(() => {
    return CUSTOM_PRESETS.find(p => p.id === selectedPresetId) || CUSTOM_PRESETS[0];
  }, [selectedPresetId]);

  const [params, setParams] = useState<Record<string, number>>(preset.defaults);
  const [initConds, setInitConds] = useState<Record<string, number>>(preset.initialConditions);

  useEffect(() => {
    setParams(preset.defaults);
    setInitConds(preset.initialConditions);
  }, [preset]);

  // Integrated Trajectories
  const trajectoryData = useMemo(() => {
    const is3D = !!preset.f3;
    const numSteps = is3D ? 1200 : 600;
    const [t0, tEnd] = preset.tDomain;
    const dt = (tEnd - t0) / numSteps;

    let cx = initConds.x ?? 1.0;
    let cy = initConds.y ?? 1.0;
    let cz = initConds.z ?? 0.0;

    const tPts: number[] = [t0];
    const xPts: number[] = [cx];
    const yPts: number[] = [cy];
    const zPts: number[] = [cz];

    for (let i = 0; i < numSteps; i++) {
      const tn = t0 + i * dt;

      // RK4 integration
      const k1x = preset.f1(cx, cy, cz, params);
      const k1y = preset.f2(cx, cy, cz, params);
      const k1z = preset.f3 ? preset.f3(cx, cy, cz, params) : 0;

      const k2x = preset.f1(cx + 0.5 * dt * k1x, cy + 0.5 * dt * k1y, cz + 0.5 * dt * k1z, params);
      const k2y = preset.f2(cx + 0.5 * dt * k1x, cy + 0.5 * dt * k1y, cz + 0.5 * dt * k1z, params);
      const k2z = preset.f3 ? preset.f3(cx + 0.5 * dt * k1x, cy + 0.5 * dt * k1y, cz + 0.5 * dt * k1z, params) : 0;

      const k3x = preset.f1(cx + 0.5 * dt * k2x, cy + 0.5 * dt * k2y, cz + 0.5 * dt * k2z, params);
      const k3y = preset.f2(cx + 0.5 * dt * k2x, cy + 0.5 * dt * k2y, cz + 0.5 * dt * k2z, params);
      const k3z = preset.f3 ? preset.f3(cx + 0.5 * dt * k2x, cy + 0.5 * dt * k2y, cz + 0.5 * dt * k2z, params) : 0;

      const k4x = preset.f1(cx + dt * k3x, cy + dt * k3y, cz + dt * k3z, params);
      const k4y = preset.f2(cx + dt * k3x, cy + dt * k3y, cz + dt * k3z, params);
      const k4z = preset.f3 ? preset.f3(cx + dt * k3x, cy + dt * k3y, cz + dt * k3z, params) : 0;

      cx += (dt / 6.0) * (k1x + 2 * k2x + 2 * k3x + k4x);
      cy += (dt / 6.0) * (k1y + 2 * k2y + 2 * k3y + k4y);
      cz += (dt / 6.0) * (k1z + 2 * k2z + 2 * k3z + k4z);

      if (isNaN(cx) || isNaN(cy) || Math.abs(cx) > 1e4 || Math.abs(cy) > 1e4) break;

      tPts.push(tn + dt);
      xPts.push(cx);
      yPts.push(cy);
      zPts.push(cz);
    }

    return { tPts, xPts, yPts, zPts, is3D };
  }, [preset, params, initConds]);

  // Canvas Ref for Phase Space / Trajectory
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);

    // Compute bounding box for projection
    const xVals = trajectoryData.xPts;
    const yVals = trajectoryData.is3D ? trajectoryData.zPts : trajectoryData.yPts;

    let minX = Math.min(...xVals);
    let maxX = Math.max(...xVals);
    let minY = Math.min(...yVals);
    let maxY = Math.max(...yVals);

    // Add padding margin
    const dx = (maxX - minX) * 0.1 || 1.0;
    const dy = (maxY - minY) * 0.1 || 1.0;
    minX -= dx;
    maxX += dx;
    minY -= dy;
    maxY += dy;

    const padding = 45;
    const toScreenX = (x: number) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
    const toScreenY = (y: number) => height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);

    // Grid lines
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.strokeRect(padding, padding, width - 2 * padding, height - 2 * padding);
    ctx.setLineDash([]);

    // Trajectory path with animated gradient styling
    ctx.lineWidth = 1.6;
    for (let i = 0; i < xVals.length - 1; i++) {
      const frac = i / xVals.length;
      // Color ramp from cyan to violet
      ctx.strokeStyle = `rgba(${Math.round(56 + frac * 150)}, ${Math.round(189 - frac * 100)}, ${Math.round(248)}, ${0.4 + 0.6 * frac})`;
      ctx.beginPath();
      ctx.moveTo(toScreenX(xVals[i]), toScreenY(yVals[i]));
      ctx.lineTo(toScreenX(xVals[i + 1]), toScreenY(yVals[i + 1]));
      ctx.stroke();
    }

    // Initial point
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(toScreenX(xVals[0]), toScreenY(yVals[0]), 5, 0, 2 * Math.PI);
    ctx.fill();

    // Final point
    const lastIdx = xVals.length - 1;
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(toScreenX(xVals[lastIdx]), toScreenY(yVals[lastIdx]), 5, 0, 2 * Math.PI);
    ctx.fill();
  }, [trajectoryData]);

  return (
    <div className="space-y-6 font-sans">
      {/* Precision Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
              <span className="font-semibold text-indigo-400 uppercase tracking-wider">
                Custom Systems & Mathematical Mechanics
              </span>
              <span>•</span>
              <span className="font-mono text-cyan-400">Lorenz Chaos, Glycolysis & Action Potentials</span>
              <span>•</span>
              <span className="text-slate-400">Adaptive Trajectory Phase Space</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Higher-Order & Chaotic Dynamical Systems Sandbox
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Explore advanced dynamical systems beyond textbook 1st-order models. Simulate the 3D Lorenz strange attractor, 
              biochemical Sel'kov limit cycles, and FitzHugh-Nagumo neural spike bursts with real-time numerical integration.
            </p>
          </div>
        </div>

        {/* Preset Selector Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {CUSTOM_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPresetId(p.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedPresetId === p.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Phase Projection, Right Parameters & Equations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Trajectory Projection (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>
                  {preset.name} — Phase Projection ({preset.vars[0]} vs {trajectoryData.is3D ? preset.vars[2] : preset.vars[1]})
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulated across $t \in [{preset.tDomain[0]}, {preset.tDomain[1]}]$ with RK4 integrator.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Start
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> End
              </span>
            </div>
          </div>

          {/* Canvas Rendering */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <canvas
              ref={canvasRef}
              width={700}
              height={440}
              className="w-full h-auto select-none"
            />
          </div>

          {/* Time Series Preview Ribbon */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <span>Time-Series Coordinate Evolution:</span>
              <span className="font-mono text-cyan-400 text-[11px]">
                {trajectoryData.tPts.length} Continuous Time Nodes
              </span>
            </div>
            <div className="h-28 bg-slate-950 rounded-lg border border-slate-800 p-2 relative">
              <svg viewBox="0 0 700 100" className="w-full h-full select-none">
                {/* Variable 1 */}
                <path
                  d={trajectoryData.tPts.map((t, i) => {
                    const x = 20 + (i / trajectoryData.tPts.length) * 660;
                    const val = trajectoryData.xPts[i];
                    const y = 50 - (val / 30.0) * 40;
                    return `${i === 0 ? "M" : "L"} ${x} ${Math.max(5, Math.min(95, y))}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.6"
                />
                {/* Variable 2 */}
                <path
                  d={trajectoryData.tPts.map((t, i) => {
                    const x = 20 + (i / trajectoryData.tPts.length) * 660;
                    const val = trajectoryData.yPts[i];
                    const y = 50 - (val / 30.0) * 40;
                    return `${i === 0 ? "M" : "L"} ${x} ${Math.max(5, Math.min(95, y))}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.4"
                  strokeDasharray="3 2"
                />
              </svg>
              <div className="absolute top-2 right-3 flex items-center gap-3 text-[10px] font-mono bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                <span className="text-sky-400 font-semibold">{preset.vars[0]}</span>
                <span className="text-purple-400 font-semibold">{preset.vars[1]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Mathematical Specifications & Live Parameter Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Equations Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-cyan-400 uppercase font-semibold">
                {preset.discipline}
              </span>
              <span className="font-mono text-slate-500">
                {preset.vars.length} Coupled States
              </span>
            </div>
            <h4 className="font-bold text-sm text-white">
              Governing Differential System
            </h4>
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 overflow-x-auto text-xs text-white">
              {preset.latexEquations.map((eq, i) => (
                <div key={i} className="py-0.5">
                  <MathView math={eq} displayMode={true} />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {preset.description}
            </p>
          </div>

          {/* Dynamic Parameters & Initial Conditions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Kinetic Parameters & State Perturbation</span>
              </h4>
              <button
                onClick={() => {
                  setParams(preset.defaults);
                  setInitConds(preset.initialConditions);
                }}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(params).map(([pName, pVal]) => (
                <div key={pName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-medium text-slate-300">{pName}</span>
                    <span className="font-mono font-bold text-cyan-400">{pVal.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(0.01, pVal * 0.2)}
                    max={pVal * 2.5}
                    step={pVal * 0.05}
                    value={pVal}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setParams(prev => ({ ...prev, [pName]: val }));
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>
              ))}
            </div>

            {/* Initial Condition Sliders */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Initial State Perturbation:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(initConds).map(([cKey, cVal]) => (
                  <div key={cKey} className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block">{cKey}(0)</span>
                    <input
                      type="number"
                      step="0.5"
                      value={cVal}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setInitConds(prev => ({ ...prev, [cKey]: val }));
                      }}
                      className="w-full bg-transparent text-center font-mono font-bold text-xs text-white focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
