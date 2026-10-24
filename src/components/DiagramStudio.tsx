/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Layers,
  Plus,
  Trash2,
  Download,
  Share2,
  Copy,
  Check,
  Play,
  ArrowRight,
  Maximize2,
  RotateCcw,
  Sparkles,
  Edit3,
  Sliders,
  Move,
  Code2,
  FileCode,
  FileText,
  Activity,
  Zap,
  Info,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  LayoutGrid,
  CircleDot,
  GitBranch
} from "lucide-react";
import { MathView } from "./MathView";

export interface CompartmentNode {
  id: string;
  name: string;
  subscript?: string;
  x: number;
  y: number;
  initialValue: number;
  color: string;
  description?: string;
}

export interface FlowLink {
  id: string;
  fromNodeId: string | null; // null if inflow from outside source
  toNodeId: string | null;   // null if outflow to outside sink
  rateFormula: string;
  rateLatex: string;
  parameterNames: string[];
  description?: string;
}

export interface PresetModel {
  id: string;
  name: string;
  category: string;
  compartmentCount: number;
  description: string;
  nodes: CompartmentNode[];
  links: FlowLink[];
}

export const PRESET_MODELS: PresetModel[] = [
  // 1. 12-COMPARTMENT WHOLE-BODY PBPK MODEL
  {
    id: "pbpk_12",
    name: "12-Compartment Whole-Body PBPK Drug Model",
    category: "Pharmacology & Physiology",
    compartmentCount: 12,
    description: "Physiologically-Based Pharmacokinetic model tracking arterial/venous blood circulation through 11 anatomical tissues and renal/hepatic clearance.",
    nodes: [
      { id: "Blood", name: "Blood", x: 600, y: 350, initialValue: 100.0, color: "#ef4444", description: "Central blood plasma pool" },
      { id: "Lungs", name: "Lungs", x: 600, y: 150, initialValue: 0.0, color: "#38bdf8", description: "Pulmonary vascular bed" },
      { id: "Heart", name: "Heart", x: 420, y: 220, initialValue: 0.0, color: "#f43f5e", description: "Myocardium tissue" },
      { id: "Brain", name: "Brain", x: 780, y: 220, initialValue: 0.0, color: "#a855f7", description: "Cerebral blood-brain barrier" },
      { id: "Gut", name: "Gut", x: 340, y: 350, initialValue: 0.0, color: "#f59e0b", description: "Gastrointestinal tract depot" },
      { id: "Spleen", name: "Spleen", x: 340, y: 490, initialValue: 0.0, color: "#ec4899", description: "Splenic lymphoid reservoir" },
      { id: "Liver", name: "Liver", x: 500, y: 490, initialValue: 0.0, color: "#84cc16", description: "Hepatic metabolism & cytochrome P450" },
      { id: "Kidneys", name: "Kidneys", x: 700, y: 490, initialValue: 0.0, color: "#06b6d4", description: "Renal glomerular filtration" },
      { id: "Muscle", name: "Muscle", x: 860, y: 350, initialValue: 0.0, color: "#eab308", description: "Skeletal muscle mass" },
      { id: "Adipose", name: "Adipose", x: 860, y: 490, initialValue: 0.0, color: "#d946ef", description: "Lipophilic lipid storage" },
      { id: "Bone", name: "Bone", x: 600, y: 580, initialValue: 0.0, color: "#94a3b8", description: "Cortical bone & marrow" },
      { id: "Clearance", name: "Elim", x: 860, y: 580, initialValue: 0.0, color: "#64748b", description: "Renal & biliary excretion sink" }
    ],
    links: [
      { id: "b_lung", fromNodeId: "Blood", toNodeId: "Lungs", rateFormula: "Q_lu * C_b", rateLatex: "Q_{\\text{lu}} C_b", parameterNames: ["Q_lu"] },
      { id: "lung_b", fromNodeId: "Lungs", toNodeId: "Blood", rateFormula: "Q_lu * C_lu", rateLatex: "Q_{\\text{lu}} C_{\\text{lu}}", parameterNames: ["Q_lu"] },
      { id: "b_heart", fromNodeId: "Blood", toNodeId: "Heart", rateFormula: "Q_h * C_b", rateLatex: "Q_h C_b", parameterNames: ["Q_h"] },
      { id: "heart_b", fromNodeId: "Heart", toNodeId: "Blood", rateFormula: "Q_h * C_h", rateLatex: "Q_h C_h", parameterNames: ["Q_h"] },
      { id: "b_brain", fromNodeId: "Blood", toNodeId: "Brain", rateFormula: "Q_br * C_b", rateLatex: "Q_{\\text{br}} C_b", parameterNames: ["Q_br"] },
      { id: "brain_b", fromNodeId: "Brain", toNodeId: "Blood", rateFormula: "Q_br * C_br", rateLatex: "Q_{\\text{br}} C_{\\text{br}}", parameterNames: ["Q_br"] },
      { id: "b_gut", fromNodeId: "Blood", toNodeId: "Gut", rateFormula: "Q_g * C_b", rateLatex: "Q_g C_b", parameterNames: ["Q_g"] },
      { id: "gut_liv", fromNodeId: "Gut", toNodeId: "Liver", rateFormula: "Q_g * C_g", rateLatex: "Q_g C_g", parameterNames: ["Q_g"] },
      { id: "b_spl", fromNodeId: "Blood", toNodeId: "Spleen", rateFormula: "Q_sp * C_b", rateLatex: "Q_{\\text{sp}} C_b", parameterNames: ["Q_sp"] },
      { id: "spl_liv", fromNodeId: "Spleen", toNodeId: "Liver", rateFormula: "Q_sp * C_sp", rateLatex: "Q_{\\text{sp}} C_{\\text{sp}}", parameterNames: ["Q_sp"] },
      { id: "liv_b", fromNodeId: "Liver", toNodeId: "Blood", rateFormula: "Q_liv * C_liv", rateLatex: "Q_{\\text{liv}} C_{\\text{liv}}", parameterNames: ["Q_liv"] },
      { id: "b_kid", fromNodeId: "Blood", toNodeId: "Kidneys", rateFormula: "Q_k * C_b", rateLatex: "Q_k C_b", parameterNames: ["Q_k"] },
      { id: "kid_b", fromNodeId: "Kidneys", toNodeId: "Blood", rateFormula: "Q_k * C_k", rateLatex: "Q_k C_k", parameterNames: ["Q_k"] },
      { id: "b_mus", fromNodeId: "Blood", toNodeId: "Muscle", rateFormula: "Q_m * C_b", rateLatex: "Q_m C_b", parameterNames: ["Q_m"] },
      { id: "mus_b", fromNodeId: "Muscle", toNodeId: "Blood", rateFormula: "Q_m * C_m", rateLatex: "Q_m C_m", parameterNames: ["Q_m"] },
      { id: "b_adi", fromNodeId: "Blood", toNodeId: "Adipose", rateFormula: "Q_ad * C_b", rateLatex: "Q_{\\text{ad}} C_b", parameterNames: ["Q_ad"] },
      { id: "adi_b", fromNodeId: "Adipose", toNodeId: "Blood", rateFormula: "Q_ad * C_ad", rateLatex: "Q_{\\text{ad}} C_{\\text{ad}}", parameterNames: ["Q_ad"] },
      { id: "b_bon", fromNodeId: "Blood", toNodeId: "Bone", rateFormula: "Q_bo * C_b", rateLatex: "Q_{\\text{bo}} C_b", parameterNames: ["Q_bo"] },
      { id: "bon_b", fromNodeId: "Bone", toNodeId: "Blood", rateFormula: "Q_bo * C_bo", rateLatex: "Q_{\\text{bo}} C_{\\text{bo}}", parameterNames: ["Q_bo"] },
      { id: "kid_elim", fromNodeId: "Kidneys", toNodeId: "Clearance", rateFormula: "CL_ren * C_k", rateLatex: "\\text{CL}_{\\text{ren}} C_k", parameterNames: ["CL_ren"] }
    ]
  },

  // 2. 10-COMPARTMENT COVID-19 CLINICAL STAGING MODEL
  {
    id: "covid_10",
    name: "10-Compartment Epidemic Clinical Staging (SEIQRHUD)",
    category: "Epidemiology & Hospital Management",
    compartmentCount: 10,
    description: "Tracks viral infection progression, asymptomatic transmission, home isolation, hospitalization, ICU saturation, and recovery.",
    nodes: [
      { id: "S", name: "S", x: 120, y: 220, initialValue: 0.90, color: "#3b82f6", description: "Susceptible population" },
      { id: "V", name: "V", x: 120, y: 440, initialValue: 0.08, color: "#06b6d4", description: "Vaccinated / Protected" },
      { id: "E", name: "E", x: 300, y: 320, initialValue: 0.01, color: "#f59e0b", description: "Exposed & latent" },
      { id: "I_A", name: "I_A", x: 480, y: 220, initialValue: 0.006, color: "#f97316", description: "Asymptomatic infectious" },
      { id: "I_S", name: "I_S", x: 480, y: 440, initialValue: 0.004, color: "#ef4444", description: "Symptomatic infectious" },
      { id: "Q", name: "Q", x: 660, y: 220, initialValue: 0.0, color: "#8b5cf6", description: "Quarantined / Home isolation" },
      { id: "H", name: "H", x: 660, y: 440, initialValue: 0.0, color: "#ec4899", description: "Hospitalized inpatients" },
      { id: "U", name: "U", x: 840, y: 440, initialValue: 0.0, color: "#e11d48", description: "Intensive care unit (ICU)" },
      { id: "R", name: "R", x: 840, y: 220, initialValue: 0.0, color: "#10b981", description: "Recovered & immune" },
      { id: "D", name: "D", x: 1000, y: 440, initialValue: 0.0, color: "#64748b", description: "Deceased / Fatal outcome" }
    ],
    links: [
      { id: "vax", fromNodeId: "S", toNodeId: "V", rateFormula: "nu * S", rateLatex: "\\nu S", parameterNames: ["nu"] },
      { id: "trans_S", fromNodeId: "S", toNodeId: "E", rateFormula: "beta * S * (I_S + 0.5*I_A)", rateLatex: "\\beta S (I_S + 0.5 I_A)", parameterNames: ["beta"] },
      { id: "trans_V", fromNodeId: "V", toNodeId: "E", rateFormula: "0.2 * beta * V * I_S", rateLatex: "0.2 \\beta V I_S", parameterNames: ["beta"] },
      { id: "e_asymp", fromNodeId: "E", toNodeId: "I_A", rateFormula: "0.4 * sigma * E", rateLatex: "0.4 \\sigma E", parameterNames: ["sigma"] },
      { id: "e_symp", fromNodeId: "E", toNodeId: "I_S", rateFormula: "0.6 * sigma * E", rateLatex: "0.6 \\sigma E", parameterNames: ["sigma"] },
      { id: "ia_rec", fromNodeId: "I_A", toNodeId: "R", rateFormula: "gamma_A * I_A", rateLatex: "\\gamma_A I_A", parameterNames: ["gamma_A"] },
      { id: "is_quar", fromNodeId: "I_S", toNodeId: "Q", rateFormula: "delta_Q * I_S", rateLatex: "\\delta_Q I_S", parameterNames: ["delta_Q"] },
      { id: "is_hosp", fromNodeId: "I_S", toNodeId: "H", rateFormula: "eta_H * I_S", rateLatex: "\\eta_H I_S", parameterNames: ["eta_H"] },
      { id: "q_rec", fromNodeId: "Q", toNodeId: "R", rateFormula: "gamma_Q * Q", rateLatex: "\\gamma_Q Q", parameterNames: ["gamma_Q"] },
      { id: "h_icu", fromNodeId: "H", toNodeId: "U", rateFormula: "omega_U * H", rateLatex: "\\omega_U H", parameterNames: ["omega_U"] },
      { id: "h_rec", fromNodeId: "H", toNodeId: "R", rateFormula: "gamma_H * H", rateLatex: "\\gamma_H H", parameterNames: ["gamma_H"] },
      { id: "u_dec", fromNodeId: "U", toNodeId: "D", rateFormula: "mu_U * U", rateLatex: "\\mu_U U", parameterNames: ["mu_U"] },
      { id: "u_rec", fromNodeId: "U", toNodeId: "R", rateFormula: "gamma_U * U", rateLatex: "\\gamma_U U", parameterNames: ["gamma_U"] }
    ]
  },

  // 3. 10-TROPHIC BOREAL ECOLOGICAL FOOD WEB
  {
    id: "trophic_10",
    name: "10-Trophic Boreal Aquatic Ecosystem",
    category: "Ecology & Environmental Biology",
    compartmentCount: 10,
    description: "Coupled nutrient-plankton-herbivore-fish-apex predator trophic cascade with bioaccumulation and detritus recycling.",
    nodes: [
      { id: "Nutrient", name: "N", x: 140, y: 220, initialValue: 50.0, color: "#06b6d4", description: "Dissolved inorganic nutrients" },
      { id: "Detritus", name: "D", x: 140, y: 440, initialValue: 20.0, color: "#78716c", description: "Benthic organic detritus" },
      { id: "Phyto", name: "P_1", x: 320, y: 220, initialValue: 15.0, color: "#10b981", description: "Phytoplankton primary producers" },
      { id: "Macro", name: "P_2", x: 320, y: 440, initialValue: 25.0, color: "#22c55e", description: "Submerged macrophytes" },
      { id: "Zoo", name: "H_1", x: 500, y: 220, initialValue: 8.0, color: "#f59e0b", description: "Pelagic zooplankton grazers" },
      { id: "Benthos", name: "H_2", x: 500, y: 440, initialValue: 12.0, color: "#d97706", description: "Benthic herbivorous snails" },
      { id: "Fish1", name: "F_1", x: 680, y: 220, initialValue: 4.0, color: "#3b82f6", description: "Planktivorous forage fish" },
      { id: "Fish2", name: "F_2", x: 680, y: 440, initialValue: 5.0, color: "#6366f1", description: "Benthic bottom feeding fish" },
      { id: "Apex", name: "A", x: 860, y: 330, initialValue: 1.2, color: "#ef4444", description: "Apex predator northern pike" },
      { id: "Microbe", name: "M", x: 1020, y: 330, initialValue: 18.0, color: "#a855f7", description: "Microbial nutrient decomposers" }
    ],
    links: [
      { id: "n_p1", fromNodeId: "Nutrient", toNodeId: "Phyto", rateFormula: "r_1 * N * P_1", rateLatex: "r_1 N P_1", parameterNames: ["r_1"] },
      { id: "n_p2", fromNodeId: "Nutrient", toNodeId: "Macro", rateFormula: "r_2 * N * P_2", rateLatex: "r_2 N P_2", parameterNames: ["r_2"] },
      { id: "p1_h1", fromNodeId: "Phyto", toNodeId: "Zoo", rateFormula: "c_1 * P_1 * H_1", rateLatex: "c_1 P_1 H_1", parameterNames: ["c_1"] },
      { id: "p2_h2", fromNodeId: "Macro", toNodeId: "Benthos", rateFormula: "c_2 * P_2 * H_2", rateLatex: "c_2 P_2 H_2", parameterNames: ["c_2"] },
      { id: "h1_f1", fromNodeId: "Zoo", toNodeId: "Fish1", rateFormula: "p_1 * H_1 * F_1", rateLatex: "p_1 H_1 F_1", parameterNames: ["p_1"] },
      { id: "h2_f2", fromNodeId: "Benthos", toNodeId: "Fish2", rateFormula: "p_2 * H_2 * F_2", rateLatex: "p_2 H_2 F_2", parameterNames: ["p_2"] },
      { id: "f1_a", fromNodeId: "Fish1", toNodeId: "Apex", rateFormula: "k_1 * F_1 * A", rateLatex: "k_1 F_1 A", parameterNames: ["k_1"] },
      { id: "f2_a", fromNodeId: "Fish2", toNodeId: "Apex", rateFormula: "k_2 * F_2 * A", rateLatex: "k_2 F_2 A", parameterNames: ["k_2"] },
      { id: "a_d", fromNodeId: "Apex", toNodeId: "Detritus", rateFormula: "m_a * A", rateLatex: "m_a A", parameterNames: ["m_a"] },
      { id: "d_m", fromNodeId: "Detritus", toNodeId: "Microbe", rateFormula: "d_rate * D * M", rateLatex: "d_{\\text{rate}} D M", parameterNames: ["d_rate"] },
      { id: "m_n", fromNodeId: "Microbe", toNodeId: "Nutrient", rateFormula: "min_rate * M", rateLatex: "\\mu_N M", parameterNames: ["min_rate"] }
    ]
  },

  // 4. CLASSIC SIR (3)
  {
    id: "sir_3",
    name: "Classic Kermack-McKendrick SIR (3)",
    category: "Epidemiology",
    compartmentCount: 3,
    description: "Standard 3-compartment epidemic transmission with transmission rate beta and removal rate gamma.",
    nodes: [
      { id: "S", name: "S", x: 220, y: 300, initialValue: 0.99, color: "#3b82f6", description: "Susceptible" },
      { id: "I", name: "I", x: 540, y: 300, initialValue: 0.01, color: "#ef4444", description: "Infectious" },
      { id: "R", name: "R", x: 860, y: 300, initialValue: 0.0, color: "#10b981", description: "Recovered" }
    ],
    links: [
      { id: "inflow", fromNodeId: null, toNodeId: "S", rateFormula: "Lambda", rateLatex: "\\Lambda", parameterNames: ["Lambda"] },
      { id: "trans", fromNodeId: "S", toNodeId: "I", rateFormula: "beta * S * I", rateLatex: "\\beta S I", parameterNames: ["beta"] },
      { id: "rec", fromNodeId: "I", toNodeId: "R", rateFormula: "gamma * I", rateLatex: "\\gamma I", parameterNames: ["gamma"] },
      { id: "muS", fromNodeId: "S", toNodeId: null, rateFormula: "mu * S", rateLatex: "\\mu S", parameterNames: ["mu"] },
      { id: "muI", fromNodeId: "I", toNodeId: null, rateFormula: "mu * I", rateLatex: "\\mu I", parameterNames: ["mu"] },
      { id: "muR", fromNodeId: "R", toNodeId: null, rateFormula: "mu * R", rateLatex: "\\mu R", parameterNames: ["mu"] }
    ]
  },

  // 5. CLASSIC LOTKA-VOLTERRA (2)
  {
    id: "lotka_volterra_2",
    name: "Lotka-Volterra Predator-Prey (2)",
    category: "Ecology",
    compartmentCount: 2,
    description: "Two-trophic cyclic interaction between prey (x) and predators (y).",
    nodes: [
      { id: "x", name: "x", x: 380, y: 300, initialValue: 2.0, color: "#10b981", description: "Prey density" },
      { id: "y", name: "y", x: 740, y: 300, initialValue: 1.0, color: "#ef4444", description: "Predator population" }
    ],
    links: [
      { id: "grow", fromNodeId: null, toNodeId: "x", rateFormula: "alpha * x", rateLatex: "\\alpha x", parameterNames: ["alpha"] },
      { id: "pred", fromNodeId: "x", toNodeId: null, rateFormula: "beta * x * y", rateLatex: "\\beta x y", parameterNames: ["beta"] },
      { id: "pred_repr", fromNodeId: null, toNodeId: "y", rateFormula: "delta * x * y", rateLatex: "\\delta x y", parameterNames: ["delta"] },
      { id: "mort", fromNodeId: "y", toNodeId: null, rateFormula: "gamma * y", rateLatex: "\\gamma y", parameterNames: ["gamma"] }
    ]
  }
];

interface DiagramStudioProps {
  onSendToSolver?: (problemType: string, customParams?: any) => void;
  externalModelToLoad?: any;
}

export const DiagramStudio: React.FC<DiagramStudioProps> = ({
  onSendToSolver,
  externalModelToLoad
}) => {
  const [nodes, setNodes] = useState<CompartmentNode[]>(PRESET_MODELS[0].nodes);
  const [links, setLinks] = useState<FlowLink[]>(PRESET_MODELS[0].links);
  const [activePreset, setActivePreset] = useState<string>("pbpk_12");

  // Selection & dragging state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pan & Zoom
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Linking
  const [linkingSourceNodeId, setLinkingSourceNodeId] = useState<string | null>(null);

  // Copy flags
  const [copiedTikZ, setCopiedTikZ] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load external model if passed (e.g. from AI generator)
  useEffect(() => {
    if (externalModelToLoad && externalModelToLoad.state_vars) {
      const newNodes: CompartmentNode[] = externalModelToLoad.state_vars.map((sv: any, idx: number) => {
        const count = externalModelToLoad.state_vars.length;
        const angle = (2 * Math.PI * idx) / count;
        return {
          id: sv.id || `node_${idx}`,
          name: sv.name || `C_${idx + 1}`,
          x: Math.round(600 + 320 * Math.cos(angle)),
          y: Math.round(350 + 220 * Math.sin(angle)),
          initialValue: sv.initial_value || 1.0,
          color: sv.color || "#3b82f6",
          description: sv.description || `Compartment ${sv.name}`
        };
      });

      const newLinks: FlowLink[] = (externalModelToLoad.links || []).map((l: any, idx: number) => ({
        id: `link_${idx}_${Date.now()}`,
        fromNodeId: l.from || null,
        toNodeId: l.to || null,
        rateFormula: l.rate || "k * S",
        rateLatex: l.rate_latex || "k S",
        parameterNames: ["k"]
      }));

      setNodes(newNodes);
      setLinks(newLinks);
      setActivePreset("ai_custom");
    }
  }, [externalModelToLoad]);

  // Derived Coupled ODE System in LaTeX
  const derivedOdeSystem = useMemo(() => {
    return nodes.map(node => {
      const inflows = links
        .filter(l => l.toNodeId === node.id)
        .map(l => l.rateLatex);
      const outflows = links
        .filter(l => l.fromNodeId === node.id)
        .map(l => l.rateLatex);

      let rhs = "";
      if (inflows.length > 0) {
        rhs += inflows.join(" + ");
      }
      if (outflows.length > 0) {
        if (rhs.length > 0) rhs += " - ";
        rhs += outflows.map(o => (o.includes("+") ? `(${o})` : o)).join(" - ");
      }
      if (rhs.length === 0) rhs = "0";

      return {
        varName: node.name,
        latex: `\\frac{d ${node.name}}{dt} = ${rhs}`,
        initialCondition: `${node.name}(0) = ${node.initialValue}`
      };
    });
  }, [nodes, links]);

  // Handle Dragging
  const handleMouseDownNode = (e: React.MouseEvent, node: CompartmentNode) => {
    e.stopPropagation();
    if (linkingSourceNodeId) {
      if (linkingSourceNodeId !== node.id) {
        const fromName = nodes.find(n => n.id === linkingSourceNodeId)?.name || "X";
        const newLink: FlowLink = {
          id: `link_${Date.now()}`,
          fromNodeId: linkingSourceNodeId,
          toNodeId: node.id,
          rateFormula: `k * ${fromName}`,
          rateLatex: `k \\cdot ${fromName}`,
          parameterNames: ["k"]
        };
        setLinks(prev => [...prev, newLink]);
        setSelectedLinkId(newLink.id);
      }
      setLinkingSourceNodeId(null);
      return;
    }

    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
    setDraggingNodeId(node.id);

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setDragOffset({
        x: (e.clientX - rect.left) / zoomScale - node.x,
        y: (e.clientY - rect.top) / zoomScale - node.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left) / zoomScale - dragOffset.x - panOffset.x;
      const newY = (e.clientY - rect.top) / zoomScale - dragOffset.y - panOffset.y;
      setNodes(prev =>
        prev.map(n => (n.id === draggingNodeId ? { ...n, x: Math.round(newX), y: Math.round(newY) } : n))
      );
    } else if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  // Add new compartment node
  const handleAddNode = () => {
    const letters = ["X", "Y", "Z", "W", "A", "B", "C", "D", "E", "F", "G", "H", "K", "M"];
    const used = new Set(nodes.map(n => n.name));
    const nextName = letters.find(l => !used.has(l)) || `C_${nodes.length + 1}`;
    const colors = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#eab308"];

    const newNode: CompartmentNode = {
      id: `node_${Date.now()}`,
      name: nextName,
      x: 200 + (nodes.length * 80) % 800,
      y: 200 + (Math.floor(nodes.length / 8) * 120),
      initialValue: 1.0,
      color: colors[nodes.length % colors.length],
      description: `State compartment ${nextName}`
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Auto-Layout: Circular
  const applyCircularLayout = () => {
    const count = nodes.length;
    if (count === 0) return;
    const centerX = 600;
    const centerY = 360;
    const radius = Math.min(380, Math.max(220, count * 30));

    setNodes(prev =>
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

  // Auto-Layout: Grid
  const applyGridLayout = () => {
    const count = nodes.length;
    if (count === 0) return;
    const cols = count > 8 ? 4 : (count > 4 ? 3 : 2);
    const startX = 220;
    const startY = 180;
    const gapX = 260;
    const gapY = 160;

    setNodes(prev =>
      prev.map((n, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return {
          ...n,
          x: startX + col * gapX,
          y: startY + row * gapY
        };
      })
    );
  };

  // Delete node
  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setLinks(prev => prev.filter(l => l.fromNodeId !== id && l.toNodeId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Delete link
  const handleDeleteLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    if (selectedLinkId === id) setSelectedLinkId(null);
  };

  // Load Preset
  const handleLoadPreset = (presetId: string) => {
    const preset = PRESET_MODELS.find(p => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setNodes(JSON.parse(JSON.stringify(preset.nodes)));
    setLinks(JSON.parse(JSON.stringify(preset.links)));
    setSelectedNodeId(null);
    setSelectedLinkId(null);
    setLinkingSourceNodeId(null);
  };

  // Generate TikZ Code for LaTeX publications
  const tikzCode = useMemo(() => {
    let code = `\\documentclass{standalone}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}\n\\begin{document}\n\\begin{tikzpicture}[\n  compartment/.style={rectangle, rounded corners=6pt, minimum width=2.0cm, minimum height=1.2cm, text centered, draw=black!70, line width=1.2pt, fill=blue!10, font=\\bfseries},\n  rate/.style={-{Stealth[length=3mm, width=2.5mm]}, line width=1.3pt, draw=black!80},\n  rate_label/.style={midway, above, font=\\small\\itshape}\n]\n\n`;

    nodes.forEach(node => {
      const tikzX = (node.x / 90).toFixed(2);
      const tikzY = (-node.y / 90).toFixed(2);
      code += `  \\node[compartment] (${node.id}) at (${tikzX}, ${tikzY}) {$${node.name}$};\n`;
    });
    code += `\n`;

    links.forEach(link => {
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
  }, [nodes, links]);

  // Export SVG directly
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `${activePreset || "compartmental"}_schematic.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  // Export High-Res PNG (300 DPI canvas rendering)
  const handleExportPng = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgRef.current);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      // High resolution scale (2x for retina quality)
      canvas.width = 2400;
      canvas.height = 1400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#020617"; // dark slate background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${activePreset || "compartmental"}_schematic.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedLink = links.find(l => l.id === selectedLinkId);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                10–12 Compartment Architecture
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Coupled ODE Extraction
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                TikZ & SVG/PNG Vector Download
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Compartmental Flow & Schematic Diagram Studio (Up to 12 States)
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Design complex multi-compartment dynamical networks: whole-body PBPK drug models (12 tissues), multi-stage pandemic hospitals (10 tiers), 
              or boreal food webs. The engine automatically derives the complete coupled differential system in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (onSendToSolver) {
                  onSendToSolver(
                    activePreset === "lotka_volterra_2" ? "coupled_predator_prey" : "compartmental_sir",
                    { nodes, links }
                  );
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-xs"
            >
              <Zap className="w-4 h-4 text-cyan-200" />
              <span>Solve System</span>
            </button>

            <button
              onClick={handleExportSvg}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all text-xs"
              title="Download vector SVG"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>SVG</span>
            </button>

            <button
              onClick={handleExportPng}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all text-xs"
              title="Download High-Res 300 DPI PNG"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>PNG (300 DPI)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Selector Tabs */}
      <div className="flex flex-wrap gap-2 items-center p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Presets:</span>
        {PRESET_MODELS.map(preset => (
          <button
            key={preset.id}
            onClick={() => handleLoadPreset(preset.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activePreset === preset.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"
            }`}
          >
            <span>{preset.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-950/60 rounded text-slate-300">
              {preset.compartmentCount}
            </span>
          </button>
        ))}
      </div>

      {/* Main Canvas and Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Canvas Area (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
          {/* Canvas Toolbar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddNode}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add State
              </button>
              <button
                onClick={() => {
                  if (selectedNodeId) setLinkingSourceNodeId(selectedNodeId);
                }}
                disabled={!selectedNodeId}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedNodeId ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Connect Rate
              </button>

              {linkingSourceNodeId && (
                <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs animate-pulse">
                  Click destination...
                </span>
              )}
            </div>

            {/* Layout & Zoom Affordances */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  onClick={applyCircularLayout}
                  className="px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 flex items-center gap-1"
                  title="Arrange all compartments in circular layout"
                >
                  <CircleDot className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Circle</span>
                </button>
                <button
                  onClick={applyGridLayout}
                  className="px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 flex items-center gap-1"
                  title="Arrange all compartments in grid layout"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Grid</span>
                </button>
              </div>

              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.15))}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[10px] font-mono text-slate-300">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  onClick={() => setZoomScale(prev => Math.min(1.8, prev + 0.15))}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setZoomScale(1.0);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="px-2 py-1 text-[10px] text-slate-400 hover:text-white rounded hover:bg-slate-700"
                  title="Reset Zoom"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Interactive SVG Canvas */}
          <div className="relative bg-slate-950 min-h-[560px] flex-1 select-none overflow-hidden cursor-crosshair">
            <svg
              ref={svgRef}
              className="w-full h-full min-h-[560px]"
              viewBox="0 0 1200 700"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={() => {
                setSelectedNodeId(null);
                setSelectedLinkId(null);
                setLinkingSourceNodeId(null);
              }}
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
                </marker>
                <marker id="arrow-selected" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                </pattern>
              </defs>

              <rect width="100%" height="100%" fill="url(#grid)" />

              <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomScale})`}>
                {/* Render Rate Flow Links */}
                {links.map(link => {
                  const fromNode = nodes.find(n => n.id === link.fromNodeId);
                  const toNode = nodes.find(n => n.id === link.toNodeId);
                  const isSelected = selectedLinkId === link.id;

                  let startX = 0, startY = 0, endX = 0, endY = 0;
                  let midX = 0, midY = 0;

                  if (fromNode && toNode) {
                    startX = fromNode.x;
                    startY = fromNode.y;
                    endX = toNode.x;
                    endY = toNode.y;

                    const dx = endX - startX;
                    const dy = endY - startY;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const offset = 42;
                    startX += (dx / dist) * offset;
                    startY += (dy / dist) * offset;
                    endX -= (dx / dist) * (offset + 8);
                    endY -= (dy / dist) * (offset + 8);

                    midX = (startX + endX) / 2;
                    midY = (startY + endY) / 2 - 12;
                  } else if (!fromNode && toNode) {
                    endX = toNode.x - 44;
                    endY = toNode.y;
                    startX = endX - 50;
                    startY = endY;
                    midX = (startX + endX) / 2;
                    midY = startY - 12;
                  } else if (fromNode && !toNode) {
                    startX = fromNode.x;
                    startY = fromNode.y + 40;
                    endX = startX;
                    endY = startY + 45;
                    midX = startX + 16;
                    midY = (startY + endY) / 2;
                  }

                  return (
                    <g
                      key={link.id}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedLinkId(link.id);
                        setSelectedNodeId(null);
                      }}
                      className="cursor-pointer group"
                    >
                      <line
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke={isSelected ? "#38bdf8" : "#64748b"}
                        strokeWidth={isSelected ? 3 : 1.8}
                        markerEnd={isSelected ? "url(#arrow-selected)" : "url(#arrow)"}
                        className="transition-all group-hover:stroke-cyan-400"
                      />
                      <rect
                        x={midX - 26}
                        y={midY - 9}
                        width="52"
                        height="18"
                        rx="5"
                        fill="#0f172a"
                        stroke={isSelected ? "#38bdf8" : "#334155"}
                        strokeWidth="1"
                      />
                      <text
                        x={midX}
                        y={midY + 4}
                        textAnchor="middle"
                        fill={isSelected ? "#38bdf8" : "#cbd5e1"}
                        fontSize="10"
                        fontWeight="600"
                        className="font-mono select-none"
                      >
                        {link.rateFormula.length > 8 ? link.rateFormula.slice(0, 7) + "…" : link.rateFormula}
                      </text>
                    </g>
                  );
                })}

                {/* Render Compartment Nodes */}
                {nodes.map(node => {
                  const isSelected = selectedNodeId === node.id;
                  const isLinkingSource = linkingSourceNodeId === node.id;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onMouseDown={e => handleMouseDownNode(e, node)}
                      className="cursor-move group"
                    >
                      {(isSelected || isLinkingSource) && (
                        <circle
                          r="44"
                          fill="none"
                          stroke={isLinkingSource ? "#f59e0b" : "#38bdf8"}
                          strokeWidth="2"
                          strokeDasharray={isLinkingSource ? "4 4" : "none"}
                          className="animate-pulse"
                        />
                      )}
                      <rect
                        x="-38"
                        y="-30"
                        width="76"
                        height="60"
                        rx="12"
                        fill="#1e293b"
                        stroke={isSelected ? "#38bdf8" : node.color}
                        strokeWidth={isSelected ? "3" : "2"}
                        className="shadow-xl transition-all group-hover:fill-slate-800"
                      />
                      <text
                        y="-4"
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="15"
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
                        IC: {node.initialValue}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>

        {/* Right Side: Inspector & Live 10–12 ODE Derivation (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Node / Link Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Component Inspector
              </span>
              {selectedNode && (
                <button onClick={() => handleDeleteNode(selectedNode.id)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
              {selectedLink && (
                <button onClick={() => handleDeleteLink(selectedLink.id)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </h3>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">State Variable Name</label>
                  <input
                    type="text"
                    value={selectedNode.name}
                    onChange={e => {
                      const val = e.target.value;
                      setNodes(prev => prev.map(n => (n.id === selectedNode.id ? { ...n, name: val } : n)));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Initial Condition u(0)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedNode.initialValue}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setNodes(prev => prev.map(n => (n.id === selectedNode.id ? { ...n, initialValue: val } : n)));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Color Palette</label>
                  <div className="flex gap-2">
                    {["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"].map(c => (
                      <button
                        key={c}
                        onClick={() => setNodes(prev => prev.map(n => (n.id === selectedNode.id ? { ...n, color: c } : n)))}
                        className={`w-5 h-5 rounded-full border-2 ${selectedNode.color === c ? "border-white scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedLink ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Rate Law Expression</label>
                  <input
                    type="text"
                    value={selectedLink.rateFormula}
                    onChange={e => {
                      const val = e.target.value;
                      setLinks(prev => prev.map(l => (l.id === selectedLink.id ? { ...l, rateFormula: val, rateLatex: val } : l)));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1 text-[11px]">Rendered Rate:</span>
                  <MathView math={selectedLink.rateLatex} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-3 text-center">
                Click any node or rate arrow on the canvas to inspect its parameters.
              </p>
            )}
          </div>

          {/* Auto-Derived Coupled Differential Equations */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Derived Coupled ODEs ({derivedOdeSystem.length})</span>
              </h3>
              <button
                onClick={() => {
                  const allLatex = derivedOdeSystem.map(eq => eq.latex).join("\n");
                  navigator.clipboard.writeText(allLatex);
                  setCopiedLatex(true);
                  setTimeout(() => setCopiedLatex(false), 2000);
                }}
                className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
              >
                {copiedLatex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLatex ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="space-y-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800 max-h-56 overflow-y-auto">
              {derivedOdeSystem.map((eq, i) => (
                <div key={i} className="pb-2 border-b border-slate-800/60 last:border-0 last:pb-0">
                  <MathView math={eq.latex} displayMode={true} />
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 text-right">
                    {eq.initialCondition}
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Download Actions */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={handleExportSvg}
                className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download SVG</span>
              </button>
              <button
                onClick={handleExportPng}
                className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LaTeX TikZ Code Generator Drawer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-400" />
              <span>LaTeX TikZ Publication Code</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Copy or download directly for vector graphics rendering in Overleaf and LaTeX manuscripts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(tikzCode);
                setCopiedTikZ(true);
                setTimeout(() => setCopiedTikZ(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors border border-slate-700"
            >
              {copiedTikZ ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTikZ ? "Copied" : "Copy TikZ"}</span>
            </button>
            <button
              onClick={() => {
                const blob = new Blob([tikzCode], { type: "application/x-tex" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${activePreset}_tikz.tex`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .tex</span>
            </button>
          </div>
        </div>
        <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-indigo-300 overflow-x-auto max-h-52 leading-relaxed">
          {tikzCode}
        </pre>
      </div>
    </div>
  );
};
