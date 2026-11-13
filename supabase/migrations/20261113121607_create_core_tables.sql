/*
# Webgreal client portal - core tables

1. New Tables
- `profiles`: one row per user (id = auth user id), email, full_name, phone, business_name,
  is_admin (default false), created_at.
- `subscriptions`: Stripe subscription mirror per user. plan is one of hosting_monthly,
  hosting_yearly, maintenance_monthly, maintenance_yearly. Browser has NO access.
- `websites`: one website per client with workflow status (default waiting_details),
  domain_type (existing/new), domain_status (default pending_check), requested_domain, notes.
- `payments`: Stripe invoice mirror per user. Browser has NO access.
- `messages`: conversation rows; user_id is the client the conversation belongs to, sender_role
  is 'client' or 'admin', sender_id defaults to the calling user, body nullable, read_at nullable.
- `message_attachments`: metadata for files in the private `client-files` bucket.
- `contact_submissions`: public contact form entries.

2. Indexes on user_id and message lookups.

3. Notes: RLS, grants, policies and the signup automation are applied in the next migration
   once all tables exist.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL CHECK (plan IN ('hosting_monthly','hosting_yearly','maintenance_monthly','maintenance_yearly')),
  status text NOT NULL,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'waiting_details' CHECK (status IN ('waiting_details','in_design','in_development','testing','client_review','live')),
  domain text,
  requested_domain text,
  domain_type text NOT NULL DEFAULT 'new' CHECK (domain_type IN ('existing','new')),
  domain_status text NOT NULL DEFAULT 'pending_check' CHECK (domain_status IN ('pending_check','available','unavailable','registered','connected')),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id text,
  amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('client','admin')),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_websites_user ON public.websites(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON public.message_attachments(message_id);
