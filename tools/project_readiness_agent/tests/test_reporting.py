from __future__ import annotations

import unittest
from datetime import timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from project_readiness_agent.models import CheckResult, Finding, ProjectReport, Recommendation, utc_now
from project_readiness_agent.reporting.markdown import render_chat_summary, render_full_report


class ReportingTests(unittest.TestCase):
    def sample_report(self) -> ProjectReport:
        finding = Finding(
            id="SEC-TEST",
            category="Security",
            severity="high",
            priority="P1",
            location="app.js",
            title="Synthetic high finding",
            description="Description",
            impact="Impact",
            recommendation="Recommendation",
        )
        return ProjectReport(
            generated_at=utc_now().astimezone(timezone.utc),
            root="/repo",
            project_name="sobag-opt-site",
            score=70,
            status="NOT_READY",
            decision="нельзя передавать, нужны исправления",
            summary="Synthetic summary.",
            goal_prompt="Открой новый GoAL-чат. Используй latest-chat.md как стартовую точку. " * 80,
            check_results=[
                CheckResult(category="Security", score=70, status="FAIL", summary="Security summary", findings=[finding])
            ],
            recommendations=[Recommendation(priority="P1", category="Security", text="Fix it", finding_id="SEC-TEST")],
            limitations=["External chat access: unavailable"],
            links=["reports/project-readiness/latest.md"],
        )

    def test_chat_summary_limit(self) -> None:
        text = render_chat_summary(self.sample_report(), limit=4000)
        self.assertLessEqual(len(text), 4000)
        self.assertIn("Next implementation packet", text)
        self.assertIn("Статус проекта", text)

    def test_full_report_contains_required_sections(self) -> None:
        text = render_full_report(self.sample_report())
        for section in [
            "# Project Readiness Report",
            "## 1. Executive Summary",
            "## 2. Readiness Score",
            "## 7. GoAL Prompt",
            "## 9. Limitations",
        ]:
            self.assertIn(section, text)


if __name__ == "__main__":
    unittest.main()
