import { useSectionRegistry } from "@/plugins/hooks";

export default function SectionPicker({
  onSelect,
  onClose,
}: {
  onSelect: (type: string) => void;
  onClose: () => void;
}) {
  const { metas: sectionMetas } = useSectionRegistry();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">添加区块</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sectionMetas.map((meta) => (
            <button
              key={meta.type}
              onClick={() => onSelect(meta.type)}
              className="flex flex-col items-start p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-900">
                {meta.labelZh}
              </span>
              <span className="text-xs text-gray-500">{meta.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
