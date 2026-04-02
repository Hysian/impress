import { useState, useEffect, useRef } from "react";
import type { MenuItem } from "@/api/menus";
import { getCategories, getTags, getAdminArticles } from "@/api/articles";
import type { Category, Tag, Article } from "@/api/articles";
import { listUnifiedPages } from "@/api/unifiedPages";
import type { UnifiedPageItem } from "@/api/unifiedPages";
import MetadataEditor from "@/components/admin/MetadataEditor";
import type { TreeNode } from "./menuTreeUtils";
import { parentOptions } from "./menuTreeUtils";

// ── Type labels (shared) ──

const typeLabels: Record<string, string> = {
  custom_link: "链接",
  article: "文章",
  page: "页面",
  category: "分类",
  tag: "标签",
};

// ── Ref slug picker — searchable dropdown for category/tag/article/page ──

interface RefOption {
  slug: string;
  label: string; // display name (zhName or title)
}

function RefSlugPicker({
  type,
  value,
  onChange,
}: {
  type: MenuItem["type"];
  value: string;
  onChange: (slug: string) => void;
}) {
  const [options, setOptions] = useState<RefOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch options when type changes
  useEffect(() => {
    if (type === "custom_link") return;
    let cancelled = false;
    setLoading(true);
    const fetch = async () => {
      try {
        let opts: RefOption[] = [];
        if (type === "category") {
          const cats = await getCategories();
          opts = cats.map((c: Category) => ({ slug: c.slug, label: c.zhName || c.enName || c.slug }));
        } else if (type === "tag") {
          const tags = await getTags();
          opts = tags.map((t: Tag) => ({ slug: t.slug, label: t.zhName || t.enName || t.slug }));
        } else if (type === "article") {
          const res = await getAdminArticles(1, 200);
          opts = (res.items || []).map((a: Article) => ({ slug: a.slug, label: a.zhTitle || a.enTitle || a.slug }));
        } else if (type === "page") {
          const pages = await listUnifiedPages();
          opts = pages.map((p: UnifiedPageItem) => ({ slug: p.slug, label: p.zhTitle || p.enTitle || p.slug }));
        }
        if (!cancelled) setOptions(opts);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [type]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter options by query
  const q = query.toLowerCase();
  const filtered = q
    ? options.filter((o) => o.slug.toLowerCase().includes(q) || o.label.toLowerCase().includes(q))
    : options;

  // Find display label for current value
  const selectedLabel = options.find((o) => o.slug === value)?.label;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1">
        关联{typeLabels[type] || "内容"}
      </label>
      <div
        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus-within:ring-1 focus-within:ring-blue-400 focus-within:border-blue-400 flex items-center gap-1 cursor-pointer bg-white"
        onClick={() => setOpen(!open)}
      >
        {value ? (
          <span className="flex-1 truncate">
            <span className="text-gray-900">{selectedLabel || value}</span>
            <span className="text-gray-400 ml-1 text-xs">({value})</span>
          </span>
        ) : (
          <span className="flex-1 text-gray-400">
            {loading ? "加载中..." : "请选择..."}
          </span>
        )}
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-1.5 border-b border-gray-100">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
              placeholder="搜索名称或 slug..."
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {/* Options list */}
          <div className="overflow-y-auto max-h-48">
            {loading ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">加载中...</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                {q ? "无匹配结果" : "暂无数据"}
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.slug}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                    opt.slug === value ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.slug);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="text-xs text-gray-400 shrink-0">{opt.slug}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Menu item form ──

export interface MenuItemFormProps {
  mode: "new" | "edit";
  tree: TreeNode[];
  editingItemId: number | null;
  itemZhName: string;
  setItemZhName: (v: string) => void;
  itemEnName: string;
  setItemEnName: (v: string) => void;
  itemType: MenuItem["type"];
  setItemType: (v: MenuItem["type"]) => void;
  itemUrl: string;
  setItemUrl: (v: string) => void;
  itemRefSlug: string;
  setItemRefSlug: (v: string) => void;
  itemTarget: MenuItem["target"];
  setItemTarget: (v: MenuItem["target"]) => void;
  itemParentId: number | null;
  setItemParentId: (v: number | null) => void;
  itemSortOrder: number;
  setItemSortOrder: (v: number) => void;
  itemMetadata: Record<string, unknown>;
  setItemMetadata: (v: Record<string, unknown>) => void;
  savingItem: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function MenuItemForm({
  mode,
  tree,
  editingItemId,
  itemZhName,
  setItemZhName,
  itemEnName,
  setItemEnName,
  itemType,
  setItemType,
  itemUrl,
  setItemUrl,
  itemRefSlug,
  setItemRefSlug,
  itemTarget,
  setItemTarget,
  itemParentId,
  setItemParentId,
  itemSortOrder,
  setItemSortOrder,
  itemMetadata,
  setItemMetadata,
  savingItem,
  onSave,
  onCancel,
}: MenuItemFormProps) {
  const parentOpts = parentOptions(tree, editingItemId);

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-3 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-800">
        {mode === "new" ? "新建菜单项" : "编辑菜单项"}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">中文名称 *</label>
          <input
            type="text"
            value={itemZhName}
            onChange={(e) => setItemZhName(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
            placeholder="首页"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">English Name</label>
          <input
            type="text"
            value={itemEnName}
            onChange={(e) => setItemEnName(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
            placeholder="Home"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">类型</label>
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value as MenuItem["type"])}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
          >
            <option value="custom_link">自定义链接</option>
            <option value="article">文章</option>
            <option value="page">页面</option>
            <option value="category">分类</option>
            <option value="tag">标签</option>
          </select>
        </div>
        <div>
          {itemType === "custom_link" ? (
            <>
              <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
              <input
                type="text"
                value={itemUrl}
                onChange={(e) => setItemUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
                placeholder="/about"
              />
            </>
          ) : (
            <RefSlugPicker
              type={itemType}
              value={itemRefSlug}
              onChange={setItemRefSlug}
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">打开方式</label>
          <select
            value={itemTarget}
            onChange={(e) => setItemTarget(e.target.value as MenuItem["target"])}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
          >
            <option value="_self">当前页 (_self)</option>
            <option value="_blank">新窗口 (_blank)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">父级菜单</label>
          <select
            value={itemParentId ?? ""}
            onChange={(e) => setItemParentId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
          >
            <option value="">无（顶级菜单）</option>
            {parentOpts.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">排序值</label>
          <input
            type="number"
            value={itemSortOrder}
            onChange={(e) => setItemSortOrder(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
          />
        </div>
      </div>
      <details className="text-xs">
        <summary className="text-gray-400 cursor-pointer hover:text-gray-600">元数据（高级）</summary>
        <div className="mt-2">
          <MetadataEditor value={itemMetadata} onChange={setItemMetadata} />
        </div>
      </details>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={savingItem}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {savingItem ? "保存中..." : "保存"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 cursor-pointer"
        >
          取消
        </button>
      </div>
    </div>
  );
}
