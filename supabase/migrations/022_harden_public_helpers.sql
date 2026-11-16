-- Keep policy helpers deterministic and trigger functions out of the Data API.
-- Trigger execution is independent of the caller's EXECUTE privilege.
begin;

alter function public.is_ornova_staff() set search_path = '';

revoke all on function public.record_inquiry_status_event() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

commit;
