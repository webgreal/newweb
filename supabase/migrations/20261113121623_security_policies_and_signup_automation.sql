/*
# Webgreal client portal - security, policies and signup automation

1. Helper function
- `public.is_admin()`: SECURITY DEFINER, returns the calling user's profiles.is_admin.
  Used by policies so admin checks never recurse into RLS. Executable by `authenticated` only.

2. Security changes (RLS enabled on every table, see previous migration)
- profiles: SELECT own rows or admin; UPDATE own rows but the column-level GRANT only covers
  full_name, phone, business_name - is_admin/email/id cannot be changed from the browser.
  No INSERT/DELETE: rows are created only by the signup trigger.
- websites: SELECT own or admin; UPDATE own but the GRANT only covers requested_domain and
  domain_type - status, domain, domain_status, notes are admin-only. No INSERT/DELETE.
- messages: SELECT own or admin; clients INSERT only sender_role='client' into their own
  conversation; admins INSERT sender_role='admin' for any client. No UPDATE/DELETE.
- message_attachments: SELECT own or admin; INSERT own. No UPDATE/DELETE.
- contact_submissions: anyone may INSERT; only admins may SELECT.
- subscriptions + payments: NO grants/policies for anon or authenticated - service_role only.
- `admin_update_website()`: SECURITY DEFINER function for admins to change the admin-only
  website columns (website_name, status, domain, domain_status, notes). It re-checks
  is_admin internally and is callable by `authenticated` only.

3. Automation
- Trigger `on_auth_user_created` on `auth.users` runs `handle_new_user()` (SECURITY DEFINER):
  creates the `profiles` row and a `websites` row (website_name = business name,
  requested_domain and domain_type from signup metadata, domain_status = pending_check,
  status = waiting_details).
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---------------------------------------------------------------- policies
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "websites_select" ON public.websites;
CREATE POLICY "websites_select" ON public.websites
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "websites_update_own" ON public.websites;
CREATE POLICY "websites_update_own" ON public.websites
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "messages_insert_client" ON public.messages;
CREATE POLICY "messages_insert_client" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_role = 'client' AND user_id = auth.uid() AND sender_id = auth.uid());

DROP POLICY IF EXISTS "messages_insert_admin" ON public.messages;
CREATE POLICY "messages_insert_admin" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_role = 'admin' AND public.is_admin());

DROP POLICY IF EXISTS "attachments_select" ON public.message_attachments;
CREATE POLICY "attachments_select" ON public.message_attachments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "attachments_insert_own" ON public.message_attachments;
CREATE POLICY "attachments_insert_own" ON public.message_attachments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contact_insert_anyone" ON public.contact_submissions;
CREATE POLICY "contact_insert_anyone" ON public.contact_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "contact_select_admin" ON public.contact_submissions;
CREATE POLICY "contact_select_admin" ON public.contact_submissions
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------- grants
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, business_name) ON public.profiles TO authenticated;

GRANT SELECT ON public.websites TO authenticated;
GRANT UPDATE (requested_domain, domain_type) ON public.websites TO authenticated;

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT, INSERT ON public.message_attachments TO authenticated;

GRANT INSERT ON public.contact_submissions TO anon, authenticated;
GRANT SELECT ON public.contact_submissions TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO service_role;

-- ---------------------------------------------------------------- admin write path
CREATE OR REPLACE FUNCTION public.admin_update_website(
  p_id uuid,
  p_website_name text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_domain text DEFAULT NULL,
  p_domain_status text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.websites SET
    website_name = coalesce(p_website_name, website_name),
    status = coalesce(p_status, status),
    domain = coalesce(p_domain, domain),
    domain_status = coalesce(p_domain_status, domain_status),
    notes = coalesce(p_notes, notes),
    updated_at = now()
  WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_website(uuid, text, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_website(uuid, text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------- signup automation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m jsonb := new.raw_user_meta_data;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, business_name)
  VALUES (
    new.id,
    new.email,
    coalesce(m->>'full_name', ''),
    coalesce(m->>'phone', ''),
    coalesce(m->>'business_name', '')
  );

  INSERT INTO public.websites (user_id, website_name, requested_domain, domain_type, domain_status, status)
  VALUES (
    new.id,
    coalesce(m->>'business_name', ''),
    nullif(m->>'requested_domain', ''),
    coalesce(m->>'domain_type', 'new'),
    'pending_check',
    'waiting_details'
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
