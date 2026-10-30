import { registerSchema } from '@musrenbang/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth, useUpdateProfileNameMutation } from '@/features/auth';
import { useProposalsQuery } from '@/features/proposals/queries';
import { formatAngka, formatTanggal } from '@/lib/format';

function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/);
  return ((kata[0]?.[0] ?? '') + (kata[1]?.[0] ?? '')).toUpperCase() || 'W';
}

/**
 * Halaman Profil: identitas akun, ganti nama, ringkasan usulan, dan tombol keluar. Hanya nama yang
 * boleh diubah dari sini; email dan peran dijaga database (trigger dan RLS).
 */
export default function Profil() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const mutation = useUpdateProfileNameMutation(user?.id ?? null);
  const proposalsQuery = useProposalsQuery();

  const namaSekarang = profile?.nama ?? '';
  const [nama, setNama] = useState(namaSekarang);
  const [galat, setGalat] = useState<string | undefined>();
  const [keluar, setKeluar] = useState(false);

  const milikku = (proposalsQuery.data ?? []).filter(
    (proposal) => user !== null && proposal.pengusul_id === user.id,
  );
  const totalUpvote = milikku.reduce((jumlah, proposal) => jumlah + proposal.jumlah_suara, 0);
  const berubah = nama.trim() !== namaSekarang;

  const simpan = (event: FormEvent) => {
    event.preventDefault();
    const hasil = registerSchema.shape.nama.safeParse(nama);
    if (!hasil.success) {
      setGalat(hasil.error.issues[0]?.message ?? 'Nama tidak valid.');
      return;
    }
    setGalat(undefined);
    mutation.mutate(hasil.data, {
      onSuccess: (baru) => {
        setNama(baru.nama);
        toast.success('Nama sudah disimpan.');
      },
    });
  };

  const handleKeluar = async () => {
    setKeluar(true);
    try {
      await signOut();
      toast.success('Kamu sudah keluar.');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal keluar.');
      setKeluar(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description="Data akunmu. Nama bisa kamu ubah; email dan peran diatur oleh sistem."
      />

      <Card className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-16 flex-none place-items-center rounded-full bg-hijau-terang text-xl font-bold text-hitam"
        >
          {inisial(namaSekarang || user?.email || 'Warga')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{namaSekarang || 'Warga'}</p>
          <p className="truncate text-sm text-muted">{profile?.email ?? user?.email}</p>
          <p className="mt-1 text-[13px] text-muted">
            {isAdmin ? 'Admin' : 'Warga'}
            {profile && ` · bergabung ${formatTanggal(profile.dibuat_pada)}`}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Ubah nama</h2>
          <form className="mt-4 space-y-4" noValidate onSubmit={simpan}>
            <Field
              label="Nama"
              htmlFor="profil-nama"
              error={galat ?? mutation.error?.message}
              hint="Nama ini tampil di usulan dan komentarmu."
              required
            >
              <Input
                id="profil-nama"
                value={nama}
                autoComplete="name"
                invalid={Boolean(galat ?? mutation.error)}
                onChange={(event) => {
                  setNama(event.target.value);
                  setGalat(undefined);
                  mutation.reset();
                }}
              />
            </Field>
            <Button type="submit" isLoading={mutation.isPending} disabled={!berubah || !profile}>
              Simpan nama
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Keikutsertaanmu</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-active px-4 py-3">
              <dt className="text-[13px] text-muted">Usulan</dt>
              <dd className="text-2xl font-bold tabular-nums">{formatAngka(milikku.length)}</dd>
            </div>
            <div className="rounded-2xl bg-active px-4 py-3">
              <dt className="text-[13px] text-muted">Upvote diterima</dt>
              <dd className="text-2xl font-bold tabular-nums">{formatAngka(totalUpvote)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link to="/usulan-saya" className={buttonClass('outline', 'sm')}>
              Lihat usulan saya
            </Link>
            <Link to="/simulator" className={buttonClass('outline', 'sm')}>
              Buka simulator
            </Link>
          </div>
        </Card>
      </div>

      <div>
        <Button variant="outline" isLoading={keluar} onClick={handleKeluar}>
          Keluar dari akun
        </Button>
      </div>
    </div>
  );
}
