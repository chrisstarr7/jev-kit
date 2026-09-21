# Java Jev Kit

一个可从 GitHub 安装的、可选且可回退的 Java 后端开发时决策辅助包，面向 Codex Desktop、Codex CLI 和支持 Agent Skills 的编码 Agent。

Jev 只负责有限选项的开发时分类；代码阅读、方案设计、最终审查和交付责任仍由 Agent 和开发者承担。

> 当前版本：`1.0.1` · 当前包不是 Maven 依赖，也不会修改 Java 源码或生产运行时。

## 快速开始

### 先决条件

- Node.js `20+`
- Codex Desktop、Codex CLI，或支持项目级 Agent Skills 与 MCP 的工具
- `uvx`：只有实时调用 Jev 时需要
- Python `3.9+`：只有运行离线评测时需要

### 从 GitHub 安装

在目标 Maven 项目根目录执行。以下命令直接从 GitHub 安装，不需要手动 clone：

```bash
cd <java-project-root>
npm install --ignore-scripts --no-save git+https://github.com/chrisstarr7/jev-kit.git#v1.0.1
npx --no-install jev-kit init
```

`npm install` 只安装工具，不会自动修改 Codex 配置；`init` 才会执行项目初始化，并默认追加 Jev MCP 配置。`--ignore-scripts` 用于避免安装来源包时自动执行生命周期脚本。

如果仓库是私有仓库，使用者必须具备 GitHub 访问权限。已配置 SSH Key 时可使用：

```bash
npm install --ignore-scripts --no-save git+ssh://git@github.com/chrisstarr7/jev-kit.git#v1.0.1
```

如果只想安装资源、不修改 Codex MCP 配置：

```bash
JEV_KIT_CONFIGURE_MCP=0 npx --no-install jev-kit init
```

PowerShell：

```powershell
$env:JEV_KIT_CONFIGURE_MCP = "0"
npx --no-install jev-kit init
```

## 初始化会修改什么

默认执行 `init` 后，以下资源会被安装或复制：

| 资源 | 默认位置 | 行为 |
| --- | --- | --- |
| 用户级 Skill | `$CODEX_HOME/skills/java-jev`，未设置时为 `$HOME/.codex/skills/java-jev` | 安装到当前用户 |
| 项目决策包 | `<project>/docs/jev` | 复制到项目目录，可纳入 Git |
| 项目级 Skill | `<project>/.agents/skills/java-jev` | 复制到项目目录，可纳入 Git |
| Jev MCP 配置 | `$CODEX_HOME/config.toml` | `init` 默认追加；已有配置会先备份 |

已有目标默认保留，不覆盖同事的修改。确认内容后需要覆盖时，使用 `--force`；已有目标会先生成带时间戳的备份：

```bash
npx --no-install jev-kit init --force
```

如果当前目录不是 Maven 项目，工具不会自动猜测项目位置。请显式指定：

```bash
npx --no-install jev-kit setup \
  --project-root <java-project-root> \
  --configure-mcp
```

初始化完成后，重启 Codex，使新的 Skill 和 MCP 配置生效。

## 配置 Jev

不要把 API Key 写入 Git、`config.toml`、`.env` 或命令行参数。只在启动 Agent 的当前进程环境中提供：

macOS/Linux：

```bash
printf 'TypeSafe API key: '
read -s TYPESAFE_API_KEY
printf '\n'
export TYPESAFE_API_KEY
codex
```

PowerShell：

```powershell
$env:TYPESAFE_API_KEY = Read-Host "TypeSafe API key"
codex
```

实时 MCP 配置位于 `config/mcp-server.toml`，当前固定到 `jev-mcp` `v0.2.1` 对应的 commit。相比可移动的 Git tag，commit pin 更适合可重复安装；升级第三方依赖时应重新审查并记录新的版本映射。

没有 API Key、MCP 不可用、请求超时、响应格式错误、置信度不足或证据冲突时，Jev 会回退到普通 Agent，不阻塞开发。

## 决策范围与安全边界

当前决策包包含：

- `file_relevance`
- `change_risk`
- `sql_risk`
- `npe_risk`
- `test_required`
- `review_gate`

Jev 的约束：

- 每个新用户轮次最多调用一次；工具续接复用已接受结果。
- 只接受声明类型匹配且置信度至少为 `0.75` 的结果。
- 发送给 Jev 的内容必须最小化并脱敏：不得包含密钥、Token、Cookie、密码、PII、生产记录、完整源码归档或数据库 dump。
- SQL、API 契约、事务、消息队列、权限、安全和迁移始终需要 Agent/开发者的深度审查。
- Jev 不会生成 Java 代码，不会自动切换 Codex 模型，也不能批准生产变更。

详细决策规则见 [`project/docs/jev/README.md`](project/docs/jev/README.md) 和 [`project/docs/jev/questions/java-backend-mvp.json`](project/docs/jev/questions/java-backend-mvp.json)。

## 常用命令

以下命令应在已经安装本包的目录中执行：

| 命令 | 用途 |
| --- | --- |
| `npx --no-install jev-kit init` | 安装资源并默认配置 MCP |
| `npx --no-install jev-kit setup` | 安装资源，不主动配置 MCP |
| `npx --no-install jev-kit setup --configure-mcp` | 安装资源并配置 MCP |
| `npx --no-install jev-kit uninstall --project-root <path>` | 移除用户级 Skill，保留项目资源 |
| `npx --no-install jev-kit uninstall --project-root <path> --remove-project-assets --remove-mcp` | 审查后移除项目资源和本包追加的 MCP 区块 |

卸载脚本只处理带有 `java-jev-kit` 标记的目录。为避免误删团队内容，卸载会把受管理目录移动到带时间戳的备份路径，而不是直接递归删除；项目文档默认保留。删除 MCP 配置前会备份 `config.toml`，如果 MCP 区块已被手工修改，工具会拒绝自动删除。

## 升级

建议始终安装明确的 Git tag，不要依赖会变化的默认分支：

```bash
npm install --ignore-scripts --no-save git+https://github.com/chrisstarr7/jev-kit.git#v1.0.1
npx --no-install jev-kit init --force
```

升级前确认备份可用，并检查 `CHANGELOG.md`。如果项目资源中有团队自定义内容，先不要使用 `--force`。

## 维护者检查

在本仓库根目录执行：

```bash
npm ci --ignore-scripts
npm test
npm pack --dry-run
```

`npm test` 包含资源完整性检查、决策包约束检查、敏感信息扫描和离线 Eval。GitHub Actions 会在 push 和 pull request 中重复这些检查。

## 从源码发布到 GitHub

本项目通过 GitHub Git 仓库分发，不需要也不应该执行 `npm publish`。发布前确认：

1. `package.json`、`manifest.json`、`CHANGELOG.md` 的版本一致。
2. `npm test` 和 `npm pack --dry-run` 通过。
3. 仓库中没有 API Key、Token、Cookie、密码、私钥或生产数据。
4. 已审查 `config/mcp-server.toml` 引用的第三方 Jev MCP 版本。

发布示例：

```bash
git add .
git commit -m "release: publish java-jev-kit"
git push origin main

git tag v1.0.1
git push origin v1.0.1
```

消费者应安装 tag，例如 `#v1.0.1`，以获得可重复的版本选择。

## 故障排查

### `jev-kit: command not found`

确认安装和执行发生在同一个项目目录，并使用 `npx --no-install jev-kit ...`。本包不要求全局安装。

### 没有发现 Maven 项目

自动检测依赖项目根目录中的 `pom.xml`。对于非标准目录，使用 `--project-root <java-project-root>`。

### MCP 配置没有变化

`init` 默认配置 MCP；`setup` 默认不配置 MCP，需要显式添加 `--configure-mcp`。如果设置了 `JEV_KIT_CONFIGURE_MCP=0`，`init` 也会跳过 MCP 配置。

### Jev 不可用是否会阻塞开发

不会。缺少 Key、网络不可用、超时或低置信度都会回退到普通 Agent；但 SQL、权限、安全等硬审查仍然不能跳过。

### 需要报告安全问题

不要创建包含凭据、客户数据或私有源码的公开 Issue。请先撤销已泄露的凭据，再按照 [`SECURITY.md`](SECURITY.md) 使用私下的维护渠道报告。

## 许可证与分发范围

当前 `package.json` 使用 `UNLICENSED`，默认含义是仅限团队内部使用，不授予公开再分发权。

如果要公开仓库或对外分发，请先：

1. 选择团队批准的许可证，并添加根目录 `LICENSE` 文件。
2. 将 `package.json` 的 `license` 字段从 `UNLICENSED` 改为对应 SPDX 标识。
3. 检查第三方 MCP 依赖和项目内素材的再分发许可。
4. 更新本节和 [`CHANGELOG.md`](CHANGELOG.md)。

## 相关文件

- [`SECURITY.md`](SECURITY.md)：安全问题报告和安全边界
- [`CHANGELOG.md`](CHANGELOG.md)：版本变更
- [`project/docs/jev/README.md`](project/docs/jev/README.md)：项目侧决策包说明
- [`skill/java-jev/SKILL.md`](skill/java-jev/SKILL.md)：安装后的 Agent Skill 规则
