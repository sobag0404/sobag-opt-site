from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any


DEFAULT_CONFIG: dict[str, Any] = {
    "project": {"name": "sobag-opt-site", "default_branch": "main"},
    "scan": {
        "max_text_file_kb": 1024,
        "max_context_files": 160,
        "large_file_lines": 1500,
        "huge_file_lines": 5000,
        "exclude_dirs": [".git", ".vercel", "node_modules", "rust-server/target", "test-results"],
        "exclude_globs": ["assets/product-preview-live/**", "*.zip", "*.png", "*.jpg", "*.webp", "*.xlsx", "*.pdf"],
    },
    "commands": {
        "enabled_env": "PROJECT_READINESS_RUN_COMMANDS",
        "default_enabled": True,
        "timeout_seconds": 180,
        "allow_shell_metacharacters": False,
        "list": ["python -m unittest discover tools/project_readiness_agent/tests"],
    },
    "reports": {
        "directory": "reports/project-readiness",
        "full": "reports/project-readiness/latest.md",
        "chat": "reports/project-readiness/latest-chat.md",
        "chat_limit": 3000,
    },
    "thresholds": {"ready": 90, "ready_with_warnings": 75, "not_ready": 25},
    "weights": {
        "Architecture": 13,
        "Code Quality": 14,
        "Security": 18,
        "Tests": 12,
        "Documentation": 10,
        "CI/CD": 11,
        "Product Readiness": 14,
        "Prompt Engineering": 8,
    },
}


def load_config(config_path: Path) -> dict[str, Any]:
    config = deepcopy(DEFAULT_CONFIG)
    if config_path.exists():
        parsed = parse_simple_yaml(config_path.read_text(encoding="utf-8"))
        deep_merge(config, parsed)
    return config


def deep_merge(target: dict[str, Any], source: dict[str, Any]) -> dict[str, Any]:
    for key, value in source.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            deep_merge(target[key], value)
        else:
            target[key] = value
    return target


def parse_simple_yaml(text: str) -> dict[str, Any]:
    lines: list[tuple[int, str]] = []
    for raw in text.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        lines.append((indent, raw.strip()))
    if not lines:
        return {}
    parsed, index = _parse_block(lines, 0, lines[0][0])
    if index != len(lines):
        raise ValueError("Could not parse complete config.yml")
    if not isinstance(parsed, dict):
        raise ValueError("Top-level config.yml value must be a map")
    return parsed


def _parse_block(lines: list[tuple[int, str]], index: int, indent: int) -> tuple[Any, int]:
    is_list = lines[index][1].startswith("- ")
    if is_list:
        result: list[Any] = []
        while index < len(lines) and lines[index][0] == indent and lines[index][1].startswith("- "):
            value = lines[index][1][2:].strip()
            if not value:
                child, index = _parse_block(lines, index + 1, lines[index + 1][0])
                result.append(child)
            else:
                result.append(_parse_scalar(value))
                index += 1
        return result, index

    result_dict: dict[str, Any] = {}
    while index < len(lines) and lines[index][0] == indent and not lines[index][1].startswith("- "):
        content = lines[index][1]
        if ":" not in content:
            raise ValueError(f"Invalid config line: {content}")
        key, raw_value = content.split(":", 1)
        key = key.strip()
        raw_value = raw_value.strip()
        if raw_value:
            result_dict[key] = _parse_scalar(raw_value)
            index += 1
            continue
        next_index = index + 1
        if next_index >= len(lines) or lines[next_index][0] <= indent:
            result_dict[key] = {}
            index += 1
            continue
        child, index = _parse_block(lines, next_index, lines[next_index][0])
        result_dict[key] = child
    return result_dict, index


def _parse_scalar(value: str) -> Any:
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        return value[1:-1]
    lower = value.lower()
    if lower == "true":
        return True
    if lower == "false":
        return False
    if lower in {"null", "none"}:
        return None
    try:
        return int(value)
    except ValueError:
        return value
