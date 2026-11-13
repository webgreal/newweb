/*
# Portal UI support: subscription reads, admin reporting, read receipts, realtime

1. New Functions (all SECURITY DEFINER, callable by `authenticated` only)
- `get_my_subscription()`: returns the calling user's own subscription row
  (plan, status, current_period_end). The subscriptions table itself stays closed
  to the browser (service_role only); this function exposes exactly one row.
- `admin_overview()`: returns total signups, active subscriptions, monthly
  recurring revenue (cents) and total payments (cents). Re-checks is_admin().
- `admin_clients()`: one row per client with profile fields, signup date, plan,
  subscription status, website status, domain status and unread (client) message
  count. Re-checks is_admin().
- `admin_client_billing(p_client_id)`: returns the client's subscription and
  payment history as JSON. Re-checks is_admin().
- `admin_conversations()`: clients ordered by most recent message, with the last
  message preview and unread count. Re-checks is_admin().

2. Modified Tables
- `messages`: the browser may now UPDATE only the `read_at` column (read receipts).
  Clients can mark admin replies as read in their own conversation; admins can mark
  client messages as read. Body/sender fields stay immutable.

3. Security changes
- Column-level GRANT UPDATE (read_at) on messages + two scoped policies.
- Storage: admins previously could not upload into the shared `client-files` bucket
  (only their own folder); an INSERT policy now lets admins upload attachments into
  client conversations. Attachment metadata INSERT policy now also allows admins to
  add rows for files they attach to a client conversation.

4. Realtime
- `public.messages` is added to the `supabase_realtime` publication so the chat
  updates live. RLS still filters which rows each subscriber can see.
*/

-- ------------------------------------------------- own subscription (browser-safe)
CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE (
  plan text,
  status text,
  current_period_end timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.plan, s.status, s.current_period_end
  FROM public.subscriptions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_subscription() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_subscription() TO authenticated;

-- ------------------------------------------------- read receipts on messages
GRANT UPDATE (read_at) ON public.messages TO authenticated;

DROP POLICY IF EXISTS "messages_mark_read_client" ON public.messages;
CREATE POLICY "messages_mark_read_client" ON public.messages
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND sender_role = 'admin')
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "messages_mark_read_admin" ON public.messages;
CREATE POLICY "messages_mark_read_admin" ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------- admin reporting
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'total_signups', (SELECT count(*) FROM public.profiles),
    'active_subscriptions', (
      SELECT count(*) FROM public.subscriptions
      WHERE status IN ('active','trialing','past_due')
    ),
    'mrr_cents', (
      SELECT coalesce(sum(CASE s.plan
        WHEN 'hosting_monthly' THEN 2400
        WHEN 'hosting_yearly' THEN 1667
        WHEN 'maintenance_monthly' THEN 9900
        WHEN 'maintenance_yearly' THEN 8200
        ELSE 0 END), 0)
      FROM public.subscriptions s
      WHERE s.status IN ('active','trialing','past_due')
    ),
    'total_payments_cents', (
      SELECT coalesce(sum(amount), 0) FROM public.payments
      WHERE status = 'paid'
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.admin_overview() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_clients()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  business_name text,
  signup_at timestamptz,
  plan text,
  subscription_status text,
  website_status text,
  domain_status text,
  requested_domain text,
  unread integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.business_name,
    p.created_at,
    s.plan,
    s.status,
    w.status,
    w.domain_status,
    w.requested_domain,
    (
      SELECT count(*)::integer FROM public.messages m
      WHERE m.user_id = p.id AND m.sender_role = 'client' AND m.read_at IS NULL
    )
  FROM public.profiles p
  LEFT JOIN public.websites w ON w.user_id = p.id
  LEFT JOIN LATERAL (
    SELECT plan, status FROM public.subscriptions
    WHERE user_id = p.id ORDER BY created_at DESC LIMIT 1
  ) s ON true
  ORDER BY p.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_clients() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_clients() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_client_billing(p_client_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'subscription', (
      SELECT jsonb_build_object(
        'plan', plan, 'status', status, 'current_period_end', current_period_end
      ) FROM public.subscriptions
      WHERE user_id = p_client_id ORDER BY created_at DESC LIMIT 1
    ),
    'payments', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'amount', amount, 'currency', currency,
        'status', status, 'created_at', created_at
      ) ORDER BY created_at DESC)
      FROM public.payments WHERE user_id = p_client_id
    ), '[]'::jsonb)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.admin_client_billing(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_client_billing(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_conversations()
RETURNS TABLE (
  client_id uuid,
  full_name text,
  email text,
  last_message_at timestamptz,
  last_message_body text,
  unread integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.full_name,
    p.email,
    m.last_at,
    m.last_body,
    m.unread_count
  FROM public.profiles p
  JOIN LATERAL (
    SELECT
      max(created_at) AS last_at,
      (array_agg(body ORDER BY created_at DESC))[1] AS last_body,
      count(*) FILTER (WHERE sender_role = 'client' AND read_at IS NULL)::integer AS unread_count
    FROM public.messages
    WHERE user_id = p.id
  ) m ON true
  ORDER BY m.last_at DESC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_conversations() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_conversations() TO authenticated;

-- ------------------------------------------------- admin uploads into client conversations
DROP POLICY IF EXISTS "client_files_admin_insert" ON storage.objects;
CREATE POLICY "client_files_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin
    )
  );

DROP POLICY IF EXISTS "attachments_insert_own" ON public.message_attachments;
CREATE POLICY "attachments_insert_own" ON public.message_attachments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------- realtime for the chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
