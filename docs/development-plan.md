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
