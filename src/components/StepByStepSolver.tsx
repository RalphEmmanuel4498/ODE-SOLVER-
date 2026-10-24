/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sliders,
  Layers,
  ArrowRight,
  Download,
  Copy,
  Check,
  Info,
  TrendingUp,
  Cpu,
  Activity
} from "lucide-react";
import { MathView } from "./MathView";

interface Recommendation {
  category: string;
  method: string;
  suitability_score: number;
  status: "highly_recommended" | "feasible" | "limited" | "not_recommended";
  rationale: string;
}

interface StepData {
  step_number: number;
  title: string;
  description: string;
  math_latex: string;
  details: string[];
}

interface StepSolverResult {
  problem_title: string;
  is_coupled: boolean;
  state_names: string[];
  method_used: string;
  steps: StepData[];
  recommendations: {
    primary_recommendation: string;
    primary_category: string;
    recommendations: Recommendation[];
    system_profile: any;
  };
  t_eval: number[];
  trajectories: {
    t: number[];
    x_approx?: number[];
    y_approx?: number[];
    z_approx?: number[];
    u_approx?: number[];
    u_pade?: number[];
    x_ref?: number[];
    y_ref?: number[];
    z_ref?: number[];
    u_ref?: number[];
    error_x?: number[];
    error_y?: number[];
    error_series?: number[];
    error_pade?: number[];
  };
  summary_metrics: {
    max_error_x?: number;
    max_error_y?: number;
    max_error_series?: number;
    max_error_pade?: number;
    rmse_x?: number;
    rmse_y?: number;
    rmse_series?: number;
    rmse_pade?: number;
    wall_time_sec: number;
  };
}

interface StepByStepSolverProps {
  initialProblemType?: string;
}

export const StepByStepSolver: React.FC<StepByStepSolverProps> = ({
  initialProblemType = "coupled_predator_prey"
}) => {
  const [problemType, setProblemType] = useState<string>(initialProblemType);
  const [selectedMethod, setSelectedMethod] = useState<string>("ADM");
  const [order, setOrder] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<StepSolverResult | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState<"derivation" | "recommendations" | "trajectories">("derivation");
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const fetchSolution = async (pType: string, meth: string, ord: number) => {
    setLoading(true);
    try {
      const resp = await fetch("/api/step-by-step-solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemType: pType,
          method: meth,
          order: ord,
          parameters: pType === "coupled_predator_prey" 
            ? { alpha: 1.2, beta: 0.6, gamma: 0.8, delta: 0.3 }
            : pType === "compartmental_sir"
            ? { beta: 0.35, gamma: 0.10, mu: 0.01, Lambda: 0.01 }
            : { a: 2.0, b: -1.0, c: 1.0 },
          initialConditions: pType === "coupled_predator_prey"
            ? { x: 2.0, y: 1.0 }
            : pType === "compartmental_sir"
            ? { S: 0.99, I: 0.01, R: 0.0 }
            : { u: 0.0 },
          tSpan: [0.0, 2.0]
        })
      });
      if (!resp.ok) throw new Error("Step-by-step computation failed");
      const data = await resp.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolution(problemType, selectedMethod, order);
  }, [problemType, selectedMethod, order]);

  // Color helper for recommendation status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "highly_recommended":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Highly Recommended</span>;
      case "feasible":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">Feasible</span>;
      case "limited":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Limited Applicability</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">Not Recommended</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Coupled & Single ODE Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Rigorous Mathematical Steps
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Multi-Method Selection Matrix
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Step-by-Step Differential Equation Derivation & Method Recommender
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Provides complete symbolic derivations for single ODEs and coupled nonlinear dynamical systems. 
              The engine compares analytical, semi-analytical, and numerical approaches, detailing operator decomposition, 
              Adomian polynomials, homotopy components, Padé acceleration, and numerical verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSolution(problemType, selectedMethod, order)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-sm disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Re-derive Steps
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Problem Selection & Method */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Problem System</label>
          <select
            value={problemType}
            onChange={e => setProblemType(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="coupled_predator_prey">Coupled Lotka-Volterra Predator-Prey</option>
            <option value="compartmental_sir">Coupled SIR Epidemic Dynamical System</option>
            <option value="riccati_ivp">Nonlinear Quadratic Riccati Equation</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Semi-Analytical Framework</label>
          <select
            value={selectedMethod}
            onChange={e => setSelectedMethod(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="ADM">Adomian Decomposition Method (ADM)</option>
            <option value="HPM">Homotopy Perturbation Method (HPM)</option>
            <option value="HAM">Homotopy Analysis Method (HAM)</option>
            <option value="DTM">Differential Transform Method (DTM)</option>
            <option value="VIM">Variational Iteration Method (VIM)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Truncation Order (N)</label>
          <select
            value={order}
            onChange={e => setOrder(parseInt(e.target.value, 10))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value={2}>Order 2 (Quadratic Terms)</option>
            <option value={3}>Order 3 (Cubic Terms)</option>
            <option value={4}>Order 4 (Quartic Terms)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Target View</label>
          <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setActiveTab("derivation")}
              className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all ${
                activeTab === "derivation" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Derivation
            </button>
            <button
              onClick={() => setActiveTab("recommendations")}
              className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all ${
                activeTab === "recommendations" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Matrix
            </button>
            <button
              onClick={() => setActiveTab("trajectories")}
              className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all ${
                activeTab === "trajectories" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Plot
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-mono">Evaluating symbolic steps and operator inversions...</p>
        </div>
      ) : result ? (
        <div>
          {/* TAB 1: STEP-BY-STEP DERIVATION CARDS */}
          {activeTab === "derivation" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-semibold text-slate-300">
                  {result.problem_title} — Step-by-Step Mathematical Derivation ({result.steps.length} Steps)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Wall Time: {(result.summary_metrics.wall_time_sec * 1000).toFixed(1)} ms
                </span>
              </div>

              <div className="space-y-4">
                {result.steps.map(step => {
                  const isExpanded = expandedStep === step.step_number;
                  return (
                    <div
                      key={step.step_number}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all"
                    >
                      <button
                        onClick={() => setExpandedStep(isExpanded ? null : step.step_number)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs font-bold font-mono">
                            {step.step_number}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-white tracking-tight">
                              {step.title}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {step.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(step.math_latex);
                              setCopiedStep(step.step_number);
                              setTimeout(() => setCopiedStep(null), 2000);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            title="Copy LaTeX"
                          >
                            {copiedStep === step.step_number ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-4">
                          {/* KaTeX Render Box */}
                          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 overflow-x-auto">
                            <MathView math={step.math_latex} displayMode={true} />
                          </div>

                          {/* Explanatory Details Bullet List */}
                          {step.details && step.details.length > 0 && (
                            <div className="space-y-1.5 pl-2 border-l-2 border-indigo-500/40">
                              {step.details.map((item, idx) => (
                                <div key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                  <span className="text-indigo-400 font-mono mt-0.5">•</span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: METHOD RECOMMENDATION & SELECTION MATRIX */}
          {activeTab === "recommendations" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Automated Method Recommendation Engine
                    </h3>
                    <p className="text-xs text-slate-400">
                      Evaluates differential order, non-linearity, stiffness, coupling, and singularities across 12 scientific paradigms.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Optimal Recommended Method:</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {result.recommendations.primary_recommendation}
                    </span>
                    <span className="text-xs text-slate-400 ml-2 font-mono">
                      ({result.recommendations.primary_category})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 border border-slate-700">
                      Coupled: {result.recommendations.system_profile.is_coupled ? "Yes" : "No"}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 border border-slate-700">
                      Nonlinear: {result.recommendations.system_profile.is_nonlinear ? "Yes" : "No"}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 border border-slate-700">
                      Stiff: {result.recommendations.system_profile.is_stiff ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                {/* Recommendations Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="pb-3 px-3">Paradigm</th>
                        <th className="pb-3 px-3">Method Name</th>
                        <th className="pb-3 px-3">Suitability Score</th>
                        <th className="pb-3 px-3">Status</th>
                        <th className="pb-3 px-3">Mathematical Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {result.recommendations.recommendations.map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 text-slate-400 font-medium">{rec.category}</td>
                          <td className="py-3 px-3 text-white font-semibold">{rec.method}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    rec.suitability_score > 80
                                      ? "bg-emerald-500"
                                      : rec.suitability_score > 60
                                      ? "bg-blue-500"
                                      : rec.suitability_score > 40
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${rec.suitability_score}%` }}
                                />
                              </div>
                              <span className="font-mono text-slate-300">{rec.suitability_score}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">{getStatusBadge(rec.status)}</td>
                          <td className="py-3 px-3 text-slate-300 max-w-md">{rec.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRAJECTORIES & NUMERICAL COMPARISON */}
          {activeTab === "trajectories" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Continuous Semi-Analytical vs Numerical Reference Solution
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Comparison over time domain t in [0, 2] between the step-by-step truncated analytical series and high-precision DOP853 Runge-Kutta numerical integration.
                </p>

                {/* Quantitative Metric Badges */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {result.summary_metrics.max_error_x !== undefined && (
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">State 1 Max Error</span>
                      <span className="text-base font-bold text-cyan-400 font-mono">
                        {result.summary_metrics.max_error_x.toExponential(3)}
                      </span>
                    </div>
                  )}
                  {result.summary_metrics.max_error_y !== undefined && (
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">State 2 Max Error</span>
                      <span className="text-base font-bold text-indigo-400 font-mono">
                        {result.summary_metrics.max_error_y.toExponential(3)}
                      </span>
                    </div>
                  )}
                  {result.summary_metrics.max_error_series !== undefined && (
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Series Max Error</span>
                      <span className="text-base font-bold text-amber-400 font-mono">
                        {result.summary_metrics.max_error_series.toExponential(3)}
                      </span>
                    </div>
                  )}
                  {result.summary_metrics.max_error_pade !== undefined && (
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Padé Accelerated Error</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        {result.summary_metrics.max_error_pade.toExponential(3)}
                      </span>
                    </div>
                  )}
                </div>

                {/* SVG Visual Plot */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                  <div className="h-64 relative flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 600 220">
                      {/* Grid lines */}
                      <line x1="50" y1="20" x2="50" y2="190" stroke="#334155" strokeWidth="1" />
                      <line x1="50" y1="190" x2="580" y2="190" stroke="#334155" strokeWidth="1" />

                      {/* Reference line 1 */}
                      {result.trajectories.x_ref && (
                        <polyline
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          points={result.trajectories.t
                            .map((t, idx) => {
                              const x = 50 + (t / 2.0) * 520;
                              const val = result.trajectories.x_ref![idx];
                              const y = 190 - (val / 3.0) * 160;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />
                      )}

                      {/* Approx line 1 */}
                      {result.trajectories.x_approx && (
                        <polyline
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          points={result.trajectories.t
                            .map((t, idx) => {
                              const x = 50 + (t / 2.0) * 520;
                              const val = result.trajectories.x_approx![idx];
                              const y = 190 - (val / 3.0) * 160;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />
                      )}

                      {/* Reference line 2 */}
                      {result.trajectories.y_ref && (
                        <polyline
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="2.5"
                          points={result.trajectories.t
                            .map((t, idx) => {
                              const x = 50 + (t / 2.0) * 520;
                              const val = result.trajectories.y_ref![idx];
                              const y = 190 - (val / 3.0) * 160;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />
                      )}

                      {/* Approx line 2 */}
                      {result.trajectories.y_approx && (
                        <polyline
                          fill="none"
                          stroke="#fb7185"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          points={result.trajectories.t
                            .map((t, idx) => {
                              const x = 50 + (t / 2.0) * 520;
                              const val = result.trajectories.y_approx![idx];
                              const y = 190 - (val / 3.0) * 160;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />
                      )}
                    </svg>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-6 mt-3 text-xs text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-0.5 bg-sky-400 inline-block" />
                      State 1 Numerical (DOP853)
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-0.5 bg-indigo-400 border-b border-dashed inline-block" />
                      State 1 Analytical Series ({selectedMethod})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-0.5 bg-rose-500 inline-block" />
                      State 2 Numerical (DOP853)
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-0.5 bg-rose-300 border-b border-dashed inline-block" />
                      State 2 Analytical Series ({selectedMethod})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
