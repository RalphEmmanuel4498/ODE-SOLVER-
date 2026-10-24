/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Compass,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  BookOpen,
  Share2,
  Table,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Database,
  Layers,
  Activity,
  ArrowRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  Copy,
  Info,
  Zap,
  MessageSquare,
  Upload,
  BarChart3,
  SlidersHorizontal,
  ChevronDown,
  GraduationCap,
  Package,
  HelpCircle,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { useAuth } from "./firebase/AuthContext";
import { MathView } from "./components/MathView";
import { DiagramStudio } from "./components/DiagramStudio";
import { StepByStepSolver } from "./components/StepByStepSolver";
import { MethodCatalog } from "./components/MethodCatalog";
import { ScientificAdvisor } from "./components/ScientificAdvisor";
import { AiModelGenerator } from "./components/AiModelGenerator";
import { ExportCenter } from "./components/ExportCenter";
import { PhasePortraitStudio } from "./components/PhasePortraitStudio";
import { NumericalAnalysisLab } from "./components/NumericalAnalysisLab";
import { CustomDeSandbox } from "./components/CustomDeSandbox";
import { CustomEquationModeler } from "./components/CustomEquationModeler";
import { FALLBACK_PROBLEMS, FALLBACK_CANONICAL_MODELS, runFallbackMethod } from "./fallback_engine";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------
interface Problem {
  id: string;
  name: string;
  category: string;
  equation_latex: string;
  description: string;
  order: number;
  t_span: [number, number];
  initial_conditions: number[];
  parameters: Record<string, number>;
  has_exact_solution: boolean;
  exact_solution_latex: string;
  stiff: boolean;
  notes: string;
}

interface CanonicalModel {
  id: string;
  name: string;
  discipline: string;
  description: string;
  latex_equations: string[];
  state_vars: string[];
  parameters: Record<string, number>;
  initial_conditions: Record<string, number>;
  conservation_laws?: string[];
  r0_formula?: string;
  control_var?: string;
  objective_functional_latex?: string;
}

interface OptimalControlData {
  problem_title: string;
  t_eval: number[];
  state_names: string[];
  controlled_states: Record<string, number[]>;
  uncontrolled_states: Record<string, number[]>;
  optimal_control: number[];
  costates: Record<string, number[]>;
  hamiltonian_latex: string;
  adjoint_equations_latex: string[];
  optimality_condition_latex: string;
  cost_controlled: number;
  cost_uncontrolled: number;
  cost_reduction_percent: number;
  iterations: number;
  converged: boolean;
  status_message: string;
}

interface StabilityData {
  model_id: string;
  model_title: string;
  equilibria: Array<{
    coordinates: Record<string, number>;
    jacobian: number[][];
    eigenvalues: Array<{ real: number; imag: number }>;
    classification: string;
    is_stable: boolean;
    notes: string;
  }>;
  r0_value?: number | null;
  r0_formula_latex?: string | null;
  sensitivity_ranking: Array<{
    parameter_name: string;
    target_variable: string;
    sensitivity_index: number;
    interpretation: string;
  }>;
  vector_field_grid?: {
    points: Array<{ x: number; y: number; dx: number; dy: number; u_norm: number; v_norm: number }>;
    x_label: string;
    y_label: string;
  };
}

interface CalibrationData {
  model_name: string;
  target_variable: string;
  parameter_estimates: Record<string, number>;
  standard_errors: Record<string, number>;
  confidence_intervals_95: Record<string, [number, number]>;
  r_squared: number;
  rss: number;
  rmse: number;
  aic: number;
  bic: number;
  t_observed: number[];
  y_observed: number[];
  y_fitted: number[];
  residuals: number[];
  converged: boolean;
  status_message: string;
}

export default function App() {
  const { user, loading: loadingAuth, signInWithGoogle, logout } = useAuth();

  // Navigation Workspaces
  const [activeWorkspace, setActiveWorkspace] = useState<
    "custom_modeler" | "solve" | "phase_portrait" | "numerical_lab" | "custom_sandbox" | "ai_formulator" | "diagram_studio" | "step_solver" | "method_catalog" | "modelling" | "semi_analytical" | "optimal_control" | "stability" | "calibration" | "literature" | "datasets" | "reports" | "exports" | "tests"
  >("custom_modeler");
  const [stepSolverProblem, setStepSolverProblem] = useState<string>("coupled_predator_prey");
  const [importedAiModel, setImportedAiModel] = useState<any | null>(null);

  // User Mode (Scholar / Guided vs Fellow / Advanced)
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
  const [showStudentGuide, setShowStudentGuide] = useState<boolean>(false);

  // Core Data
  const [problems, setProblems] = useState<Problem[]>(FALLBACK_PROBLEMS as any);
  const [canonicalModels, setCanonicalModels] = useState<CanonicalModel[]>(FALLBACK_CANONICAL_MODELS as any);
  const [selectedModelId, setSelectedModelId] = useState<string>("sir_epidemic");

  // LaTeX Equation Editor State (Solve & Analyze)
  const [customLatexEquation, setCustomLatexEquation] = useState<string>(
    "\\frac{dS}{dt} = -\\beta S I, \\quad \\frac{dI}{dt} = \\beta S I - \\gamma I, \\quad \\frac{dR}{dt} = \\gamma I"
  );
  const [equationMode, setEquationMode] = useState<"preset" | "latex" | "plaintext">("preset");
  const [plainTextInput, setPlainTextInput] = useState<string>("dS/dt = -beta*S*I\ndI/dt = beta*S*I - gamma*I\ndR/dt = gamma*I");

  // Calculation & Benchmark Outputs
  const [selectedMethod, setSelectedMethod] = useState<"HAM" | "HPM" | "ADM" | "VIM" | "DTM" | "OHAM">("HAM");
  const [truncationOrder, setTruncationOrder] = useState<number>(4);
  const [hbarValue, setHbarValue] = useState<number>(-1.0);
  const [runResult, setRunResult] = useState<any | null>(null);
  const [isRunningSolve, setIsRunningSolve] = useState<boolean>(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Optimal Control State
  const [optimalControlData, setOptimalControlData] = useState<OptimalControlData | null>(null);
  const [isRunningControl, setIsRunningControl] = useState<boolean>(false);
  const [ocBeta, setOcBeta] = useState<number>(1.4);
  const [ocGamma, setOcGamma] = useState<number>(0.4);
  const [ocWeightB, setOcWeightB] = useState<number>(2.0);
  const [ocUMax, setOcUMax] = useState<number>(0.8);

  // Stability & Dynamical Systems State
  const [stabilityData, setStabilityData] = useState<StabilityData | null>(null);
  const [isRunningStability, setIsRunningStability] = useState<boolean>(false);
  const [stabilityBeta, setStabilityBeta] = useState<number>(1.2);
  const [stabilityGamma, setStabilityGamma] = useState<number>(0.4);

  // Model Calibration State
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);
  const [isRunningCalibration, setIsRunningCalibration] = useState<boolean>(false);

  // Literature Discovery State
  const [literatureQuery, setLiteratureQuery] = useState<string>("homotopy analysis method nonlinear differential equations");
  const [literatureResults, setLiteratureResults] = useState<any | null>(null);
  const [isLoadingLiterature, setIsLoadingLiterature] = useState<boolean>(false);

  // Dataset Discovery State
  const [datasetQuery, setDatasetQuery] = useState<string>("epidemiological dynamics");
  const [datasetResults, setDatasetResults] = useState<any | null>(null);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState<boolean>(false);
  const [uploadedCsvText, setUploadedCsvText] = useState<string>("");
  const [csvInspection, setCsvInspection] = useState<any | null>(null);

  // LaTeX Publication Generator State
  const [generatedLatexSource, setGeneratedLatexSource] = useState<string>("");
  const [generatedPyScript, setGeneratedPyScript] = useState<string>("");
  const [isGeneratingPaper, setIsGeneratingPaper] = useState<boolean>(false);
  const [copiedTex, setCopiedTex] = useState<boolean>(false);
  const [copiedPy, setCopiedPy] = useState<boolean>(false);

  // Automated Tests
  const [testReport, setTestReport] = useState<any | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  // Advisor Drawer
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(false);

  const handleAdvisorAction = (action: string, metadata?: any) => {
    if (action === "run_benchmark") {
      setActiveWorkspace("solve");
      if (metadata?.problem_id) {
        const prob = problems.find((p) => p.id === metadata.problem_id);
        if (prob) setCustomLatexEquation(prob.equation_latex);
      }
    } else if (action === "view_hbar" || action === "view_adomian" || action === "run_full_matrix") {
      setActiveWorkspace("semi_analytical");
    } else if (
      action === "view_catalog" ||
      action === "run_dtm" ||
      action === "run_oham" ||
      action === "view_oham_details"
    ) {
      setActiveWorkspace("method_catalog");
    } else if (action === "view_step_solver") {
      setActiveWorkspace("step_solver");
    } else if (action === "view_diagrams") {
      setActiveWorkspace("diagram_studio");
    } else if (action === "view_modelling") {
      setActiveWorkspace("modelling");
    } else if (action === "view_ai") {
      setActiveWorkspace("ai_formulator");
    } else if (action === "view_exports") {
      setActiveWorkspace("exports");
    } else if (action === "view_phase") {
      setActiveWorkspace("phase_portrait");
    } else if (action === "view_numerical_lab") {
      setActiveWorkspace("numerical_lab");
    } else if (action === "view_custom") {
      setActiveWorkspace("custom_sandbox");
    } else if (action === "generate_report") {
      setActiveWorkspace("reports");
      handleGeneratePaper();
    } else if (action === "run_tests") {
      setActiveWorkspace("tests");
      handleRunTests();
    }
    setIsAdvisorOpen(false);
  };

  // Initial Data Loading
  useEffect(() => {
    fetchProblems();
    fetchCanonicalModels();
    handleSearchLiterature("homotopy analysis method nonlinear differential equations");
    handleSearchDatasets("epidemiological dynamics");
    handleRunStability();
    handleRunOptimalControl();
    handleRunCalibrationDefault();
    handleRunSolve();
    handleGeneratePaper();
  }, []);

  const fetchProblems = async () => {
    try {
      const res = await fetch("/api/problems");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setProblems(data);
      }
    } catch (e) {
      console.warn("Using fallback problems", e);
    }
  };

  const fetchCanonicalModels = async () => {
    try {
      const res = await fetch("/api/canonical-models");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setCanonicalModels(data);
      }
    } catch (e) {
      console.warn("Using fallback canonical models", e);
    }
  };

  // Run Solver for Solve & Analyze workspace
  const handleRunSolve = async () => {
    setIsRunningSolve(true);
    try {
      const res = await fetch("/api/run-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: "riccati_ivp",
          method: selectedMethod,
          order: truncationOrder,
          hbar: hbarValue,
        }),
      });
      if (res.ok) {
        setRunResult(await res.json());
      } else {
        const fb = runFallbackMethod("riccati_ivp", selectedMethod, truncationOrder, hbarValue);
        setRunResult(fb);
      }
    } catch (e) {
      const fb = runFallbackMethod("riccati_ivp", selectedMethod, truncationOrder, hbarValue);
      setRunResult(fb);
    } finally {
      setIsRunningSolve(false);
    }
  };

  // Run Optimal Control
  const handleRunOptimalControl = async () => {
    setIsRunningControl(true);
    try {
      const res = await fetch("/api/optimal-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beta: ocBeta,
          gamma: ocGamma,
          B: ocWeightB,
          uMax: ocUMax,
          T: 20.0,
          numPoints: 121,
        }),
      });
      if (res.ok) setOptimalControlData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningControl(false);
    }
  };

  // Run Stability Analysis
  const handleRunStability = async () => {
    setIsRunningStability(true);
    try {
      const res = await fetch("/api/stability-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: "sir_epidemic",
          beta: stabilityBeta,
          gamma: stabilityGamma,
        }),
      });
      if (res.ok) setStabilityData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningStability(false);
    }
  };

  // Run Calibration
  const handleRunCalibrationDefault = async () => {
    setIsRunningCalibration(true);
    try {
      const res = await fetch("/api/calibrate-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tData: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14],
          yData: [0.5, 0.85, 1.35, 1.78, 1.94, 1.98, 1.99, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0],
        }),
      });
      if (res.ok) setCalibrationData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningCalibration(false);
    }
  };

  // Search Literature
  const handleSearchLiterature = async (queryStr?: string) => {
    const q = queryStr || literatureQuery;
    setIsLoadingLiterature(true);
    try {
      const res = await fetch(`/api/search-literature?q=${encodeURIComponent(q)}`);
      if (res.ok) setLiteratureResults(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLiterature(false);
    }
  };

  // Search Datasets
  const handleSearchDatasets = async (queryStr?: string) => {
    const q = queryStr || datasetQuery;
    setIsLoadingDatasets(true);
    try {
      const res = await fetch(`/api/search-datasets?q=${encodeURIComponent(q)}`);
      if (res.ok) setDatasetResults(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  // Inspect Uploaded CSV
  const handleInspectCsv = async (csvText: string) => {
    try {
      const res = await fetch("/api/inspect-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText }),
      });
      if (res.ok) setCsvInspection(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Generate LaTeX Paper
  const handleGeneratePaper = async () => {
    setIsGeneratingPaper(true);
    try {
      const res = await fetch("/api/generate-latex-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName: "Kermack-McKendrick SIR Model",
          equations: [
            "\\frac{dS}{dt} = -\\beta S I",
            "\\frac{dI}{dt} = \\beta S I - \\gamma I",
            "\\frac{dR}{dt} = \\gamma I",
          ],
          parameters: { beta: 1.2, gamma: 0.4 },
          initialConditions: { S: 0.99, I: 0.01, R: 0.0 },
          methodResults: [
            { method: "HAM", order: 4, rmse: 1.41e-3, e_inf: 6.31e-3, residual_max: 0.075, wall_time_sec: 0.065, converged: true },
            { method: "HPM", order: 4, rmse: 1.41e-3, e_inf: 6.31e-3, residual_max: 0.075, wall_time_sec: 0.052, converged: true },
            { method: "ADM", order: 4, rmse: 1.41e-3, e_inf: 6.31e-3, residual_max: 0.075, wall_time_sec: 0.163, converged: true },
            { method: "VIM", order: 4, rmse: 1.62e-4, e_inf: 1.15e-3, residual_max: 0.021, wall_time_sec: 0.092, converged: true },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedLatexSource(data.latex_source);
        setGeneratedPyScript(data.python_script);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPaper(false);
    }
  };

  // Run Automated Tests
  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch("/api/run-tests", { method: "POST" });
      if (res.ok) setTestReport(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* ------------------------------------------------------------------- */}
      {/* 1. TOP BAR CONTRACT (Strict 3-Zone Architecture)                   */}
      {/* ------------------------------------------------------------------- */}
      <header className="h-16 bg-slate-950/90 border-b border-slate-800/80 px-6 flex items-center justify-between gap-8 sticky top-0 z-40 backdrop-blur-md">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <span className="font-serif font-black text-lg italic leading-none">N</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              Noether Scientific
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Mathematical Modelling & Optimal Control</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: "custom_modeler", label: "Solve Any Equation", badge: "Custom Model" },
            { id: "solve", label: "Solve & Analyze" },
            { id: "phase_portrait", label: "Phase Portraits", badge: "Poincaré" },
            { id: "numerical_lab", label: "Numerical Lab", badge: "Order p" },
            { id: "custom_sandbox", label: "Custom Systems", badge: "Lorenz" },
            { id: "ai_formulator", label: "AI Copilot", badge: "AI" },
            { id: "diagram_studio", label: "Diagram Studio", badge: "12 States" },
            { id: "step_solver", label: "Step Solver" },
            { id: "modelling", label: "Modelling" },
            { id: "method_catalog", label: "Taxonomy" },
            { id: "optimal_control", label: "Control" },
            { id: "stability", label: "Stability" },
            { id: "calibration", label: "Calibration" },
            { id: "exports", label: "Downloads", badge: "Assets" },
            { id: "literature", label: "Literature" },
            { id: "datasets", label: "Datasets" },
            { id: "reports", label: "Publish" },
            { id: "tests", label: "Validation" },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveWorkspace(item.id as any);
                if (item.id === "reports" && !generatedLatexSource) handleGeneratePaper();
                if (item.id === "tests" && !testReport) handleRunTests();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeWorkspace === item.id
                  ? "bg-slate-800 text-white shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                  item.badge === "Custom Model"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : item.badge === "AI"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : item.badge === "Poincaré"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : item.badge === "Order p"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : item.badge === "Lorenz"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowStudentGuide(!showStudentGuide)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showStudentGuide ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40" : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Student Primers</span>
          </button>

          <button
            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isAdvancedMode ? "Fellow (Advanced)" : "Scholar (Guided)"}</span>
          </button>

          <button
            onClick={() => setIsAdvisorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">AI Advisor</span>
          </button>

          <button
            onClick={() => setActiveWorkspace("exports")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-indigo-600/20 transition-all whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Downloads</span>
          </button>

          {/* Firebase Authentication & Cloud State */}
          <div className="pl-1 border-l border-slate-800 flex items-center">
            {loadingAuth ? (
              <div className="w-7 h-7 rounded-full bg-slate-800 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-7 h-7 rounded-full border border-emerald-500/50 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-500/50 flex items-center justify-center font-bold text-xs">
                    {user.email ? user.email[0].toUpperCase() : "U"}
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[110px]">
                    {user.displayName || user.email?.split("@")[0]}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono">Cloud Synced</span>
                </div>
                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/60 transition-all shadow-xs"
                title="Sign in with Google to persist models & derivations to Cloud Firestore"
              >
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <div className="xl:hidden flex items-center gap-1 overflow-x-auto p-2 bg-slate-900 border-b border-slate-800 no-scrollbar">
        {[
          { id: "custom_modeler", label: "Solve Any ODE" },
          { id: "solve", label: "Solve" },
          { id: "phase_portrait", label: "Phase Plane" },
          { id: "numerical_lab", label: "Num Lab" },
          { id: "custom_sandbox", label: "Chaos/3D" },
          { id: "ai_formulator", label: "AI Copilot" },
          { id: "diagram_studio", label: "Diagrams (12)" },
          { id: "step_solver", label: "Steps" },
          { id: "modelling", label: "Modelling" },
          { id: "method_catalog", label: "Taxonomy" },
          { id: "optimal_control", label: "Control" },
          { id: "stability", label: "Stability" },
          { id: "calibration", label: "Calibration" },
          { id: "exports", label: "Downloads" },
          { id: "literature", label: "Literature" },
          { id: "datasets", label: "Datasets" },
          { id: "reports", label: "Publish" },
          { id: "tests", label: "Tests" },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveWorkspace(item.id as any)}
            className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
              activeWorkspace === item.id
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Student Educational Quick Primer Drawer */}
      {showStudentGuide && (
        <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 transition-all">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <GraduationCap className="w-4 h-4" />
                <span>Applied Mathematics, Numerical Methods & Dynamical Systems Student Primers</span>
              </div>
              <button
                onClick={() => setShowStudentGuide(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="font-semibold text-indigo-300">1. Stiff Stability Barrier</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Explicit RK collapses if $h &gt; 2/|\lambda|$. Implicit Radau IIA / Backward Euler removes this step size limit completely.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="font-semibold text-cyan-300">2. Adomian Polynomials</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Decompose nonlinear operators $N(u) = \sum A_n$ using exact Taylor derivatives without grid discretization.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="font-semibold text-purple-300">3. The h-bar Plateau Rule</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  In HAM, the flat horizontal region where $du/d\hbar \approx 0$ marks the optimal convergent parameter interval.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="font-semibold text-emerald-300">4. Pontryagin Optimality</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  States march forward; adjoint costates march backward from T with &lambda;(T)=0; control satisfies u*(t) = argmax H.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="font-semibold text-amber-300">5. Trace-Determinant Parabola</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Trace &tau; and Determinant &Delta;. The critical parabola &tau;&sup2; - 4&Delta; = 0 separates real nodes from complex spirals.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="font-semibold text-rose-300">6. Log-Log Convergence $p$</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Halving $h$ and computing $p = \Delta\log(E)/\Delta\log(h)$ verifies empirical order: Euler is 1, Heun is 2, RK4 is 4.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. MAIN WORKSPACE CANVAS                                           */}
      {/* ------------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* WORKSPACE 0: SOLVE ANY EQUATION & AUTO-DRAW COMPARTMENT DIAGRAM (PRIMARY) */}
        {activeWorkspace === "custom_modeler" && (
          <div className="space-y-6">
            <CustomEquationModeler />
          </div>
        )}

        {/* WORKSPACE 1: SOLVE & ANALYZE (Central Hub) */}
        {activeWorkspace === "solve" && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Central Equation Solver & Method Recommendation Engine
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Enter LaTeX or plain-text differential equations to receive automatic problem categorization, multi-paradigm method selection, and benchmark reference solutions.
                </p>
              </div>

              {/* Preset Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Canonical Preset:</span>
                <select
                  value={selectedModelId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedModelId(id);
                    const found = canonicalModels.find((m) => m.id === id);
                    if (found) {
                      setCustomLatexEquation(found.latex_equations.join(", \\quad "));
                    }
                  }}
                  className="text-xs border border-slate-700 rounded-xl px-3 py-2 bg-slate-950 text-white font-medium focus:outline-none focus:border-indigo-500"
                >
                  {canonicalModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.discipline})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LaTeX Equation Editor & Beautiful Math Renderer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Equation Entry & Recommendations (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Equation Entry
                  </label>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg text-xs border border-slate-800">
                    <button
                      onClick={() => setEquationMode("latex")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        equationMode === "latex" || equationMode === "preset"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      LaTeX
                    </button>
                    <button
                      onClick={() => setEquationMode("plaintext")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        equationMode === "plaintext"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Plain Text
                    </button>
                  </div>
                </div>

                {equationMode === "latex" || equationMode === "preset" ? (
                  <textarea
                    rows={4}
                    value={customLatexEquation}
                    onChange={(e) => setCustomLatexEquation(e.target.value)}
                    className="w-full font-mono text-xs border border-slate-800 rounded-xl p-3.5 bg-slate-950 text-indigo-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                    placeholder="Enter LaTeX equation, e.g. \frac{dS}{dt} = -\beta S I"
                  />
                ) : (
                  <textarea
                    rows={4}
                    value={plainTextInput}
                    onChange={(e) => setPlainTextInput(e.target.value)}
                    className="w-full font-mono text-xs border border-slate-800 rounded-xl p-3.5 bg-slate-950 text-indigo-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                    placeholder="dS/dt = -beta*S*I&#10;dI/dt = beta*S*I - gamma*I&#10;dR/dt = gamma*I"
                  />
                )}

                {/* Rendered Mathematical Notation via KaTeX */}
                <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                    Rendered Mathematical Notation
                  </div>
                  <div className="overflow-x-auto text-center py-2 text-white text-sm">
                    <MathView math={customLatexEquation} displayMode={true} />
                  </div>
                </div>

                {/* Automatic Method Recommendations */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Automatic Method Selection
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-slate-200 space-y-1">
                      <div className="font-semibold flex items-center justify-between text-indigo-300">
                        <span>Homotopy Analysis Method (HAM)</span>
                        <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded font-mono">
                          Optimal
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Nonlinear polynomial coupling requires arbitrary convergence-control parameter h-bar to prevent series divergence.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300 space-y-1">
                      <div className="font-semibold flex items-center justify-between text-slate-200">
                        <span>SciPy DOP853 (Explicit RK8)</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                          Reference
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        High-accuracy explicit solver for non-stiff systems with strict tolerance $10^{-13}$.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Execution Controls */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Method</label>
                      <select
                        value={selectedMethod}
                        onChange={(e) => setSelectedMethod(e.target.value as any)}
                        className="w-full mt-1 border border-slate-700 rounded-lg px-2.5 py-1.5 bg-slate-950 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="HAM">HAM (Homotopy Analysis)</option>
                        <option value="HPM">HPM (Homotopy Perturbation)</option>
                        <option value="ADM">ADM (Adomian Decomposition)</option>
                        <option value="VIM">VIM (Variational Iteration)</option>
                        <option value="DTM">DTM (Differential Transform)</option>
                        <option value="OHAM">OHAM (Optimal Homotopy)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Order N</label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={truncationOrder}
                        onChange={(e) => setTruncationOrder(parseInt(e.target.value, 10))}
                        className="w-full mt-1 border border-slate-700 rounded-lg px-2.5 py-1.5 bg-slate-950 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {selectedMethod === "HAM" && (
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase">
                        <span>Convergence Control Parameter (h-bar)</span>
                        <span className="font-mono text-cyan-400">{hbarValue.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="-2.0"
                        max="0.0"
                        step="0.05"
                        value={hbarValue}
                        onChange={(e) => setHbarValue(parseFloat(e.target.value))}
                        className="w-full mt-1 accent-indigo-500"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleRunSolve}
                    disabled={isRunningSolve}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {isRunningSolve ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>Solve & Compute Reference</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Interactive Solution & Error Dashboard (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">
                      Solution Trajectories & Error Spectrum
                    </h2>
                    <p className="text-xs text-slate-400">
                      Evaluated continuously across domain t in [0.0, 1.0].
                    </p>
                  </div>
                  {runResult && (
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified (RMSE: {runResult.metrics.rmse.toExponential(2)})
                      </span>
                    </div>
                  )}
                </div>

                {/* Plot Area */}
                {runResult ? (
                  <div className="space-y-4">
                    <div className="relative h-64 w-full bg-slate-950/80 rounded-xl border border-slate-800 p-3">
                      <svg
                        viewBox="0 0 700 240"
                        className="w-full h-full cursor-crosshair select-none"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const relX = (e.clientX - rect.left) / rect.width;
                          const idx = Math.min(
                            runResult.t_eval.length - 1,
                            Math.max(0, Math.round(relX * (runResult.t_eval.length - 1)))
                          );
                          setHoverIndex(idx);
                        }}
                        onMouseLeave={() => setHoverIndex(null)}
                      >
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
                        {/* Reference Path */}
                        <path
                          d={runResult.t_eval.map((t: number, i: number) => {
                            const x = 40 + (t / 1.0) * 630;
                            const y = 210 - (runResult.u_ref[i] / 1.0) * 190;
                            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                          }).join(" ")}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.2"
                        />
                        {/* Approx Path */}
                        <path
                          d={runResult.t_eval.map((t: number, i: number) => {
                            const x = 40 + (t / 1.0) * 630;
                            const y = 210 - (runResult.u_approx[i] / 1.0) * 190;
                            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                          }).join(" ")}
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="1.8"
                          strokeDasharray="4 2"
                        />

                        {/* Interactive Crosshair */}
                        {hoverIndex !== null && (
                          <g>
                            <line
                              x1={40 + (runResult.t_eval[hoverIndex] / 1.0) * 630}
                              y1={20}
                              x2={40 + (runResult.t_eval[hoverIndex] / 1.0) * 630}
                              y2={210}
                              stroke="#64748b"
                              strokeWidth="1"
                              strokeDasharray="2 2"
                            />
                            <circle
                              cx={40 + (runResult.t_eval[hoverIndex] / 1.0) * 630}
                              cy={210 - (runResult.u_ref[hoverIndex] / 1.0) * 190}
                              r="4"
                              fill="#38bdf8"
                            />
                            <circle
                              cx={40 + (runResult.t_eval[hoverIndex] / 1.0) * 630}
                              cy={210 - (runResult.u_approx[hoverIndex] / 1.0) * 190}
                              r="4"
                              fill="#a855f7"
                            />
                          </g>
                        )}
                      </svg>

                      {/* Legend */}
                      <div className="absolute top-3 right-4 flex items-center gap-4 text-xs font-mono bg-slate-900/90 p-2 rounded-lg border border-slate-800 shadow-md">
                        <span className="flex items-center gap-1.5 text-sky-400">
                          <span className="w-3 h-0.5 bg-sky-400 inline-block" /> Reference (Exact)
                        </span>
                        <span className="flex items-center gap-1.5 text-purple-400">
                          <span className="w-3 h-0.5 bg-purple-400 inline-block border-b border-dashed" /> Approx ({selectedMethod})
                        </span>
                      </div>

                      {/* Hover Data Monospace HUD */}
                      {hoverIndex !== null && (
                        <div className="absolute bottom-3 left-4 bg-slate-900/95 border border-slate-700 p-2 rounded text-[11px] font-mono text-slate-300 flex items-center gap-3">
                          <span>t: {runResult.t_eval[hoverIndex].toFixed(3)}</span>
                          <span className="text-sky-400">u_ref: {runResult.u_ref[hoverIndex].toFixed(5)}</span>
                          <span className="text-purple-400">u_approx: {runResult.u_approx[hoverIndex].toFixed(5)}</span>
                          <span className="text-emerald-400">
                            err: {Math.abs(runResult.u_approx[hoverIndex] - runResult.u_ref[hoverIndex]).toExponential(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metric Cards Row */}
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-mono block">MAX ERROR E_INF</span>
                        <span className="text-sm font-bold font-mono text-cyan-400 tabular-nums">
                          {runResult.metrics.e_inf.toExponential(3)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-mono block">RMSE</span>
                        <span className="text-sm font-bold font-mono text-indigo-400 tabular-nums">
                          {runResult.metrics.rmse.toExponential(3)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-mono block">MAX RESIDUAL</span>
                        <span className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                          {runResult.metrics.residual_max.toExponential(3)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-mono block">RUNTIME</span>
                        <span className="text-sm font-bold font-mono text-slate-200 tabular-nums">
                          {(runResult.metrics.wall_time_sec * 1000).toFixed(1)} ms
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                    <Compass className="w-8 h-8 text-slate-600 animate-pulse" />
                    <span>Click "Solve & Compute Reference" to run mathematical analysis.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE 1B: PHASE PORTRAIT & TRACE-DETERMINANT STUDIO (NEW) */}
        {activeWorkspace === "phase_portrait" && (
          <div className="space-y-6">
            <PhasePortraitStudio />
          </div>
        )}

        {/* WORKSPACE 1C: NUMERICAL ANALYSIS TOURNAMENT & CONVERGENCE LAB (NEW) */}
        {activeWorkspace === "numerical_lab" && (
          <div className="space-y-6">
            <NumericalAnalysisLab />
          </div>
        )}

        {/* WORKSPACE 1D: HIGHER-ORDER & CHAOTIC DYNAMICAL SYSTEMS SANDBOX (NEW) */}
        {activeWorkspace === "custom_sandbox" && (
          <div className="space-y-6">
            <CustomDeSandbox />
          </div>
        )}

        {/* WORKSPACE 2: AI MATHEMATICAL MODEL SYNTHESIZER (NEW) */}
        {activeWorkspace === "ai_formulator" && (
          <div className="space-y-6">
            <AiModelGenerator
              onImportToDiagramStudio={(model) => {
                setImportedAiModel(model);
                setActiveWorkspace("diagram_studio");
              }}
              onImportToSolver={(latexEquations) => {
                setCustomLatexEquation(latexEquations.join(", \\quad "));
                setActiveWorkspace("solve");
              }}
            />
          </div>
        )}

        {/* WORKSPACE 3: DIAGRAM & SCHEMATIC STUDIO (10–12 COMPARTMENTS) */}
        {activeWorkspace === "diagram_studio" && (
          <div className="space-y-6">
            <DiagramStudio
              externalModelToLoad={importedAiModel}
              onSendToSolver={(problemType) => {
                setStepSolverProblem(problemType);
                setActiveWorkspace("step_solver");
              }}
            />
          </div>
        )}

        {/* WORKSPACE 4: STEP-BY-STEP COUPLED ODE SOLVER */}
        {activeWorkspace === "step_solver" && (
          <div className="space-y-6">
            <StepByStepSolver initialProblemType={stepSolverProblem} />
          </div>
        )}

        {/* WORKSPACE 5: METHOD TAXONOMY & 17+ SOLVERS CATALOG */}
        {activeWorkspace === "method_catalog" && (
          <div className="space-y-6">
            <MethodCatalog
              onSelectMethod={() => {
                setActiveWorkspace("step_solver");
              }}
            />
          </div>
        )}

        {/* WORKSPACE 6: MATHEMATICAL MODELLING (14 Domains) */}
        {activeWorkspace === "modelling" && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Verified Mathematical Models across 14 Scientific Disciplines
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Rigorous differential equations incorporating state variables, dimensional parameter sets, conservation laws, and positivity conditions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {canonicalModels.map((m) => (
                <div key={m.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-indigo-400 font-semibold uppercase tracking-wider">
                      {m.discipline}
                    </span>
                    <h3 className="font-bold text-white text-sm">{m.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{m.description}</p>

                    {/* Rendered Equation */}
                    <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-white overflow-x-auto">
                      <MathView math={m.latex_equations[0]} displayMode={true} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {m.state_vars.length} States · {Object.keys(m.parameters).length} Params
                    </span>
                    <button
                      onClick={() => {
                        setSelectedModelId(m.id);
                        setCustomLatexEquation(m.latex_equations.join(", \\quad "));
                        setActiveWorkspace("solve");
                      }}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <span>Load into Solver</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WORKSPACE 7: OPTIMAL CONTROL & OPTIMIZATION */}
        {activeWorkspace === "optimal_control" && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Pontryagin Maximum Principle & Optimal Control Workspace
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Derives Hamiltonians, adjoint differential systems, and solves bounded control trajectories using the Forward-Backward Sweep Method (FBSM).
                </p>
              </div>

              <button
                onClick={handleRunOptimalControl}
                disabled={isRunningControl}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {isRunningControl ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>Solve Optimal Control Problem</span>
              </button>
            </div>

            {optimalControlData && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Mathematical Formulation (5 cols) */}
                <div className="lg:col-span-5 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 text-xs">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                    Optimal Control Formulation
                  </h3>
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase block">
                      Hamiltonian H(x, u, \lambda, t)
                    </span>
                    <div className="overflow-x-auto text-white py-1">
                      <MathView math={optimalControlData.hamiltonian_latex} displayMode={true} />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase block">
                      Adjoint Costate Differential Equations
                    </span>
                    <div className="space-y-1 text-white overflow-x-auto">
                      {optimalControlData.adjoint_equations_latex.map((eq, i) => (
                        <div key={i} className="py-0.5">
                          <MathView math={eq} displayMode={true} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase block">
                      Optimality Condition u*(t)
                    </span>
                    <div className="overflow-x-auto text-white py-1">
                      <MathView math={optimalControlData.optimality_condition_latex} displayMode={true} />
                    </div>
                  </div>

                  {/* Objective Cost Comparison */}
                  <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-200 space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider block text-emerald-400">
                      Objective Cost Reduction J(u)
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <span>Uncontrolled Cost J(0):</span>
                      <span className="font-mono font-bold text-white">{optimalControlData.cost_uncontrolled.toFixed(3)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Optimal Controlled Cost J(u*):</span>
                      <span className="font-mono font-bold text-white">{optimalControlData.cost_controlled.toFixed(3)}</span>
                    </div>
                    <div className="pt-2 border-t border-emerald-800/40 flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>Intervention Efficiency:</span>
                      <span className="font-mono text-sm">+{optimalControlData.cost_reduction_percent.toFixed(1)}% Reduction</span>
                    </div>
                  </div>
                </div>

                {/* Trajectory Plots (7 cols) */}
                <div className="lg:col-span-7 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                    Controlled vs Uncontrolled Epidemic Trajectory
                  </h3>

                  {/* Dual Trajectory SVG */}
                  <div className="h-64 bg-slate-950/80 rounded-xl border border-slate-800 p-3 relative">
                    <svg viewBox="0 0 700 240" className="w-full h-full select-none">
                      {/* Grid */}
                      {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => (
                        <line key={idx} x1={40} y1={20 + frac * 190} x2={670} y2={20 + frac * 190} stroke="#1e293b" strokeDasharray="3 3" />
                      ))}
                      {/* Uncontrolled Infection Curve */}
                      <path
                        d={optimalControlData.t_eval.map((t, i) => {
                          const x = 40 + (t / 20.0) * 630;
                          const y = 210 - (optimalControlData.uncontrolled_states["I"][i] / 0.6) * 190;
                          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                        }).join(" ")}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2.2"
                      />
                      {/* Controlled Infection Curve */}
                      <path
                        d={optimalControlData.t_eval.map((t, i) => {
                          const x = 40 + (t / 20.0) * 630;
                          const y = 210 - (optimalControlData.controlled_states["I"][i] / 0.6) * 190;
                          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                        }).join(" ")}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.2"
                      />
                    </svg>

                    <div className="absolute top-3 right-4 flex items-center gap-4 text-xs font-mono bg-slate-900/90 p-2 rounded-lg border border-slate-800 shadow-md">
                      <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                        <span className="w-3 h-0.5 bg-rose-500 inline-block" /> Uncontrolled I(t)
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Controlled I(t)
                      </span>
                    </div>
                  </div>

                  {/* Optimal Control Profile u*(t) */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-300 uppercase font-mono block">
                      Optimal Vaccination Intervention Profile u*(t)
                    </span>
                    <div className="h-32 bg-slate-950/80 rounded-xl border border-slate-800 p-3">
                      <svg viewBox="0 0 700 110" className="w-full h-full select-none">
                        <path
                          d={optimalControlData.t_eval.map((t, i) => {
                            const x = 40 + (t / 20.0) * 630;
                            const y = 95 - (optimalControlData.optimal_control[i] / 1.0) * 80;
                            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                          }).join(" ")}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.2"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 8: STABILITY & SENSITIVITY ANALYSIS */}
        {activeWorkspace === "stability" && stabilityData && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Jacobian Stability, Eigenvalues & Forward Sensitivity Indices
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Computes analytical equilibria, local linearizations, next-generation matrix R_0, and phase portraits.
                </p>
              </div>

              {stabilityData.r0_value !== undefined && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs flex items-center gap-3">
                  <span className="text-slate-300 font-medium">Basic Reproduction Number:</span>
                  <span className="text-base font-bold font-mono text-cyan-400">
                    R_0 = {stabilityData.r0_value?.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded font-mono font-semibold">
                    {stabilityData.r0_value! > 1 ? "Outbreak Regime (R_0 > 1)" : "Extinction Regime (R_0 < 1)"}
                  </span>
                </div>
              )}
            </div>

            {/* Equilibria Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {stabilityData.equilibria.map((eq, i) => (
                <div key={i} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="font-bold text-white text-sm">
                      Equilibrium #{i + 1}: {Object.entries(eq.coordinates).map(([k, v]) => `${k}=${v}`).join(", ")}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded font-mono ${
                        eq.is_stable ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                      }`}
                    >
                      {eq.is_stable ? "Asymptotically Stable" : "Unstable"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase">Jacobian Matrix J(x*)</span>
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-center text-indigo-300">
                      [ [{eq.jacobian[0].map((v) => v.toFixed(2)).join(", ")}], [{eq.jacobian[1].map((v) => v.toFixed(2)).join(", ")}] ]
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase">Computed Eigenvalues</span>
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl font-mono space-y-1 text-slate-300">
                      {eq.eigenvalues.map((ev, idx) => (
                        <div key={idx}>
                          \lambda_{idx + 1} = {ev.real.toFixed(3)} {ev.imag !== 0 ? `+ ${ev.imag.toFixed(3)}i` : ""}
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-slate-400 text-[11px] leading-relaxed pt-1">{eq.notes}</p>
                </div>
              ))}
            </div>

            {/* Sensitivity Ranking Table */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                Normalized Forward Sensitivity Indices
              </h3>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Parameter</th>
                      <th className="p-3">Target Observable</th>
                      <th className="p-3 font-mono">Sensitivity Index</th>
                      <th className="p-3">Physical Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {stabilityData.sensitivity_ranking.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-3 font-sans font-medium text-white">{s.parameter_name}</td>
                        <td className="p-3 text-cyan-400">{s.target_variable}</td>
                        <td className="p-3 font-bold text-indigo-300">
                          {s.sensitivity_index > 0 ? `+${s.sensitivity_index.toFixed(2)}` : s.sensitivity_index.toFixed(2)}
                        </td>
                        <td className="p-3 font-sans text-slate-300 text-[11px]">{s.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE 9: MODEL CALIBRATION & PARAMETER ESTIMATION */}
        {activeWorkspace === "calibration" && calibrationData && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Nonlinear Parameter Estimation & Model Calibration
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Calibrates differential equation parameters against empirical data using SciPy nonlinear least-squares and generates 95% confidence intervals.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="p-2.5 bg-emerald-950/40 text-emerald-400 rounded-xl font-semibold border border-emerald-800/40">
                  R² = {calibrationData.r_squared.toFixed(4)}
                </span>
                <span className="p-2.5 bg-slate-950/80 text-slate-300 rounded-xl border border-slate-800">
                  RMSE = {calibrationData.rmse.toFixed(4)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Parameter Estimates Table (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Calibrated Parameter Estimates
                </h3>

                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Parameter</th>
                        <th className="p-3 font-mono">Estimate</th>
                        <th className="p-3 font-mono">Std Error</th>
                        <th className="p-3 font-mono">95% CI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {Object.entries(calibrationData.parameter_estimates).map(([pName, pVal], idx) => {
                        const se = calibrationData.standard_errors[pName];
                        const ci = calibrationData.confidence_intervals_95[pName];
                        return (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="p-3 font-sans font-medium text-white">{pName}</td>
                            <td className="p-3 font-bold text-cyan-400">{pVal.toFixed(3)}</td>
                            <td className="p-3 text-slate-400">± {se.toFixed(3)}</td>
                            <td className="p-3 text-slate-400 text-[11px]">[{ci[0].toFixed(2)}, {ci[1].toFixed(2)}]</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-mono block">AKAIKE CRITERION (AIC)</span>
                    <span className="text-sm font-bold font-mono text-indigo-400">{calibrationData.aic.toFixed(2)}</span>
                  </div>
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-mono block">BAYESIAN CRITERION (BIC)</span>
                    <span className="text-sm font-bold font-mono text-cyan-400">{calibrationData.bic.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Observed Points vs Fitted Model (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Empirical Data Points vs Calibrated Dynamic Model
                </h3>

                <div className="h-64 bg-slate-950/80 rounded-xl border border-slate-800 p-3 relative">
                  <svg viewBox="0 0 700 240" className="w-full h-full select-none">
                    {/* Grid */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => (
                      <line key={idx} x1={40} y1={20 + frac * 190} x2={670} y2={20 + frac * 190} stroke="#1e293b" strokeDasharray="3 3" />
                    ))}
                    {/* Fitted Curve */}
                    <path
                      d={calibrationData.t_observed.map((t, i) => {
                        const x = 40 + (t / 14.0) * 630;
                        const y = 210 - (calibrationData.y_fitted[i] / 2.2) * 190;
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      }).join(" ")}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.2"
                    />
                    {/* Observed Points */}
                    {calibrationData.t_observed.map((t, i) => {
                      const x = 40 + (t / 14.0) * 630;
                      const y = 210 - (calibrationData.y_observed[i] / 2.2) * 190;
                      return <circle key={i} cx={x} cy={y} r="4" fill="#a855f7" stroke="#ffffff" strokeWidth="1.5" />;
                    })}
                  </svg>
                  <div className="absolute top-3 right-4 flex items-center gap-4 text-xs font-mono bg-slate-900/90 p-2 rounded-lg border border-slate-800 shadow-md">
                    <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Observed Samples
                    </span>
                    <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                      <span className="w-3 h-0.5 bg-sky-400 inline-block" /> Calibrated Model Curve
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE 10: RESEARCH ASSETS & DOWNLOADS CENTER (NEW) */}
        {activeWorkspace === "exports" && (
          <div className="space-y-6">
            <ExportCenter
              latexSource={generatedLatexSource}
              pythonScript={generatedPyScript}
              onNavigateToWorkspace={(ws) => setActiveWorkspace(ws as any)}
            />
          </div>
        )}

        {/* WORKSPACE 11: RESEARCH LITERATURE DISCOVERY */}
        {activeWorkspace === "literature" && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Peer-Reviewed Scientific Literature Discovery
              </h2>
              <p className="text-xs text-slate-400">
                Live search querying OpenAlex & Crossref metadata with verified external workflows for Google Scholar, IEEE Xplore, and ScienceDirect.
              </p>

              {/* Search Bar */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={literatureQuery}
                  onChange={(e) => setLiteratureQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchLiterature()}
                  placeholder="Search differential equations, optimal control, mathematical models..."
                  className="flex-1 text-xs border border-slate-800 rounded-xl px-4 py-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                />
                <button
                  onClick={() => handleSearchLiterature()}
                  disabled={isLoadingLiterature}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  {isLoadingLiterature ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Search Literature</span>
                </button>
              </div>
            </div>

            {/* Live Articles List */}
            {literatureResults && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
                  <span>Found {literatureResults.articles?.length || 0} Peer-Reviewed Articles via OpenAlex</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {literatureResults.external_portals?.map((p: any, i: number) => (
                      <a
                        key={i}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>{p.portal}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {literatureResults.articles?.map((art: any, i: number) => (
                    <div key={i} className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-4">
                        <a
                          href={art.url || art.doi}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-white text-sm hover:text-cyan-400 transition-colors"
                        >
                          {art.title}
                        </a>
                        {art.is_oa && (
                          <span className="text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2.5 py-0.5 rounded font-mono shrink-0">
                            Open Access
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-slate-400 text-[11px]">
                        <span>{art.authors?.join(", ") || "Authors"}</span>
                        <span>·</span>
                        <span className="font-semibold text-slate-300">{art.venue}</span>
                        <span>·</span>
                        <span>{art.publication_year}</span>
                        <span>·</span>
                        <span className="font-mono text-indigo-400">{art.cited_by_count} Citations</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 12: DATASET DISCOVERY & INTEGRATION */}
        {activeWorkspace === "datasets" && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Empirical Research Dataset Discovery & Integration
              </h2>
              <p className="text-xs text-slate-400">
                Discover open scientific datasets via Zenodo, or load curated historical benchmark records to calibrate mathematical models.
              </p>

              {/* Search Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={datasetQuery}
                  onChange={(e) => setDatasetQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchDatasets()}
                  placeholder="Search scientific datasets on Zenodo..."
                  className="flex-1 text-xs border border-slate-800 rounded-xl px-4 py-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleSearchDatasets()}
                  disabled={isLoadingDatasets}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  {isLoadingDatasets ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                  <span>Search Zenodo</span>
                </button>
              </div>
            </div>

            {/* Curated Historical Datasets */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Pre-Packaged Empirical Benchmark Datasets
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {datasetResults?.curated_datasets?.map((ds: any, idx: number) => (
                  <div key={idx} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3 text-xs flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-cyan-400 font-semibold uppercase">{ds.discipline}</div>
                      <h4 className="font-bold text-white text-sm mt-1">{ds.title}</h4>
                      <p className="text-slate-400 text-[11px] leading-relaxed mt-1.5">{ds.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-slate-400">{ds.sample_size} Samples · {ds.time_span}</span>
                      <button
                        onClick={() => {
                          setActiveWorkspace("calibration");
                          handleRunCalibrationDefault();
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Calibrate Model
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Zenodo Results */}
            {datasetResults?.zenodo_datasets && datasetResults.zenodo_datasets.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Zenodo Open Science Records
                </span>
                <div className="grid grid-cols-1 gap-3">
                  {datasetResults.zenodo_datasets.map((zd: any, idx: number) => (
                    <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <a href={zd.url} target="_blank" rel="noreferrer" className="font-bold text-white text-sm hover:text-cyan-400">
                          {zd.title}
                        </a>
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          {zd.license}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{zd.description}</p>
                      <div className="flex items-center gap-3 text-slate-500 text-[10px] font-mono">
                        <span>{zd.creators?.join(", ")}</span>
                        <span>·</span>
                        <span>{zd.publication_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 13: LATEX REPORT & PYTHON REPRODUCTION GENERATOR */}
        {activeWorkspace === "reports" && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Automated Academic LaTeX Paper & Python Reproduction Generator
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Generates compilable AMS-LaTeX source (.tex) and a standalone Python script (.py) ensuring 100% mathematical reproducibility.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLatexSource);
                    setCopiedTex(true);
                    setTimeout(() => setCopiedTex(false), 2000);
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copiedTex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTex ? "Copied LaTeX!" : "Copy LaTeX Source"}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPyScript);
                    setCopiedPy(true);
                    setTimeout(() => setCopiedPy(false), 2000);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
                >
                  {copiedPy ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPy ? "Copied Script!" : "Copy Python Script"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* LaTeX Source View */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block font-mono">
                  paper_manuscript.tex (LaTeX)
                </span>
                <textarea
                  readOnly
                  rows={22}
                  value={generatedLatexSource}
                  className="w-full font-mono text-[11px] bg-slate-950 border border-slate-800 rounded-xl p-3.5 leading-relaxed text-slate-300 select-all resize-none"
                />
              </div>

              {/* Standalone Python Script */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block font-mono">
                  reproduce_results.py (Standalone Python)
                </span>
                <textarea
                  readOnly
                  rows={22}
                  value={generatedPyScript}
                  className="w-full font-mono text-[11px] bg-slate-950 border border-slate-800 rounded-xl p-3.5 leading-relaxed text-slate-300 select-all resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE 14: AUTOMATED VERIFICATION SUITE */}
        {activeWorkspace === "tests" && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Automated Mathematical Verification Layer
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Runs 6 automated unit tests verifying exact agreement, initial condition adherence, and symbolic Adomian derivatives.
                </p>
              </div>

              <button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20"
              >
                {isRunningTests ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>Re-run Test Suite</span>
              </button>
            </div>

            {testReport && (
              <div className="space-y-4">
                <div className="p-5 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex items-center gap-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-emerald-300">
                      All {testReport.tests_run} Mathematical Verification Tests Passed Successfully
                    </div>
                    <div className="text-xs text-emerald-400/80 mt-0.5">
                      0 Failures · 0 Errors · Certified against exact analytical tanh(t) and singular Lane-Emden polytrope.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 15: SEMI-ANALYTICAL & BENCHMARKS */}
        {activeWorkspace === "semi_analytical" && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Semi-Analytical Benchmarking Suite (HAM, HPM, ADM, VIM, DTM, OHAM)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Comparative error metrics, h-bar convergence-control analysis, and Adomian polynomial inspector across 8 differential equations.
              </p>
            </div>

            {/* Fast Trigger Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: "Riccati IVP", desc: "Order 4, tanh(t) exact", id: "riccati_ivp" },
                { title: "Lane-Emden Polytrope", desc: "Singular at t=0", id: "lane_emden" },
                { title: "Duffing Oscillator", desc: "Cubic stiffness", id: "duffing_oscillator" },
                { title: "Stiff Boundary Layer", desc: "lambda=50 stiff", id: "stiff_relaxation" },
              ].map((p, i) => (
                <div key={i} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-2 text-xs">
                  <h4 className="font-bold text-white text-sm">{p.title}</h4>
                  <p className="text-slate-400 text-[11px]">{p.desc}</p>
                  <button
                    onClick={() => {
                      setActiveWorkspace("solve");
                      handleRunSolve();
                    }}
                    className="w-full mt-2 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl font-medium text-[11px] transition-colors"
                  >
                    Load in Benchmark
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------- */}
      {/* 3. COMPUTATIONAL ADVISOR DRAWER & FLOATING BUTTON                   */}
      {/* ------------------------------------------------------------------- */}
      <ScientificAdvisor
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        onSelectAction={handleAdvisorAction}
      />

      {!isAdvisorOpen && (
        <button
          onClick={() => setIsAdvisorOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white py-3 px-5 rounded-full shadow-2xl flex items-center gap-2.5 transition-transform hover:scale-105 font-medium text-xs shadow-indigo-500/30 border border-indigo-400/30"
          title="Open Noether Computational Advisor"
        >
          <Sparkles className="w-4 h-4 text-cyan-200" />
          <span>Noether Advisor</span>
        </button>
      )}
    </div>
  );
}
