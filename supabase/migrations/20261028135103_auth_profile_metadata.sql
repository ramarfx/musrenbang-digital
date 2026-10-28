-- Nama tampilan berasal dari metadata Auth; peran selalu ditetapkan server.
-- Tidak mengubah profil yang sudah ada atau memberikan grants baru.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles(id, email, nama, peran)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::text || '@unknown.local'),
    COALESCE(
      CASE WHEN pg_catalog.jsonb_typeof(NEW.raw_user_meta_data -> 'nama') = 'string'
        THEN NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'nama', E' \t\n\r'), '') END,
      CASE WHEN pg_catalog.jsonb_typeof(NEW.raw_user_meta_data -> 'full_name') = 'string'
        THEN NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'full_name', E' \t\n\r'), '') END,
      CASE WHEN pg_catalog.jsonb_typeof(NEW.raw_user_meta_data -> 'name') = 'string'
        THEN NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'name', E' \t\n\r'), '') END,
      'Warga'
    ),
    'warga'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
