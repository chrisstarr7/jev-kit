import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const required = [
  "manifest.json", "README.md", "SECURITY.md", "package.json", "config/mcp-server.toml",
  "bin/jev-kit.mjs", ".github/workflows/validate.yml",
  "skill/java-jev/SKILL.md", "project/docs/jev/README.md",
  "project/docs/jev/questions/java-backend-mvp.json", "project/docs/jev/evals/evaluate.py",
];
for (const relative of required) await readFile(join(root, relative));
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
if (packageJson.name !== manifest.name || packageJson.version !== manifest.version || packageJson.license !== manifest.license) {
  throw new Error("package.json and manifest.json metadata must match");
}
const pack = JSON.parse(await readFile(join(root, "project/docs/jev/questions/java-backend-mvp.json"), "utf8"));
const expectedDecisionIds = new Set(["file_relevance", "change_risk", "sql_risk", "npe_risk", "test_required", "review_gate"]);
const decisionIds = pack.decisions.map((decision) => decision.id);
if (decisionIds.length !== expectedDecisionIds.size || new Set(decisionIds).size !== decisionIds.length || !decisionIds.every((id) => expectedDecisionIds.has(id))) {
  throw new Error("decision pack must contain the six unique MVP decisions");
}
if (pack.execution_policy.fresh_user_turn_only !== true || pack.execution_policy.reuse_across_tool_continuation !== true) {
  throw new Error("decision pack turn-boundary policy must be fail-safe");
}
if (pack.execution_policy.min_confidence < 0.75 || pack.execution_policy.max_attempts !== 1) throw new Error("decision execution policy is too permissive");

const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,})\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:TYPESAFE_API_KEY|AWS_SECRET_ACCESS_KEY|API_KEY|SECRET_KEY|ACCESS_TOKEN)\s*[:=]\s*["'`]?([A-Za-z0-9_./+=-]{16,})["'`]?/,
];
const textFilePattern = /(?:^|\.)\w*(?:md|json|toml|mjs|ps1|py|jsonl|yml|yaml|sh|env|ini|cfg|conf|properties|xml)$/i;

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    if (entry.isDirectory()) await scan(path);
    else if (entry.isFile() && (textFilePattern.test(entry.name) || entry.name.startsWith(".env"))) {
      const content = await readFile(path, "utf8");
      if (secretPatterns.some((pattern) => pattern.test(content))) throw new Error(`possible secret in ${path}`);
    }
  }
}
await scan(root);
console.log(`java-jev-kit ${manifest.version} verification passed`);
