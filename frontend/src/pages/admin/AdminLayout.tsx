import { Outlet, Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated && location.pathname !== "/admin/login") {
    return <Navigate to="/admin/login" replace />;
  }

  // Show login page without navigation frame
  if (location.pathname === "/admin/login") {
    return <Outlet />;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">
                印迹官网 - 管理后台
              </h1>
              <nav className="flex space-x-4">
                <Link
                  to="/admin/content"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.startsWith("/admin/content")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  内容管理
                </Link>
                <Link
                  to="/admin/media"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.startsWith("/admin/media")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  媒体管理
                </Link>
                <Link
                  to="/admin/articles"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.startsWith("/admin/articles")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  文章管理
                </Link>
                <Link
                  to="/admin/analytics"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.startsWith("/admin/analytics")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  访问统计
                </Link>
                <Link
                  to="/admin/audit-logs"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.startsWith("/admin/audit-logs")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  审计日志
                </Link>
                <Link
                  to="/admin/backups"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.startsWith("/admin/backups")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  数据备份
                </Link>
                <Link
                  to="/admin/pages"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.startsWith("/admin/pages")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  页面管理
                </Link>
                <Link
                  to="/admin/theme"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.startsWith("/admin/theme")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  主题设置
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.username || "管理员"}
              </span>
              <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                {user?.role === "admin" ? "管理员" : "编辑"}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
