-- Ringkasan aspirasi warga tanpa AI. Semua angka dihitung di database dari usulan yang
-- sudah Disetujui, suara pada usulan itu, dan alokasi anggaran warga. Kalimat ringkasan
-- dirangkai dari angka yang sama, jadi tidak ada angka yang bisa dikarang model.
--
-- Hanya agregat per kategori yang keluar: tidak ada ID, judul, nama, atau baris individual.
-- Pola sama dengan v_public_stats: fungsi privat SECURITY DEFINER dan view invoker.
CREATE FUNCTION private.aspiration_overview()
RETURNS TABLE (
  kategori text,
  jumlah_usulan bigint,
  persen_usulan numeric,
  peringkat_usulan bigint,
  jumlah_suara bigint,
  persen_suara numeric,
  total_alokasi bigint,
  persen_alokasi numeric,
  total_usulan_disetujui bigint,
  ringkasan text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH usulan AS (
    SELECT p.kategori, count(*)::bigint AS n
    FROM public.proposals p
    WHERE p.moderasi = 'Disetujui'
    GROUP BY p.kategori
  ),
  suara AS (
    SELECT p.kategori, count(*)::bigint AS n
    FROM public.votes v
    JOIN public.proposals p ON p.id = v.proposal_id
    WHERE p.moderasi = 'Disetujui'
    GROUP BY p.kategori
  ),
  alokasi AS (
    SELECT a.kategori, COALESCE(sum(a.jumlah), 0)::bigint AS n
    FROM public.allocations a
    GROUP BY a.kategori
  ),
  base AS (
    SELECT
      c.nama,
      COALESCE(u.n, 0) AS u,
      COALESCE(s.n, 0) AS s,
      COALESCE(l.n, 0) AS l
    FROM public.categories c
    LEFT JOIN usulan u ON u.kategori = c.nama
    LEFT JOIN suara s ON s.kategori = c.nama
    LEFT JOIN alokasi l ON l.kategori = c.nama
  ),
  tot AS (
    SELECT sum(u)::bigint AS tu, sum(s)::bigint AS ts, sum(l)::bigint AS tl FROM base
  ),
  top_usulan AS (
    SELECT b.nama, b.u, (SELECT count(*) FROM base x WHERE x.u = b.u)::bigint AS seri
    FROM base b ORDER BY b.u DESC, b.nama LIMIT 1
  ),
  top_alokasi AS (
    SELECT b.nama, b.l FROM base b ORDER BY b.l DESC, b.nama LIMIT 1
  ),
  kalimat AS (
    SELECT
      CASE WHEN t.tu = 0 THEN 'Belum ada usulan warga yang disetujui.'
        WHEN tu.seri > 1 THEN format(
          'Usulan warga yang disetujui tersebar merata: %s kategori sama-sama terbanyak (masing-masing %s dari %s usulan).',
          tu.seri,
          tu.u,
          t.tu
        )
        ELSE format(
          '%s usulan warga yang disetujui mengenai %s (%s%% dari %s usulan).',
          CASE WHEN tu.u * 2 > t.tu THEN 'Mayoritas' ELSE 'Terbanyak' END,
          tu.nama,
          replace(round(tu.u * 100.0 / t.tu, 1)::text, '.', ','),
          t.tu
        )
      END
      || CASE WHEN t.tl = 0 THEN ''
        ELSE format(
          ' Dalam pembagian anggaran, warga paling banyak menempatkan dana di %s (%s%%).',
          ta.nama,
          replace(round(ta.l * 100.0 / t.tl, 1)::text, '.', ',')
        )
      END AS teks
    FROM tot t, top_usulan tu, top_alokasi ta
  )
  SELECT
    b.nama,
    b.u,
    CASE WHEN t.tu > 0 THEN round(b.u * 100.0 / t.tu, 1) ELSE 0 END,
    rank() OVER (ORDER BY b.u DESC),
    b.s,
    CASE WHEN t.ts > 0 THEN round(b.s * 100.0 / t.ts, 1) ELSE 0 END,
    b.l,
    CASE WHEN t.tl > 0 THEN round(b.l * 100.0 / t.tl, 1) ELSE 0 END,
    t.tu,
    k.teks
  FROM base b
  CROSS JOIN tot t
  CROSS JOIN kalimat k
  ORDER BY b.u DESC, b.nama;
$$;
REVOKE ALL ON FUNCTION private.aspiration_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.aspiration_overview() TO anon, authenticated;

CREATE OR REPLACE VIEW public.v_aspiration_overview
WITH (security_invoker = true, security_barrier = true)
AS
SELECT * FROM private.aspiration_overview();
REVOKE ALL ON public.v_aspiration_overview FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_aspiration_overview TO anon, authenticated;
COMMENT ON VIEW public.v_aspiration_overview IS
  'Ringkasan aspirasi per kategori: usulan disetujui, suara, dan alokasi warga beserta persentasenya. Dihitung di SQL tanpa AI, tanpa identitas warga.';
