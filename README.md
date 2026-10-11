# Jev Kit

English | [简体中文](docs/readme/README.zh-CN.md)

**A Codex Skill and MCP integration for bounded, advisory decisions in Java backend development.** Jev classifies a small set of engineering questions; your coding assistant still owns code reading, implementation, review, and delivery.

## Install

Run this from the root of a Maven project:

```bash
npx -y chrisstarr7/jev-kit
```

The installer adds the Skill to your Codex user, copies the decision pack and project Skill when it finds `pom.xml`, and adds the Jev MCP entry to your Codex `config.toml` if one is not already present. Existing targets are kept. Restart Codex after installation. This command runs the repository's current default branch; review the source before running it.

**Requirements:** Node.js 20+ and Git. Live Jev requests also need `uvx` and `TYPESAFE_API_KEY` in the environment that starts Codex. The installer never writes the key to disk.

To install the Skill and project files without changing MCP configuration:

```bash
npx -y chrisstarr7/jev-kit setup
```

If the Maven project is not an ancestor of your current directory, add `--project-root /path/to/project` to either command.

## How a task uses Jev

1. Codex loads the Skill when the host supports it and the task matches its scope. Installing a Skill does not guarantee that it will run on every turn.
2. The assistant reads relevant code and the decision pack, then decides whether one bounded classification would help.
3. If useful and safe, it sends a short, redacted context to the `jev_ask` MCP tool. It should call Jev at most once per fresh user turn and reuse the result during tool continuations.
4. The assistant checks the answer type, confidence (`>= 0.75`), and agreement with code evidence. On errors, timeouts, missing credentials, low confidence, or conflicting evidence, it continues with its normal workflow.
5. Jev remains advisory. It cannot write Java code, approve a production change, waive a test, or bypass a review gate.

## Decisions

| Decision | Purpose |
| --- | --- |
| `file_relevance` | Narrow a large candidate file list |
| `change_risk` | Choose an appropriate review depth |
| `sql_risk` | Flag data access and migration risk |
| `npe_risk` | Identify null and external-boundary risk |
| `test_required` | Recommend a regression-test level |
| `review_gate` | Keep the required review gate visible |

SQL, API contracts, transactions, message queues, permissions, security, and database migrations remain hard review gates regardless of Jev's answer.

## Privacy and external requests

Live calls go through the community `jev-mcp` server and require `TYPESAFE_API_KEY`. The assistant must read the relevant code before calling Jev and send only the smallest redacted context needed for the selected decision.

Never send credentials, tokens, cookies, passwords, customer personal data, production records, database dumps, or full source archives. If context cannot be safely minimized, skip Jev. Review the MCP provider's data-handling terms before sending project context. The key remains in the process environment and is not stored in the repository or Codex config.

## Installed files

| Resource | Default location | Notes |
| --- | --- | --- |
| User Skill | `$CODEX_HOME/skills/java-jev` or `~/.codex/skills/java-jev` | Loads the assistant guidance |
| Project decision pack | `<project>/docs/jev` | May be committed if the team wants to share it |
| Project Skill | `<project>/.agents/skills/java-jev` | Project-level guidance |
| MCP entry | `$CODEX_HOME/config.toml` | User-level Codex configuration |

Existing targets are kept unless `--force` is supplied; replaced targets are backed up. The installer does not edit Java source files. `setup` skips MCP configuration. The default command initializes resources and updates the user-level MCP config.

## Update and uninstall

Existing files are intentionally left untouched. To replace managed files with the current version, pass `--force`; review local edits first because the installer backs up the old targets but does not merge them.

```bash
npx -y chrisstarr7/jev-kit init --force
```

Uninstall the user Skill with:

```bash
npx -y chrisstarr7/jev-kit uninstall
```

Uninstall preserves project assets and MCP config by default. Managed files are moved to recoverable backup paths. Review `npx -y chrisstarr7/jev-kit uninstall --help` before detaching project assets or the MCP entry.

## Development and verification

Run `npm test` for repository checks, offline evaluation, and CLI tests. Run `npm pack --dry-run` to inspect package contents. A passing package check does not prove a host will load or follow the Skill; verify host-side behavior separately.

## License

This repository currently declares `UNLICENSED`. That does not grant permission to use, modify, or redistribute the package. A public GitHub repository is not automatically open source; add an explicit license before distributing it as open-source software.
