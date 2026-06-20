const { getStore, saveStore } = require("./store");

const MAX_AUDIT_RECORDS = 500;

function compactActor(user = {}) {
  return {
    id: user.id || user.email || "unknown",
    role: user.role || "unknown",
  };
}

function auditRecord(type, action, user, details = {}) {
  return {
    id: `AUD-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type,
    action,
    actor: compactActor(user),
    timestamp: new Date().toISOString(),
    ...details,
  };
}

async function appendAdminAudit(type, action, user, details = {}) {
  const store = await getStore();
  const record = auditRecord(type, action, user, details);
  store.audit = [record, ...(Array.isArray(store.audit) ? store.audit : [])].slice(0, MAX_AUDIT_RECORDS);
  await saveStore(store);
  return record;
}

module.exports = { appendAdminAudit, auditRecord };
