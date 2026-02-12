# RESTful API 规范（Go + Gin + GORM）

## 1. 基础约定

- Base URL：`/api/v1`
- 数据格式：`application/json`
- 鉴权：`Authorization: Bearer <access_token>`
- 角色：`admin`（发布/回滚）、`editor`（编辑/校验）
- 时间：ISO-8601（UTC）

## 2. 核心对象

```json
{
  "ContentDocument": {
    "pageKey": "home",
    "draftConfig": {},
    "publishedConfig": {},
    "draftVersion": 12,
    "publishedVersion": 10,
    "updatedAt": "2026-02-13T00:00:00Z"
  },
  "ContentVersion": {
    "pageKey": "home",
    "version": 11,
    "configSnapshot": {},
    "changeNote": "更新首页文案",
    "operator": "admin@company.com",
    "createdAt": "2026-02-13T00:00:00Z"
  },
  "PublicPageResponse": {
    "pageKey": "home",
    "version": 10,
    "config": {}
  }
}
```

## 3. 认证接口（JWT）

### `POST /auth/login`
- Request: `{ "username": "", "password": "" }`
- Response: `{ "accessToken": "", "refreshToken": "", "expiresIn": 3600, "role": "admin" }`

### `POST /auth/refresh`
- Request: `{ "refreshToken": "" }`
- Response: `{ "accessToken": "", "expiresIn": 3600 }`

### `GET /auth/me`
- Response: `{ "id": "u_1", "username": "editor", "role": "editor" }`

### `POST /auth/logout`
- Request: `{ "refreshToken": "" }`
- Response: `{ "ok": true }`

## 4. 公共内容接口（仅发布态）

### `GET /public/content/{pageKey}?locale=zh|en`
- 说明：仅返回 `publishedConfig`，禁止透出草稿。
- Response:

```json
{
  "pageKey": "home",
  "version": 10,
  "locale": "zh",
  "config": {}
}
```

## 5. 后台内容接口

### `GET /admin/content/{pageKey}/draft`
- 权限：`admin/editor`
- Response: `{ "pageKey": "home", "version": 12, "config": {} }`

### `PUT /admin/content/{pageKey}/draft`
- 权限：`admin/editor`
- Header：`If-Match: 12`
- Request: `{ "config": {}, "changeNote": "更新 hero" }`
- Response: `{ "pageKey": "home", "version": 13, "updatedAt": "..." }`
- 并发冲突：`409 CONFLICT_VERSION`

### `POST /admin/content/{pageKey}/validate`
- 权限：`admin/editor`
- Request: `{ "config": {} }`
- Response:

```json
{
  "valid": false,
  "errors": [
    { "path": "hero.title.en", "code": "REQUIRED", "message": "English title is required" }
  ],
  "translationStatus": {
    "hero.title": "missing",
    "about.description": "stale"
  }
}
```

### `POST /admin/content/{pageKey}/publish`
- 权限：`admin`
- Request: `{ "expectedDraftVersion": 13, "changeNote": "首页改版发布" }`
- 规则：同步发布 `zh+en`，若存在必填 `missing/stale` 则拒绝。
- Response: `{ "pageKey": "home", "publishedVersion": 11, "publishedAt": "..." }`

### `GET /admin/content/{pageKey}/versions`
- 权限：`admin/editor`
- Query：`page=1&pageSize=20`
- Response:

```json
{
  "items": [
    { "version": 11, "changeNote": "首页改版发布", "operator": "admin", "createdAt": "..." }
  ],
  "total": 1
}
```

### `GET /admin/content/{pageKey}/versions/{version}`
- 权限：`admin/editor`
- Response: `ContentVersion`

### `POST /admin/content/{pageKey}/rollback/{version}`
- 权限：`admin`
- Request: `{ "changeNote": "回滚到 v9" }`
- 行为：从历史快照创建新发布版本（不是覆盖旧版本）。
- Response: `{ "pageKey": "home", "publishedVersion": 12, "sourceVersion": 9 }`

## 6. 状态码与错误码

- `200/201` 成功
- `400 BAD_REQUEST` 参数错误
- `401 UNAUTHORIZED` 未登录或 token 无效
- `403 FORBIDDEN` 无权限
- `404 NOT_FOUND` 页面或版本不存在
- `409 CONFLICT_VERSION` 草稿版本冲突
- `422 VALIDATION_FAILED` Schema 或多语言门禁失败

统一错误结构：

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "publish blocked by missing or stale translations",
    "details": [{ "path": "hero.title.en", "reason": "missing" }]
  }
}
```

## 7. 一致性与并发控制

- 草稿更新必须携带 `If-Match` 或 `expectedVersion`。
- 发布必须校验 `expectedDraftVersion`，防止“先校验后被他人改写”。
- 发布流程使用事务：
  1. 校验草稿与翻译状态
  2. 写入 `content_versions`
  3. 更新 `content_documents.published_config/published_version`
  4. 提交事务

## 8. 测试清单（API）

- JWT：登录、刷新、过期、权限拦截
- 并发：双编辑者同时保存触发 `409`
- 发布门禁：存在 `missing/stale` 必填字段时 `422`
- 只读安全：公共接口绝不返回草稿数据
- 回滚：指定旧版本后生成新发布版本并立即可读
