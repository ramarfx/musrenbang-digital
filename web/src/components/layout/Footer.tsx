import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="px-4 pb-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-2 border-t border-rule pt-6 text-sm text-muted">
        <p>Musrenbang Digital adalah prototipe partisipasi warga, bukan sistem pemerintah.</p>
        <nav className="flex gap-4" aria-label="Navigasi footer">
          <Link to="/apbd" className="hover:text-ink">
            Sumber APBD
          </Link>
          <Link to="/bandingkan" className="hover:text-ink">
            Gap Warga-APBD
          </Link>
        </nav>
      </div>
    </footer>
  );
}
