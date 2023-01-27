import * as React from 'react';
import { QueryClientProvider } from 'react-query';
import { HashRouter as Router, Route, RouteObject, Routes, useRoutes } from 'react-router-dom';
import { RecoilRoot } from 'recoil';

import APIConfig from '~/components//APIConfig';
import { About } from '~/components/about/About';
import APIDiscovery from '~/components/APIDiscovery';
import ErrorBoundary from '~/components/ErrorBoundary';
import Home from '~/components/Home';
import Loading from '~/components/Loading';
import Loading2 from '~/components/Loading2';
import { Head } from '~/components/shared/Head';
import SideBar from '~/components/SideBar';
import StateProvider from '~/components/StateProvider';
import StyleGuide from '~/components/StyleGuide';
import { queryClient } from '~/misc/query';
import { actions, initialState } from '~/store';

import styles from './App.module.scss';

const { lazy, Suspense } = React;

const Connections = lazy(() => import('~/components/Connections'));
const Config = lazy(() => import('~/components/Config'));
const Logs = lazy(() => import('~/components/Logs'));
const Proxies = lazy(() => import('~/components/proxies/Proxies'));
const Rules = lazy(() => import('~/components/Rules'));

const routes = [
  { path: '/', element: <Home /> },
  { path: '/connections', element: <Connections /> },
  { path: '/configs', element: <Config /> },
  { path: '/logs', element: <Logs /> },
  { path: '/proxies', element: <Proxies /> },
  { path: '/rules', element: <Rules /> },
  { path: '/about', element: <About /> },
  process.env.NODE_ENV === 'development' ? { path: '/style', element: <StyleGuide /> } : false,
].filter(Boolean) as RouteObject[];

function SideBarApp() {
  return (
    <>
      <APIDiscovery />
      <SideBar />
      <div className={styles.content}>
        <Suspense fallback={<Loading2 />}>{useRoutes(routes)}</Suspense>
      </div>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <RecoilRoot>
      <StateProvider initialState={initialState} actions={actions}>
        <QueryClientProvider client={queryClient}>
          <div className={styles.app}>
            <Head />
            <Suspense fallback={<Loading />}>
              <Router>
                <Routes>
                  <Route path="/backend" element={<APIConfig />} />
                  <Route path="*" element={<SideBarApp />} />
                </Routes>
              </Router>
            </Suspense>
          </div>
        </QueryClientProvider>
      </StateProvider>
    </RecoilRoot>
  </ErrorBoundary>
);

export default App;
