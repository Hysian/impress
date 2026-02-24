import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  exact?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navGroups: NavGroup[] = [
  {
    items: [
      {
        label: "仪表盘",
        path: "/admin",
        exact: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "内容",
    items: [
      {
        label: "内容管理",
        path: "/admin/content",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        label: "页面管理",
        path: "/admin/pages",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        ),
      },
      {
        label: "文章管理",
        path: "/admin/articles",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2zM16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
          </svg>
        ),
      },
      {
        label: "媒体管理",
        path: "/admin/media",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "系统",
    items: [
      {
        label: "主题管理",
        path: "/admin/theme",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        ),
      },
      {
        label: "访问统计",
        path: "/admin/analytics",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        label: "审计日志",
        path: "/admin/audit-logs",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
      },
      {
        label: "数据备份",
        path: "/admin/backups",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        ),
      },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.path;
  }
  return pathname.startsWith(item.path);
}

function SidebarContent({ collapsed, onToggle, onMobileClose }: {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
}) {
  const location = useLocation();

  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="h-14 flex items-center px-4 border-b border-gray-700 shrink-0">
        {collapsed ? (
          <span className="text-lg font-bold text-blue-400 mx-auto">印</span>
        ) : (
          <span className="text-lg font-bold text-blue-400 truncate">印迹管理后台</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex} className={groupIndex > 0 ? "mt-4" : ""}>
            {group.label && !collapsed && (
              <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.label}
              </div>
            )}
            {group.label && collapsed && (
              <div className="border-t border-gray-700 mx-2 mb-2" />
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(location.pathname, item);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center rounded-md transition-colors duration-150 ${
                      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                    } ${
                      active
                        ? "bg-blue-600/20 text-blue-400 border-l-3 border-blue-400"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <span className="ml-3 text-sm font-medium truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-gray-700 p-2 shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2.5 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white transition-colors duration-150"
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AdminSidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 left-0 h-screen bg-gray-900 text-white z-20 transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarContent collapsed={collapsed} onToggle={onToggle} />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="absolute top-0 left-0 h-full w-64 bg-gray-900 text-white shadow-xl">
            <SidebarContent collapsed={false} onToggle={onToggle} onMobileClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}
