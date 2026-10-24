/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Compass,
  CheckCircle2,
  ChevronDown,
  Layers,
  Cpu,
  BookOpen,
  Sliders,
  TrendingUp,
  Activity
} from "lucide-react";
import { MathView } from "./MathView";

interface ChatMessage {
  id: string;
  sender: "user" | "advisor";
  timestamp: string;
  text: string;
  data?: {
    headline?: string;
    summary?: string;
    sections?: Array<{ title: string; content: string }>;
    recommended_actions?: Array<{
      label: string;
      action: string;
      problem_id?: string;
      method?: string;
    }>;
  };
}

interface ScientificAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string, metadata?: any) => void;
}

const CURATED_PROMPTS = [
  "What capabilities does Noether Scientific provide?",
  "Explore Phase Portraits & Poincaré Trace-Determinant Parabola",
  "How do we verify Numerical Order of Convergence (log-log slope)?",
  "Why do explicit solvers explode on stiff ODEs (h > 2/lambda)?",
  "How do DTM and OHAM work & what are their convergence parameters?",
  "Simulate 3D Lorenz Strange Attractor & Sel'kov Limit Cycles",
  "Explain the HAM h-bar curve and plateau principle",
  "How do I solve an Optimal Control problem with Pontryagin?"
];

export const ScientificAdvisor: React.FC<ScientificAdvisorProps> = ({
  isOpen,
  onClose,
  onSelectAction
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial_greeting",
      sender: "advisor",
      timestamp: "Noether Computational Advisor",
      text: "Welcome to Noether Scientific. I am your automated mathematical and computational guide. Ask me about analytical, semi-analytical (HAM, HPM, ADM, VIM, DTM, OHAM), or numerical methods, or request guidance on phase portraits, order verification, stiffness barriers, optimal control, and literature discovery.",
      data: {
        headline: "Noether Computational Intelligence & Guidance Engine",
        summary: "This platform provides 15 specialized mathematical modeling, numerical analysis, and differential equation workspaces.",
        sections: [
          {
            title: "Core Computational Capabilities",
            content: "• Equation Solver: LaTeX equation editor, plain-text parser, and automated problem recognition.\n• Phase Portrait Studio: Interactive click-to-shoot vector fields, nullclines, and Poincaré trace-determinant parabola (τ vs Δ).\n• Numerical Analysis Lab: Multi-integrator tournament (Euler, Heun, RK4, Radau), Butcher tableaux, log-log convergence order slope p, and explicit stiffness explosion demo.\n• Chaotic Systems Sandbox: 3D Lorenz butterfly attractor, Sel'kov glycolysis limit cycles, and FitzHugh-Nagumo neural bursts.\n• Semi-Analytical Suite: HAM (h-bar convergence control), HPM, ADM (Adomian polynomials), VIM (Lagrange multipliers), DTM (algebraic recurrence), and OHAM (optimal residual constants).\n• Optimal Control: Pontryagin Maximum Principle, Hamiltonians, adjoint differential systems, and Forward-Backward Sweep Method (FBSM)."
          }
        ],
        recommended_actions: [
          { label: "Phase Portrait & Poincaré Studio", action: "view_phase" },
          { label: "Numerical Lab (Order p & Stiffness)", action: "view_numerical_lab" },
          { label: "Lorenz Strange Attractor Sandbox", action: "view_custom" },
          { label: "DTM & OHAM in Method Catalog", action: "view_catalog" },
          { label: "Run Riccati Benchmark (All Methods)", action: "run_benchmark", problem_id: "riccati_ivp" },
          { label: "Step-by-Step Coupled Solver", action: "view_step_solver" }
        ]
      }
    }
  ]);

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res = await fetch("/api/autonomy-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });

      if (!res.ok) throw new Error("Failed to consult computational advisor");

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `advisor_${Date.now()}`,
        sender: "advisor",
        timestamp: "Advisor Guidance",
        text: data.summary || "Here is the mathematical analysis for your inquiry:",
        data: {
          headline: data.headline,
          summary: data.summary,
          sections: data.sections,
          recommended_actions: data.recommended_actions
        }
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "advisor",
          timestamp: "Diagnostic Notice",
          text: `Advisor service response: ${err.message}. Please verify the computational daemon.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[560px] z-50 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col font-sans">
      {/* Header */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight flex items-center gap-2">
                Noether Computational Advisor
              </h3>
              <p className="text-xs text-slate-400">
                Mathematical Modelling & Method Selection Guide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Advisor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Inquiries Strip */}
      <div className="bg-slate-950/40 border-b border-slate-800/80 px-4 py-2.5 overflow-x-auto flex gap-2 no-scrollbar">
        {CURATED_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="text-xs whitespace-nowrap px-3 py-1 bg-slate-800/90 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg transition-all shadow-xs"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/30">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">
              {msg.timestamp}
            </span>

            {msg.sender === "user" ? (
              <div className="max-w-[85%] bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs text-xs font-medium shadow-md leading-relaxed">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[95%] bg-slate-900 border border-slate-800 p-4 rounded-2xl rounded-tl-xs shadow-md space-y-3">
                {msg.data?.headline && (
                  <div className="border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold text-indigo-300 tracking-tight">
                      {msg.data.headline}
                    </h4>
                  </div>
                )}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {msg.text}
                </p>

                {msg.data?.sections && (
                  <div className="space-y-2.5 pt-1">
                    {msg.data.sections.map((sec, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl"
                      >
                        <div className="text-xs font-semibold text-cyan-300 mb-1">
                          {sec.title}
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                          {sec.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {msg.data?.recommended_actions && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                      Suggested Actions:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.data.recommended_actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => {
                            onSelectAction(act.action, {
                              problem_id: act.problem_id,
                              method: act.method
                            });
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 rounded-lg transition-colors"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-white" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
            <RotateCcw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>Consulting mathematical capability matrix...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="bg-slate-950 border-t border-slate-800 p-3.5">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Ask about methods (HAM, DTM, OHAM, Pontryagin, Radau) or problem types..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
