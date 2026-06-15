from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


CATEGORIES = [
    "Architecture",
    "Code Quality",
    "Security",
    "Tests",
    "Documentation",
    "CI/CD",
    "Product Readiness",
    "Prompt Engineering",
    "Chat / GoAL Context",
]

SEVERITIES = ["info", "low", "medium", "high", "critical"]
PRIORITIES = ["P3", "P2", "P1", "P0"]

SEVERITY_RANK = {severity: index for index, severity in enumerate(SEVERITIES)}
SEVERITY_PENALTY = {
    "critical": 55,
    "high": 30,
    "medium": 14,
    "low": 6,
    "info": 2,
}


@dataclass(frozen=True)
class Finding:
    id: str
    category: str
    severity: str
    priority: str
    location: str
    title: str
    description: str
    impact: str
    recommendation: str
    example: str = ""

    def __post_init__(self) -> None:
        if self.severity not in SEVERITIES:
            raise ValueError(f"Unsupported severity: {self.severity}")
        if self.priority not in PRIORITIES:
            raise ValueError(f"Unsupported priority: {self.priority}")


@dataclass(frozen=True)
class Recommendation:
    priority: str
    category: str
    text: str
    finding_id: str = ""


@dataclass
class CheckResult:
    category: str
    score: int
    status: str
    summary: str
    findings: list[Finding] = field(default_factory=list)
    recommendations: list[Recommendation] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ProjectReport:
    generated_at: datetime
    root: str
    project_name: str
    score: int
    status: str
    decision: str
    summary: str
    goal_prompt: str
    check_results: list[CheckResult]
    recommendations: list[Recommendation]
    limitations: list[str]
    links: list[str]
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def findings(self) -> list[Finding]:
        return [finding for result in self.check_results for finding in result.findings]


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def max_severity(findings: list[Finding]) -> str:
    if not findings:
        return "info"
    return max((finding.severity for finding in findings), key=lambda value: SEVERITY_RANK[value])


def score_from_findings(findings: list[Finding], base: int = 100) -> int:
    score = base - sum(SEVERITY_PENALTY[finding.severity] for finding in findings)
    return cap_score_for_findings(score, findings)


def cap_score_for_findings(score: int, findings: list[Finding]) -> int:
    if any(finding.severity == "critical" for finding in findings):
        score = min(score, 24)
    elif any(finding.severity == "high" for finding in findings):
        score = min(score, 74)
    elif any(finding.severity == "medium" for finding in findings):
        score = min(score, 89)
    return max(0, min(100, int(score)))


def category_status(findings: list[Finding], score: int) -> str:
    severity = max_severity(findings)
    if severity == "critical":
        return "BLOCKED"
    if severity == "high":
        return "FAIL"
    if severity in {"medium", "low"} or score < 90:
        return "WARN"
    return "OK"


def readiness_status(findings: list[Finding], score: int) -> str:
    if any(finding.severity == "critical" for finding in findings) or score < 25:
        return "CRITICAL_BLOCKERS"
    if any(finding.severity == "high" for finding in findings) or score < 75:
        return "NOT_READY"
    if any(finding.severity in {"medium", "low"} for finding in findings) or score < 90:
        return "READY_WITH_WARNINGS"
    return "READY"


def readiness_decision(status: str) -> str:
    return {
        "READY": "можно передавать в GoAL",
        "READY_WITH_WARNINGS": "можно передавать с предупреждениями",
        "NOT_READY": "нельзя передавать, нужны исправления",
        "CRITICAL_BLOCKERS": "критически нельзя передавать",
    }[status]


def recommendation_from_finding(finding: Finding) -> Recommendation:
    return Recommendation(
        priority=finding.priority,
        category=finding.category,
        text=f"{finding.id}: {finding.recommendation}",
        finding_id=finding.id,
    )
