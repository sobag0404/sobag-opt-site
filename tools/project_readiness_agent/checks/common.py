from __future__ import annotations

from collections.abc import Iterable

from ..models import CheckResult, Finding, Recommendation, category_status, recommendation_from_finding, score_from_findings


def build_result(category: str, summary: str, findings: list[Finding], base_score: int = 100, metadata: dict | None = None) -> CheckResult:
    score = score_from_findings(findings, base=base_score)
    recommendations = unique_recommendations(recommendation_from_finding(finding) for finding in findings)
    return CheckResult(
        category=category,
        score=score,
        status=category_status(findings, score),
        summary=summary,
        findings=findings,
        recommendations=recommendations,
        metadata=metadata or {},
    )


def unique_recommendations(items: Iterable[Recommendation]) -> list[Recommendation]:
    seen: set[tuple[str, str]] = set()
    result: list[Recommendation] = []
    for item in items:
        key = (item.priority, item.text)
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def finding(
    id: str,
    category: str,
    severity: str,
    priority: str,
    location: str,
    title: str,
    description: str,
    impact: str,
    recommendation: str,
    example: str = "",
) -> Finding:
    return Finding(
        id=id,
        category=category,
        severity=severity,
        priority=priority,
        location=location,
        title=title,
        description=description,
        impact=impact,
        recommendation=recommendation,
        example=example,
    )
