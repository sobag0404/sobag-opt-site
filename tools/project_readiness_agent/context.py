from __future__ import annotations

import fnmatch
import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .sanitizer import mask_sensitive


TEXT_EXTENSIONS = {
    ".css",
    ".csv",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".rs",
    ".sql",
    ".toml",
    ".txt",
    ".xml",
    ".yml",
    ".yaml",
}


@dataclass(frozen=True)
class FileSnapshot:
    path: str
    size: int
    lines: int
    text: str | None

    @property
    def suffix(self) -> str:
        return Path(self.path).suffix.lower()


@dataclass
class CommandResult:
    command: str
    ok: bool
    returncode: int | None
    stdout: str
    stderr: str
    timed_out: bool = False
    skipped: bool = False
    error: str = ""


class RepositoryContext:
    def __init__(self, root: Path, config: dict[str, Any]):
        self.root = root
        self.config = config
        self.files: list[FileSnapshot] = []
        self.file_map: dict[str, FileSnapshot] = {}
        self.tracked_files: set[str] = set()
        self.git: dict[str, str] = {}
        self.package: dict[str, Any] = {}
        self.command_results: list[CommandResult] = []

    @classmethod
    def load(cls, root: Path, config: dict[str, Any]) -> "RepositoryContext":
        context = cls(root.resolve(), config)
        context.tracked_files = set(context._git_lines(["ls-files"]))
        context.git = context._load_git_metadata()
        context.files = context._load_files()
        context.file_map = {item.path: item for item in context.files}
        context.package = context._load_json("package.json")
        return context

    def read_text(self, relative_path: str) -> str:
        snapshot = self.file_map.get(relative_path)
        if snapshot and snapshot.text is not None:
            return snapshot.text
        path = self.root / relative_path
        return safe_read_text(path)

    def existing(self, relative_path: str) -> bool:
        return (self.root / relative_path).exists()

    def glob(self, pattern: str) -> list[FileSnapshot]:
        return [item for item in self.files if fnmatch.fnmatch(item.path, pattern)]

    def run_configured_commands(self) -> list[CommandResult]:
        commands_config = self.config.get("commands", {})
        enabled_env = str(commands_config.get("enabled_env", "PROJECT_READINESS_RUN_COMMANDS"))
        env_value = os.getenv(enabled_env)
        enabled = commands_config.get("default_enabled", True)
        if env_value is not None:
            enabled = env_value.strip().lower() not in {"0", "false", "no", "off"}
        commands = [str(command) for command in commands_config.get("list", [])]
        if not enabled:
            self.command_results = [
                CommandResult(command=command, ok=False, returncode=None, stdout="", stderr="", skipped=True, error="disabled by environment")
                for command in commands
            ]
            return self.command_results
        timeout = int(commands_config.get("timeout_seconds", 180))
        allow_shell = bool(commands_config.get("allow_shell_metacharacters", False))
        self.command_results = [run_command(self.root, command, timeout, allow_shell) for command in commands]
        return self.command_results

    def _load_files(self) -> list[FileSnapshot]:
        max_bytes = int(self.config.get("scan", {}).get("max_text_file_kb", 1024)) * 1024
        snapshots: list[FileSnapshot] = []
        for path in self.root.rglob("*"):
            if not path.is_file():
                continue
            relative = relpath(self.root, path)
            if self._excluded(relative):
                continue
            size = path.stat().st_size
            text: str | None = None
            lines = 0
            if path.suffix.lower() in TEXT_EXTENSIONS and size <= max_bytes:
                text = safe_read_text(path)
                lines = text.count("\n") + (1 if text else 0)
            snapshots.append(FileSnapshot(path=relative, size=size, lines=lines, text=text))
        return sorted(snapshots, key=lambda item: item.path)

    def _excluded(self, relative: str) -> bool:
        normalized = relative.replace("\\", "/")
        scan = self.config.get("scan", {})
        for excluded in scan.get("exclude_dirs", []):
            prepared = str(excluded).strip("/").replace("\\", "/")
            if normalized == prepared or normalized.startswith(f"{prepared}/"):
                return True
        return any(fnmatch.fnmatch(normalized, str(pattern)) for pattern in scan.get("exclude_globs", []))

    def _load_json(self, relative_path: str) -> dict[str, Any]:
        path = self.root / relative_path
        if not path.exists():
            return {}
        try:
            parsed = json.loads(path.read_text(encoding="utf-8"))
            return parsed if isinstance(parsed, dict) else {}
        except (OSError, json.JSONDecodeError):
            return {}

    def _load_git_metadata(self) -> dict[str, str]:
        return {
            "branch": self._git_one(["rev-parse", "--abbrev-ref", "HEAD"]),
            "commit": self._git_one(["rev-parse", "--short", "HEAD"]),
            "status": "\n".join(self._git_lines(["status", "--short"])),
        }

    def _git_one(self, args: list[str]) -> str:
        lines = self._git_lines(args)
        return lines[0] if lines else "unavailable"

    def _git_lines(self, args: list[str]) -> list[str]:
        try:
            result = subprocess.run(["git", *args], cwd=self.root, text=True, encoding="utf-8", capture_output=True, timeout=10, check=False)
        except (OSError, subprocess.TimeoutExpired):
            return []
        if result.returncode != 0:
            return []
        return [line for line in result.stdout.splitlines() if line.strip()]


def relpath(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def safe_read_text(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1251"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
        except OSError:
            return ""
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def run_command(root: Path, command: str, timeout: int, allow_shell_metacharacters: bool) -> CommandResult:
    if not allow_shell_metacharacters and any(token in command for token in ["|", "&&", "||", ";", "`", "$("]):
        return CommandResult(
            command=command,
            ok=False,
            returncode=None,
            stdout="",
            stderr="",
            error="command rejected because shell metacharacters are disabled",
        )
    args = split_command(command)
    if not args:
        return CommandResult(command=command, ok=False, returncode=None, stdout="", stderr="", error="empty command")
    args = resolve_command(args)
    try:
        result = subprocess.run(args, cwd=root, text=True, encoding="utf-8", errors="replace", capture_output=True, timeout=timeout, check=False)
    except subprocess.TimeoutExpired as error:
        return CommandResult(
            command=command,
            ok=False,
            returncode=None,
            stdout=mask_sensitive(error.stdout or "", 4000),
            stderr=mask_sensitive(error.stderr or "", 4000),
            timed_out=True,
            error=f"timed out after {timeout}s",
        )
    except OSError as error:
        return CommandResult(command=command, ok=False, returncode=None, stdout="", stderr="", error=str(error))
    return CommandResult(
        command=command,
        ok=result.returncode == 0,
        returncode=result.returncode,
        stdout=mask_sensitive(result.stdout or "", 4000),
        stderr=mask_sensitive(result.stderr or "", 4000),
    )


def split_command(command: str) -> list[str]:
    import shlex

    return shlex.split(command, posix=os.name != "nt")


def resolve_command(args: list[str]) -> list[str]:
    if not args:
        return args
    executable = args[0]
    if os.name == "nt":
        aliases = {"npm": "npm.cmd", "npx": "npx.cmd"}
        executable = aliases.get(executable.lower(), executable)
    resolved = shutil.which(executable)
    return [resolved or executable, *args[1:]]
