# 开发计划（Long-Running Agent 输入版）

## 1. 项目目标
在现有 React 官网基础上，建设“可后台编辑 + 可发布回滚 + 双语门禁”的内容管理能力。

交付目标：
- 前台页面内容由发布态配置驱动。
- 后台支持草稿编辑、校验、发布、版本回滚。
- 双语（`zh` / `en`）字段具备 `missing/stale/done` 状态，并在发布前强门禁。

## 2. 范围（MVP）
- 页面范围：`home`、`about`、`advantages`、`core-services`、`cases`、`experts`、`contact`、`global`
- 不包含：404 页面配置化、对象存储签名上传、复杂工作流审批

## 3. 技术栈约束
- 前台站点：React + React Router + Tailwind（保留现状）
- 后台：React + React Router + Ant Design
- 后端：Go + Gin + GORM
- 数据库：SQLite（开发）/ PostgreSQL（生产可选）
- 鉴权：JWT（access + refresh）

## 4. 分阶段交付

### Phase A：基础设施与骨架
- 建立后端目录与分层结构（handler/service/repository）
- 初始化数据库迁移与核心表：`users`、`refresh_tokens`、`content_documents`、`content_versions`
- 接入统一错误结构、日志、配置管理
- 建立最小 CI 检查（lint/type-check）

### Phase B：认证与权限
- 实现 `POST /auth/login`、`POST /auth/refresh`、`GET /auth/me`、`POST /auth/logout`
- 实现角色权限：`admin`、`editor`
- 接入中间件：鉴权、权限拦截、错误映射

### Phase C：内容草稿与校验
- 实现 `GET/PUT /admin/content/{pageKey}/draft`
- 实现并发版本控制（`If-Match` / `expectedVersion`）
- 实现 `POST /admin/content/{pageKey}/validate`
- 按数据模型实现双语状态计算（`missing/stale/done`）

### Phase D：发布与回滚
- 实现 `POST /admin/content/{pageKey}/publish`
- 发布事务化：写 `content_versions` + 更新 `published_config`
- 实现版本查询：`GET /admin/content/{pageKey}/versions`、`GET /admin/content/{pageKey}/versions/{version}`
- 实现回滚：`POST /admin/content/{pageKey}/rollback/{version}`（生成新版本）

### Phase E：前台消费与配置驱动
- 实现公共接口：`GET /public/content/{pageKey}?locale=zh|en`
- 前台按 `config` + `locale` 渲染页面
- 保留 i18n 兜底，逐页迁移硬编码内容

### Phase F：后台管理界面
- 登录页与会话管理
- 页面草稿编辑器（双语同屏输入）
- 校验结果与翻译状态面板
- 发布与回滚操作面板

### Phase G：质量与上线准备
- API 集成测试：认证、并发冲突、发布门禁、回滚可读性
- 前台回归测试：页面内容完整性与多语言兜底
- 可观测性：发布成功率、校验失败率、公共接口 P95
- 生产配置：SQLite->PostgreSQL 切换路径与迁移策略

## 5. 验收标准
- 所有目标页面可通过后台编辑并发布到前台。
- 发布门禁准确拦截 `missing/stale` 必填字段。
- 回滚后生成新发布版本并立即可读。
- 公共接口仅返回发布态，不泄露草稿。
- 至少完成 lint + type-check + 核心链路回归测试。

## 6. 实施约束
- 长任务代理每轮仅实现一个 feature。
- 每轮必须先做“已完成能力回归检查”。
- 若需求不明确，标记 `needs_human` 并中止本轮。

## 7. 风险与依赖项说明

### 依赖项
- **前置文档**：实施前需已定稿或可执行版本：`docs/architecture.md`、`docs/api-spec.md`、`docs/data-model.md`、`docs/business-requirements.md`。Agent 每轮应依据上述文档做实现与回归，不得擅自改约定。
- **运行环境**：Node.js 20+、pnpm 8+、Go 1.24+；开发阶段依赖 SQLite，生产可选 PostgreSQL，需在部署文档中明确切换路径与迁移步骤。
- **前端现状**：依赖现有 React 官网代码与 i18n 资源；Phase E/F 需与现有路由、组件、`src/pages` 结构对接，逐页迁移时保持既有页面可用。
- **验证命令**：每轮通过 `pnpm lint && pnpm type-check`（或项目 `.lragent/config.json` 中配置的 `verifyCommand`）视为通过；若引入后端，需在 CI 中加入 Go 测试与构建。

### 风险
- **并发与存储**：开发环境使用 SQLite，高并发草稿保存或同时发布多页面时可能遇到锁竞争；建议 Phase D 后评估，生产流量大时切换 PostgreSQL 或提前做连接/事务策略。
- **Schema 与门禁一致性**：`data-model.md` 中各 pageKey 的 schema 与后端校验、前台消费必须一致；任一处单独改 schema 易导致校验漏报或前台报错，变更需三处同步并回归。
- **双语状态传播**：`stale` 依赖“中文变更后英文未同步”的判定规则，若实现与文档不一致（如时间戳或版本粒度不同），会导致门禁过严或过松，需在 Phase C 用用例固化预期。
- **Agent 执行约束**：每轮只做单一 feature、不修改 backlog 中 id/标题/依赖关系；若前置文档缺失或冲突，应标记 `needs_human` 并停止，避免在未定稿需求上继续开发。
