export default function ContentPage() {
  const pages = [
    { key: "home", label: "首页" },
    { key: "about", label: "关于我们" },
    { key: "advantages", label: "优势" },
    { key: "core-services", label: "核心服务" },
    { key: "cases", label: "案例" },
    { key: "experts", label: "专家" },
    { key: "contact", label: "联系方式" },
    { key: "global", label: "全局配置" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">内容管理</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600 mb-4">选择要编辑的页面：</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pages.map((page) => (
            <button
              key={page.key}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
              onClick={() => {
                // Placeholder for future navigation to page editor
                alert(`编辑 ${page.label} - 功能即将推出`);
              }}
            >
              <div className="text-sm font-medium text-gray-900">
                {page.label}
              </div>
              <div className="text-xs text-gray-500 mt-1">{page.key}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
