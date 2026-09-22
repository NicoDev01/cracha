-- Configure this function as Auth > Hooks > Before User Created after deployment.
-- Unlike the form hint this is enforced for direct Supabase signups as well.
create or replace function public.before_user_created(event jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare domain text := lower(split_part(event->'user'->>'email','@',2));
begin
  if domain = any(array['mailinator.com','guerrillamail.com','tempmail.com','10minutemail.com',
    'yopmail.com','trashmail.com','throwawaymail.com','sharklasers.com','dispostable.com',
    'getairmail.com','fakemailgenerator.com','temp-mail.org','burnermail.io','dropmail.me','guerrillamailblock.com']) then
    return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','Bitte verwende eine dauerhafte E-Mail-Adresse.'));
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.before_user_created(jsonb) from public,anon,authenticated;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;
