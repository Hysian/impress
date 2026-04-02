import { useSectionRegistry } from "@/plugins/hooks";
import type { SectionData } from "@/theme/types";

export default function SectionListItem({
  section,
  index,
  total,
  isSelected,
  isComposable,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  dragHandlers,
}: {
  section: SectionData;
  index: number;
  total: number;
  isSelected: boolean;
  isComposable: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  dragHandlers: {
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
}) {
  const { metas: sectionMetas } = useSectionRegistry();
  const meta = sectionMetas.find((m) => m.type === section.type);
  const label = meta?.labelZh || section.type;
  const locked = !!section.locked;
  const draggable = isComposable && !locked;

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? dragHandlers.onDragStart : undefined}
      onDragOver={draggable ? dragHandlers.onDragOver : undefined}
      onDrop={draggable ? dragHandlers.onDrop : undefined}
      onDragEnd={draggable ? dragHandlers.onDragEnd : undefined}
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer select-none border transition-colors ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {/* drag grip or lock icon */}
      {locked ? (
        <span className="text-gray-400 text-xs" title="模板锁定">&#128274;</span>
      ) : draggable ? (
        <span className="text-gray-400 cursor-grab text-xs" title="拖拽排序">&#x2630;</span>
      ) : (
        <span className="text-gray-300 text-xs">&#x2630;</span>
      )}

      {/* index + label */}
      <span className="flex-1 text-sm text-gray-800 truncate">
        <span className="text-gray-400 mr-1">{index + 1}.</span>
        {label}
      </span>

      {/* up / down / delete — only for composable & unlocked */}
      {isComposable && !locked && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={index === 0}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs px-1"
            title="上移"
          >&#9650;</button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={index === total - 1}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs px-1"
            title="下移"
          >&#9660;</button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-gray-400 hover:text-red-600 text-sm px-1"
            title="删除"
          >&times;</button>
        </>
      )}
    </div>
  );
}
