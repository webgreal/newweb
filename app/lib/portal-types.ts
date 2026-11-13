export type WebsiteRow = {
  id: string;
  website_name: string;
  status: string;
  domain: string | null;
  requested_domain: string | null;
};

export type ProfileRow = {
  full_name: string;
  phone: string;
  business_name: string;
};

export type SubscriptionInfo = {
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
};

export type MessageRow = {
  id: string;
  user_id: string;
  sender_role: "client" | "admin";
  sender_id: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  message_attachments?: AttachmentRow[];
};

export type AttachmentRow = {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
};

export const WEBSITE_STEPS = [
  { key: "waiting_details", label: "Order Received" },
  { key: "in_design", label: "Design & Planning" },
  { key: "in_development", label: "Website Development" },
  { key: "testing", label: "Testing & Optimization" },
  { key: "client_review", label: "Client Review" },
  { key: "live", label: "Website Published" },
] as const;

export function websiteStepIndex(status: string | null | undefined): number {
  if (!status) return 0;
  const i = WEBSITE_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

export const STATUS_LABELS: Record<string, string> = {
  waiting_details: "Order Received",
  in_design: "Design & Planning",
  in_development: "Website Development",
  testing: "Testing & Optimization",
  client_review: "Client Review",
  live: "Website Published",
  available: "Available",
  unavailable: "Unavailable",
  registered: "Registered",
  connected: "Connected",
  pending_check: "Pending check",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  trialing: "Trialing",
  unpaid: "Past due",
  incomplete: "Incomplete",
  incomplete_expired: "Canceled",
};

export function statusLabel(s: string | null | undefined): string {
  if (!s) return "";
  return STATUS_LABELS[s] ?? s;
}

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_TYPES = [
  "pdf", "txt", "doc", "docx", "xls", "xlsx", "csv", "png", "jpg", "jpeg", "zip",
];

export function attachmentAllowed(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_TYPES.includes(ext)) {
    return `“${file.name}” is not an accepted file type.`;
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `“${file.name}” is over the 10 MB limit.`;
  }
  return null;
}

export function isImageAttachment(a: AttachmentRow): boolean {
  return !!a.file_type?.startsWith("image/");
}
