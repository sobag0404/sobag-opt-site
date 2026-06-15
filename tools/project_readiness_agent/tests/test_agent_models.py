from __future__ import annotations

import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from project_readiness_agent.models import Finding, readiness_status, score_from_findings


class AgentScoringTests(unittest.TestCase):
    def finding(self, severity: str) -> Finding:
        return Finding(
            id=f"T-{severity}",
            category="Tests",
            severity=severity,
            priority="P1" if severity in {"high", "critical"} else "P2",
            location="test",
            title="test",
            description="test",
            impact="test",
            recommendation="test",
        )

    def test_critical_caps_score_and_status(self) -> None:
        findings = [self.finding("critical")]
        score = score_from_findings(findings)
        self.assertLessEqual(score, 24)
        self.assertEqual(readiness_status(findings, score), "CRITICAL_BLOCKERS")

    def test_high_caps_status_at_not_ready(self) -> None:
        findings = [self.finding("high")]
        score = score_from_findings(findings, base=100)
        self.assertLessEqual(score, 74)
        self.assertEqual(readiness_status(findings, score), "NOT_READY")

    def test_warning_status_without_blockers(self) -> None:
        findings = [self.finding("medium")]
        score = score_from_findings(findings, base=100)
        self.assertEqual(readiness_status(findings, score), "READY_WITH_WARNINGS")


if __name__ == "__main__":
    unittest.main()
