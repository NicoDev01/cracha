-- Supabase Auth writes every login, token refresh and deletion into
-- auth.audit_log_entries, e-mail address included, and never prunes it. That
-- kept the addresses of deleted accounts indefinitely. A daily job now removes
-- entries of accounts that no longer exist and everything older than 30 days.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.purge_auth_audit_log()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_deleted integer;
begin
  delete from auth.audit_log_entries a
   where a.created_at < now() - interval '30 days'
      or (a.payload->>'actor_id' is not null
          and not exists (select 1 from auth.users u where u.id::text = a.payload->>'actor_id'));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke all on function public.purge_auth_audit_log() from public, anon, authenticated;
grant execute on function public.purge_auth_audit_log() to service_role;

select cron.schedule('purge-auth-audit-log', '17 3 * * *', $$select public.purge_auth_audit_log()$$);
