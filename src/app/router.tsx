import { Suspense } from 'react';
import { HashRouter, Navigate, Route, RouteObject, Routes, useRoutes } from 'react-router-dom';

import SideBar from '~/app/SideBar';
import { Head } from '~/components/shared/Head';
import Loading from '~/components/shared/Loading';

import styles from '../App.module.scss';
import BackendPage from '../pages/BackendPage';
import ConfigPage from '../pages/ConfigPage';
import ConnectionsPage from '../pages/ConnectionsPage';
import HomePage from '../pages/HomePage';
import LogsPage from '../pages/LogsPage';
import ProxiesPage from '../pages/ProxiesPage';
import RulesPage from '../pages/RulesPage';
import StyleGuidePage from '../pages/StyleGuidePage';

import APIDiscoveryContainer from './APIDiscoveryContainer';

const routes = [
  { path: '/', element: <Navigate to="/proxies" replace /> },
  { path: '/home', element: <HomePage /> },
  { path: '/connections', element: <ConnectionsPage /> },
  { path: '/configs', element: <ConfigPage /> },
  { path: '/logs', element: <LogsPage /> },
  { path: '/proxies', element: <ProxiesPage /> },
  { path: '/rules', element: <RulesPage /> },
  import.meta.env.DEV ? { path: '/style', element: <StyleGuidePage /> } : false,
].filter(Boolean) as RouteObject[];

function DashboardRouter() {
  const page = useRoutes(routes);
  return (
    <>
      <APIDiscoveryContainer />
      <SideBar />
      {/* 页面数据在等后端时只挂起内容区，侧边栏要留着能点，才能切到别的后端 */}
      <div className={styles.content}>
        <Suspense fallback={<Loading />}>{page}</Suspense>
      </div>
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
