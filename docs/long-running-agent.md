# Long-Running Agent 使用说明

## 1. 设计来源
该实现采用 Anthropic 在 *Effective harnesses for long-running agents* 中的核心思路：
- 两阶段代理：`initializer`（一次）+ `coding`（多轮）
- feature backlog 作为长期状态
- 每轮只做一个 feature，并记录可续跑进度
- 新上下文窗口反复启动，靠文件持久化推进任务

## 2. 目录结构
运行后会在仓库根目录生成：

- `.long-agent/feature_list.json`：特性清单（含状态）
- `.long-agent/state.json`：执行状态（迭代号、最近特性）
- `.long-agent/agent-progress.md`：会话进度日志
- `.long-agent/reports/*.json`：每轮结构化报告
- `.long-agent/init.sh`：初始化脚本（由 initializer 生成）

Prompt 模板：
- `long-agent/prompts/initializer.md`
- `long-agent/prompts/coding.md`

执行器：
- `scripts/long-agent.mjs`

## 3. 前置要求
- 已安装并可用 `claude` CLI
- 当前仓库可被 CLI 访问
- 建议先执行：`pnpm install`

## 4. 常用命令
仅初始化 backlog：

```bash
pnpm agent:init
```

执行 3 轮编码代理：

```bash
pnpm agent:run
```

执行更多轮，并指定模型：

```bash
pnpm agent:run -- --max-iterations 10 --model sonnet
```

控制初始化粒度（推荐）：

```bash
pnpm agent:init -- --init-min-features 24 --init-max-features 36 --init-granularity balanced
```

使用自定义 plan：

```bash
pnpm agent:run -- --plan docs/development-plan.md
```

## 5. 运行参数
`node scripts/long-agent.mjs [options]`

- `--plan <path>`：开发计划文件
- `--state-dir <path>`：状态目录（默认 `.long-agent`）
- `--max-iterations <n>`：每次运行编码轮数（默认 `3`）
- `--delay-seconds <n>`：轮次间延迟（默认 `3`）
- `--verify-command <cmd>`：每轮校验命令（默认 `pnpm lint && pnpm type-check`）
- `--init-min-features <n>`：初始化最小 feature 数（默认 `24`）
- `--init-max-features <n>`：初始化最大 feature 数（默认 `36`）
- `--init-granularity <mode>`：初始化粒度（`coarse|balanced|fine`，默认 `balanced`）
- `--model <name>`：Claude 模型别名/名称
- `--max-budget-usd <num>`：单次运行预算上限
- `--init-only`：仅运行初始化阶段
- `--workspace <path>`：目标仓库目录

## 6. 建议工作流
1. 先 `pnpm agent:init` 生成并检查 feature list。
2. 根据需要微调 feature list 的优先级和依赖关系。
3. 再执行 `pnpm agent:run`，观察 `.long-agent/reports`。
4. 发现 `needs_human` 时先做决策，再继续运行。

## 7. 粒度建议
- `balanced`（默认）：一个 feature 对应一个可验证的端到端能力，通常最适合持续迭代。
- `coarse`：更少 feature、更大的能力包，适合你想减少任务数量时使用。
- `fine`：更细拆分，适合高风险项目，但容易造成 backlog 过长。
- 建议区间：
  - 中型项目：`24~36`
  - 复杂项目：`30~45`
  - 若出现“每个 endpoint 一个任务”，说明拆分过细，优先提高粒度或收窄 feature 数范围。

## 8. 重新初始化说明
- `initializer` 仅在目标状态目录中不存在 `feature_list.json` 时触发。
- 如果要按新粒度重建 backlog，可选做法：
- 使用新状态目录：`pnpm agent:init -- --state-dir .long-agent-v2 --init-min-features 24 --init-max-features 36 --init-granularity balanced`
- 或清理旧状态目录后再执行 `pnpm agent:init`。
