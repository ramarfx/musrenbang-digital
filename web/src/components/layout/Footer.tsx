import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-stone-500">
        <p>Musrenbang Digital — prototipe partisipasi warga, bukan sistem pemerintah.</p>
        <nav className="flex gap-4" aria-label="Navigasi footer">
          <Link to="/apbd" className="hover:text-emerald-800">
            Sumber APBD
          </Link>
          <Link to="/bandingkan" className="hover:text-emerald-800">
            Gap Warga-APBD
          </Link>
        </nav>
      </div>
    </footer>
  );
}
