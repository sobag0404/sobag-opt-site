import { execFileSync } from "node:child_process";

const FORCE_MARKERS = ["[vercel]", "[fallback]", "[force-vercel]"];
const SKIP_MARKERS = ["[skip-vercel]", "[no-vercel]"];

function localCommitMessage() {
  try {
    return execFileSync("git", ["log", "-1", "--format=%B"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    return "";
  }
}

const message = String(process.env.VERCEL_GIT_COMMIT_MESSAGE || localCommitMessage()).toLowerCase();

if (SKIP_MARKERS.some((marker) => message.includes(marker))) {
  console.log("Vercel fallback deploy gate: skipped by commit marker.");
  process.exit(0);
}

if (FORCE_MARKERS.some((marker) => message.includes(marker))) {
  console.log("Vercel fallback deploy gate: build forced by commit marker.");
  process.exit(1);
}

console.log("Vercel fallback deploy gate: skipped by default. Add [vercel], [fallback], or [force-vercel] to deploy fallback.");
process.exit(0);
