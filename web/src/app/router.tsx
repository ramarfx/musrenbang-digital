import { PageLoader } from '@/components/ui/PageLoader';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAdmin, RequireAuth } from '@/features/auth';
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RouteError } from '@/routes/RouteError';

const Beranda = lazy(() => import('@/routes/Beranda'));
const Bandingkan = lazy(() => import('@/routes/Bandingkan'));
const Apbd = lazy(() => import('@/routes/Apbd'));
const Simulator = lazy(() => import('@/routes/Simulator'));
const BuatUsulan = lazy(() => import('@/routes/BuatUsulan'));
const UsulanDetail = lazy(() => import('@/routes/UsulanDetail'));
const Auth = lazy(() => import('@/routes/Auth'));
const Admin = lazy(() => import('@/routes/Admin'));
const Metodologi = lazy(() => import('@/routes/Metodologi'));
const NotFound = lazy(() => import('@/routes/NotFound'));

function page(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(<Beranda />) },
      { path: 'bandingkan', element: page(<Bandingkan />) },
      { path: 'apbd', element: page(<Apbd />) },
      { path: 'simulator', element: page(<Simulator />) },
      { path: 'metodologi', element: page(<Metodologi />) },
      {
        path: 'usulan/baru',
        element: page(
          <RequireAuth>
            <BuatUsulan />
          </RequireAuth>,
        ),
      },
      { path: 'usulan/:id', element: page(<UsulanDetail />) },
      { path: 'login', element: page(<Auth />) },
      {
        path: 'admin',
        element: page(
          <RequireAdmin>
            <Admin />
          </RequireAdmin>,
        ),
      },
      { path: '*', element: page(<NotFound />) },
    ],
  },
]);
