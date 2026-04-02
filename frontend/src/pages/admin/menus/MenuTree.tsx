import { useState } from "react";
import type { MenuItem } from "@/api/menus";
import type { TreeNode } from "./menuTreeUtils";

// ── Type badge ──

const typeLabels: Record<string, string> = {
  custom_link: "链接",
  article: "文章",
  page: "页面",
  category: "分类",
  tag: "标签",
};

const typeColors: Record<string, string> = {
  custom_link: "bg-blue-50 text-blue-600",
  article: "bg-green-50 text-green-600",
  page: "bg-purple-50 text-purple-600",
  category: "bg-yellow-50 text-yellow-700",
  tag: "bg-pink-50 text-pink-600",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${typeColors[type] || "bg-gray-100 text-gray-600"}`}>
      {typeLabels[type] || type}
    </span>
  );
}

// ── Tree item row ──

export default function TreeItemRow({
  node,
  depth,
  siblings,
  siblingIndex,
  onEdit,
  onDelete,
  onAddChild,
  onSwap,
  onToggleVisible,
  editingItemId,
  renderForm,
}: {
  node: TreeNode;
  depth: number;
  siblings: TreeNode[];
  siblingIndex: number;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onAddChild: (parentId: number) => void;
  onSwap: (siblings: TreeNode[], a: number, b: number) => void;
  onToggleVisible: (item: MenuItem) => void;
  editingItemId: number | null;
  renderForm: () => React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.treeChildren.length > 0;
  const isFirst = siblingIndex === 0;
  const isLast = siblingIndex === siblings.length - 1;

  if (editingItemId === node.id) {
    return (
      <div style={{ paddingLeft: depth * 28 }}>
        {renderForm()}
      </div>
    );
  }

  return (
    <>
      <div
        className="group flex items-center gap-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: depth * 28 + 4 }}
      >
        {/* Collapse toggle / tree indicator */}
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {hasChildren ? (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${collapsed ? "" : "rotate-90"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          )}
        </div>

        {/* Reorder arrows */}
        <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => !isFirst && onSwap(siblings, siblingIndex, siblingIndex - 1)}
            disabled={isFirst}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-20 leading-none cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => !isLast && onSwap(siblings, siblingIndex, siblingIndex + 1)}
            disabled={isLast}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-20 leading-none cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Item info */}
        <div className={`flex-1 min-w-0 flex items-center gap-2 ${node.visible === false ? "opacity-50" : ""}`}>
          <span className="text-sm text-gray-900 font-medium truncate">{node.zhName}</span>
          {node.enName && (
            <span className="text-xs text-gray-400 truncate">{node.enName}</span>
          )}
          <TypeBadge type={node.type} />
          {node.visible === false && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-medium">隐藏</span>
          )}
          <span className="text-xs text-gray-300 truncate hidden sm:inline">
            {node.type === "custom_link" ? node.url : node.refSlug || ""}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleVisible(node)}
            className={`px-1.5 py-0.5 text-[11px] rounded cursor-pointer ${
              node.visible === false
                ? "text-gray-400 hover:text-green-600 hover:bg-green-50"
                : "text-green-600 hover:text-gray-400 hover:bg-gray-50"
            }`}
            title={node.visible === false ? "显示" : "隐藏"}
          >
            {node.visible === false ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
          <button
            onClick={() => onAddChild(node.id)}
            className="px-1.5 py-0.5 text-[11px] text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
            title="添加子菜单"
          >
            + 子级
          </button>
          <button
            onClick={() => onEdit(node)}
            className="px-1.5 py-0.5 text-[11px] text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
          >
            编辑
          </button>
          <button
            onClick={() => onDelete(node)}
            className="px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50 rounded cursor-pointer"
          >
            删除
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && !collapsed && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute top-0 bottom-2 border-l border-gray-200"
            style={{ left: depth * 28 + 14 }}
          />
          {node.treeChildren.map((child, ci) => (
            <TreeItemRow
              key={child.id}
              node={child}
              depth={depth + 1}
              siblings={node.treeChildren}
              siblingIndex={ci}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onSwap={onSwap}
              onToggleVisible={onToggleVisible}
              editingItemId={editingItemId}
              renderForm={renderForm}
            />
          ))}
        </div>
      )}
    </>
  );
}
