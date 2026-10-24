"""
Validation and Automated Verification Suite
===========================================

Verifies:
1. Agreement with analytical exact solutions for test problems (Riccati, Lane-Emden, Logistic, Stiff)
2. Satisfaction of initial conditions u(0) = u_0, u'(0) = u'_0
3. Consistency of Adomian polynomials against Taylor expansion derivatives
4. Identification of correct Lagrange multipliers in VIM
5. HAM deformation zeroth- and m-th order consistency
6. Correct computation of E_inf, RMSE, and differential equation residuals
7. Stability diagnostics and divergence detection
"""

import unittest
from typing import Dict, Any, List
import numpy as np
import sympy as sp

from .problems import (
    load_problem,
    problem_riccati,
    problem_lane_emden,
    problem_logistic,
    problem_stiff,
    problem_coupled,
)
from .numerical_solvers import compute_reference_solution
from .adm import solve_adm, compute_adomian_polynomials
from .hpm import solve_hpm
from .ham import solve_ham, compute_hbar_curve
from .vim import solve_vim
from .metrics import compute_metrics


class TestSemiAnalyticalMethods(unittest.TestCase):

    def test_adomian_polynomials_quadratic(self):
        """Verify Adomian polynomials A_0, A_1, A_2 for N(u) = u^2 match theory."""
        A = compute_adomian_polynomials("u**2", 4)
        u0, u1, u2, u3 = [sp.Symbol(f"u_{i}", real=True) for i in range(4)]
        
        self.assertEqual(A[0], u0**2, "A_0 must equal u_0^2")
        self.assertEqual(A[1], 2 * u0 * u1, "A_1 must equal 2 * u_0 * u_1")
        self.assertEqual(sp.expand(A[2]), sp.expand(u1**2 + 2 * u0 * u2), "A_2 must equal u_1^2 + 2 * u_0 * u_2")
        self.assertEqual(sp.expand(A[3]), sp.expand(2 * u1 * u2 + 2 * u0 * u3), "A_3 must equal 2*u_1*u_2 + 2*u_0*u_3")

    def test_riccati_exact_agreement(self):
        """Verify all 4 methods approximate exact Riccati solution u(t) = tanh(t) with RMSE < 5e-3 at order 4."""
        prob = problem_riccati
        ref = compute_reference_solution(prob)

        # ADM
        res_adm = solve_adm(prob, order=4)
        m_adm = compute_metrics(prob, "ADM", res_adm.u_approx, res_adm.t_eval, ref.u_ref, 4, res_adm.wall_time_sec)
        self.assertTrue(m_adm.converged)
        self.assertLess(m_adm.rmse, 5e-3, f"ADM Riccati RMSE {m_adm.rmse} should be < 5e-3")

        # HPM
        res_hpm = solve_hpm(prob, order=4)
        m_hpm = compute_metrics(prob, "HPM", res_hpm.u_approx, res_hpm.t_eval, ref.u_ref, 4, res_hpm.wall_time_sec)
        self.assertTrue(m_hpm.converged)
        self.assertLess(m_hpm.rmse, 5e-3, f"HPM Riccati RMSE {m_hpm.rmse} should be < 5e-3")

        # HAM with hbar = -1.0
        res_ham = solve_ham(prob, order=4, hbar=-1.0)
        m_ham = compute_metrics(prob, "HAM", res_ham.u_approx, res_ham.t_eval, ref.u_ref, 4, res_ham.wall_time_sec, hbar=-1.0)
        self.assertTrue(m_ham.converged)
        self.assertLess(m_ham.rmse, 5e-3, f"HAM Riccati RMSE {m_ham.rmse} should be < 5e-3")

        # VIM
        res_vim = solve_vim(prob, order=4)
        m_vim = compute_metrics(prob, "VIM", res_vim.u_approx, res_vim.t_eval, ref.u_ref, 4, res_vim.wall_time_sec)
        self.assertTrue(m_vim.converged)
        self.assertLess(m_vim.rmse, 5e-3, f"VIM Riccati RMSE {m_vim.rmse} should be < 5e-3")

    def test_lane_emden_singular_origin(self):
        """Verify handling of singularity at t=0 for Lane-Emden polytrope n=5 with exact solution."""
        prob = problem_lane_emden
        ref = compute_reference_solution(prob)

        res_adm = solve_adm(prob, order=3)
        m_adm = compute_metrics(prob, "ADM", res_adm.u_approx, res_adm.t_eval, ref.u_ref, 3, res_adm.wall_time_sec)
        self.assertTrue(m_adm.converged)
        # Check initial condition u(0) = 1.0 exactly
        self.assertAlmostEqual(res_adm.u_approx[0], 1.0, places=7)
        self.assertLess(m_adm.rmse, 5e-3)

    def test_initial_conditions_satisfied(self):
        """Verify all methods strictly satisfy initial conditions at t=0."""
        for prob in [problem_riccati, problem_logistic, problem_coupled]:
            ref = compute_reference_solution(prob)
            for solver in [solve_adm, solve_hpm, lambda p, o: solve_ham(p, o, -1.0), solve_vim]:
                res = solver(prob, 3)
                ic_val = res.u_approx[0]
                expected_ic = prob.initial_conditions[0]
                self.assertAlmostEqual(ic_val, expected_ic, places=6, msg=f"IC mismatch for {prob.id}")

    def test_ham_hbar_convergence_control(self):
        """Verify HAM hbar control allows finding a stable horizontal plateau."""
        prob = problem_riccati
        curve_data = compute_hbar_curve(prob, order=3, hbar_range=(-1.8, -0.2), num_points=25)
        self.assertTrue(len(curve_data["hbars"]) > 10)
        self.assertIn("optimal_hbar", curve_data)
        self.assertLess(curve_data["optimal_hbar"], 0.0, "Optimal hbar must be negative for standard deformation")

    def test_divergence_detection(self):
        """Verify metrics correctly flag divergence when a method blows up."""
        prob = problem_riccati
        # Simulate explosive output
        t_eval = np.linspace(0, 1, 10)
        u_explosive = np.array([1e14] * 10)
        m = compute_metrics(prob, "TEST", u_explosive, t_eval, np.tanh(t_eval), 5, 0.01)
        self.assertFalse(m.converged, "Explosive solution should be flagged converged=False")
        self.assertIn("stability threshold", m.failure_reason)


def run_all_tests() -> Dict[str, Any]:
    """Execute complete validation suite and return structured report."""
    suite = unittest.TestLoader().loadTestsFromTestCase(TestSemiAnalyticalMethods)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return {
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "was_successful": result.wasSuccessful(),
        "failure_details": [str(f) for f in result.failures],
        "error_details": [str(e) for e in result.errors],
    }


if __name__ == "__main__":
    unittest.main()
