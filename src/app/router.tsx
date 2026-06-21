import { Suspense } from 'react';
import { HashRouter, Navigate, Route, RouteObject, Routes, useRoutes } from 'react-router-dom';

import Loading from '~/components/Loading';
import { Head } from '~/components/shared/Head';
import SideBar from '~/components/SideBar';

import styles from '../App.module.scss';
import AboutPage from '../pages/AboutPage';
import BackendPage from '../pages/BackendPage';
import ConfigPage from '../pages/ConfigPage';
import ConnectionsPage from '../pages/ConnectionsPage';
import HomePage from '../pages/HomePage';
import LogsPage from '../pages/LogsPage';
import ProxiesPage from '../pages/ProxiesPage';
import RulesPage from '../pages/RulesPage';
import StyleGuidePage from '../pages/StyleGuidePage';

import APIDiscovery from './APIDiscovery';

const routes = [
  { path: '/', element: <Navigate to="/proxies" replace /> },
  { path: '/home', element: <HomePage /> },
  { path: '/connections', element: <ConnectionsPage /> },
  { path: '/configs', element: <ConfigPage /> },
  { path: '/logs', element: <LogsPage /> },
  { path: '/proxies', element: <ProxiesPage /> },
  { path: '/rules', element: <RulesPage /> },
  { path: '/about', element: <AboutPage /> },
  import.meta.env.DEV ? { path: '/style', element: <StyleGuidePage /> } : false,
].filter(Boolean) as RouteObject[];

function DashboardRouter() {
  return (
    <>
      <APIDiscovery />
      <SideBar />
      <div className={styles.content}>{useRoutes(routes)}</div>
    </>
  );
}

export function AppRouter() {
  return (
    <div className={styles.app}>
      <Head />
      <Suspense fallback={<Loading />}>
        <HashRouter>
          <Routes>
            <Route path="/backend" element={<BackendPage />} />
            <Route path="*" element={<DashboardRouter />} />
          </Routes>
        </HashRouter>
      </Suspense>
    </div>
  );
}
