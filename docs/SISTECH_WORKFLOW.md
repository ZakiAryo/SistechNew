# SISTECH Workflow Architecture

Dokumen ini menjelaskan desain Tahap 2: multi-role, sidebar dinamis, dashboard per role, workflow antar divisi, status approval, report realtime, export, dan audit log.

## 1. Struktur Database Relasional

Core identity:

- `auth.users`: dikelola Supabase Auth.
- `profiles`: data profil aplikasi dan role user.

Master data:

- `customers`
- `suppliers`
- `projects`
- `cost_codes`

Marketing & Sales:

- `contracts`: kontrak customer, relasi ke `projects` dan `customers`.
- `project_cost_codes`: mapping `projects` ke `cost_codes`.
- `project_budgets`: budget vs actual per project dan cost code.

Engineering & Project:

- `purchase_requests`: PR berbasis project.
- `purchase_request_items`: item PR detail.

Purchasing:

- `purchase_orders`: PO dari PR, relasi ke supplier, project, dan purchase request.
- `purchase_order_items`: item PO detail.
- `delivery_orders`: delivery order dari PO.

Finance & Accounting:

- `account_payables`: AP dari approved PO.
- `account_receivables`: AR dari invoice customer/project.
- `cash_bank_transactions`: transaksi cash dan bank.
- `accounting_entries`: jurnal/laporan accounting.
- `invoices`: invoice project/customer.

System:

- `notifications`: notifikasi user atau target role.
- `audit_logs`: log aktivitas user.

## 2. Hak Akses Role

Admin:

- Akses semua menu.
- Manage master data.
- Manage semua workflow.
- Melihat audit log.

Marketing:

- Dashboard Marketing.
- Input customer, project customer, project cost code, project budget, contract customer.
- Report data customer, cost control, list contract.
- Tidak melihat menu Engineering, Purchasing, Finance.

Engineering:

- Dashboard Engineering.
- Input Purchase Request berdasarkan project.
- Report PR outstanding.
- PR otomatis terlihat oleh Purchasing.

Purchasing:

- Dashboard Purchasing.
- Melihat incoming PR dari Engineering.
- Convert PR menjadi PO.
- Input/update PO.
- Delivery Order.
- PO vs Payment.

Finance:

- Dashboard Finance.
- Menerima PO approved/delivered/paid dari Purchasing.
- Account Payable, Account Receivable, Cash & Bank.
- Update payment status.
- AP Aging, AR Aging, Reconcile Bank, Accounting Report, Tax Report.

User:

- Dashboard terbatas.
- Notifications.

## 3. Flow Antar Divisi

1. Marketing & Sales membuat customer, project, budget, cost code allocation, dan contract.
2. Engineering & Project melihat data project lalu membuat Purchase Request.
3. Purchase Request masuk otomatis ke Purchasing melalui table `purchase_requests` dan notification target role `purchasing`.
4. Purchasing memproses PR menjadi Purchase Order.
5. Saat PO dibuat, Delivery Order awal ikut dibuat dan PO otomatis masuk report PO vs Payment.
6. Jika PO status `approved`, `delivered`, atau `paid`, Finance melihat data tersebut di Account Payable.
7. Finance memproses pembayaran, mengubah payment status PO, membuat AP, cash bank transaction, dan accounting entry.
8. Reports membaca data realtime dari table transaksi masing-masing divisi.

## 4. Struktur Menu/Sidebar Tiap Role

Marketing:

- Dashboard
- Data Project Customer
- Project Cost Code List
- Project Cost Budget
- Contract Customer
- Data Customer
- Project Cost Control
- List of Contract
- Reports
- Notifications

Engineering:

- Dashboard
- Input Purchase Request
- PR List Outstanding
- Reports
- Notifications

Purchasing:

- Dashboard
- Incoming PR
- Input Purchase Order
- PO List Outstanding
- Delivery Order
- PO vs Payment
- Reports
- Notifications

Finance:

- Dashboard
- Account Payable
- Account Receivable
- Cash & Bank
- List AP Aging
- List AR Aging
- Reconcile Bank
- Accounting Report
- Tax Report
- Reports
- Notifications

Admin:

- Semua menu role.
- Master Data.
- Users.
- Audit Logs.

## 5. Desain Dashboard Modern

Dashboard memakai:

- Sidebar kiri role-based.
- Topbar dengan profile dan logout.
- Card statistik per role.
- Tabel responsive.
- Search/filter di table.
- Empty state dan loading state.
- Export PDF/Excel di report.

Dashboard Marketing:

- Data Project Customer.
- Project Cost Code List.
- Project Cost Budget.
- Customer Contract.

Dashboard Engineering:

- Project Data.
- All Purchase Requests.
- Pending PR.
- Processed PR.

Dashboard Purchasing:

- Incoming PR.
- Purchase Orders.
- Delivery Orders.
- PO vs Payment.

Dashboard Finance:

- Account Payable.
- Account Receivable.
- Cash & Bank.
- Accounting Entries.

## 6. Tabel Input dan Output Modul

Marketing input:

- `customers`
- `projects`
- `project_cost_codes`
- `project_budgets`
- `contracts`

Marketing output/report:

- Data Customer.
- Project Cost Control.
- List of Contract.

Engineering input:

- `purchase_requests`

Engineering output/report:

- PR Outstanding.

Purchasing input:

- `purchase_orders`
- `delivery_orders`

Purchasing output/report:

- Incoming PR.
- PO Outstanding.
- PO vs Payment.

Finance input:

- `account_payables`
- `account_receivables`
- `cash_bank_transactions`

Finance output/report:

- AP Aging.
- AR Aging.
- Reconcile Bank.
- Accounting Report.
- Tax Report.

## 7. Status dan Workflow Approval

Purchase Request:

- `pending`: dibuat Engineering, menunggu Purchasing.
- `processed`: sudah dikonversi menjadi PO.
- `approved`: sudah disetujui saat proses PO.

Purchase Order:

- `waiting`: PO dibuat, belum approved.
- `approved`: PO siap masuk Finance.
- `delivered`: barang/jasa diterima.
- `paid`: pembayaran selesai.

Delivery Order:

- `waiting`
- `approved`
- `delivered`
- `paid`

Payment:

- `unpaid`
- `partial`
- `paid`

## 8. Demo Accounts

Supabase Auth tetap menjadi sumber password. Buat user berikut di Supabase Authentication, lalu jalankan `supabase/demo-users.sql`:

- `admin@sistech.local`
- `marketing@sistech.local`
- `engineering@sistech.local`
- `purchasing@sistech.local`
- `finance@sistech.local`
- `user@sistech.local`

Password dibuat di Supabase Auth, bukan di table public.
