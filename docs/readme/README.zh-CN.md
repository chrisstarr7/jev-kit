# Jev Kit

[English](../../README.md) | 简体中文

**面向 Java 后端研发的 Codex Skill 与 MCP 决策辅助工具。** Jev 对少量工程问题进行有限分类；代码阅读、实现决策、审查和交付仍由 AI 助手负责。

## 安装

在 Maven 项目根目录执行：

```bash
npx -y chrisstarr7/jev-kit
```

安装器会为当前 Codex 用户安装 Skill；发现 `pom.xml` 时复制项目决策包和项目 Skill；如果尚无 Jev MCP 配置，则向 Codex 用户级 `config.toml` 添加配置。已有目标默认保留。安装后重启 Codex。该命令会运行仓库当前默认分支的程序，请先检查源码。

**需要：** Node.js 20+ 和 Git。实时调用 Jev 还需要 `uvx`，并在启动 Codex 的进程环境中设置 `TYPESAFE_API_KEY`。安装器不会将密钥写入磁盘。

只安装 Skill 和项目文件、不修改 MCP 配置：

```bash
npx -y chrisstarr7/jev-kit setup
```

如果 Maven 项目不在当前目录的上级路径中，给命令添加 `--project-root /项目路径`。

## 一次任务如何使用 Jev

1. 宿主支持且任务符合范围时，Codex 加载 Skill。安装 Skill 不代表每轮都一定调用。
2. 助手先阅读相关代码和决策包，再判断一次有限分类是否有帮助。
3. 只有在有用且输入安全时，才向 `jev_ask` MCP 工具发送简短、脱敏的上下文。每个新的用户轮次最多调用一次；工具续接复用已有结果。
4. 助手检查答案类型、置信度（`>= 0.75`）及其与代码证据是否一致。遇到错误、超时、缺少凭据、低置信度或证据冲突时，按常规工作流继续。
5. Jev 只提供建议。它不写 Java 代码、不批准生产变更、不取消测试，也不绕过审查门禁。

## 决策范围

| 决策 | 用途 |
| --- | --- |
| `file_relevance` | 从较大的候选文件列表中筛选相关文件 |
| `change_risk` | 选择适当的审查深度 |
| `sql_risk` | 标出数据访问和迁移风险 |
| `npe_risk` | 检查空值及外部边界风险 |
| `test_required` | 建议回归测试级别 |
| `review_gate` | 明确交付前所需的审查门禁 |

不论 Jev 返回什么，SQL、API 契约、事务、消息队列、权限、安全和数据库迁移仍需严格审查。

## 隐私与外部请求

实时请求通过社区 `jev-mcp` 服务发出，并需要 `TYPESAFE_API_KEY`。调用前先阅读相关代码，只发送当前判断所需的最少脱敏内容。

禁止发送凭据、Token、Cookie、密码、客户个人信息、生产记录、数据库 dump 或完整源码归档。如果无法安全缩减上下文，就跳过 Jev。发送项目信息前，请先查看 MCP 服务提供方的数据处理条款。密钥只保留在进程环境中，不写入仓库或 Codex 配置。

## 安装内容

| 资源 | 默认位置 | 说明 |
| --- | --- | --- |
| 用户级 Skill | `$CODEX_HOME/skills/java-jev` 或 `~/.codex/skills/java-jev` | 加载 AI 助手指导 |
| 项目决策包 | `<项目>/docs/jev` | 团队可按需提交到 Git |
| 项目 Skill | `<项目>/.agents/skills/java-jev` | 项目级指导 |
| MCP 配置 | `$CODEX_HOME/config.toml` | 当前用户的 Codex 配置 |

默认不覆盖已有目标；传入 `--force` 后会先备份再替换。安装器不修改 Java 源码。`setup` 不改 MCP 配置；无子命令时会初始化资源并更新用户级 MCP 配置。

## 更新与卸载

已有文件默认保留。要替换为当前版本，请使用 `--force`。先检查本地修改：安装器会备份旧目标，但不会合并自定义内容。

```bash
npx -y chrisstarr7/jev-kit init --force
```

卸载用户级 Skill：

```bash
npx -y chrisstarr7/jev-kit uninstall
```

默认保留项目资源和 MCP 配置。受管理的文件会移动到可恢复的备份路径。移除项目资源或 MCP 配置前，请查看 `npx -y chrisstarr7/jev-kit uninstall --help`。

## 开发与验证

`npm test` 会执行仓库检查、离线评估和 CLI 测试。`npm pack --dry-run` 可查看打包内容。包检查通过不代表宿主会加载或遵循 Skill；宿主端行为需要单独验证。

## 许可证

仓库当前声明为 `UNLICENSED`，没有授予使用、修改或再分发许可。GitHub 仓库公开不等于开源；以开源软件方式分发前，需要添加明确许可证。
