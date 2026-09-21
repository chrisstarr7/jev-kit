import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs as parseSetupArgs, runSetup } from "../scripts/setup.mjs";
import { parseArgs as parseUninstallArgs, runUninstall } from "../scripts/uninstall.mjs";

const exists = async (path) => {
  try { await access(path); return true; } catch { return false; }
};

test("CLI parsers reject missing values and unknown flags", () => {
  assert.throws(() => parseSetupArgs(["--project-root"]), /requires a directory path/);
  assert.throws(() => parseUninstallArgs(["--project-root", "--remove-mcp"]), /requires a directory path/);
  assert.throws(() => parseSetupArgs(["--unexpected"]), /Unknown option/);
  assert.deepEqual(parseUninstallArgs(["--project-root", "/tmp/project", "--remove-mcp"]), {
    projectRoot: "/tmp/project",
    removeProjectAssets: false,
    removeMcp: true,
  });
});

test("setup installs resources and uninstall detaches them into recoverable backups", async () => {
  const root = await mkdtemp(join(tmpdir(), "jev-kit-test-"));
  const projectRoot = join(root, "project");
  const codexHome = join(root, "codex");
  await mkdir(projectRoot, { recursive: true });
  await writeFile(join(projectRoot, "pom.xml"), "<project/>\n");

  try {
    await runSetup({ projectRoot, codexHome, configureMcp: true });
    const docsRoot = join(projectRoot, "docs/jev");
    const configPath = join(codexHome, "config.toml");
    assert.equal(await exists(join(docsRoot, "README.md")), true);
    assert.match(await readFile(configPath, "utf8"), /983b69444593d27be0c99d4ab134041929e5a55a/);

    await writeFile(join(docsRoot, "team-notes.md"), "keep this\n");
    await runUninstall({ codexHome, projectRoot, removeProjectAssets: true, removeMcp: true });

    assert.equal(await exists(docsRoot), false);
    const backups = await readdir(join(projectRoot, "docs"));
    const docsBackup = backups.find((name) => name.startsWith("jev.backup-"));
    assert.ok(docsBackup);
    assert.equal(await exists(join(projectRoot, "docs", docsBackup, "team-notes.md")), true);
    const configBackup = (await readdir(codexHome)).find((name) => name.startsWith("config.toml.backup-"));
    assert.ok(configBackup);
    assert.match(await readFile(join(codexHome, configBackup), "utf8"), /java-jev-kit:start/);
    assert.doesNotMatch(await readFile(configPath, "utf8"), /java-jev-kit:start/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("uninstall refuses to remove a modified MCP block", async () => {
  const root = await mkdtemp(join(tmpdir(), "jev-kit-test-"));
  const codexHome = join(root, "codex");
  await mkdir(codexHome, { recursive: true });
  const configPath = join(codexHome, "config.toml");
  await writeFile(configPath, "# java-jev-kit:start\n[mcp_servers.jev]\nenabled = false\n# java-jev-kit:end\n");
  try {
    await assert.rejects(runUninstall({ codexHome, removeMcp: true }), /MCP block was modified/);
    assert.match(await readFile(configPath, "utf8"), /enabled = false/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
