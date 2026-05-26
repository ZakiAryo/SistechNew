# SISTECH

SISTECH adalah ERP modern dari SISTECH. Versi ini memakai Next.js App Router, Supabase Auth, Supabase PostgreSQL, Row Level Security, dan Tailwind CSS. Project ini tidak memakai PHP, MySQL, XAMPP, PDO, atau hasil konversi mentah dari file PHP lama.

## Tech Stack

- Next.js App Router
- React
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- Tailwind CSS
- Vercel deployment target

## Cara Install

```bash
npm install
```

## Setup Supabase

1. Buat project baru di Supabase.
2. Buka Supabase Dashboard.
3. Masuk ke SQL Editor.
4. Jalankan file SQL dengan urutan berikut:

```text
supabase/schema.sql
supabase/policies.sql
supabase/seed.sql
supabase/demo-users.sql
```

Urutan ini penting karena `policies.sql` membutuhkan table dari `schema.sql`, dan `seed.sql` membutuhkan table yang sudah tersedia. Jalankan `demo-users.sql` setelah user dibuat di Supabase Authentication.

## Environment Variables

Buat file `.env.local` di root project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Aturan:

- `NEXT_PUBLIC_SUPABASE_URL` boleh dipakai client.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` boleh dipakai client.
- `SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai server-side.
- Tahap 1 belum memakai service role key di browser maupun client component.

## Run Local

```bash
npm run dev
```

Default URL:

```text
http://localhost:3000
```

## Cara Tambah Admin User

Jangan insert password ke table public.

1. Buka Supabase Dashboard.
2. Masuk ke Authentication.
3. Buat user baru dengan email dan password.
4. Setelah user dibuat, trigger `handle_new_auth_user` akan membuat row di `public.profiles`.
5. Buka SQL Editor dan set role user menjadi admin:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@company.com';
```

Setelah role admin aktif, user tersebut bisa insert, update, dan delete master data sesuai RLS policy awal.

## Database Files

- `supabase/schema.sql`: extension, table, index, updated_at trigger, profile trigger dari Supabase Auth.
- `supabase/policies.sql`: RLS enablement dan policy awal.
- `supabase/seed.sql`: dummy data untuk customers, suppliers, projects, dan cost codes.
- `supabase/demo-users.sql`: update role untuk akun demo setelah dibuat di Supabase Auth.
- `docs/SISTECH_WORKFLOW.md`: desain relasi, hak akses role, menu, workflow, dan status approval.

## RLS Policy Awal

Policy awal dibuat konservatif:

- Authenticated users bisa read master data.
- Admin bisa insert, update, delete master data.
- User hanya bisa read profile sendiri.
- Admin bisa manage profiles.
- Notifications dibatasi ke owner atau admin.

TODO: role-specific workflow policy untuk marketing, purchasing, finance, dan engineering akan dibuat saat modul transaksi mulai diimplementasikan.

## Deploy ke Vercel

1. Push project ke Git provider.
2. Import project di Vercel.
3. Set Root Directory ke:

```text
./
```

Jika repo berisi beberapa folder, pilih folder:

```text
sistech-next
```

4. Install command:

```bash
npm install
```

5. Build command:

```bash
npm run build
```

6. Isi Environment Variables di Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

7. Deploy.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Yang Belum Selesai

- Modul Marketing penuh.
- Modul Engineering penuh.
- Modul Purchasing penuh.
- Modul Finance penuh.
- Reports penuh.
- Notifications workflow.
- User management UI penuh.
- Role-based policy detail per modul.
- Audit log dan attachment/document handling.
