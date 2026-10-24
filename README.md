# Semi-Analytical Method Benchmarking Framework for Nonlinear Differential Equations

A rigorous, reproducible scientific computing benchmark comparing four canonical semi-analytical methods:
1. **Homotopy Analysis Method (HAM)** (Liao 1992, 2003, 2012)
2. **Homotopy Perturbation Method (HPM)** (He 1999, 2003)
3. **Adomian Decomposition Method (ADM)** (Adomian 1984, 1994)
4. **Variational Iteration Method (VIM)** (He 1999, 2007)

Against high-precision numerical reference solvers (**SciPy DOP853** for non-stiff systems with $atol=10^{-13}, rtol=10^{-13}$, **SciPy Radau** for stiff systems with $atol=10^{-12}, rtol=10^{-12}$) and analytical exact solutions.

---

## Architecture & Module Structure

```
semi_analytical_benchmark/
├── __init__.py           # Package version and metadata
├── problems.py           # 8 canonical benchmark problems registry
├── ham.py                # Homotopy Analysis Method with h-bar deformation & curve analysis
├── hpm.py                # Homotopy Perturbation Method with p-perturbation series
├── adm.py                # Adomian Decomposition Method with exact Adomian polynomials
├── vim.py                # Variational Iteration Method with optimal Lagrange multipliers
├── numerical_solvers.py  # SciPy DOP853, Radau, BDF, and exact reference solvers
├── metrics.py            # Error metrics: E_inf, RMSE, residuals, IC errors, convergence rate
├── experiments.py        # Benchmark suite runner and CSV exporter
├── visualization.py      # Publication-quality figure generation (PNG, SVG)
├── validation.py         # Automated unittest and mathematical verification suite
├── autonomy.py           # Autonomy Engine & Capability Oracle (interactive assistant)
└── cli.py                # Unified command-line interface
```

---

## The 4 Semi-Analytical Formulations

### 1. Homotopy Analysis Method (HAM)
- **Zeroth-order deformation equation**:
  $$(1 - q) \mathcal{L}[\phi(t; q) - u_0(t)] = q \hbar H(t) \mathcal{N}[\phi(t; q)]$$
- **$m$-th order deformation equation**:
  $$\mathcal{L}[u_m(t) - \chi_m u_{m-1}(t)] = \hbar H(t) R_m(\vec{u}_{m-1}, t)$$
  where $\chi_m = 0$ for $m \le 1$ and $\chi_m = 1$ for $m > 1$.
- **Convergence-Control Parameter $\hbar$**: Unlike perturbation parameter $p$, $\hbar$ remains in the series to control convergence rate and radius. The optimal $\hbar^*$ is located on the horizontal flat plateau of the $\hbar$-curve where $\frac{d u}{d\hbar} \approx 0$.

### 2. Homotopy Perturbation Method (HPM)
- **Homotopy**:
  $$\mathcal{H}(v, p) = (1 - p) [\mathcal{L}(v) - \mathcal{L}(u_0)] + p [\mathcal{A}(v) - f(r)] = 0$$
- **Perturbation series**:
  $$v(t; p) = \sum_{k=0}^M p^k v_k(t) \quad \xrightarrow{p \to 1} \quad u_{approx}(t) = \sum_{k=0}^M v_k(t)$$

### 3. Adomian Decomposition Method (ADM)
- **Canonical equation**: $L u + R u + N(u) = g(t)$, with inverse $L^{-1}(\cdot) = \int_0^t \dots \int_0^t (\cdot) dt$.
- **Adomian polynomials**:
  $$A_n = \left. \frac{1}{n!} \frac{d^n}{d\lambda^n} \left[ N\left(\sum_{k=0}^n \lambda^k u_k\right) \right] \right|_{\lambda = 0}$$
- **Iterates**: $u_0 = \Phi_0 + L^{-1} g, \quad u_{n+1} = - L^{-1}[R u_n] - L^{-1}[A_n]$.

### 4. Variational Iteration Method (VIM)
- **Correction functional**:
  $$u_{n+1}(t) = u_n(t) + \int_0^t \lambda(\tau) \left[ \mathcal{L} u_n(\tau) + \mathcal{N} \tilde{u}_n(\tau) - g(\tau) \right] d\tau$$
- **Optimal Lagrange multipliers**:
  - 1st-order: $\lambda(\tau) = -1$
  - 2nd-order: $\lambda(\tau) = \tau - t$

---

## 8 Benchmark Differential Equations

1. **Riccati First-Order IVP**: $u' + u^2 = 1, u(0)=0 \implies u(t) = \tanh(t)$
2. **Lane-Emden Equation (Polytrope $n=5$)**: $u'' + \frac{2}{t}u' + u^5 = 0, u(0)=1, u'(0)=0 \implies u(t) = (1 + t^2/3)^{-1/2}$
3. **Duffing Nonlinear Oscillator**: $u'' + u + 0.5 u^3 = 0, u(0)=1, u'(0)=0$
4. **Coupled Nonlinear System**: $u' = -u + v^2, v' = -v + u^2, u_0=v_0=0.5 \implies u(t) = v(t) = (1 + e^t)^{-1}$
5. **Logistic Population Dynamics**: $u' = 1.5 u (1 - u/2), u(0)=0.5 \implies u(t) = \frac{K u_0 e^{rt}}{K + u_0(e^{rt}-1)}$
6. **Epidemiological SIR Model**: $S' = -1.2 SI, I' = 1.2 SI - 0.4 I, R' = 0.4 I$
7. **Rapid Transition Front**: $u' = 4 u^2 (1 - u), u(0)=0.1$
8. **Stiff Boundary Layer ODE**: $u' = -50(u - t^2) + 2t, u(0)=1 \implies u(t) = t^2 + e^{-50 t}$

---

## Installation & Quickstart

```bash
# Clone and install dependencies
pip install -r requirements.txt

# Run automated validation test suite
python3 -m unittest semi_analytical_benchmark/validation.py

# Run a single experiment via CLI
python3 -m semi_analytical_benchmark.cli run --problem riccati_ivp --method HAM --order 4 --hbar -1.0

# Generate HAM h-bar curve
python3 -m semi_analytical_benchmark.cli hbar --problem riccati_ivp --order 4

# Run the complete tutorial and generate publication figures
python3 examples/notebook_example.py
```

---

## The Autonomy System: "What can this app do?"

The framework includes an autonomous capability inspector and advisory engine. You can ask it natural language questions at any time:

```bash
# Ask about platform capabilities
python3 -m semi_analytical_benchmark.cli autonomy "What can this app do?"

# Ask for method selection advice
python3 -m semi_analytical_benchmark.cli autonomy "Which method is best for stiff equations?"

# Ask for h-bar curve mathematical explanation
python3 -m semi_analytical_benchmark.cli autonomy "How does the hbar curve work?"
```

In the Web Workbench, the Autonomy System is accessible via the top-bar and side drawer with interactive 1-click execution triggers.

---

## Quantitative Metrics

For every method and problem configuration, the framework computes:
1. **Maximum Absolute Error**: $E_\infty = \max_i |u_{approx}(t_i) - u_{ref}(t_i)|$
2. **Root Mean Square Error**: $\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (u_{approx}(t_i) - u_{ref}(t_i))^2}$
3. **Maximum Differential Equation Residual**: $\max_i |\mathcal{L} u + \mathcal{N} u - g|$
4. **Initial Condition Error**: $|u_{approx}(0) - u(0)|$
5. **Order-Reduction Rate**: $\log_{10}(\text{RMSE}_M / \text{RMSE}_{M-1})$
6. **Wall-clock Runtime** in milliseconds
7. **Numerical Divergence and Failure Flag**

---

## Research Contribution

- **Beyond Single-Problem Advocacy**: Proves that no single semi-analytical method is universally superior. ADM is computationally faster for smooth polynomial nonlinearities on compact domains, whereas HAM's $\hbar$ parameter is uniquely indispensable for controlling stiff boundary layer divergence ($\lambda = 50$).
- **Automated Plateau Locator**: Provides an algorithmic, gradient-minimized detection of the optimal $\hbar^*$ plateau, replacing heuristic visual inspection.
- **Reproducible Open Benchmark Protocol**: Fully open-source suite with exact closed-form validation and DOP853/Radau ground truths.

---

## Citation

```bibtex
@software{semi_analytical_benchmark_2026,
  author = {Applied Mathematics and Scientific Computing Research Group},
  title = {Semi-Analytical Method Benchmarking Framework for Nonlinear Differential Equations},
  year = {2026},
  url = {https://github.com/open-science/semi_analytical_benchmark}
}
```

## License
Apache License 2.0. See `LICENSE` for details.
