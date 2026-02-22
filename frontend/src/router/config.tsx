
import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const HomePage = lazy(() => import('../pages/home/page'));
const AboutPage = lazy(() => import('../pages/about/page'));
const AdvantagesPage = lazy(() => import('../pages/advantages/page'));
const ExpertsPage = lazy(() => import('../pages/experts/page'));
const CasesPage = lazy(() => import('../pages/cases/page'));
const CoreServicesPage = lazy(() => import('../pages/core-services/page'));
const ContactPage = lazy(() => import('../pages/contact/page'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Admin routes
const AdminLayout = lazy(() => import('../pages/admin/AdminLayout'));
const AdminLoginPage = lazy(() => import('../pages/admin/login/page'));
const AdminContentPage = lazy(() => import('../pages/admin/content/page'));
const AdminContentEditorPage = lazy(() => import('../pages/admin/content/editor/page'));
const AdminMediaPage = lazy(() => import('../pages/admin/media/page'));
const AdminAnalyticsPage = lazy(() => import('../pages/admin/analytics/page'));
const AdminArticlesPage = lazy(() => import('../pages/admin/articles/page'));
const AdminArticleEditorPage = lazy(() => import('../pages/admin/articles/editor/page'));
const AdminCategoriesPage = lazy(() => import('../pages/admin/articles/categories/page'));
const AdminTagsPage = lazy(() => import('../pages/admin/articles/tags/page'));
const AdminAuditLogsPage = lazy(() => import('../pages/admin/audit-logs/page'));
const AdminBackupsPage = lazy(() => import('../pages/admin/backups/page'));
const AdminPagesPage = lazy(() => import('../pages/admin/pages/page'));
const AdminPageEditorPage = lazy(() => import('../pages/admin/pages/editor/page'));
const AdminThemePage = lazy(() => import('../pages/admin/theme/page'));

// Public blog routes
const BlogPage = lazy(() => import('../pages/blog/page'));
const BlogDetailPage = lazy(() => import('../pages/blog/[slug]/page'));

// Dynamic page (section-based rendering)
const DynamicPage = lazy(() => import('../theme/DynamicPage'));
const PublicLayout = lazy(() => import('../theme/layouts/PublicLayout'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/advantages',
    element: <AdvantagesPage />,
  },
  {
    path: '/experts',
    element: <ExpertsPage />,
  },
  {
    path: '/cases',
    element: <CasesPage />,
  },
  {
    path: '/core-services',
    element: <CoreServicesPage />,
  },
  {
    path: '/contact',
    element: <ContactPage />,
  },
  {
    path: '/blog',
    element: <BlogPage />,
  },
  {
    path: '/blog/:slug',
    element: <BlogDetailPage />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        path: 'login',
        element: <AdminLoginPage />,
      },
      {
        path: 'content',
        element: <AdminContentPage />,
      },
      {
        path: 'content/editor/:pageKey',
        element: <AdminContentEditorPage />,
      },
      {
        path: 'media',
        element: <AdminMediaPage />,
      },
      {
        path: 'analytics',
        element: <AdminAnalyticsPage />,
      },
      {
        path: 'articles',
        element: <AdminArticlesPage />,
      },
      {
        path: 'articles/new',
        element: <AdminArticleEditorPage />,
      },
      {
        path: 'articles/edit/:id',
        element: <AdminArticleEditorPage />,
      },
      {
        path: 'articles/categories',
        element: <AdminCategoriesPage />,
      },
      {
        path: 'articles/tags',
        element: <AdminTagsPage />,
      },
      {
        path: 'audit-logs',
        element: <AdminAuditLogsPage />,
      },
      {
        path: 'backups',
        element: <AdminBackupsPage />,
      },
      {
        path: 'pages',
        element: <AdminPagesPage />,
      },
      {
        path: 'pages/new',
        element: <AdminPageEditorPage />,
      },
      {
        path: 'pages/edit/:id',
        element: <AdminPageEditorPage />,
      },
      {
        path: 'theme',
        element: <AdminThemePage />,
      },
    ],
  },
  {
    path: '/p/*',
    element: <PublicLayout><DynamicPage /></PublicLayout>,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
