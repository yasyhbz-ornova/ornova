-- The catalog item guard runs as a trigger; clients must not call it as an RPC.
begin;

revoke all on function public.catalog_inquiry_item_guard() from public, anon, authenticated;

commit;
