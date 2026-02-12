# 页面配置数据模型设计（zh/en）

## 1. 目标与范围
本设计用于将现有前端页面从“代码内硬编码 + i18n 分散键值”升级为“后台可管理的页面配置”。

- 语言：仅 `zh`、`en`
- 页面范围：`home`、`about`、`advantages`、`core-services`、`cases`、`experts`、`contact`、`global`
- 不纳入：`404` 页面

## 2. 现状映射（固定布局 vs 循环列表）

| 页面 | 固定布局模块 | 循环渲染模块 | 当前硬编码数据 |
|---|---|---|---|
| Home | hero、about | advantages cards、core services list | hero/bg、about 图、卡片图、服务图、`href="#"` |
| About | hero、companyProfile | section2/section3（可抽象为 blocks） | `ABOUT_IMAGES` |
| Advantages | hero | 5 个优势 block | `ADVANTAGE_IMAGES`、`BLOCK_KEYS` |
| Core Services | hero | 3 个 service block | `SERVICE_IMAGES`、`SERVICE_KEYS` |
| Cases | hero | case 列表 + 每个 case 的 items 列表 | `CASE_KEYS`、hero 背景图 |
| Experts | hero、sectionTitle | experts 列表、bio 段落列表 | `EXPERTS`（id + 头像） |
| Contact | hero、contact info、form | 无 | `HERO_BG_COLOR`、SVG 图标、固定字段集 |
| Global | header、footer | nav links、footer links（可列表化） | logo、页脚外链、锚点链接 |

## 3. 通用类型（内容层）

```json
{
  "$defs": {
    "LocalizedText": {
      "type": "object",
      "required": ["zh", "en"],
      "properties": {
        "zh": { "type": "string", "minLength": 1 },
        "en": { "type": "string", "minLength": 1 }
      },
      "x-editable": true,
      "x-fallback": "zh"
    },
    "LocalizedRichText": {
      "allOf": [{ "$ref": "#/$defs/LocalizedText" }],
      "x-format": "multiline"
    },
    "MediaRef": {
      "type": "object",
      "required": ["url", "alt"],
      "properties": {
        "url": { "type": "string", "format": "uri-reference" },
        "alt": { "$ref": "#/$defs/LocalizedText" }
      },
      "x-editable": true
    },
    "Cta": {
      "type": "object",
      "required": ["label", "href"],
      "properties": {
        "label": { "$ref": "#/$defs/LocalizedText" },
        "href": { "type": "string" },
        "target": { "type": "string", "enum": ["_self", "_blank"], "default": "_self" }
      },
      "x-editable": true
    }
  }
}
```

## 4. 页面 Schema 示例（按 pageKey）
说明：`required` 表示发布前必填；`x-editable` 表示后台可编辑；运行时回退统一 `zh`，但发布校验要求双语都存在。

### 4.1 home

```json
{
  "type": "object",
  "required": ["hero", "about", "advantages", "coreServices"],
  "properties": {
    "hero": {
      "type": "object",
      "required": ["title", "subtitle", "backgroundImage"],
      "properties": {
        "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true },
        "subtitle": { "$ref": "#/$defs/LocalizedText", "x-editable": true },
        "backgroundImage": { "$ref": "#/$defs/MediaRef", "x-editable": true }
      }
    },
    "about": {
      "type": "object",
      "required": ["title", "descriptions", "image", "cta"],
      "properties": {
        "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true },
        "descriptions": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/LocalizedRichText" },
          "x-editable": true
        },
        "image": { "$ref": "#/$defs/MediaRef", "x-editable": true },
        "cta": { "$ref": "#/$defs/Cta", "x-editable": true }
      }
    },
    "advantages": {
      "type": "object",
      "required": ["title", "cards"],
      "properties": {
        "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true },
        "cards": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": ["title", "titleEn", "description", "image"],
            "properties": {
              "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true },
              "titleEn": { "$ref": "#/$defs/LocalizedText", "x-editable": true },
              "description": { "$ref": "#/$defs/LocalizedRichText", "x-editable": true },
              "image": { "$ref": "#/$defs/MediaRef", "x-editable": true }
            }
          }
        }
      }
    },
    "coreServices": {
      "type": "object",
      "required": ["title", "items"],
      "properties": {
        "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true },
        "items": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": ["title", "description", "image", "cta"],
            "properties": {
              "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true },
              "description": { "$ref": "#/$defs/LocalizedRichText", "x-editable": true },
              "image": { "$ref": "#/$defs/MediaRef", "x-editable": true },
              "cta": { "$ref": "#/$defs/Cta", "x-editable": true }
            }
          }
        }
      }
    }
  }
}
```

### 4.2 about

```json
{
  "type": "object",
  "required": ["hero", "companyProfile", "blocks"],
  "properties": {
    "hero": { "type": "object", "properties": { "label": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "image": { "$ref": "#/$defs/MediaRef", "x-editable": true } } },
    "companyProfile": { "type": "object", "properties": { "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "description": { "$ref": "#/$defs/LocalizedRichText", "x-editable": true } } },
    "blocks": { "type": "array", "items": { "type": "object", "properties": { "layout": { "type": "string", "enum": ["imageLeft", "imageRight"], "x-editable": true }, "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "description": { "$ref": "#/$defs/LocalizedRichText", "x-editable": true }, "image": { "$ref": "#/$defs/MediaRef", "x-editable": true } } } }
  }
}
```

### 4.3 advantages

```json
{
  "type": "object",
  "required": ["hero", "blocks"],
  "properties": {
    "hero": { "type": "object", "properties": { "label": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "image": { "$ref": "#/$defs/MediaRef", "x-editable": true } } },
    "blocks": { "type": "array", "items": { "type": "object", "required": ["title", "description", "image"], "properties": { "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "description": { "$ref": "#/$defs/LocalizedRichText", "x-editable": true }, "image": { "$ref": "#/$defs/MediaRef", "x-editable": true } } } }
  }
}
```

### 4.4 core-services

```json
{
  "type": "object",
  "required": ["hero", "services"],
  "properties": {
    "hero": { "type": "object", "properties": { "label": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "image": { "$ref": "#/$defs/MediaRef", "x-editable": true } } },
    "services": { "type": "array", "items": { "type": "object", "required": ["title", "description", "image"], "properties": { "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "description": { "$ref": "#/$defs/LocalizedRichText", "x-editable": true }, "image": { "$ref": "#/$defs/MediaRef", "x-editable": true } } } }
  }
}
```

### 4.5 cases

```json
{
  "type": "object",
  "required": ["hero", "cases"],
  "properties": {
    "hero": { "type": "object", "properties": { "label": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "image": { "$ref": "#/$defs/MediaRef", "x-editable": true } } },
    "cases": { "type": "array", "items": { "type": "object", "required": ["title", "items"], "properties": { "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "items": { "type": "array", "items": { "$ref": "#/$defs/LocalizedRichText" }, "x-editable": true } } } }
  }
}
```

### 4.6 experts

```json
{
  "type": "object",
  "required": ["hero", "sectionTitle", "experts"],
  "properties": {
    "hero": { "type": "object", "properties": { "label": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "image": { "$ref": "#/$defs/MediaRef", "x-editable": true } } },
    "sectionTitle": { "$ref": "#/$defs/LocalizedText", "x-editable": true },
    "experts": { "type": "array", "items": { "type": "object", "required": ["id", "name", "title", "avatar", "bioParagraphs"], "properties": { "id": { "type": "string", "x-editable": false }, "name": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "avatar": { "$ref": "#/$defs/MediaRef", "x-editable": true }, "bioParagraphs": { "type": "array", "items": { "$ref": "#/$defs/LocalizedRichText" }, "x-editable": true } } } }
  }
}
```

### 4.7 contact

```json
{
  "type": "object",
  "required": ["hero", "form", "contactInfo"],
  "properties": {
    "hero": { "type": "object", "properties": { "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "subtitle": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "backgroundColor": { "type": "string", "x-editable": true } } },
    "form": { "type": "object", "properties": { "title": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "subtitle": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "fields": { "type": "array", "x-editable": true }, "submitLabel": { "$ref": "#/$defs/LocalizedText", "x-editable": true } } },
    "contactInfo": { "type": "object", "properties": { "phone": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "address": { "$ref": "#/$defs/LocalizedText", "x-editable": true } } }
  }
}
```

### 4.8 global

```json
{
  "type": "object",
  "required": ["branding", "nav", "footer"],
  "properties": {
    "branding": { "type": "object", "properties": { "logo": { "$ref": "#/$defs/MediaRef", "x-editable": true }, "companyName": { "$ref": "#/$defs/LocalizedText", "x-editable": true } } },
    "nav": { "type": "object", "properties": { "items": { "type": "array", "x-editable": true } } },
    "footer": { "type": "object", "properties": { "address": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "phone": { "$ref": "#/$defs/LocalizedText", "x-editable": true }, "links": { "type": "array", "x-editable": true }, "copyright": { "$ref": "#/$defs/LocalizedText", "x-editable": true } } }
  }
}
```

## 5. 存储模型

### 5.1 ContentDocument

```json
{
  "pageKey": "home",
  "draftConfig": {},
  "publishedConfig": {},
  "draftVersion": 12,
  "publishedVersion": 10,
  "updatedAt": "2026-02-13T00:00:00Z"
}
```

### 5.2 ContentVersion

```json
{
  "pageKey": "home",
  "version": 11,
  "configSnapshot": {},
  "changeNote": "更新首页 hero 与服务描述",
  "operator": "admin@company.com",
  "createdAt": "2026-02-13T00:00:00Z"
}
```

实现建议：
- SQLite：`draft_config`、`published_config`、`config_snapshot` 用 `TEXT`（JSON）
- PostgreSQL：对应字段用 `JSONB`

## 6. 后台多语言编辑规则

- 编辑界面：同字段双栏输入（`zh` 左、`en` 右），禁止“整页切语言再编辑”。
- 翻译状态：`done | missing | stale`
  - `missing`：任一必填语言为空
  - `stale`：`zh` 变更后，`en` 未确认同步
  - `done`：必填字段双语齐全且版本一致
- 状态传播：
  1. 当 `zh` 字段值变更时，目标字段 `en` 自动标记 `stale`
  2. 编辑者点击“确认翻译”或更新 `en` 后转为 `done`
- 发布门禁（同步发布）：存在 `missing/stale` 的必填字段时，阻止发布。

## 7. 前端消费约定

- 前端读取 `config` 后按当前语言取值：`value[locale]`
- 若运行时 `en` 缺失，允许回退 `zh`（仅兜底，不改变发布校验规则）
- 本阶段保留 `react-i18next` 作为兼容层，逐步由配置中心替换分散 key。
