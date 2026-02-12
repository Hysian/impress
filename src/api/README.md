# Public Content Data Access Layer

This module provides a reusable API client and React hook for fetching published page content from the backend.

## Overview

The public content data access layer consists of:

1. **API Client** (`src/api/publicContent.ts`): Core functions for fetching and normalizing public content
2. **React Hook** (`src/hooks/usePublicContent.ts`): Custom hook for React components with state management
3. **Examples** (`src/api/publicContent.examples.tsx`): Usage examples and patterns

## Features

- ✅ Reusable hook/client fetches page config by pageKey and locale
- ✅ Error and loading states are handled consistently
- ✅ Locale fallback policy is applied without mutating source data
- ✅ Type-safe with TypeScript
- ✅ Support for both normalized and raw config access
- ✅ Conditional fetching and manual refetch support

## API Client

### `fetchPublicContent(pageKey, locale)`

Fetches published content for a specific page and locale.

```typescript
import { fetchPublicContent } from "@/api/publicContent";

const response = await fetchPublicContent("home", "zh");
// Returns: { pageKey: "home", version: 10, locale: "zh", config: {...} }
```

### `getLocalizedText(text, locale)`

Applies locale fallback to a LocalizedText object without mutation.

```typescript
import { getLocalizedText } from "@/api/publicContent";

const text = { zh: "你好", en: "" };
const result = getLocalizedText(text, "en");
// Returns: "你好" (falls back to zh when en is missing)
```

### `normalizeConfigForLocale(config, locale)`

Recursively applies locale selection to a config object, replacing LocalizedText objects with locale-selected strings.

```typescript
import { normalizeConfigForLocale } from "@/api/publicContent";

const config = {
  hero: {
    title: { zh: "欢迎", en: "Welcome" },
    subtitle: { zh: "副标题", en: "Subtitle" }
  }
};

const normalized = normalizeConfigForLocale(config, "en");
// Returns: { hero: { title: "Welcome", subtitle: "Subtitle" } }
```

## React Hook

### `usePublicContent(pageKey, options)`

Custom hook for fetching public page content with locale support.

#### Options

- `locale` (default: `"zh"`): Target locale for content
- `autoNormalize` (default: `true`): Whether to automatically normalize LocalizedText objects
- `enabled` (default: `true`): Whether to fetch on mount

#### Returns

- `loading`: Loading state (boolean)
- `error`: Error state (PublicContentError | null)
- `config`: Page configuration data (normalized or raw based on autoNormalize)
- `response`: Full API response (includes version, pageKey, locale, raw config)
- `refetch`: Function to manually refetch content

### Basic Usage

```typescript
import { usePublicContent } from "@/hooks/usePublicContent";

function HomePage() {
  const { loading, error, config } = usePublicContent("home", {
    locale: "zh",
    autoNormalize: true
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!config) return null;

  const hero = config.hero as { title: string; subtitle: string };
  return <h1>{hero.title}</h1>;
}
```

### Without Auto-Normalization

```typescript
function HomePage() {
  const { loading, error, response } = usePublicContent("home", {
    locale: "en",
    autoNormalize: false
  });

  if (loading || error || !response) return null;

  const hero = response.config.hero as {
    title: { zh: string; en: string };
  };

  return <h1>{hero.title[response.locale]}</h1>;
}
```

### Manual Refetch

```typescript
function HomePage() {
  const { config, refetch } = usePublicContent("home");

  return (
    <div>
      <div>{JSON.stringify(config)}</div>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Conditional Fetching

```typescript
function HomePage({ shouldLoad }: { shouldLoad: boolean }) {
  const { loading, config } = usePublicContent("home", {
    enabled: shouldLoad
  });

  if (!shouldLoad) return <div>Disabled</div>;
  if (loading) return <div>Loading...</div>;

  return <div>{JSON.stringify(config)}</div>;
}
```

## Locale Fallback Policy

According to `docs/data-model.md`:

- **Runtime fallback**: If the requested locale (e.g., `en`) is missing or empty, the system falls back to `zh`
- **No mutation**: The source data is never modified; fallback is applied during normalization
- **Publish validation**: Backend still requires both `zh` and `en` for required fields before publishing

The `getLocalizedText` and `normalizeConfigForLocale` functions implement this fallback policy.

## Error Handling

Errors follow the backend error structure:

```typescript
interface PublicContentError {
  code: string;
  message: string;
  details?: unknown;
}
```

Common error codes:
- `NOT_FOUND`: Page or version not found (404)
- `NETWORK_ERROR`: Network or connectivity issue
- `UNKNOWN_ERROR`: Other API errors

## Supported Page Keys

- `home`
- `about`
- `advantages`
- `core-services`
- `cases`
- `experts`
- `contact`
- `global`

## Integration with Backend

This layer integrates with the backend public content API:

**Endpoint**: `GET /public/content/{pageKey}?locale=zh|en`

**Response**:
```json
{
  "pageKey": "home",
  "version": 10,
  "locale": "zh",
  "config": { ... }
}
```

**Notes**:
- Only returns `publishedConfig` (draft data is never exposed)
- Backend implements locale-based filtering according to `docs/api-spec.md`
- Frontend normalization layer ensures safe fallback behavior

## Next Steps

The next feature (FE-106) will migrate core public pages (home, about, advantages, core-services) to use this data access layer for config-driven rendering.
