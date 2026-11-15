-- Let message authors supply only the request, identity, role, and body.
-- Database-generated IDs and timestamps keep customers from forging chronology.
revoke insert on table public.inquiry_messages from public, anon, authenticated;
revoke insert (id, inquiry_id, author_user_id, author_role, body, created_at)
  on table public.inquiry_messages from public, anon, authenticated;

grant insert (inquiry_id, author_user_id, author_role, body)
  on table public.inquiry_messages to authenticated;
