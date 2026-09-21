# Jev Decision Layer

这是 Java 后端项目的 Codex 开发辅助层，不是 Java 服务运行时组件。它把低熵、有限选项的判断交给 Jev，把代码阅读、证据解释、方案设计和最终责任留给 Codex。

## MVP decisions

决策定义在 [`questions/java-backend-mvp.json`](questions/java-backend-mvp.json)：

* `file_relevance`：候选文件是否与任务直接相关。
* `change_risk`：变更风险 0–3 分。
* `sql_risk`：SQL/数据访问风险分类。
* `npe_risk`：空值/外部边界运行时风险 0–3 分。
* `test_required`：最小回归测试级别。
* `review_gate`：`allow`、`codex_review` 或 `deep_review`。

## Invocation policy

1. 先由 Codex 阅读仓库、定位调用链，并生成脱敏的最小上下文。
2. 只有判断是有限选项且 Jev 能降低重复判断成本时，才调用通用 MCP 工具 `jev_ask`。
3. Jev 返回后，Codex 检查置信度、证据和项目硬门禁，再决定是否采用。
4. Jev 失败、超时、缺少 API Key、响应格式错误、置信度低或证据冲突时，直接回退到 Codex，不阻塞任务。

每个新用户轮次最多做一次 Jev 判断；工具调用续接、标题生成、纯系统输入不重复判断，并沿用当前任务已经接受的结果。Jev 结果必须满足 `confidence >= 0.75`，且输入上下文控制在有限长度内；超出边界时先缩减或直接 fallback。

以下内容始终是 Codex 的硬审查门禁：SQL、API 契约、事务、消息队列、权限、安全和数据库迁移。Jev 不能批准这些门禁的绕过，也不能代替测试。

## Privacy boundary

允许发送：仓库相对路径、短的脱敏摘要、无业务数据的表/字段名、移除密钥和字面量后的有限 SQL/API 片段。

禁止发送：API Key、Token、密码、Cookie、证书、客户 PII、生产记录、完整仓库归档、数据库 dump 和不必要的生产 URL。若无法脱敏，跳过 Jev。

## MCP setup

当前用户级 Codex 配置注册了固定版本的社区 Jev MCP：

```toml
[mcp_servers.jev]
type = "stdio"
command = "uvx"
# Source version: v0.2.1; commit-pinned for reproducible installs.
args = ["--from", "git+https://github.com/blakestone-x/jev-mcp@983b69444593d27be0c99d4ab134041929e5a55a", "jev-mcp"]
enabled = true
startup_timeout_sec = 30
```

启动 Codex 的环境中需要提供 `TYPESAFE_API_KEY`。密钥不要写入仓库、Skill 或 `config.toml`；没有密钥时保留 MCP 注册也不会影响正常 Codex 工作，因为调用会按上面的策略 fallback。

本资源包不修改项目根 `.mcp.json`，避免把个人开发工具和现有 MCP 配置绑定到所有项目用户。

## 从 codex-jev-router 吸收的设计

附件源码提供了一个 Node 20 本地 Responses API 代理，可以自动为每个新 Codex 轮次选择模型和 reasoning effort，并在工具调用期间保持路由稳定。我们吸收了它的轮次识别、能力降级、短超时、fail-open 和 fake upstream 测试思路，但没有把 CLI 代理设为默认：当前接入目标是 Codex Desktop 的 MCP，直接启用代理会额外引入 Node 运行时、SDK、启动方式和另一套凭据链。

如果以后确实需要“自动选择 Codex 模型/推理强度”，应作为独立的 CLI opt-in 任务实现，并补充状态 TTL、请求体上限、置信度门槛和敏感输入过滤；不要把它混入当前 Java 决策包。

## Skill

用户级 Skill 位于 `$CODEX_HOME/skills/java-jev/SKILL.md`，未设置时使用 `$HOME/.codex/skills/java-jev/SKILL.md`。它只规定调用边界和问题选择，不生成 Java 代码、不改变 Java 服务行为。

## Offline Eval

Eval 不调用网络，只评估从 MCP 或人工流程导出的预测 JSONL：

```powershell
python docs/jev/evals/evaluate.py
python docs/jev/evals/evaluate.py --cases docs/jev/evals/cases.jsonl --predictions path/to/predictions.jsonl
```

输入格式见 `cases.jsonl` 和 `sample-predictions.jsonl`。脚本输出 accuracy、宏平均 Precision/Recall、review gate recall、平均延迟和上下文节省率；缺失预测、重复 ID、未知 ID 或非法 gate 值会以非零状态失败。样例指标只验证评估管道，不代表线上模型质量。

## Future boundary

如果未来要让业务运行时使用 Jev，必须单独评估网络失败、超时、数据隐私、可观测性、重试、熔断和回滚，并建立服务级契约测试；本 MVP 不预留 Java 抽象或生产依赖。
