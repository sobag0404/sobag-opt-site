#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const NODE_ROUTE = "server-routes/auth/me.js";
const RUST_ROUTE = "rust-server/src/main.rs";
const API_SMOKE = "tools/api-security-smoke.mjs";
const CONTRACT_DOC = "docs/backend-pricing-reviews-contract.md";

function readRequired(file) {
  const path = join(root, file);
  if (!existsSync(path)) throw new Error(`Missing ${file}`);
  return readFileSync(path, "utf8");
}

function assertIncludes(text, marker, label, errors) {
  if (!String(text || "").includes(marker)) errors.push(`${label} missing marker: ${marker}`);
}

function assertMatches(text, pattern, label, description, errors) {
  if (!pattern.test(text)) errors.push(`${label} missing guard: ${description}`);
}

function assertNotMatches(text, pattern, label, description, errors) {
  if (pattern.test(text)) errors.push(`${label} unsafe pattern: ${description}`);
}

function auditReviewEligibility({ nodeRoute, rustRoute, apiSmoke, contractDoc }) {
  const errors = [];
  for (const [label, source] of [
    [NODE_ROUTE, nodeRoute],
    [RUST_ROUTE, rustRoute],
  ]) {
    assertMatches(source, /hasEligibleReviewOrder|has_eligible_review_order/, label, "server must check eligible review order", errors);
    assertIncludes(source, "REVIEW_ORDER_REQUIRED", label, errors);
    assertIncludes(source, "REVIEW_ALREADY_EXISTS", label, errors);
    assertMatches(source, /reviews:create:/, label, "review writes must be rate limited per buyer", errors);
    assertMatches(source, /shipped["']?\s*[,|]\s*["']done|done["']?\s*[,|]\s*["']shipped/, label, "eligible statuses must stay shipped/done only", errors);
    assertNotMatches(source, /customer\.email[^;\n]*REVIEW_ORDER_REQUIRED|REVIEW_ORDER_REQUIRED[\s\S]{0,400}customer\.email/i, label, "customer contact email must not grant review eligibility", errors);
  }
  for (const marker of [
    "anonymous review should be rejected",
    "review without eligible order should be rejected",
    "eligible completed order should allow review",
    "user should not be able to review using another user's completed order",
    "duplicate review should be rejected",
    "pending order should not allow review",
    "canceled order should not allow review",
    "review write burst should return 429",
  ]) {
    assertIncludes(apiSmoke, marker, API_SMOKE, errors);
  }
  for (const marker of [
    "confirmed order",
    "anonymous users cannot review",
    "duplicate review",
    "tools/api-security-smoke.mjs",
  ]) {
    assertIncludes(contractDoc, marker, CONTRACT_DOC, errors);
  }
  if (errors.length) throw new Error(`Review eligibility contract audit failed:\n${errors.join("\n")}`);
  return { ok: true };
}

function selfTest() {
  const nodeRoute = [
    "function hasEligibleReviewOrder() {}",
    "const REVIEW_ELIGIBLE_ORDER_STATUSES = new Set([\"shipped\", \"done\"]);",
    "REVIEW_ORDER_REQUIRED",
    "REVIEW_ALREADY_EXISTS",
    "reviews:create:",
  ].join("\n");
  const rustRoute = [
    "fn has_eligible_review_order() {}",
    "matches!(status.as_str(), \"shipped\" | \"done\")",
    "REVIEW_ORDER_REQUIRED",
    "REVIEW_ALREADY_EXISTS",
    "reviews:create:",
  ].join("\n");
  const apiSmoke = [
    "anonymous review should be rejected",
    "review without eligible order should be rejected",
    "eligible completed order should allow review",
    "user should not be able to review using another user's completed order",
    "duplicate review should be rejected",
    "pending order should not allow review",
    "canceled order should not allow review",
    "review write burst should return 429",
  ].join("\n");
  const contractDoc = "confirmed order\nanonymous users cannot review\nduplicate review\ntools/api-security-smoke.mjs";
  auditReviewEligibility({ nodeRoute, rustRoute, apiSmoke, contractDoc });
  let rejected = false;
  try {
    auditReviewEligibility({ nodeRoute: nodeRoute.replace("reviews:create:", ""), rustRoute, apiSmoke, contractDoc });
  } catch (error) {
    rejected = /rate limited/.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject missing review rate limit");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("Review eligibility contract audit self-test passed");
    return;
  }
  auditReviewEligibility({
    nodeRoute: readRequired(NODE_ROUTE),
    rustRoute: readRequired(RUST_ROUTE),
    apiSmoke: readRequired(API_SMOKE),
    contractDoc: readRequired(CONTRACT_DOC),
  });
  console.log("Review eligibility contract audit passed");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

export { auditReviewEligibility };
