
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
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
