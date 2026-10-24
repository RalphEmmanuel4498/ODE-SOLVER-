"""
Command-Line Interface (CLI)
============================

Executable interface for running benchmarks, testing, visualization, and autonomy queries.

Usage:
  python3 -m semi_analytical_benchmark.cli run --problem riccati_ivp --method HAM --order 4 --hbar -1.0
  python3 -m semi_analytical_benchmark.cli benchmark --orders 1 2 3 4 5
  python3 -m semi_analytical_benchmark.cli hbar --problem riccati_ivp --order 4
  python3 -m semi_analytical_benchmark.cli validate
  python3 -m semi_analytical_benchmark.cli autonomy "What can this app do?"
"""

import sys
import argparse
import json
from .problems import list_problems, load_problem
from .experiments import run_single_experiment, run_full_benchmark_suite
from .ham import compute_hbar_curve
from .validation import run_all_tests
from .autonomy import query_autonomy


def main():
    parser = argparse.ArgumentParser(description="Semi-Analytical ODE Benchmark Framework CLI")
    subparsers = parser.add_subparsers(dest="command", help="Subcommand to execute")

    # Command: run
    run_parser = subparsers.add_parser("run", help="Run a single method on a specific problem")
    run_parser.add_argument("--problem", type=str, default="riccati_ivp", help="Problem ID")
    run_parser.add_argument("--method", type=str, default="HAM", choices=["HAM", "HPM", "ADM", "VIM"], help="Method name")
    run_parser.add_argument("--order", type=int, default=4, help="Truncation order")
    run_parser.add_argument("--hbar", type=float, default=-1.0, help="HAM h-bar parameter")

    # Command: benchmark
    bench_parser = subparsers.add_parser("benchmark", help="Execute full benchmark suite")
    bench_parser.add_argument("--orders", nargs="+", type=int, default=[1, 2, 3, 4, 5], help="List of orders to test")
    bench_parser.add_argument("--output", type=str, default="results/benchmark_results.csv", help="Output CSV path")

    # Command: hbar
    hbar_parser = subparsers.add_parser("hbar", help="Compute HAM h-bar curve")
    hbar_parser.add_argument("--problem", type=str, default="riccati_ivp", help="Problem ID")
    hbar_parser.add_argument("--order", type=int, default=4, help="Deformation order")

    # Command: validate
    subparsers.add_parser("validate", help="Run automated validation test suite")

    # Command: autonomy
    auto_parser = subparsers.add_parser("autonomy", help="Query the autonomy capability engine")
    auto_parser.add_argument("query", type=str, default="What can this app do?", help="Natural language query")

    # Command: list
    subparsers.add_parser("list", help="List all 8 benchmark differential equations")

    args = parser.parse_args()

    if args.command == "run":
        res = run_single_experiment(args.problem, args.method, order=args.order, hbar=args.hbar)
        print(f"=== {args.method} Result on {args.problem} (Order {args.order}) ===")
        m = res["metrics"]
        print(f"RMSE:         {m['rmse']:.3e}")
        print(f"E_inf:        {m['e_inf']:.3e}")
        print(f"Residual Max: {m['residual_max']:.3e}")
        print(f"IC Error:     {m['ic_error']:.3e}")
        print(f"Wall Time:    {m['wall_time_sec']*1000:.2f} ms")
        print(f"Converged:    {m['converged']}")

    elif args.command == "benchmark":
        records = run_full_benchmark_suite(orders=args.orders, output_csv_path=args.output)
        print(f"Benchmark completed with {len(records)} test configurations.")

    elif args.command == "hbar":
        prob = load_problem(args.problem)
        curve = compute_hbar_curve(prob, order=args.order)
        print(f"=== h-bar Curve for {prob.name} (Order {args.order}) ===")
        print(f"Optimal h-bar: {curve['optimal_hbar']:.3f}")
        print(f"Flat Region:   [{curve['flat_region'][0]:.3f}, {curve['flat_region'][1]:.3f}]")

    elif args.command == "validate":
        report = run_all_tests()
        print(json.dumps(report, indent=2))

    elif args.command == "autonomy":
        ans = query_autonomy(args.query)
        print(json.dumps(ans, indent=2))

    elif args.command == "list":
        for p in list_problems():
            print(f"- [{p.id}] {p.name}: {p.equation_latex} (Order {p.order}, Exact: {p.has_exact_solution})")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
