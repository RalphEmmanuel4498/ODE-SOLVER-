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
  BookOpen,
  ArrowRight,
  RotateCcw,
  Compass,
  CheckCircle2,
  ChevronDown,
  Layers,
  Cpu,
  Minimize2,
  Maximize2
} from "lucide-react";
import { MathView } from "./MathView";

interface ChatMessage {
  id: string;
  sender: "user" | "archivist";
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

interface ArchivistChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string, metadata?: any) => void;
}

const CURATED_PROMPTS = [
  "What can this mathematical laboratory do?",
  "How do DTM and OHAM work & what are their convergence parameters?",
  "Which method should I choose for my nonlinear equation?",
  "Explain the HAM h-bar curve and plateau principle",
  "How do I solve an Optimal Control problem with Pontryagin?",
  "What numerical solvers are available for stiff equations?",
  "Tell me about the 1937 Differential Analyzer heritage"
];

export const ArchivistChatbot: React.FC<ArchivistChatbotProps> = ({
  isOpen,
  onClose,
  onSelectAction
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial_greeting",
      sender: "archivist",
      timestamp: "1937 Monograph Archivist",
      text: "Greetings, Fellow of the Mathematical Society. I am the 1937 Royal Mathematical Archivist and Computational Guide. You may ask me what this platform can do, query specific analytical, semi-analytical (HAM, HPM, ADM, VIM, DTM, OHAM), or numerical methods, or request guidance on optimal control, parameter calibration, and diagrammatic modeling.",
      data: {
        headline: "Royal Society Mathematical Archives · Vol. XXXVII (1937)",
        summary: "Welcome to the Comprehensive Mathematical Modeling & Scientific Computing Framework. Select an inquiry below or type any mathematical question.",
        sections: [
          {
            title: "Ten Dedicated Research Workspaces",
            content: "1. Equation Solver (LaTeX, Visual Builder, AST Recognition)\n2. Mathematical Modelling (SIR, Logistics, Vector Diagrams)\n3. Analytical & Semi-Analytical Solvers (HAM, HPM, ADM, VIM, DTM, OHAM, Padé)\n4. Numerical Analysis (DOP853, Radau IIA, LSODA, BDF, Spectral)\n5. Optimal Control (Pontryagin, Adjoints, Forward-Backward Sweep)\n6. Sensitivity & Stability (Jacobians, R0, Phase Planes)\n7. Parameter Estimation (Nonlinear Least Squares, AIC, 95% CIs)\n8. Research & Dataset Discovery (Zenodo, arXiv, Crossref)\n9. Visualization & Diagrams (Flowcharts, Schematics, Vector Fields)\n10. Publication Generator (LaTeX Papers, Python Reproduction)"
          }
        ],
        recommended_actions: [
          { label: "Overview of Full Platform Capabilities", action: "ask_capabilities" },
          { label: "Inspect DTM & OHAM Convergence Methods", action: "view_catalog" },
          { label: "Run Riccati Benchmark (All Methods)", action: "run_benchmark", problem_id: "riccati_ivp" },
          { label: "Explore Step-by-Step Coupled ODE Solver", action: "view_step_solver" },
          { label: "Open Diagram & Schematic Studio", action: "view_diagrams" }
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

      if (!res.ok) throw new Error("Failed to consult archivist");

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `archivist_${Date.now()}`,
        sender: "archivist",
        timestamp: "Archivist Dispatch",
        text: data.summary || "I have consulted the mathematical archives on your inquiry:",
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
          sender: "archivist",
          timestamp: "Notice",
          text: `The archive index could not be reached: ${err.message}. Please verify the computational daemon.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] z-50 bg-[#faf7f0] border-l-2 border-[#bda888] shadow-2xl flex flex-col font-serif">
      {/* 1937 Monograph Header */}
      <div className="bg-[#f2ebd9] border-b-2 border-[#8e7a60] p-4 text-[#1a1713] relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#8b281a] flex items-center justify-center bg-[#fdfcfa] text-[#8b281a] shadow-inner font-cinzel font-bold text-sm">
              1937
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-base tracking-wide text-[#1a1713] flex items-center gap-2">
                Royal Mathematical Archivist
              </h3>
              <p className="text-xs text-[#5c5040] italic font-garamond">
                Proceedings of Mathematical Mechanics & Computing · Vol. XXXVII
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#e6dcbe] text-[#5c5040] transition-colors"
            title="Close Archivist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Decorative double rule */}
        <div className="mt-3 border-t border-[#8e7a60] border-b border-[#cbbca4] py-0.5">
          <div className="text-[10px] tracking-widest text-[#7a6a54] text-center uppercase font-cinzel font-semibold">
            Inquiry & Guidance Dispatch · Differential Analyzer Laboratory
          </div>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="bg-[#f6f0e2] border-b border-[#d8ccb6] px-4 py-2.5 overflow-x-auto flex gap-2 no-scrollbar">
        {CURATED_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="text-xs whitespace-nowrap px-3 py-1 bg-[#fdfcf9] hover:bg-[#ede4d1] text-[#3d3326] border border-[#cbbea6] rounded-sm transition-all shadow-xs font-garamond"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fbf9f4]">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#7a6a54] mb-1 font-cinzel">
              {msg.timestamp}
            </div>

            {msg.sender === "user" ? (
              <div className="max-w-[85%] bg-[#2a2217] text-[#f4eee2] p-3 rounded-md shadow-md text-sm font-garamond leading-relaxed">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[95%] bg-[#fdfcfa] border border-[#d6cab7] p-4 rounded-sm shadow-sm space-y-3">
                {msg.data?.headline && (
                  <div className="border-b border-[#e5dcce] pb-2">
                    <h4 className="font-cinzel text-sm font-bold text-[#8b281a]">
                      {msg.data.headline}
                    </h4>
                  </div>
                )}

                <p className="text-sm text-[#2b241b] font-garamond leading-relaxed">
                  {msg.text}
                </p>

                {msg.data?.sections && (
                  <div className="space-y-3 pt-1">
                    {msg.data.sections.map((sec, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-[#f7f2e7] border border-[#e2d6c2] p-2.5 rounded-xs"
                      >
                        <div className="text-xs font-bold font-cinzel text-[#3a3023] mb-1">
                          {sec.title}
                        </div>
                        <div className="text-xs text-[#4a3f31] font-garamond leading-relaxed whitespace-pre-line">
                          {sec.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {msg.data?.recommended_actions && (
                  <div className="pt-2 border-t border-[#e8dfcf]">
                    <div className="text-[10px] font-cinzel font-bold text-[#7a6850] uppercase tracking-wider mb-2">
                      Suggested Actions in Laboratory:
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
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#f4ede0] hover:bg-[#8b281a] hover:text-white text-[#4a3c2c] border border-[#cbbca4] rounded-xs transition-colors shadow-2xs font-garamond"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3" />
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
          <div className="flex items-center gap-2 p-3 bg-[#fdfcfa] border border-[#d6cab7] rounded-sm text-xs text-[#5c5040] font-garamond italic">
            <RotateCcw className="w-3.5 h-3.5 animate-spin text-[#8b281a]" />
            Consulting archival annals and computational indices...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="bg-[#f2ebd9] border-t-2 border-[#8e7a60] p-3">
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
            placeholder="Ask about methods (HAM, DTM, OHAM, Pontryagin, Radau) or capabilities..."
            className="flex-1 bg-[#fdfcfa] border border-[#c5b69c] rounded-xs px-3 py-2 text-sm text-[#1a1713] placeholder-[#8a7a66] focus:outline-none focus:ring-1 focus:ring-[#8b281a] font-garamond"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="px-4 py-2 bg-[#2b2217] hover:bg-[#8b281a] disabled:opacity-50 text-[#faf6ee] font-cinzel text-xs tracking-wider uppercase font-semibold rounded-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Dispatch</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="text-[10px] text-[#786a56] text-center mt-1.5 font-garamond italic">
          Royal Mathematical Society · Computing Engine Anno 1937
        </div>
      </div>
    </div>
  );
};
