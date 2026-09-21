import { access, readFile, rename, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { backup, findProjectRoot, uniqueBackupPath, writeTextAtomically } from "./setup.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const markerName = ".jev-kit-managed.json";

const exists = async (path) => {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
};

export function parseArgs(argv = process.argv.slice(2)) {
  const options = { projectRoot: null, removeProjectAssets: false, removeMcp: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--remove-project-assets") options.removeProjectAssets = true;
    else if (arg === "--remove-mcp") options.removeMcp = true;
    else if (arg === "--project-root") {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error("--project-root requires a directory path");
      options.projectRoot = value;
    } else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
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

async function moveManaged(target) {
  const markerPath = join(target, markerName);
  if (!await exists(markerPath)) {
    console.log(`Skipped unmarked target: ${target}`);
    return;
  }
  const marker = JSON.parse(await readFile(markerPath, "utf8"));
  if (marker.kit !== "java-jev-kit") throw new Error(`Unknown install marker: ${target}`);
  const backupPath = await uniqueBackupPath(target);
  await rename(target, backupPath);
  console.log(`Moved ${target} to ${backupPath} for recovery`);
}

function normalizeBlock(text) {
  return text.replace(/\r\n/g, "\n").trim();
}

async function removeMcpBlock(codexHome) {
  const configPath = join(codexHome, "config.toml");
  if (!await exists(configPath)) {
    console.log(`No Codex config found: ${configPath}`);
    return;
  }

  const config = await readFile(configPath, "utf8");
  const blockPattern = /(^|\r?\n)(# java-jev-kit:start[\s\S]*?# java-jev-kit:end)(?:\r?\n)?/m;
  const match = config.match(blockPattern);
  if (!match) {
    console.log(`No java-jev-kit MCP block found: ${configPath}`);
    return;
  }

  const expected = await readFile(join(packageRoot, "config/mcp-server.toml"), "utf8");
  if (normalizeBlock(match[2]) !== normalizeBlock(expected)) {
    throw new Error(`MCP block was modified; refusing to remove it automatically: ${configPath}`);
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17);
  await backup(configPath, stamp);
  await writeTextAtomically(configPath, config.replace(match[0], match[1]));
  console.log(`Removed the java-jev-kit MCP block from ${configPath}`);
}

export async function runUninstall({
  codexHome = process.env.CODEX_HOME || join(homedir(), ".codex"),
  projectRoot,
  removeProjectAssets = false,
  removeMcp = false,
} = {}) {
  const resolvedProject = await resolveProjectRoot(projectRoot);
  await moveManaged(join(codexHome, "skills/java-jev"));

  if (removeProjectAssets && resolvedProject) {
    await moveManaged(join(resolvedProject, "docs/jev"));
    await moveManaged(join(resolvedProject, ".agents/skills/java-jev"));
  } else if (resolvedProject) {
    console.log("Retained project docs/jev and .agents/skills/java-jev; pass --remove-project-assets after review to detach them.");
  }

  if (removeMcp) await removeMcpBlock(codexHome);
  else console.log("MCP config was not modified; pass --remove-mcp after review to remove the packaged block.");
  console.log("Jev kit uninstall complete.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs();
    if (options.help) console.log("Usage: jev-kit uninstall [--project-root <path>] [--remove-project-assets] [--remove-mcp]");
    else await runUninstall(options);
  } catch (error) {
    console.error(`jev-kit uninstall: ${error.message}`);
    process.exitCode = 1;
  }
}
