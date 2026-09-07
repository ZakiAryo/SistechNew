-- Allows Purchase Request records to reference a supplier selected from master data.
-- Existing document-number triggers already preserve manually entered values and
-- only generate a value when the corresponding number is blank.

alter table public.purchase_requests
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists purchase_requests_supplier_id_idx
  on public.purchase_requests using btree (supplier_id);
