import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAdmin, RequireAuth } from '@/features/auth';
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RouteError } from '@/routes/RouteError';

const Landing = lazy(() => import('@/routes/Landing'));
const Beranda = lazy(() => import('@/routes/Beranda'));
const UsulanWarga = lazy(() => import('@/routes/UsulanWarga'));
const Hasilmu = lazy(() => import('@/routes/Hasilmu'));
const Bandingkan = lazy(() => import('@/routes/Bandingkan'));
const Apbd = lazy(() => import('@/routes/Apbd'));
const Simulator = lazy(() => import('@/routes/Simulator'));
const BuatUsulan = lazy(() => import('@/routes/BuatUsulan'));
const UsulanDetail = lazy(() => import('@/routes/UsulanDetail'));
const Auth = lazy(() => import('@/routes/Auth'));
const Admin = lazy(() => import('@/routes/Admin'));
const Metodologi = lazy(() => import('@/routes/Metodologi'));
const UsulanSaya = lazy(() => import('@/routes/UsulanSaya'));
const Profil = lazy(() => import('@/routes/Profil'));
const NotFound = lazy(() => import('@/routes/NotFound'));

function page(element: ReactNode) {
  // Layar sambutan menutupi muatan pertama; setelah itu halaman cukup kosong sesaat.
  return <Suspense fallback={null}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  // Landing berdiri sendiri tanpa sidebar; halaman aplikasi lain memakai AppLayout.
  { path: '/', element: page(<Landing />), errorElement: <RouteError /> },
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { path: 'beranda', element: page(<Beranda />) },
      { path: 'bandingkan', element: page(<Bandingkan />) },
      { path: 'apbd', element: page(<Apbd />) },
      { path: 'simulator', element: page(<Simulator />) },
      { path: 'usulan', element: page(<UsulanWarga />) },
      {
        path: 'hasilmu',
        element: page(
          <RequireAuth>
            <Hasilmu />
          </RequireAuth>,
        ),
      },
      { path: 'metodologi', element: page(<Metodologi />) },
      {
        path: 'usulan/baru',
        element: page(
          <RequireAuth>
            <BuatUsulan />
          </RequireAuth>,
        ),
      },
      {
        path: 'usulan-saya',
        element: page(
          <RequireAuth>
            <UsulanSaya />
          </RequireAuth>,
        ),
      },
      {
        path: 'profil',
        element: page(
          <RequireAuth>
            <Profil />
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
