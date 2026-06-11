#!/usr/bin/env node
import { readFileSync } from "node:fs";

const PLAN_PATH = "docs/rust-auth-orders-admin-migration-plan.md";

const REQUIRED_MARKERS = [
  "sobag_session",
  "PBKDF2 SHA-256",
  "310000",
  "admin@sobag",
  "30 000 RUB",
  "guest admin visibility",
  "internal manager notes",
  "Content write limit: 4 MB",
  "imports must not delete products",
  "update existing products only in explicit update mode",
  "GET /api/auth/me",
  "/api/orders",
  "/api/briefs",
  "admin/manager order",
  "admin content GET/PUT",
  "review moderation PATCH",
  "Node-vs-Rust shadow compare",
  "Temporary-store write smoke",
  "buyer cannot access admin routes",
  "unsupported methods return 405",
  "Remove the Nginx location",
  "Do not route public auth/order/admin write endpoints to Rust",
  "Do not delete Node handlers",
  "Do not touch production data",
];

const REQUIRED_HEADINGS = [
  "## Goal",
  "## Current State",
  "## Contracts To Preserve",
  "## Migration Order",
  "## Required Tests",
  "## Rollback",
  "## Parallel Work Split",
  "## Do Not Do Yet",
];

function audit(text) {
  const errors = [];
  for (const heading of REQUIRED_HEADINGS) {
    if (!text.includes(heading)) errors.push(`missing heading: ${heading}`);
  }
  for (const marker of REQUIRED_MARKERS) {
    if (!text.includes(marker)) errors.push(`missing marker: ${marker}`);
  }
  if (/\b.env\b|password\s*=|token\s*=|SECRET\s*=|PRIVATE KEY/i.test(text)) {
    errors.push("plan must not include secrets, env values, tokens, or private keys");
  }
  if (!/Node stays authoritative/.test(text)) {
    errors.push("plan must explicitly keep Node authoritative before cutover");
  }
  if (!/one route group at a time/.test(text)) {
    errors.push("plan must require one route group at a time");
  }
  return errors;
}

function selfTest() {
  const fixture = [
    ...REQUIRED_HEADINGS,
    ...REQUIRED_MARKERS,
    "Node stays authoritative",
    "one route group at a time",
  ].join("\n");
  const errors = audit(fixture);
  if (errors.length) throw new Error(`self-test failed: ${errors.join("; ")}`);
  const broken = audit("## Goal\npassword=123");
  if (!broken.length) throw new Error("self-test failed: broken plan passed");
  console.log("Rust auth/orders/admin migration plan audit self-test passed");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  const text = readFileSync(PLAN_PATH, "utf8");
  const errors = audit(text);
  if (errors.length) {
    console.error(`Rust auth/orders/admin migration plan audit failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`Rust auth/orders/admin migration plan audit passed: ${REQUIRED_MARKERS.length} markers`);
}

main();
