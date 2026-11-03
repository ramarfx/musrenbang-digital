import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { MusrenAIChat } from '@/features/musrenai/MusrenAIChat';

export default function MusrenAI() {
  const { user, loading } = useAuth();
  if (import.meta.env.VITE_MUSRENAI_ENABLED !== 'true')
    return <p>MusrenAI belum tersedia saat ini.</p>;
  if (loading) return <p role="status">Memeriksa sesi…</p>;
  if (!user)
    return (
      <p>
        Silakan{' '}
        <Link to="/login" className="underline">
          masuk
        </Link>{' '}
        untuk menggunakan MusrenAI.
      </p>
    );
  return <MusrenAIChat key={user.id} />;
}
