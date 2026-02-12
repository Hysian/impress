import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { useState } from "react";

export default function AdminLayout() {
  const location = useLocation();
  const [isAuthenticated] = useState(() => {
    // Check if user has access token in localStorage
    return !!localStorage.getItem("accessToken");
  });

  // Redirect to login if not authenticated
  if (!isAuthenticated && location.pathname !== "/admin/login") {
    return <Navigate to="/admin/login" replace />;
  }

  // Show login page without navigation frame
  if (location.pathname === "/admin/login") {
    return <Outlet />;
  }

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
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {localStorage.getItem("username") || "管理员"}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("refreshToken");
                  localStorage.removeItem("username");
                  window.location.href = "/admin/login";
                }}
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
