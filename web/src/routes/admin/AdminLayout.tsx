import { Outlet } from 'react-router-dom';

/** Bingkai route admin. Guard akses dipasang di router, bukan di sini. */
export default function AdminLayout() {
  return <Outlet />;
}
