import { useState } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom';
import { TutorialAwal } from '@/components/tutorial/TutorialAwal';
import { useAuth } from '@/features/auth';
import { sudahLihatTutorial, tandaiTutorialSelesai } from '@/lib/tutorial';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  // Saat menu HP terbuka, isi halaman dibuat inert supaya Tab dan pembaca layar
  // tidak masuk ke konten yang tertutup panel menu.
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Id akun yang tutorialnya baru ditutup, supaya tidak muncul lagi sebelum halaman dimuat ulang.
  const [tutorialDitutup, setTutorialDitutup] = useState<string | null>(null);
  const tampilTutorial =
    user !== null && tutorialDitutup !== user.id && !sudahLihatTutorial(user.id);
  return (
    <div className="min-h-dvh bg-ground text-ink lg:flex">
      <a
        inert={menuOpen}
        href="#isi"
        className="sr-only z-50 rounded-xl bg-ink px-4 py-2 text-on-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Lewati ke isi
      </a>
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <Sidebar />
      <div inert={menuOpen} className="flex min-w-0 flex-1 flex-col">
        <main id="isi" className="w-full flex-1 px-4 pt-5 pb-10 sm:px-6 lg:px-10 lg:pt-8">
          <div className="mx-auto max-w-[1160px]">
            {/* Kunci pada alamat: setiap pindah halaman, isi baru memudar masuk. */}
            <div key={location.pathname} className="anim-page">
              <Outlet />
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <ScrollRestoration />
      {tampilTutorial && (
        <TutorialAwal
          onSelesai={(tujuan) => {
            tandaiTutorialSelesai(user.id);
            setTutorialDitutup(user.id);
            if (tujuan) navigate(tujuan);
          }}
        />
      )}
    </div>
  );
}
