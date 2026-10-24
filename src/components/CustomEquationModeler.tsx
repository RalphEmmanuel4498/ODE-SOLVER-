/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  ArrowRight,
  Download,
  Copy,
  Check,
  Zap,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Share2,
  TrendingUp,
  CircleDot,
  LayoutGrid,
  BookOpen,
  GraduationCap,
  Printer,
  Cloud,
  CloudUpload,
  FolderArchive,
  Trash2,
  LogIn,
  Save,
  X
} from "lucide-react";
import { MathView } from "./MathView";
import { AcademicPaperViewer, AcademicReportResult } from "./AcademicPaperViewer";
import { useAuth } from "../firebase/AuthContext";
import {
  createCustomModel,
  deleteCustomModel,
  subscribeUserModels,
  CustomModelDoc,
} from "../firebase/modelsService";

interface CompartmentNode {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  initialValue: number;
  description?: string;
}

interface FlowLink {
  id: string;
  fromNodeId: string | null;
  toNodeId: string | null;
  rateFormula: string;
  fluxFormula?: string;
  rateLatex: string;
  fluxLatex?: string;
  parameterNames: string[];
}

interface StepItem {
  step_number: number;
  title: string;
  description: string;
  math_latex: string;
  details: string[];
}

interface CustomSolveResult {
  problem_title: string;
  state_vars: string[];
  parameters: Record<string, number>;
  initial_conditions: Record<string, number>;
  equations_latex: string[];
  method_used: string;
  order: number;
  steps: StepItem[];
  nodes: CompartmentNode[];
  links: FlowLink[];
  t_eval: number[];
  trajectories: {
    t: number[];
    approx: Record<string, number[]>;
    ref: Record<string, number[]>;
    error: Record<string, number[]>;
  };
  summary_metrics: {
    max_errors: Record<string, number>;
    rmses: Record<string, number>;
    wall_time_sec: number;
    converged: boolean;
  };
}

interface TemplatePreset {
  name: string;
  equations: string;
  params: Record<string, number>;
  ics: Record<string, number>;
  tEnd: number;
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    name: "6-Compartment Academic Model (Exact User LaTeX)",
    equations: `\\begin{equation}
\\left.\\begin{aligned}
\\dfrac{dS}{dt} &= \\Lambda + \\delta\\,R(t) - \\bigl(\\beta_1 u_1(t)+\\mu\\bigr)S(t)\\\\[8pt]
\\dfrac{dE}{dt} &= \\beta_1 u_1(t)\\,S(t) - \\bigl(\\beta_2+\\mu\\bigr)E(t)\\\\[8pt]
\\dfrac{dA}{dt} &= \\beta_2\\,E(t) - \\bigl(\\beta_3 u_2(t)+\\alpha+\\mu\\bigr)A(t)\\\\[8pt]
\\dfrac{dC}{dt} &= \\bigl(\\beta_3 u_2(t)+\\alpha\\bigr)A(t) - \\bigl(\\beta_4+\\gamma+\\mu\\bigr)C(t)\\\\[8pt]
\\dfrac{dL}{dt} &= \\beta_4\\,C(t) - \\mu\\,L(t)\\\\[8pt]
\\dfrac{dR}{dt} &= \\gamma\\,C(t) - \\bigl(\\delta+\\mu\\bigr)R(t)
\\end{aligned}\\right\\}
\\label{eq:model1}
\\end{equation}

\\noindent subject to the initial conditions:
\\begin{equation}
S(0)=S_0>0,\\quad E(0)\\geq 0,\\quad A(0)\\geq 0,\\quad C(0)=0,\\quad L(0)=0,\\quad R(0)=0.
\\label{eq:ic1}
\\end{equation}`,
    params: {
      Lambda: 10.0,
      delta: 0.05,
      beta_1: 0.002,
      u_1: 0.8,
      mu: 0.02,
      beta_2: 0.15,
      beta_3: 0.08,
      u_2: 0.5,
      alpha: 0.05,
      beta_4: 0.1,
      gamma: 0.12
    },
    ics: { S: 100.0, E: 15.0, A: 5.0, C: 0.0, L: 0.0, R: 0.0 },
    tEnd: 2.0
  },
  {
    name: "8-Compartment COVID-19 SVEIHQRD System (8 States)",
    equations: `dS/dt = Lambda - beta*S*I - v_rate*S - mu*S
dV/dt = v_rate*S - (1 - eff)*beta*V*I - mu*V
dE/dt = beta*S*I + (1 - eff)*beta*V*I - sigma*E - mu*E
dI/dt = sigma*E - gamma*I - delta_d*I - mu*I
dH/dt = gamma*I*h_rate - gamma_h*H - mu*H
dQ/dt = gamma*I*(1 - h_rate) - gamma_q*Q - mu*Q
dR/dt = gamma_h*H + gamma_q*Q - mu*R
dD/dt = delta_d*I`,
    params: {
      Lambda: 15.0,
      beta: 0.003,
      v_rate: 0.02,
      eff: 0.85,
      sigma: 0.2,
      gamma: 0.15,
      delta_d: 0.01,
      h_rate: 0.3,
      gamma_h: 0.1,
      gamma_q: 0.12,
      mu: 0.01
    },
    ics: { S: 500.0, V: 50.0, E: 20.0, I: 5.0, H: 0.0, Q: 0.0, R: 0.0, D: 0.0 },
    tEnd: 4.0
  },
  {
    name: "7-Compartment Multi-Stage Latent Model (7 States)",
    equations: `dS/dt = Lambda - beta*S*(I1 + I2) - mu*S
dE1/dt = beta*S*(I1 + I2) - k1*E1 - mu*E1
dE2/dt = k1*E1 - k2*E2 - mu*E2
dI1/dt = k2*E2 - gamma1*I1 - mu*I1
dI2/dt = gamma1*I1 - gamma2*I2 - delta*I2 - mu*I2
dR/dt = gamma2*I2 - mu*R
dD/dt = delta*I2`,
    params: {
      Lambda: 10.0,
      beta: 0.002,
      k1: 0.4,
      k2: 0.35,
      gamma1: 0.2,
      gamma2: 0.15,
      delta: 0.02,
      mu: 0.015
    },
    ics: { S: 250.0, E1: 10.0, E2: 5.0, I1: 2.0, I2: 0.0, R: 0.0, D: 0.0 },
    tEnd: 5.0
  },
  {
    name: "SIR Epidemic System (3 States)",
    equations: "dS/dt = -beta*S*I\ndI/dt = beta*S*I - gamma*I\ndR/dt = gamma*I",
    params: { beta: 0.5, gamma: 0.2 },
    ics: { S: 0.99, I: 0.01, R: 0.0 },
    tEnd: 15.0
  },
  {
    name: "SEIR Latent Model (4 States)",
    equations: "dS/dt = -beta*S*I\ndE/dt = beta*S*I - sigma*E\ndI/dt = sigma*E - gamma*I\ndR/dt = gamma*I",
    params: { beta: 0.8, sigma: 0.4, gamma: 0.2 },
    ics: { S: 0.99, E: 0.008, I: 0.002, R: 0.0 },
    tEnd: 20.0
  },
  {
    name: "Lotka-Volterra Predator-Prey (2 States)",
    equations: "dx/dt = alpha*x - beta*x*y\ndy/dt = delta*x*y - gamma*y",
    params: { alpha: 1.1, beta: 0.4, delta: 0.1, gamma: 0.4 },
    ics: { x: 5.0, y: 2.0 },
    tEnd: 12.0
  },
  {
    name: "Two-Compartment PK/PD (2 States)",
    equations: "dC1/dt = -k12*C1 + k21*C2 - ke*C1\ndC2/dt = k12*C1 - k21*C2",
    params: { k12: 0.3, k21: 0.15, ke: 0.1 },
    ics: { C1: 100.0, C2: 0.0 },
    tEnd: 24.0
  },
  {
    name: "Nonlinear Riccati ODE (1 State)",
    equations: "du/dt = 1 - u^2",
    params: {},
    ics: { u: 0.0 },
    tEnd: 2.0
  }
];

export const CustomEquationModeler: React.FC = () => {
  // Input equations state - initialized to user's 6-state clinical model
  const [equationsText, setEquationsText] = useState<string>(TEMPLATE_PRESETS[0].equations);
  const [selectedMethod, setSelectedMethod] = useState<string>("ADM");
  const [truncationOrder, setTruncationOrder] = useState<number>(3);
  const [hbarValue, setHbarValue] = useState<number>(-1.0);
  const [tEnd, setTEnd] = useState<number>(2.0);

  // Dynamic parameters & initial conditions
  const [userParams, setUserParams] = useState<Record<string, number>>(TEMPLATE_PRESETS[0].params);
  const [userIcs, setUserIcs] = useState<Record<string, number>>(TEMPLATE_PRESETS[0].ics);

  // Execution & results state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [solution, setSolution] = useState<CustomSolveResult | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [copiedTikZ, setCopiedTikZ] = useState(false);

  // Academic Research Paper & Derivation Report state
  const [academicReport, setAcademicReport] = useState<AcademicReportResult | null>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [activeViewMode, setActiveViewMode] = useState<"all" | "diagram" | "paper">("all");

  // Canvas visual nodes & links (allows dragging)
  const [diagramNodes, setDiagramNodes] = useState<CompartmentNode[]>([]);
  const [diagramLinks, setDiagramLinks] = useState<FlowLink[]>([]);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showFluxRate, setShowFluxRate] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Firebase Auth & Cloud Firestore Persistence State
  const { user, signInWithGoogle } = useAuth();
  const [savedModels, setSavedModels] = useState<CustomModelDoc[]>([]);
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>("");
  const [saveDescription, setSaveDescription] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Subscribe to real-time updates of user models from Cloud Firestore
  useEffect(() => {
    if (!user) {
      setSavedModels([]);
      return;
    }
    const unsubscribe = subscribeUserModels(
      user.uid,
      (models) => {
        setSavedModels(models);
      },
      (err) => {
        console.error("Failed to load models from Firestore:", err);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleSaveToCloud = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!saveTitle.trim()) {
      alert("Please enter a title for your model.");
      return;
    }
    setIsSaving(true);
    try {
      const rawLines = equationsText.split("\n").filter((l) => l.trim().length > 0);
      await createCustomModel({
        title: saveTitle.trim(),
        description: saveDescription.trim(),
        equations: rawLines.length > 0 ? rawLines : [equationsText],
        compartments: solution?.state_vars || Object.keys(userIcs),
        parameters: Object.keys(userParams),
        defaultParams: userParams,
        defaultInitialConditions: userIcs,
        derivationMethod: selectedMethod,
        derivationNotes: academicReport ? `Analytical Derivation Method: ${selectedMethod}` : "",
      });
      setSaveSuccessMsg("Model saved to Cloud Firestore!");
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setShowSaveModal(false);
        setSaveTitle("");
        setSaveDescription("");
      }, 1200);
    } catch (err: any) {
      alert("Error saving model: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSavedModel = (m: CustomModelDoc) => {
    setEquationsText(m.equations.join("\n"));
    if (m.defaultParams && Object.keys(m.defaultParams).length > 0) {
      setUserParams(m.defaultParams);
    }
    if (m.defaultInitialConditions && Object.keys(m.defaultInitialConditions).length > 0) {
      setUserIcs(m.defaultInitialConditions);
    }
    if (m.derivationMethod) {
      setSelectedMethod(m.derivationMethod);
    }
    setShowSavedModal(false);
  };

  const handleDeleteSavedModel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this saved model from Cloud Firestore?")) {
      try {
        await deleteCustomModel(id);
      } catch (err: any) {
        alert("Failed to delete model: " + err.message);
      }
    }
  };

  // Generate full peer-reviewed research manuscript (.tex, KaTeX, Proofs)
  const handleGenerateAcademicReport = async (
    methodOverride?: string,
    hbarOverride?: number,
    orderOverride?: number
  ) => {
    setReportLoading(true);
    try {
      const activeMethod = methodOverride || selectedMethod;
      const activeHbar = hbarOverride !== undefined ? hbarOverride : hbarValue;
      const activeOrder = orderOverride || 15;

      const rawText = equationsText.trim();
      const res = await fetch("/api/generate-academic-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName: solution?.problem_title || "Dynamical Compartment System",
          equationsLatex: solution?.equations_latex || rawText.split("\n").filter(l => l.trim()),
          stateVars: solution?.state_vars || Object.keys(userIcs),
          parameters: userParams,
          initialConditions: userIcs,
          method: activeMethod,
          order: activeOrder,
          hbar: activeHbar,
          tSpan: [0.0, tEnd],
          numPoints: 101
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate academic report.");
      }

      const reportData: AcademicReportResult = await res.json();
      setAcademicReport(reportData);
    } catch (err: any) {
      console.error("Report generation error:", err);
      setError("Academic report generation: " + (err.message || String(err)));
    } finally {
      setReportLoading(false);
    }
  };

  // Execute solve and compartment generation
  const handleSolve = async () => {
    setLoading(true);
    setError(null);
    try {
      const rawText = equationsText.trim();
      if (!rawText) {
        throw new Error("Please enter at least one differential equation or paste LaTeX equations.");
      }

      const res = await fetch("/api/solve-custom-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equationsRaw: rawText,
          method: selectedMethod,
          order: truncationOrder,
          parameters: userParams,
          initialConditions: userIcs,
          tSpan: [0.0, tEnd],
          hbar: hbarValue
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Solver returned error ${res.statusText}`);
      }

      const data: CustomSolveResult = await res.json();
      setSolution(data);

      // Populate discovered parameters and initial conditions
      setUserParams(data.parameters);
      setUserIcs(data.initial_conditions);

      // Position compartment nodes nicely
      setDiagramNodes(data.nodes);
      setDiagramLinks(data.links);

      // Concurrently synthesize academic research report
      handleGenerateAcademicReport(selectedMethod, hbarValue, 15);
    } catch (err: any) {
      setError(err.message || "Failed to solve differential equation system.");
    } finally {
      setLoading(false);
    }
  };

  // Run on initial mount with default SIR
  useEffect(() => {
    handleSolve();
  }, []);

  // Preset selector
  const loadPreset = (p: typeof TEMPLATE_PRESETS[0]) => {
    setEquationsText(p.equations);
    setUserParams(p.params);
    setUserIcs(p.ics);
    setTEnd(p.tEnd);
  };

  // Node Dragging on Compartment Diagram
  const handleMouseDownNode = (e: React.MouseEvent, node: CompartmentNode) => {
    e.stopPropagation();
    setDraggingNodeId(node.id);
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const newX = Math.max(50, Math.min(rect.width - 50, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(50, Math.min(rect.height - 50, e.clientY - rect.top - dragOffset.y));
    setDiagramNodes(prev =>
      prev.map(n => (n.id === draggingNodeId ? { ...n, x: Math.round(newX), y: Math.round(newY) } : n))
    );
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  // 1. Pipeline / Stream Flow Layout (Default for biological/epidemic stages)
  const applyPipelineLayout = () => {
    const count = diagramNodes.length;
    if (count === 0) return;
    if (count <= 4) {
      setDiagramNodes(prev =>
        prev.map((n, idx) => ({
          ...n,
          x: 160 + idx * 240,
          y: 240
        }))
      );
    } else if (count <= 7) {
      const mainCount = count - 1;
      const spacing = Math.max(120, Math.floor(820 / Math.max(1, mainCount)));
      setDiagramNodes(prev =>
        prev.map((n, idx) => {
          if (idx < mainCount) {
            return { ...n, x: 120 + idx * spacing, y: 180 };
          } else {
            return { ...n, x: 120 + Math.floor((mainCount - 1) * spacing / 2), y: 360 };
          }
        })
      );
    } else {
      const cols = Math.ceil(count / 2);
      const spacing = Math.max(110, Math.floor(860 / Math.max(1, cols)));
      setDiagramNodes(prev =>
        prev.map((n, idx) => {
          const row = idx < cols ? 0 : 1;
          const col = row === 0 ? idx : idx - cols;
          return {
            ...n,
            x: 110 + col * spacing,
            y: 170 + row * 180
          };
        })
      );
    }
  };

  // 2. Circular / Radial Layout
  const applyCircularLayout = () => {
    const count = diagramNodes.length;
    if (count === 0) return;
    const centerX = 500;
    const centerY = 250;
    const radius = Math.min(230, Math.max(140, count * 32));
    setDiagramNodes(prev =>
      prev.map((n, idx) => {
        const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
        return {
          ...n,
          x: Math.round(centerX + radius * Math.cos(angle)),
          y: Math.round(centerY + radius * Math.sin(angle))
        };
      })
    );
  };

  // 3. Two-Tier Matrix Layout
  const applyMatrixLayout = () => {
    const count = diagramNodes.length;
    if (count === 0) return;
    const cols = Math.ceil(count / 2);
    const spacing = Math.max(120, Math.floor(860 / Math.max(1, cols)));
    setDiagramNodes(prev =>
      prev.map((n, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        return {
          ...n,
          x: 120 + col * spacing,
          y: 170 + row * 180
        };
      })
    );
  };

  // Download SVG
  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custom_compartment_diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate TikZ
  const tikzCode = useMemo(() => {
    if (!solution) return "";
    let code = `\\documentclass{standalone}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}\n\\begin{document}\n\\begin{tikzpicture}[\n  compartment/.style={rectangle, rounded corners=6pt, minimum width=2.0cm, minimum height=1.2cm, text centered, draw=black!70, line width=1.2pt, fill=blue!10, font=\\bfseries},\n  rate/.style={-{Stealth[length=3mm, width=2.5mm]}, line width=1.3pt, draw=black!80},\n  rate_label/.style={midway, above, font=\\small\\itshape}\n]\n\n`;
    diagramNodes.forEach(node => {
      const tikzX = (node.x / 90).toFixed(2);
      const tikzY = (-node.y / 90).toFixed(2);
      code += `  \\node[compartment] (${node.id}) at (${tikzX}, ${tikzY}) {$${node.name}$};\n`;
    });
    code += `\n`;
    diagramLinks.forEach(link => {
      if (link.fromNodeId && link.toNodeId) {
        code += `  \\draw[rate] (${link.fromNodeId}) -- node[rate_label] {$${link.rateLatex}$} (${link.toNodeId});\n`;
      } else if (!link.fromNodeId && link.toNodeId) {
        code += `  \\draw[rate] ([xshift=-1.4cm]${link.toNodeId}.west) -- node[rate_label] {$${link.rateLatex}$} (${link.toNodeId});\n`;
      } else if (link.fromNodeId && !link.toNodeId) {
        code += `  \\draw[rate] (${link.fromNodeId}) -- node[rate_label] {$${link.rateLatex}$} ([yshift=-1.4cm]${link.fromNodeId}.south);\n`;
      }
    });
    code += `\\end{tikzpicture}\n\\end{document}`;
    return code;
  }, [diagramNodes, diagramLinks, solution]);

  return (
    <div className="space-y-6 font-sans">
      {/* Precision Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
              <span className="px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Core User Workflow
              </span>
              <span>•</span>
              <span className="font-mono text-cyan-400">Copy & Paste Custom ODEs</span>
              <span>•</span>
              <span className="text-slate-400">Auto Compartment Diagram & Step Derivation</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Custom Model Solver, Step-by-Step Derivation & Compartment Generator
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Paste your model equations below and select your preferred method. The engine dynamically parses your rates, 
              <strong> automatically draws the compartment flow diagram</strong>, derives each symbolic order step-by-step, 
              and computes the exact convergence and error spectrum against high-precision numerical reference solvers.
            </p>
          </div>

          {/* Cloud Persistence Hub in Hero */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {user ? (
              <>
                <button
                  onClick={() => {
                    setSaveTitle(solution?.problem_title || "My ODE System");
                    setShowSaveModal(true);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  title="Save this ODE model & parameters to Cloud Firestore"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>Save to Cloud</span>
                </button>

                <button
                  onClick={() => setShowSavedModal(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  <FolderArchive className="w-4 h-4 text-cyan-400" />
                  <span>Cloud Models ({savedModels.length})</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Sync</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: EQUATION & PARAMETERS ENTRY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Equations Input Box (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>1. Enter Model Equations (Plain Text or Full Academic LaTeX)</span>
            </span>
            <div className="flex items-center gap-2 text-xs">
              {(equationsText.includes("\\begin{equation}") || equationsText.includes("\\dfrac") || equationsText.includes("&=")) ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  LaTeX Equations &amp; ICs Active
                </span>
              ) : (
                <span className="text-cyan-300 bg-slate-950 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-800">
                  dX/dt = f(X, ...)
                </span>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={9}
              value={equationsText}
              onChange={e => setEquationsText(e.target.value)}
              placeholder="Paste plain ODEs or raw LaTeX block:&#10;\begin{equation}&#10;  \dfrac{dS}{dt} = \Lambda + \delta R - (\beta_1 u_1 + \mu) S&#10;  \dfrac{dE}{dt} = \beta_1 u_1 S - (\beta_2 + \mu) E&#10;\end{equation}&#10;subject to: S(0)=100, E(0)=0"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-indigo-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y min-h-[170px]"
            />
            {equationsText && (
              <button
                onClick={() => setEquationsText("")}
                className="absolute top-2.5 right-2.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] transition-colors"
                title="Clear equation input"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Template Chips */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick Exemplar Models (Click to Load):
              </span>
              <span className="text-[10px] text-indigo-400">
                Pasting your own custom model works universally
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(p)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    idx === 0
                      ? "bg-indigo-600/30 border-indigo-500/60 text-indigo-200 hover:bg-indigo-600 hover:text-white font-semibold"
                      : "bg-slate-950/80 hover:bg-indigo-600 text-slate-300 hover:text-white border-slate-800"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Method and Controls Row */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 ${selectedMethod === "HAM" ? "lg:grid-cols-4" : ""} gap-3 pt-3 border-t border-slate-800`}>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                Solution Method
              </label>
              <select
                value={selectedMethod}
                onChange={e => {
                  const m = e.target.value;
                  setSelectedMethod(m);
                  if (m === "HAM") setHbarValue(-0.8);
                  else if (m === "HPM") setHbarValue(-1.0);
                }}
                className="w-full bg-slate-950 border border-slate-700 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="ADM">ADM (Adomian Decomposition)</option>
                <option value="HPM">HPM (Homotopy Perturbation, ℏ = -1)</option>
                <option value="HAM">HAM (Homotopy Analysis, tunable ℏ)</option>
                <option value="VIM">VIM (Variational Iteration, λ = -1)</option>
                <option value="DTM">DTM (Differential Transform)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                Truncation Order (N = {truncationOrder})
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={truncationOrder}
                onChange={e => setTruncationOrder(parseInt(e.target.value, 10))}
                className="w-full mt-2 accent-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                Time Horizon T = {tEnd}
              </label>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={tEnd}
                onChange={e => setTEnd(parseFloat(e.target.value))}
                className="w-full mt-2 accent-indigo-500"
              />
            </div>

            {selectedMethod === "HAM" && (
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                  Convergence ℏ ({hbarValue})
                </label>
                <input
                  type="range"
                  min={-2.0}
                  max={-0.1}
                  step={0.05}
                  value={hbarValue}
                  onChange={e => setHbarValue(parseFloat(e.target.value))}
                  className="w-full mt-2 accent-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={handleSolve}
              disabled={loading}
              className="py-3 px-3 bg-gradient-to-r from-indigo-600 via-cyan-600 to-indigo-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Deriving...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Solve & Diagram</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setActiveViewMode("paper");
                handleGenerateAcademicReport();
              }}
              disabled={reportLoading}
              className="py-3 px-3 bg-slate-950 hover:bg-slate-800 border border-indigo-500/50 hover:border-indigo-400 text-indigo-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              title="Generate complete academic paper (.tex, proofs, tables, KaTeX)"
            >
              {reportLoading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Writing...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Academic Paper</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setSaveTitle(solution?.problem_title || "My ODE System");
                setShowSaveModal(true);
              }}
              className="py-3 px-3 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/60 hover:border-emerald-500 text-emerald-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              title="Save equations and configuration to Cloud Firestore"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Save Model</span>
            </button>
          </div>
        </div>

        {/* Parameters & Initial Conditions Table (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>2. Place Your Parameters & Initial Conditions</span>
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              Input the physical/biological values. Convergence and error metrics will update automatically.
            </p>
          </div>

          {/* Parameters Inputs */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Model Parameters:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(userParams).map(([pName, pVal]) => (
                <div key={pName} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-cyan-300 font-bold">{pName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">parameter</span>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    value={pVal}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0;
                      setUserParams(prev => ({ ...prev, [pName]: v }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white px-2 py-1 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Initial Conditions Inputs */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Initial State Conditions (t = 0):
            </span>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(userIcs).map(([vName, vVal]) => (
                <div key={vName} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-indigo-300 font-bold">{vName}(0)</span>
                    <span className="text-[10px] text-slate-500 font-mono">state IC</span>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    value={vVal}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0;
                      setUserIcs(prev => ({ ...prev, [vName]: v }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white px-2 py-1 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {selectedMethod === "HAM" && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">HAM Convergence Parameter $\hbar$:</span>
                <span className="font-mono text-cyan-400 font-bold">{hbarValue.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-2.0"
                max="0.0"
                step="0.05"
                value={hbarValue}
                onChange={e => setHbarValue(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-2xl text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Equation Parsing or Computation Notice</div>
            <div className="mt-0.5 leading-relaxed">{error}</div>
          </div>
        </div>
      )}

      {/* SECTION VIEW SWITCHER BAR */}
      {solution && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 pl-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Workspace View:</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveViewMode("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeViewMode === "all"
                  ? "bg-slate-800 text-white font-semibold shadow-xs border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
              <span>Complete View (Diagram + Paper)</span>
            </button>
            <button
              onClick={() => setActiveViewMode("diagram")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeViewMode === "diagram"
                  ? "bg-slate-800 text-white font-semibold shadow-xs border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Compartment Flow & Trajectories</span>
            </button>
            <button
              onClick={() => {
                setActiveViewMode("paper");
                if (!academicReport) handleGenerateAcademicReport();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeViewMode === "paper"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "text-indigo-300 hover:text-white bg-indigo-950/40 border border-indigo-800/40"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-300" />
              <span>Full Academic Research Paper (.tex / KaTeX)</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono font-bold">
                AMS-LaTeX
              </span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: AUTOMATICALLY DRAWN COMPARTMENT FLOW DIAGRAM */}
      {solution && (activeViewMode === "all" || activeViewMode === "diagram") && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Automatically Extracted Compartment Flow Diagram</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nodes and rate arrows are automatically identified from your differential equation terms. Drag nodes to reposition.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={applyPipelineLayout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                title="Arrange nodes along main transmission/reaction pipeline"
              >
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pipeline Layout</span>
              </button>
              <button
                onClick={applyCircularLayout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                title="Arrange nodes in circular layout"
              >
                <CircleDot className="w-3.5 h-3.5 text-indigo-400" />
                <span>Circle</span>
              </button>
              <button
                onClick={applyMatrixLayout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                title="Arrange nodes in 2-tier matrix"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>2-Tier</span>
              </button>
              <button
                onClick={() => setShowFluxRate(!showFluxRate)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border ${
                  showFluxRate
                    ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/50"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
                title="Toggle between transition rate (e.g. β₄) and total flux (e.g. β₄ C)"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showFluxRate ? "Flux: β₄ C" : "Rate: β₄"}</span>
              </button>
              <button
                onClick={handleDownloadSvg}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                title="Download SVG vector file"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>SVG</span>
              </button>
            </div>
          </div>

          {/* SVG Compartment Canvas */}
          <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 min-h-[460px] select-none cursor-crosshair">
            <svg
              ref={svgRef}
              className="w-full h-full min-h-[460px]"
              viewBox={`0 0 ${Math.max(1050, diagramNodes.length * 125)} ${diagramNodes.length > 7 ? 560 : 480}`}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <defs>
                <marker
                  id="flow-arrow"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <pattern id="diag-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                </pattern>
              </defs>

              <rect width="100%" height="100%" fill="url(#diag-grid)" />

              {/* Render Flow Links with Curved Arcs and Academic Rate Typography */}
              {diagramLinks.map(link => {
                const fromNode = diagramNodes.find(n => n.id === link.fromNodeId);
                const toNode = diagramNodes.find(n => n.id === link.toNodeId);

                const labelText = showFluxRate
                  ? (link.fluxFormula || link.rateFormula)
                  : link.rateFormula;

                let pathD = "";
                let midX = 0;
                let midY = 0;

                if (fromNode && toNode) {
                  const dx = toNode.x - fromNode.x;
                  const dy = toNode.y - fromNode.y;
                  const dist = Math.hypot(dx, dy) || 1;
                  const offset = 44;

                  const startX = fromNode.x + (dx / dist) * offset;
                  const startY = fromNode.y + (dy / dist) * offset;
                  const endX = toNode.x - (dx / dist) * (offset + 8);
                  const endY = toNode.y - (dy / dist) * (offset + 8);

                  // Feedback return flow (flowing backward, e.g. R -> S)
                  const isBackward = dx < -60 || (fromNode.y > 280 && toNode.y < 240);
                  if (isBackward) {
                    const ctrlX = (startX + endX) / 2 - 20;
                    const ctrlY = Math.max(startY, endY) + 75;
                    pathD = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
                    midX = ctrlX;
                    midY = (startY + endY) / 4 + ctrlY / 2;
                  } else if (Math.abs(dy) > 100 && Math.abs(dx) > 100) {
                    const ctrlX = (startX + endX) / 2 + 25;
                    const ctrlY = (startY + endY) / 2 - 25;
                    pathD = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
                    midX = ctrlX;
                    midY = ctrlY;
                  } else {
                    pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
                    midX = (startX + endX) / 2;
                    midY = (startY + endY) / 2 - 13;
                  }
                } else if (!fromNode && toNode) {
                  // Inflow from source (e.g. recruitment Lambda)
                  const endX = toNode.x - 44;
                  const endY = toNode.y;
                  const startX = endX - 65;
                  const startY = endY;
                  pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
                  midX = (startX + endX) / 2;
                  midY = startY - 14;
                } else if (fromNode && !toNode) {
                  // Outflow to sink (e.g. natural death mu)
                  const sameNodeSinks = diagramLinks.filter(l => l.fromNodeId === fromNode.id && !l.toNodeId);
                  const sinkIdx = sameNodeSinks.findIndex(l => l.id === link.id);
                  const totalSinks = sameNodeSinks.length;
                  const spread = totalSinks > 1 ? (sinkIdx - (totalSinks - 1) / 2) * 26 : 0;

                  const startX = fromNode.x + spread;
                  const startY = fromNode.y + 30;
                  const endX = startX + spread * 0.6;
                  const endY = startY + 45;
                  pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
                  midX = endX + 16;
                  midY = (startY + endY) / 2;
                }

                const pillWidth = Math.max(48, labelText.length * 8.5 + 18);

                return (
                  <g key={link.id} className="group">
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={2.2}
                      markerEnd="url(#flow-arrow)"
                    />
                    <rect
                      x={midX - pillWidth / 2}
                      y={midY - 11}
                      width={pillWidth}
                      height={22}
                      rx={6}
                      fill="#090d16"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="11"
                      fontWeight="bold"
                      className="font-sans select-none tracking-wide"
                    >
                      {labelText}
                    </text>
                  </g>
                );
              })}

              {/* Render Compartment Nodes */}
              {diagramNodes.map(node => (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={e => handleMouseDownNode(e, node)}
                  className="cursor-move group"
                >
                  <rect
                    x="-40"
                    y="-30"
                    width="80"
                    height="60"
                    rx="12"
                    fill="#1e293b"
                    stroke={node.color || "#38bdf8"}
                    strokeWidth="2.5"
                    className="shadow-xl transition-all group-hover:fill-slate-800"
                  />
                  <text
                    y="-4"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="16"
                    fontWeight="bold"
                    className="font-sans select-none pointer-events-none"
                  >
                    {node.name}
                  </text>
                  <text
                    y="14"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    className="font-mono select-none pointer-events-none"
                  >
                    IC: {userIcs[node.name] ?? node.initialValue}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* SECTION 3: STEP-BY-STEP MATHEMATICAL DERIVATION CARDS */}
      {solution && (activeViewMode === "all" || activeViewMode === "diagram") && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Step-by-Step Symbolic Mathematical Derivation ({solution.steps.length} Steps)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact symbolic calculation for your custom system using {solution.method_used} (Truncation Order {solution.order}).
              </p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Wall Time: {(solution.summary_metrics.wall_time_sec * 1000).toFixed(1)} ms
            </div>
          </div>

          {/* Accordion Steps */}
          <div className="space-y-3">
            {solution.steps.map(step => {
              const isExpanded = expandedStep === step.step_number;
              return (
                <div
                  key={step.step_number}
                  className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md transition-all"
                >
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : step.step_number)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs font-bold font-mono">
                        {step.step_number}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-tight">
                          {step.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {isExpanded ? "Collapse" : "Expand"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
                      <div className="p-3 bg-slate-900 rounded-lg text-xs overflow-x-auto border border-slate-800 text-white">
                        <MathView math={step.math_latex} displayMode={true} />
                      </div>
                      {step.details && step.details.length > 0 && (
                        <div className="space-y-1 pl-2 border-l-2 border-indigo-500/40">
                          {step.details.map((item, idx) => (
                            <div key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                              <span className="text-indigo-400 font-mono">•</span>
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

      {/* SECTION 4: CONVERGENCE & NUMERICAL REFERENCE COMPARISON */}
      {solution && (activeViewMode === "all" || activeViewMode === "diagram") && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Convergence & Numerical Reference Error Spectrum</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparing your {solution.method_used} analytical series against the high-precision SciPy DOP853 explicit numerical ground truth.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
                solution.summary_metrics.converged
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                  : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{solution.summary_metrics.converged ? "Convergent Series" : "Divergence Alert"}</span>
              </span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(solution.summary_metrics.max_errors).map(([v, err]) => (
              <div key={v} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  State {v} Max Error E_inf
                </span>
                <span className="text-base font-bold font-mono text-cyan-400">
                  {err.toExponential(3)}
                </span>
              </div>
            ))}
            {Object.entries(solution.summary_metrics.rmses).map(([v, rmse]) => (
              <div key={v} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  State {v} RMSE
                </span>
                <span className="text-base font-bold font-mono text-indigo-400">
                  {rmse.toExponential(3)}
                </span>
              </div>
            ))}
          </div>

          {/* Solution Curves Plot */}
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

              {/* Reference and Approx curves for each state variable */}
              {solution.state_vars.map((v, vIdx) => {
                const approxData = solution.trajectories.approx[v] || [];
                const refData = solution.trajectories.ref[v] || [];
                const colors = ["#38bdf8", "#f43f5e", "#10b981", "#f59e0b", "#a855f7"];
                const color = colors[vIdx % colors.length];

                const maxVal = Math.max(
                  1.0,
                  ...approxData.map(val => Math.abs(val)),
                  ...refData.map(val => Math.abs(val))
                );

                return (
                  <g key={v}>
                    {/* Reference Line */}
                    <path
                      d={solution.t_eval.map((t, i) => {
                        const x = 40 + (t / tEnd) * 630;
                        const y = 210 - (Math.max(0, Math.min(maxVal * 1.2, refData[i] || 0)) / (maxVal * 1.2)) * 190;
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      }).join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth="2.2"
                    />
                    {/* Approx Series Line */}
                    <path
                      d={solution.t_eval.map((t, i) => {
                        const x = 40 + (t / tEnd) * 630;
                        const y = 210 - (Math.max(0, Math.min(maxVal * 1.2, approxData[i] || 0)) / (maxVal * 1.2)) * 190;
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      }).join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="absolute top-3 right-4 flex flex-wrap items-center gap-3 text-xs font-mono bg-slate-900/90 p-2 rounded-lg border border-slate-800 shadow-md">
              <span className="flex items-center gap-1.5 text-white">
                <span className="w-3.5 h-0.5 bg-white inline-block" /> Solid = DOP853 Ref
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3.5 h-0.5 border-b border-dashed border-white inline-block" /> Dashed = {solution.method_used}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: PUBLICATION RESEARCH MANUSCRIPT & SYMBOLIC DERIVATION */}
      {(activeViewMode === "all" || activeViewMode === "paper") && (
        <AcademicPaperViewer
          report={academicReport}
          loading={reportLoading}
          onRefresh={(m, h, o) => handleGenerateAcademicReport(m, h, o)}
          selectedMethod={selectedMethod}
          hbar={hbarValue}
          order={truncationOrder >= 10 ? truncationOrder : 15}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: SAVE MODEL TO CLOUD FIRESTORE                        */}
      {/* ------------------------------------------------------------- */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <CloudUpload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Save Model to Cloud</h3>
                  <p className="text-xs text-slate-400">Persist to Cloud Firestore for your account</p>
                </div>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Model Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="e.g. 6-Compartment Pandemic System with Dual Controls"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    maxLength={150}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Description & Research Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="Brief background, literature source, or target parameter values..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 resize-none"
                    maxLength={1000}
                  />
                </div>

                {/* Model Snapshot Summary */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Target Method:</span>
                    <span className="text-cyan-300 font-bold">{selectedMethod}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>State Compartments:</span>
                    <span className="text-white font-bold">
                      {solution?.state_vars.join(", ") || Object.keys(userIcs).join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Active Parameters:</span>
                    <span className="text-slate-300">{Object.keys(userParams).length} biological rates</span>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveToCloud}
                    disabled={isSaving || !saveTitle.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload className="w-4 h-4" />
                        <span>Save to Firestore</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 mx-auto flex items-center justify-center">
                  <LogIn className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Google Sign-In Required</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Sign in with your Google account to securely persist, load, and manage your custom ODE models and research papers across devices.
                  </p>
                </div>
                <button
                  onClick={() => signInWithGoogle()}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: MY CLOUD MODELS (FIRESTORE PERSISTENCE DRAWER)       */}
      {/* ------------------------------------------------------------- */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    My Cloud Models ({savedModels.length})
                  </h3>
                  <p className="text-xs text-slate-400">Stored in Cloud Firestore for {user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSavedModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {savedModels.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <FolderArchive className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No models saved in Cloud Firestore yet.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Configure your ODE system in the modeler and click &quot;Save Model to Cloud&quot; to securely store it here.
                  </p>
                </div>
              ) : (
                savedModels.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{m.title}</span>
                        {m.derivationMethod && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {m.derivationMethod}
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">{m.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-mono">
                        <span>{m.equations.length} ODE equations</span>
                        {m.compartments && m.compartments.length > 0 && (
                          <span>States: {m.compartments.join(", ")}</span>
                        )}
                        <span>{new Date(m.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleLoadSavedModel(m)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Load Model</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteSavedModel(m.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete from Firestore"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
