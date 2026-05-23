insert into public.customers (customer_code, name, email, phone, address, contact_person, status)
values
  ('CUST-001', 'PT Nusantara Energi', 'procurement@nusantara-energi.co.id', '+62 21 555 0101', 'Jakarta Selatan', 'Andi Pratama', 'active'),
  ('CUST-002', 'PT Prima Teknologi Industri', 'operations@prima-tech.co.id', '+62 22 555 0202', 'Bandung', 'Maya Lestari', 'active'),
  ('CUST-003', 'PT Samudra Karya Mandiri', 'info@samudrakarya.co.id', '+62 31 555 0303', 'Surabaya', 'Budi Santoso', 'active')
on conflict (customer_code) do update
set name = excluded.name,
    email = excluded.email,
    phone = excluded.phone,
    address = excluded.address,
    contact_person = excluded.contact_person,
    status = excluded.status;

insert into public.suppliers (supplier_code, name, email, phone, address, contact_person, status)
values
  ('SUP-001', 'CV Teknik Abadi', 'sales@teknikabadi.co.id', '+62 21 555 1101', 'Bekasi', 'Rina Wijaya', 'active'),
  ('SUP-002', 'PT Global Instrumentasi', 'support@globalinstrumentasi.co.id', '+62 24 555 1202', 'Semarang', 'Dimas Nugroho', 'active'),
  ('SUP-003', 'PT Cipta Mekanik Solusi', 'admin@ciptamekanik.co.id', '+62 31 555 1303', 'Sidoarjo', 'Sari Rahma', 'active')
on conflict (supplier_code) do update
set name = excluded.name,
    email = excluded.email,
    phone = excluded.phone,
    address = excluded.address,
    contact_person = excluded.contact_person,
    status = excluded.status;

insert into public.cost_codes (code, name, description, category, status)
values
  ('ENG-100', 'Engineering Design', 'Design, drawing, and engineering documentation', 'Engineering', 'active'),
  ('MAT-200', 'Material Procurement', 'Project materials and purchased components', 'Purchasing', 'active'),
  ('FIN-300', 'Project Finance', 'Invoice, payment, and project finance control', 'Finance', 'active')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    status = excluded.status;

insert into public.projects (project_code, project_name, customer_id, description, status, start_date, end_date)
values
  (
    'PRJ-001',
    'Automation Panel Upgrade',
    (select id from public.customers where customer_code = 'CUST-001'),
    'Upgrade control panel for production line automation.',
    'planning',
    '2026-06-01',
    '2026-08-30'
  ),
  (
    'PRJ-002',
    'Instrumentation Maintenance',
    (select id from public.customers where customer_code = 'CUST-002'),
    'Preventive maintenance for field instrumentation.',
    'active',
    '2026-05-15',
    '2026-07-15'
  ),
  (
    'PRJ-003',
    'Electrical Installation Package',
    (select id from public.customers where customer_code = 'CUST-003'),
    'Electrical installation and commissioning package.',
    'planning',
    '2026-07-01',
    '2026-10-15'
  )
on conflict (project_code) do update
set project_name = excluded.project_name,
    customer_id = excluded.customer_id,
    description = excluded.description,
    status = excluded.status,
    start_date = excluded.start_date,
    end_date = excluded.end_date;
