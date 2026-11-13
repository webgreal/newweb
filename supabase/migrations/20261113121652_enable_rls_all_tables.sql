/*
# Enable Row Level Security on all Webgreal tables

1. Security
- Turns on RLS for every public table. The policies and grants were created in the previous
  migration; without RLS enabled they would not be enforced, so this is the switch that locks
  each table down to exactly its policies.

2. Tables affected
- profiles, subscriptions, websites, payments, messages, message_attachments, contact_submissions.
*/

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
