import { execFileSync } from "node:child_process";

const FORCE_MARKERS = ["[vercel]", "[fallback]", "[force-vercel]"];
const SKIP_MARKERS = ["[skip-vercel]", "[no-vercel]"];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function moscowDayKey(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date(value))
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function currentSha() {
  return process.env.VERCEL_GIT_COMMIT_SHA || git(["rev-parse", "HEAD"]);
}

function commitDate(sha) {
  return git(["show", "-s", "--format=%cI", sha]);
}

function commitMessage(sha) {
  return (process.env.VERCEL_GIT_COMMIT_MESSAGE || git(["log", "-1", "--format=%B", sha])).toLowerCase();
}

function commitHistory() {
  return git(["log", "--first-parent", "--format=%H%x00%cI", "-n", "10"])
    .split("\n")
    .map((line) => {
      const [sha, date] = line.split("\0");
      return { sha, date };
    })
    .filter((entry) => entry.sha && entry.date);
}

function shouldBuild() {
  const env = process.env.VERCEL_ENV || "";
  if (env && env !== "production") return { build: false, reason: `skip ${env} deployment` };

  const sha = currentSha();
  const message = commitMessage(sha);
  if (SKIP_MARKERS.some((marker) => message.includes(marker))) return { build: false, reason: "commit message requested Vercel skip" };
  if (FORCE_MARKERS.some((marker) => message.includes(marker))) return { build: true, reason: "commit message requested Vercel deploy" };

  const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA || "";
  const currentDay = moscowDayKey(commitDate(sha));
  if (previousSha) {
    try {
      const previousDay = moscowDayKey(commitDate(previousSha));
      return previousDay === currentDay
        ? { build: false, reason: `Vercel already deployed on ${currentDay} MSK` }
        : { build: true, reason: `first Vercel deploy after ${previousDay} MSK` };
    } catch (error) {
      console.log(`Vercel daily deploy gate: could not inspect previous deploy ${previousSha}: ${error.message}`);
    }
  }

  const commits = commitHistory();
  const current = commits.find((entry) => entry.sha === sha) || commits[0];
  if (!current) return { build: true, reason: "unable to inspect commit history" };

  const day = moscowDayKey(current.date);
  const previousSameDay = commits.slice(commits.indexOf(current) + 1).some((entry) => moscowDayKey(entry.date) === day);
  return previousSameDay ? { build: false, reason: `daily Vercel build already used for ${day} MSK` } : { build: true, reason: `first commit for ${day} MSK` };
}

try {
  const result = shouldBuild();
  console.log(`Vercel daily deploy gate: ${result.reason}.`);
  process.exit(result.build ? 1 : 0);
} catch (error) {
  console.log(`Vercel daily deploy gate: build allowed after gate error: ${error.message}`);
  process.exit(1);
}
