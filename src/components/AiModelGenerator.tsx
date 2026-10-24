/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  Layers,
  Activity,
  CheckCircle2,
  Sliders,
  Zap,
  Info,
  Copy,
  Check,
  Compass,
  TrendingUp,
  Cpu,
  Share2
} from "lucide-react";
import { MathView } from "./MathView";

interface AiGeneratedModel {
  name: string;
  discipline: string;
  description: string;
  state_vars: Array<{
    id: string;
    name: string;
    description: string;
    initial_value: number;
    color?: string;
  }>;
  parameters: Record<string, number>;
  latex_equations: string[];
  links: Array<{
    from: string | null;
    to: string | null;
    rate: string;
    rate_latex: string;
  }>;
  conservation_laws?: string[];
  method_recommendation?: string;
  educational_notes?: string;
}

interface AiModelGeneratorProps {
  onImportToDiagramStudio?: (model: AiGeneratedModel) => void;
  onImportToSolver?: (latexEquations: string[], modelName: string) => void;
}

const INSPIRATION_PROMPTS = [
  {
    title: "12-Compartment Whole-Body PBPK Drug Model",
    prompt: "12-compartment physiologically-based pharmacokinetic model tracking monoclonal antibody circulation through plasma, brain, lungs, heart, liver, kidneys, gut, spleen, muscle, adipose, bone, and renal elimination."
  },
  {
    title: "10-Compartment COVID-19 Clinical Care Model",
    prompt: "10-compartment epidemiological and clinical staging model with susceptible, vaccinated, exposed, asymptomatic, symptomatic, quarantined, hospitalized, intensive care unit (ICU), recovered, and deceased compartments."
  },
  {
    title: "10-Trophic Marine Ecosystem Bioaccumulation",
    prompt: "10-compartment marine trophic food web with primary producers, zooplankton, benthic invertebrates, forage fish, predator fish, apex sharks, detritus, and microbial decomposers tracking microplastic bioaccumulation."
  },
  {
    title: "Coupled Nonlinear FitzHugh-Nagumo Neural Mass",
    prompt: "Coupled nonlinear neural mass model with 8 state variables representing pyramidal excitatory neurons, inhibitory interneurons, membrane synaptic conductances, and recovery variables under external electrical stimulus."
  }
];

export const AiModelGenerator: React.FC<AiModelGeneratorProps> = ({
  onImportToDiagramStudio,
  onImportToSolver
}) => {
  const [prompt, setPrompt] = useState("");
  const [domain, setDomain] = useState("Pharmacokinetics & Physiology");
  const [numCompartments, setNumCompartments] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedModel, setGeneratedModel] = useState<AiGeneratedModel | null>(null);
  const [copiedLatex, setCopiedLatex] = useState(false);

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = customPrompt || prompt;
    if (!textToUse.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/formulate-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToUse,
          targetCompartments: numCompartments,
          domain
        })
      });

      if (!res.ok) {
        throw new Error(`Generation failed: ${res.statusText}`);
      }

      const data = await res.json();
      setGeneratedModel(data);
    } catch (err: any) {
      setError(err.message || "Failed to formulate model with AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                AI Mathematical Copilot
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                10–12 Compartment Synthesizer
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              AI Mathematical Model Formulator & Differential Synthesizer
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Describe any physical, biological, ecological, or engineering system in natural language. 
              The Gemini reasoning engine derives governing coupled differential equations, balances conservation laws, 
              creates 10–12 state compartments, and configures numerical/semi-analytical solution methods.
            </p>
          </div>
        </div>
      </div>

      {/* Input Formulation Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div>
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
            System Description & Physical Assumptions
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. 10-compartment oncology tumor-immune interaction model with T-cells, cytokines, vascular growth, and chemotherapy infusion..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none font-sans"
          />
        </div>

        {/* Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Scientific Discipline</label>
            <select
              value={domain}
              onChange={e => setDomain(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Pharmacokinetics & Physiology">Pharmacokinetics & PBPK</option>
              <option value="Epidemiology & Public Health">Epidemiology & Immunology</option>
              <option value="Ecology & Multi-Trophic Food Webs">Ecology & Boreal Trophic Webs</option>
              <option value="Biochemical Reaction Networks">Biochemical Kinetics & Enzymes</option>
              <option value="Neuroscience & Synaptic Networks">Neuroscience & Neural Mass</option>
              <option value="Chemical Engineering & Reactors">Chemical Reactor Networks</option>
              <option value="Mathematical Finance & Economics">Macroeconomics & Dynamic Markets</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1.5">
              <span>Target Compartment Count</span>
              <span className="font-mono text-cyan-400">{numCompartments} States</span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              step="1"
              value={numCompartments}
              onChange={e => setNumCompartments(parseInt(e.target.value, 10))}
              className="w-full mt-2 accent-indigo-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => handleGenerate()}
              disabled={loading || !prompt.trim()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Model...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Synthesize Model with AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Inspiration Chips */}
        <div className="pt-2 border-t border-slate-800">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
            Inspiration Examples (Click to Generate):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INSPIRATION_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(item.prompt);
                  handleGenerate(item.prompt);
                }}
                className="text-left p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl transition-colors group"
              >
                <div className="text-xs font-semibold text-indigo-300 group-hover:text-white flex items-center justify-between">
                  <span>{item.title}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {item.prompt}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Generated Model Results */}
      {generatedModel && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <span className="font-mono text-cyan-400 uppercase font-semibold">
                  {generatedModel.discipline}
                </span>
                <span>·</span>
                <span className="font-mono text-indigo-400">
                  {generatedModel.state_vars.length} Compartments
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {generatedModel.name}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {generatedModel.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (onImportToDiagramStudio) {
                    onImportToDiagramStudio(generatedModel);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Open in Diagram Studio</span>
              </button>

              <button
                onClick={() => {
                  if (onImportToSolver) {
                    onImportToSolver(generatedModel.latex_equations, generatedModel.name);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Solve in Equation Hub</span>
              </button>
            </div>
          </div>

          {/* Governing Coupled Differential Equations in KaTeX */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Governing Coupled Differential Equations ({generatedModel.latex_equations.length} ODEs)
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedModel.latex_equations.join("\n"));
                  setCopiedLatex(true);
                  setTimeout(() => setCopiedLatex(false), 2000);
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedLatex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLatex ? "Copied" : "Copy LaTeX"}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 overflow-x-auto">
              {generatedModel.latex_equations.map((eq, idx) => (
                <div key={idx} className="py-1 border-b border-slate-800/60 last:border-0">
                  <MathView math={eq} displayMode={true} />
                </div>
              ))}
            </div>
          </div>

          {/* Compartments & Parameters Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compartments Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                State Compartments ({generatedModel.state_vars.length} Nodes)
              </span>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Variable</th>
                      <th className="p-2.5">Meaning</th>
                      <th className="p-2.5 font-mono">IC (t=0)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {generatedModel.state_vars.map((sv, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-mono text-cyan-400 font-bold">{sv.id}</td>
                        <td className="p-2.5 font-bold text-white">{sv.name}</td>
                        <td className="p-2.5 text-slate-300 text-[11px]">{sv.description}</td>
                        <td className="p-2.5 font-mono text-slate-300">{sv.initial_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Parameters Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Kinetic Parameters & Rates ({Object.keys(generatedModel.parameters || {}).length} Params)
              </span>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Parameter</th>
                      <th className="p-2.5 font-mono">Nominal Value</th>
                      <th className="p-2.5">Dimension / Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {Object.entries(generatedModel.parameters || {}).map(([pName, pVal], idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-mono font-bold text-indigo-300">{pName}</td>
                        <td className="p-2.5 font-mono text-cyan-400 font-bold">{pVal}</td>
                        <td className="p-2.5 text-slate-400 text-[11px]">Kinetic transfer rate constant</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Conservation & Educational Recommendations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            {generatedModel.conservation_laws && (
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                  Conservation Laws & Invariant Manifold
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {generatedModel.conservation_laws.join("; ")}
                </p>
              </div>
            )}

            {generatedModel.method_recommendation && (
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">
                  Recommended Solution Paradigm
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {generatedModel.method_recommendation}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
