/**
 * QA helper — play admin against a pending_logins row.
 *
 * The member site only CREATES rows and POLLS them (Testing 2 RULE 3): it never
 * approves or denies itself. This performs the same Neon UPDATE the Control
 * Center button would make, so a real browser sitting in its 90s poll observes a
 * genuine decision.
 *
 * Usage: node scripts/_set-pending-status.mjs <id> <pending|approved|denied|redirected|expired>
 *
 * Never writes .env.local. Reads DATABASE_URL only.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ALLOWED = new Set(["pending", "approved", "denied", "redirected", "expired"])

function loadEnv() {
  for (const file of [".env.local", ".env", ".env.production.local", ".env.production"]) {
    const full = path.join(ROOT, file)
    if (!fs.existsSync(full)) continue
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  }
}

/** Mirrors lib/database-urls.ts normalizeNeonDatabaseUrl — drops channel_binding. */
function normalize(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  try {
    const u = new URL(trimmed)
    u.searchParams.delete("channel_binding")
    return u.toString()
  } catch {
    return trimmed
      .replace(/[?&]channel_binding=[^&]*/gi, "")
      .replace(/\?&+/g, "?")
      .replace(/\?$/g, "")
  }
}

export async function setPendingStatus(id, status) {
  if (!id) throw new Error("pending id is required")
  if (!ALLOWED.has(status)) {
    throw new Error(`status must be one of ${[...ALLOWED].join(" | ")}; got "${status}"`)
  }
  loadEnv()
  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error("DATABASE_URL is not set")

  const { neon } = await import("@neondatabase/serverless")
  neon.fetchConnectionCache = true
  const sql = neon(normalize(url))

  const rows = await sql`
    UPDATE pending_logins SET status = ${status} WHERE id = ${id} RETURNING id, status
  `
  if (!rows || rows.length === 0) throw new Error(`no pending_logins row with id ${id}`)
  return rows[0]
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , id, status] = process.argv
  if (!id || !status) {
    console.error("usage: node scripts/_set-pending-status.mjs <id> <status>")
    process.exit(2)
  }
  setPendingStatus(id, status)
    .then((row) => {
      console.log(`  pending_logins ${row.id} -> ${row.status}`)
    })
    .catch((err) => {
      console.error("  FAILED:", err.message)
      process.exit(1)
    })
}
