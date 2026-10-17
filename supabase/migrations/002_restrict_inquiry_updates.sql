-- Customer inquiries are immutable from the client side.
-- Status and internal workflow fields must only be changed by a future server-side admin layer.
drop policy if exists "inquiries_update_own" on public.inquiries;
