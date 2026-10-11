#!/usr/bin/env node

import { parseArgs, runSetup } from "../scripts/setup.mjs";

try {
  const [command = "init", ...args] = process.argv.slice(2);
  if (command === "setup" || command === "init") {
    const options = parseArgs(args);
    if (command === "init" && process.env.JEV_KIT_CONFIGURE_MCP !== "0") options.configureMcp = true;
    if (options.help) {
      console.log("Usage: jev-kit [init|setup] [--project-root <path>] [--configure-mcp] [--force]");
    } else {
      await runSetup(options);
    }
  } else if (command === "uninstall") {
    const { parseArgs, runUninstall } = await import("../scripts/uninstall.mjs");
    const options = parseArgs(args);
    if (options.help) {
      console.log("Usage: jev-kit uninstall [--project-root <path>] [--remove-project-assets] [--remove-mcp]");
    } else {
      await runUninstall(options);
    }
  } else {
    throw new Error(`Unknown jev-kit command: ${command}. Supported commands: init, setup, uninstall`);
  }
} catch (error) {
  console.error(`jev-kit: ${error.message}`);
  process.exitCode = 1;
}
