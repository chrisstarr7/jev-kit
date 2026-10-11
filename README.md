# Java Jev Kit

English | [简体中文](docs/readme/README.zh-CN.md)

An optional, bounded decision aid for Java backend development. Jev classifies a small set of engineering questions; your coding assistant remains responsible for reading the code, making decisions, reviewing changes, and delivering the work.

## Install

From the root of a Maven project, run:

```bash
npx -y chrisstarr7/jev-kit
```

This downloads the public GitHub repository through npm, installs the Skill for your Codex user, copies the project decision pack and project Skill when a `pom.xml` is found, and adds the Jev MCP entry to your Codex `config.toml`. Restart Codex after installation. Requires Node.js 20+ and Git. Live Jev calls also require `uvx` and `TYPESAFE_API_KEY` in the environment that starts Codex; the key is never written by this installer.

The command defaults to `init`. To install resources without changing MCP configuration, run `npx -y chrisstarr7/jev-kit setup`. To initialize a project outside the current directory, add `--project-root /path/to/project`.

## What happens during a task

```mermaid
sequenceDiagram
    participant D as Developer
    participant A as Coding assistant
    participant S as java-jev Skill
    participant M as Jev MCP
    D->>A: Ask for Java development work
    A->>S: Load project guidance when supported by the host
    A->>A: Read code and decide whether a bounded classification helps
    opt One useful, safe question
        A->>M: Send minimal, redacted context to jev_ask
        M-->>A: Return a classification and confidence
        A->>A: Validate result; keep hard review gates; otherwise fall back
    end
    A-->>D: Continue normal development and report evidence
```

The Skill is guidance, not a host event hook. It cannot guarantee that every new turn automatically invokes Jev. The assistant should call it at most once for a fresh user turn, skip tool continuations, and reuse an accepted result while that task remains unchanged. If the Skill or MCP is unavailable, the assistant continues with its normal evidence-based workflow.

## Decision and safety boundaries

The decision pack covers file relevance, change risk, SQL risk, null-related runtime risk, test level, and review gate. Jev is advisory: a response is usable only when its answer matches the declared type, has confidence of at least `0.75`, and does not conflict with code evidence.

The assistant must read the relevant code before asking Jev and send only the minimum redacted context. Never send credentials, tokens, cookies, passwords, customer personal data, production records, database dumps, or a full source archive. SQL, API contracts, transactions, queues, permissions, security, and migrations remain hard review gates. Jev cannot generate Java code, approve production changes, or waive a test or review.

The configured MCP runs the community `jev-mcp` server with `uvx` and requires `TYPESAFE_API_KEY` for live requests. The key stays in the process environment. Review the MCP provider's own data handling before sending any context; redaction remains the assistant's responsibility.

## Files installed

| Resource | Location | Purpose |
| --- | --- | --- |
| User Skill | `$CODEX_HOME/skills/java-jev` (default: `~/.codex/skills/java-jev`) | Assistant instructions |
| Project decision pack | `<project>/docs/jev` | Java decision definitions and evaluation materials |
| Project Skill | `<project>/.agents/skills/java-jev` | Project-local guidance |
| MCP configuration | `$CODEX_HOME/config.toml` | Registers the local Jev MCP server |

Existing files are kept unless `--force` is supplied; replaced targets are backed up. The installer does not edit Java source files. Project assets may be committed if your team wants to share them. The user-level MCP configuration affects Codex sessions for this user.

## Commands

| Command | Effect |
| --- | --- |
| `npx -y chrisstarr7/jev-kit` | Initialize resources and configure MCP |
| `npx -y chrisstarr7/jev-kit setup` | Install resources without changing MCP configuration |
| `npx -y chrisstarr7/jev-kit init --force` | Replace managed targets after creating backups |
| `npx -y chrisstarr7/jev-kit uninstall` | Detach the user Skill; keep project assets and MCP config |

Uninstall moves managed Skill/assets to recoverable backup paths. Project files and MCP config require explicit flags to detach. Review `npx -y chrisstarr7/jev-kit uninstall --help` before removing them.

## Development and verification

Run `npm test` for resource checks, offline evaluation, and CLI tests. Run `npm pack --dry-run` to inspect the package contents. Installation on a host does not prove that the host loads or follows the Skill on every turn; host-side end-to-end behavior must be verified separately.

## License

The repository currently declares `UNLICENSED`. This does not grant users permission to redistribute or modify the package. A public GitHub URL and a working install command do not replace an explicit open-source license. Add a license before presenting this project as open source.
