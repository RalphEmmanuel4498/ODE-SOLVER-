/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Download,
  FileCode,
  FileText,
  Image,
  Database,
  Check,
  Copy,
  ExternalLink,
  Package,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  Sliders,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";

interface ExportCenterProps {
  latexSource?: string;
  pythonScript?: string;
  benchmarkCsvUrl?: string;
  onNavigateToWorkspace?: (ws: string) => void;
}

export const ExportCenter: React.FC<ExportCenterProps> = ({
  latexSource = "",
  pythonScript = "",
  benchmarkCsvUrl = "/api/export-csv",
  onNavigateToWorkspace
}) => {
  const [copiedTex, setCopiedTex] = useState(false);
  const [copiedPy, setCopiedPy] = useState(false);
  const [downloadingBundle, setDownloadingBundle] = useState(false);

  // Helper to trigger direct text file download
  const downloadTextFile = (filename: string, content: string, mime: string = "text/plain") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download all files sequentially as a bundle
  const handleDownloadAllBundle = () => {
    setDownloadingBundle(true);

    // 1. Download LaTeX Paper
    if (latexSource) {
      downloadTextFile("noether_paper_manuscript.tex", latexSource, "application/x-tex");
    }

    // 2. Download Python Script
    setTimeout(() => {
      if (pythonScript) {
        downloadTextFile("noether_reproduce_results.py", pythonScript, "text/x-python");
      }
    }, 400);

    // 3. Download Markdown Technical Report
    setTimeout(() => {
      fetch("/api/report")
        .then(res => res.text())
        .then(mdText => {
          downloadTextFile("noether_technical_report.md", mdText, "text/markdown");
        })
        .catch(() => {});
    }, 800);

    // 4. Download Benchmark CSV
    setTimeout(() => {
      const link = document.createElement("a");
      link.href = "/api/export-csv";
      link.download = "noether_benchmark_results.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadingBundle(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Asset & Downloads Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Scientific Publication Exports
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Research Figures, Drawings, Code & Publication Center
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Export and download publication-grade vector graphics, high-resolution figures, standalone Python scripts, 
              AMS-LaTeX manuscripts, and empirical datasets for 100% scientific reproducibility.
            </p>
          </div>

          <button
            onClick={handleDownloadAllBundle}
            disabled={downloadingBundle}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-sm shrink-0 disabled:opacity-50"
          >
            <Package className="w-4 h-4 text-cyan-200" />
            <span>{downloadingBundle ? "Packaging Downloads..." : "Download Research Bundle"}</span>
          </button>
        </div>
      </div>

      {/* Grid of Downloadable Research Assets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Compartmental Flow Schematics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Compartmental Flow Schematics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multi-compartment dynamical topologies (10–12 state networks, pharmacokinetic models, epidemiological transmission webs).
            </p>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div>Formats: SVG Vector · PNG (300 DPI) · TikZ (.tex)</div>
              <div className="text-indigo-400">Resolution: Scalable Vector Graphics</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => onNavigateToWorkspace && onNavigateToWorkspace("diagram_studio")}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Open Studio
            </button>
            <button
              onClick={() => onNavigateToWorkspace && onNavigateToWorkspace("diagram_studio")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Drawing</span>
            </button>
          </div>
        </div>

        {/* Card 2: Solution Comparison Plots */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Analytical vs Reference Plots</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              High-precision solution trajectories comparing semi-analytical series (HAM, HPM, ADM, VIM) against SciPy DOP853 ($10^{-13}$ tol).
            </p>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div>Figures: `tutorial_riccati_comparison.png`</div>
              <div className="text-cyan-400">Includes Logarithmic Absolute Error Trajectory</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <a
              href="/results/figures/tutorial_riccati_comparison.svg"
              download="riccati_comparison.svg"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SVG</span>
            </a>
            <a
              href="/results/figures/tutorial_riccati_comparison.png"
              download="riccati_comparison.png"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG (300 DPI)</span>
            </a>
          </div>
        </div>

        {/* Card 3: HAM h-bar Plateau Diagnostic */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">HAM h-bar Curve Convergence Diagnostics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Horizontal plateau identification where du/d(hbar) approaches 0, ensuring unconditional convergence on stiff and singular ODEs.
            </p>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div>Figures: `tutorial_hbar_curve.svg`</div>
              <div className="text-purple-400">Annotated Optimal $\hbar^*$ & Flat Region</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <a
              href="/results/figures/tutorial_hbar_curve.svg"
              download="ham_hbar_curve.svg"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SVG</span>
            </a>
            <a
              href="/results/figures/tutorial_hbar_curve.png"
              download="ham_hbar_curve.png"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG (300 DPI)</span>
            </a>
          </div>
        </div>

        {/* Card 4: Full AMS-LaTeX Paper Manuscript */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">AMS-LaTeX Paper Manuscript</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete, compilable LaTeX academic manuscript ready for Overleaf, arXiv, or peer-reviewed journal submission with BibTeX references.
            </p>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div>Filename: `noether_paper_manuscript.tex`</div>
              <div className="text-emerald-400">Includes Booktabs Tables & Proof Equations</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                if (latexSource) {
                  navigator.clipboard.writeText(latexSource);
                  setCopiedTex(true);
                  setTimeout(() => setCopiedTex(false), 2000);
                }
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              {copiedTex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTex ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={() => {
                if (latexSource) {
                  downloadTextFile("noether_paper_manuscript.tex", latexSource, "application/x-tex");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .tex</span>
            </button>
          </div>
        </div>

        {/* Card 5: Standalone Python Reproduction Script */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Python Reproduction Script</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standalone, executable Python script leveraging NumPy, SciPy, and Matplotlib to verify all differential solutions independently.
            </p>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div>Filename: `noether_reproduce_results.py`</div>
              <div className="text-amber-400">Zero Dependencies Beyond Standard Stack</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                if (pythonScript) {
                  navigator.clipboard.writeText(pythonScript);
                  setCopiedPy(true);
                  setTimeout(() => setCopiedPy(false), 2000);
                }
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              {copiedPy ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPy ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={() => {
                if (pythonScript) {
                  downloadTextFile("noether_reproduce_results.py", pythonScript, "text/x-python");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .py</span>
            </button>
          </div>
        </div>

        {/* Card 6: Experimental Benchmark CSV Data */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Benchmark Metrics & CSV Tables</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete tabular dataset recording $E_\infty$, RMSE, max residuals, IC errors, order-reduction rates, and wall times across all equations.
            </p>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div>Filename: `noether_benchmark_results.csv`</div>
              <div className="text-blue-400">Compatible with Excel, R, Julia & Pandas</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <a
              href="/results/benchmark_results.csv"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Preview Data
            </a>
            <a
              href="/api/export-csv"
              download="noether_benchmark_results.csv"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
