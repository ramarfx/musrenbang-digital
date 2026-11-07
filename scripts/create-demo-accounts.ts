import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Membuat 20 akun warga dummy untuk demo lomba. Nama berakhiran D1 sampai D20 dan email
 * memakai domain `.test`, yang dicadangkan dan tidak pernah bisa menerima email. Akun langsung
 * terkonfirmasi, jadi tidak ada email yang dikirim. Profil dibuat otomatis oleh trigger
 * `auth.users` dari metadata `nama`, dengan peran `warga`.
 *
 * Aman dijalankan ulang: email yang sudah terdaftar dilewati. Kata sandi tidak pernah dicetak.
 */
const DEMO_ACCOUNTS = [
  { nama: 'Arkana Wiratama D1', email: 'arkana.d1@demo.test' },
  { nama: 'Nayla Kirana Putri D2', email: 'nayla.d2@demo.test' },
  { nama: 'Bima Satria Mahendra D3', email: 'bima.d3@demo.test' },
  { nama: 'Aurelia Sekar Ayu D4', email: 'aurelia.d4@demo.test' },
  { nama: 'Raka Adhitya Pranaja D5', email: 'raka.d5@demo.test' },
  { nama: 'Kirana Larasati D6', email: 'kirana.d6@demo.test' },
  { nama: 'Dimas Arya Pradipta D7', email: 'dimas.d7@demo.test' },
  { nama: 'Alesha Nawang Wulan D8', email: 'alesha.d8@demo.test' },
  { nama: 'Gilang Rizky Ramadhan D9', email: 'gilang.d9@demo.test' },
  { nama: 'Tiara Ayunda Maheswari D10', email: 'tiara.d10@demo.test' },
  { nama: 'Rafandra Kusuma D11', email: 'rafandra.d11@demo.test' },
  { nama: 'Salsabila Anindya D12', email: 'salsabila.d12@demo.test' },
  { nama: 'Elang Samudra D13', email: 'elang.d13@demo.test' },
  { nama: 'Cinta Laras Asmara D14', email: 'cinta.d14@demo.test' },
  { nama: 'Danendra Bagaskara D15', email: 'danendra.d15@demo.test' },
  { nama: 'Zahra Kamila D16', email: 'zahra.d16@demo.test' },
  { nama: 'Bayu Anggara Putra D17', email: 'bayu.d17@demo.test' },
  { nama: 'Kayla Puspita Sari D18', email: 'kayla.d18@demo.test' },
  { nama: 'Arjuna Mahardika D19', email: 'arjuna.d19@demo.test' },
  { nama: 'Shafira Dewi Anjani D20', email: 'shafira.d20@demo.test' },
];

const parsed = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
    DEMO_PASSWORD: z.string().min(12, 'minimal 12 karakter'),
  })
  .safeParse(process.env);
if (!parsed.success) {
  const kurang = parsed.error.issues.map((issue) => `${issue.path.join('.')} (${issue.message})`);
  console.error(`Root .env belum lengkap: ${kurang.join(', ')}`);
  process.exit(1);
}
const env = parsed.data;

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const terdaftar = new Set<string>();
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error('Gagal membaca daftar akun:', error.message);
    process.exit(1);
  }
  for (const user of data.users) if (user.email) terdaftar.add(user.email.toLowerCase());
  if (data.users.length < 200) break;
}

let dibuat = 0;
for (const akun of DEMO_ACCOUNTS) {
  if (terdaftar.has(akun.email)) {
    console.log(`Lewati, sudah ada: ${akun.nama}`);
    continue;
  }
  const { error } = await supabase.auth.admin.createUser({
    email: akun.email,
    password: env.DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { nama: akun.nama },
  });
  if (error) {
    console.error(`Gagal membuat ${akun.nama}: ${error.message}`);
    process.exit(1);
  }
  dibuat += 1;
  console.log(`Dibuat: ${akun.nama} <${akun.email}>`);
}
console.log(`Selesai: ${dibuat} akun baru, ${DEMO_ACCOUNTS.length - dibuat} sudah ada.`);
