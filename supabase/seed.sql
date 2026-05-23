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

insert into public.contracts (contract_number, project_id, customer_id, contract_title, contract_value, contract_date, start_date, end_date, status, document_url)
values
  (
    'CTR-001',
    (select id from public.projects where project_code = 'PRJ-001'),
    (select id from public.customers where customer_code = 'CUST-001'),
    'Automation Panel Upgrade Contract',
    450000000,
    '2026-05-20',
    '2026-06-01',
    '2026-08-30',
    'active',
    'https://example.com/contracts/ctr-001'
  ),
  (
    'CTR-002',
    (select id from public.projects where project_code = 'PRJ-002'),
    (select id from public.customers where customer_code = 'CUST-002'),
    'Instrumentation Maintenance Agreement',
    185000000,
    '2026-05-01',
    '2026-05-15',
    '2026-07-15',
    'active',
    'https://example.com/contracts/ctr-002'
  ),
  (
    'CTR-003',
    (select id from public.projects where project_code = 'PRJ-003'),
    (select id from public.customers where customer_code = 'CUST-003'),
    'Electrical Installation Package Contract',
    620000000,
    '2026-06-12',
    '2026-07-01',
    '2026-10-15',
    'draft',
    'https://example.com/contracts/ctr-003'
  )
on conflict (contract_number) do update
set project_id = excluded.project_id,
    customer_id = excluded.customer_id,
    contract_title = excluded.contract_title,
    contract_value = excluded.contract_value,
    contract_date = excluded.contract_date,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    status = excluded.status,
    document_url = excluded.document_url;

insert into public.project_cost_codes (project_id, cost_code_id, budget_amount, actual_amount, status)
values
  (
    (select id from public.projects where project_code = 'PRJ-001'),
    (select id from public.cost_codes where code = 'ENG-100'),
    120000000,
    65000000,
    'active'
  ),
  (
    (select id from public.projects where project_code = 'PRJ-001'),
    (select id from public.cost_codes where code = 'MAT-200'),
    250000000,
    180000000,
    'active'
  ),
  (
    (select id from public.projects where project_code = 'PRJ-002'),
    (select id from public.cost_codes where code = 'FIN-300'),
    45000000,
    15000000,
    'active'
  )
on conflict (project_id, cost_code_id) do update
set budget_amount = excluded.budget_amount,
    actual_amount = excluded.actual_amount,
    status = excluded.status;

insert into public.project_budgets (project_id, cost_code_id, fiscal_year, budget_amount, actual_amount, notes)
values
  (
    (select id from public.projects where project_code = 'PRJ-001'),
    (select id from public.cost_codes where code = 'ENG-100'),
    2026,
    120000000,
    65000000,
    'Engineering design budget.'
  ),
  (
    (select id from public.projects where project_code = 'PRJ-001'),
    (select id from public.cost_codes where code = 'MAT-200'),
    2026,
    250000000,
    180000000,
    'Procurement budget.'
  ),
  (
    (select id from public.projects where project_code = 'PRJ-003'),
    (select id from public.cost_codes where code = 'MAT-200'),
    2026,
    410000000,
    0,
    'Electrical installation material budget.'
  )
on conflict (project_id, cost_code_id, fiscal_year) do update
set budget_amount = excluded.budget_amount,
    actual_amount = excluded.actual_amount,
    notes = excluded.notes;

insert into public.purchase_requests (pr_number, project_id, status, request_date, needed_date, priority, item_summary, estimated_amount, notes)
values
  (
    'PR-001',
    (select id from public.projects where project_code = 'PRJ-001'),
    'pending',
    '2026-05-23',
    '2026-06-15',
    'high',
    'PLC panel components and wiring accessories',
    125000000,
    'Required for automation panel upgrade.'
  ),
  (
    'PR-002',
    (select id from public.projects where project_code = 'PRJ-002'),
    'processed',
    '2026-05-22',
    '2026-06-10',
    'normal',
    'Calibration tools and replacement sensors',
    58000000,
    'Maintenance package.'
  ),
  (
    'PR-003',
    (select id from public.projects where project_code = 'PRJ-003'),
    'approved',
    '2026-05-21',
    '2026-07-01',
    'normal',
    'Cable tray and electrical accessories',
    210000000,
    'Initial procurement for installation.'
  )
on conflict (pr_number) do update
set project_id = excluded.project_id,
    status = excluded.status,
    request_date = excluded.request_date,
    needed_date = excluded.needed_date,
    priority = excluded.priority,
    item_summary = excluded.item_summary,
    estimated_amount = excluded.estimated_amount,
    notes = excluded.notes;

insert into public.purchase_orders (po_number, purchase_request_id, supplier_id, project_id, status, payment_status, delivery_status, order_date, total_amount)
values
  (
    'PO-001',
    (select id from public.purchase_requests where pr_number = 'PR-002'),
    (select id from public.suppliers where supplier_code = 'SUP-002'),
    (select id from public.projects where project_code = 'PRJ-002'),
    'approved',
    'unpaid',
    'waiting',
    '2026-05-24',
    58000000
  ),
  (
    'PO-002',
    (select id from public.purchase_requests where pr_number = 'PR-003'),
    (select id from public.suppliers where supplier_code = 'SUP-003'),
    (select id from public.projects where project_code = 'PRJ-003'),
    'delivered',
    'partial',
    'delivered',
    '2026-05-24',
    210000000
  )
on conflict (po_number) do update
set purchase_request_id = excluded.purchase_request_id,
    supplier_id = excluded.supplier_id,
    project_id = excluded.project_id,
    status = excluded.status,
    payment_status = excluded.payment_status,
    delivery_status = excluded.delivery_status,
    order_date = excluded.order_date,
    total_amount = excluded.total_amount;

insert into public.delivery_orders (do_number, purchase_order_id, delivery_date, status, notes)
values
  (
    'DO-001',
    (select id from public.purchase_orders where po_number = 'PO-002'),
    '2026-05-25',
    'delivered',
    'Material received by project team.'
  )
on conflict (do_number) do update
set purchase_order_id = excluded.purchase_order_id,
    delivery_date = excluded.delivery_date,
    status = excluded.status,
    notes = excluded.notes;
