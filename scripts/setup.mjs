import { access, cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const markerName = ".jev-kit-managed.json";

const exists = async (path) => {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
};

export function parseArgs(argv = process.argv.slice(2)) {
  const options = { configureMcp: false, force: false, projectRoot: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--configure-mcp") options.configureMcp = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--project-root") {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error("--project-root requires a directory path");
      options.projectRoot = value;
    }
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

export async function findProjectRoot(startPaths = [process.env.INIT_CWD, process.cwd()]) {
  for (const start of startPaths.filter(Boolean)) {
    let current = resolve(start);
    while (true) {
      if (await exists(join(current, "pom.xml"))) return current;
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return null;
}

export async function uniqueBackupPath(path, stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17)) {
  const base = `${path}.backup-${stamp}`;
  let backupPath = base;
  for (let suffix = 1; await exists(backupPath); suffix += 1) backupPath = `${base}-${suffix}`;
  return backupPath;
}

export async function backup(path, stamp) {
  const backupPath = await uniqueBackupPath(path, stamp);
  await cp(path, backupPath, { recursive: true, force: false, errorOnExist: true });
  console.log(`Backed up existing target to ${backupPath}`);
  return backupPath;
}

export async function writeTextAtomically(path, content) {
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(temporaryPath, content, "utf8");
    await rename(temporaryPath, path);
  } finally {
    if (await exists(temporaryPath)) await rm(temporaryPath, { force: true });
  }
}

async function copyManaged(source, target, { force, stamp, label }) {
  if (await exists(target)) {
    if (!force) {
      console.log(`Kept existing ${label}: ${target}`);
      return false;
    }
    await backup(target, stamp);
  }
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true, force: true });
  console.log(`Installed ${label}: ${target}`);
  return true;
}

async function writeMarker(target, version) {
  await writeFile(join(target, markerName), `${JSON.stringify({
    kit: "java-jev-kit",
    version,
    installed_at: new Date().toISOString(),
  }, null, 2)}\n`, "utf8");
}

async function configureMcpConfig(codexHome, { stamp }) {
  const configPath = join(codexHome, "config.toml");
  const snippet = await readFile(join(packageRoot, "config/mcp-server.toml"), "utf8");
  const config = await exists(configPath) ? await readFile(configPath, "utf8") : "";
  if (/^\s*\[\s*mcp_servers\.jev\s*\]\s*(?:#.*)?$/m.test(config)) {
    console.log(`Kept existing Jev MCP entry: ${configPath}`);
    return;
  }
  if (await exists(configPath)) await backup(configPath, stamp);
  await mkdir(dirname(configPath), { recursive: true });
  const existing = config.trimEnd();
  const nextConfig = existing ? `${existing}\n\n${snippet.trim()}\n` : `${snippet.trim()}\n`;
  await writeTextAtomically(configPath, nextConfig);
  console.log(`Added Jev MCP entry: ${configPath}`);
}

async function resolveProjectRoot(projectRoot) {
  if (!projectRoot) return findProjectRoot([process.env.INIT_CWD, process.cwd()]);
  const resolved = resolve(projectRoot);
  try {
    if (!(await stat(resolved)).isDirectory()) throw new Error(`${projectRoot} is not a directory`);
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`Project root does not exist: ${resolved}`);
    throw error;
  }
  return resolved;
}

export async function runSetup({
  codexHome = process.env.CODEX_HOME || join(homedir(), ".codex"),
  projectRoot,
  configureMcp = false,
  force = false,
} = {}) {
  const manifest = JSON.parse(await readFile(join(packageRoot, "manifest.json"), "utf8"));
  const resolvedProject = await resolveProjectRoot(projectRoot);
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 15);

  const skillTarget = join(codexHome, "skills/java-jev");
  const skillCopied = await copyManaged(join(packageRoot, "skill/java-jev"), skillTarget, { force, stamp, label: "java-jev Skill" });
  if (skillCopied) await writeMarker(skillTarget, manifest.version);

  if (resolvedProject) {
    const projectTarget = join(resolvedProject, "docs/jev");
    const projectCopied = await copyManaged(join(packageRoot, "project/docs/jev"), projectTarget, { force, stamp, label: "project Jev assets" });
    if (projectCopied) await writeMarker(projectTarget, manifest.version);

    const projectSkillTarget = join(resolvedProject, ".agents/skills/java-jev");
    const projectSkillCopied = await copyManaged(join(packageRoot, "skill/java-jev"), projectSkillTarget, { force, stamp, label: "project Agent Skill" });
    if (projectSkillCopied) await writeMarker(projectSkillTarget, manifest.version);
  } else {
    console.log("No Maven project root detected; project docs were not copied.");
  }

  if (configureMcp) await configureMcpConfig(codexHome, { stamp });
  else console.log("MCP config unchanged. Use --configure-mcp to append the packaged template.");
  console.log("Jev kit setup complete. Set TYPESAFE_API_KEY in the process environment, then restart Codex.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs();
  if (options.help) console.log("Usage: npm run setup -- [--project-root <path>] [--configure-mcp] [--force]");
  else await runSetup(options);
}
