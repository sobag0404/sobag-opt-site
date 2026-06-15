import { pathToFileURL } from "node:url";
import { auditPacketFile as auditFinalContentPacket } from "./final-content-packet-audit.mjs";
import { auditPacketFile as auditObjectStoragePacket } from "./object-storage-env-packet-audit.mjs";
import { auditPacketFile as auditCatalogDbPacket } from "./catalog-db-env-packet-audit.mjs";
import { auditPacketFile as auditCwvPacket } from "./cwv-field-audit-packet.mjs";
import { auditPacketFile as auditVpsRustCutoverPacket } from "./vps-rust-cutover-packet-audit.mjs";

const PACKETS = [
  {
    key: "finalContent",
    label: "SEO/content final facts",
    path: "local-import-output/final-content-packet.json",
    audit: auditFinalContentPacket,
  },
  {
    key: "objectStorage",
    label: "Photo storage/images provider",
    path: "local-import-output/object-storage-env-packet.json",
    audit: auditObjectStoragePacket,
  },
  {
    key: "catalogDb",
    label: "Import/PIM PostgreSQL test DB",
    path: "local-import-output/catalog-db-env-packet.json",
    audit: auditCatalogDbPacket,
  },
  {
    key: "cwvField",
    label: "Performance/Core Web Vitals field audit",
    path: "local-import-output/cwv-field-audit-packet.json",
    audit: auditCwvPacket,
  },
  {
    key: "vpsRustCutover",
    label: "VPS/Rust cutover no-secret packet",
    path: "local-import-output/vps-rust-cutover-packet.json",
    audit: auditVpsRustCutoverPacket,
  },
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = { strict: false, json: false, selfTest: false };
  for (const token of argv) {
    if (token === "--strict") args.strict = true;
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function buildGoalInputsReport({ strict = false } = {}) {
  const packets = PACKETS.map((packet) => {
    const result = packet.audit(packet.path, { strict });
    return {
      key: packet.key,
      label: packet.label,
      path: packet.path,
      ok: Boolean(result.ok),
      ready: Boolean(result.ready),
      missing: Boolean(result.missing),
      errors: result.errors || [],
      warnings: result.warnings || [],
    };
  });

  return {
    ok: packets.every((packet) => packet.ok),
    ready: packets.every((packet) => packet.ready),
    packets,
  };
}

function selfTest() {
  const report = buildGoalInputsReport({ strict: false });
  if (!Array.isArray(report.packets) || report.packets.length !== 5) throw new Error("goal inputs report must contain 5 packets");
  if (!report.packets.every((packet) => packet.path.startsWith("local-import-output/"))) {
    throw new Error("goal input packets must stay in ignored local-import-output");
  }
  if (report.ready) throw new Error("current goal inputs should not be ready without real local packets");
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Goal inputs packet audit self-test passed");
    return;
  }
  const report = buildGoalInputsReport(args);
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Goal inputs: ${report.ready ? "ready" : "pending"}`);
    report.packets.forEach((packet) => {
      const detail = packet.errors.length ? ` errors=${packet.errors.join("; ")}` : packet.warnings.length ? ` warnings=${packet.warnings.join("; ")}` : "";
      console.log(`${packet.ready ? "OK" : "PENDING"} ${packet.label}: ${packet.path}${detail}`);
    });
  }
  if (!report.ok) process.exitCode = 1;
  if (args.strict && !report.ready) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { buildGoalInputsReport };
