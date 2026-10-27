#!/usr/bin/env node
/**
 * Audit SteinsGate (alias wrapper forwarding to audit-steins-gate.mjs).
 * Usage: node scripts/audit-referrer-gate.mjs [project-root]
 */

import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const targetScript = path.join(__dirname, "audit-steins-gate.mjs")
const args = process.argv.slice(2)

const child = spawn(process.execPath, [targetScript, ...args], {
  stdio: "inherit",
})

child.on("exit", (code) => {
  process.exit(code ?? 0)
})
