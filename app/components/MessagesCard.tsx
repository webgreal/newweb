"use client";

import { useEffect, useRef, useState, useCallback, FormEvent, ChangeEvent } from "react";
import { Paperclip, Send, X, FileText, Loader2 } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import {
  MessageRow,
  AttachmentRow,
  attachmentAllowed,
  isImageAttachment,
} from "@/app/lib/portal-types";

type PendingAttachment = { file: File; previewUrl?: string };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessagesCard({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = useCallback(async (rows: MessageRow[]) => {
    if (rows.length === 0) return rows;
    const supabase = createClient();
    const { data } = await supabase
      .from("message_attachments")
      .select("id, message_id, file_path, file_name, file_type, file_size")
      .in(
        "message_id",
        rows.map((r) => r.id)
      );
    const byMessage = new Map<string, AttachmentRow[]>();
    for (const a of data ?? []) {
      const list = byMessage.get(a.message_id) ?? [];
      list.push(a);
      byMessage.set(a.message_id, list);
    }
    return rows.map((r) => ({ ...r, message_attachments: byMessage.get(r.id) ?? [] }));
  }, []);

  const markAdminMessagesRead = useCallback(async (rows: MessageRow[]) => {
    const unreadIds = rows
      .filter((m) => m.sender_role === "admin" && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    const supabase = createClient();
    await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    setUnread(0);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadInitial() {
      const { data, error } = await supabase
        .from("messages")
        .select("id, user_id, sender_role, sender_id, body, created_at, read_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) {
        setError("Could not load messages.");
        setMessages([]);
        return;
      }
      const withAtt = await loadAttachments(data ?? []);
      setMessages(withAtt);
      const unreadCount = (data ?? []).filter(
        (m) => m.sender_role === "admin" && !m.read_at
      ).length;
      setUnread(unreadCount);
      await markAdminMessagesRead(data ?? []);
    }
    loadInitial();

    channel = supabase
      .channel(`messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `user_id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as MessageRow;
            const [withAtt] = await loadAttachments([row]);
            setMessages((prev) => {
              if (!prev || prev.some((m) => m.id === row.id)) return prev;
              return [...prev, withAtt];
            });
            if (row.sender_role === "admin") {
              setUnread((u) => u + 1);
              await markAdminMessagesRead([row]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, loadAttachments, markAdminMessagesRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function onFilesPicked(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files);
    for (const f of picked) {
      const err = attachmentAllowed(f);
      if (err) {
        setError(err);
        continue;
      }
      setPending((p) => [
        ...p,
        { file: f, previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined },
      ]);
    }
    setError(null);
    e.target.value = "";
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && pending.length === 0) return;
    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const supabase = createClient();
      const { data: inserted, error: msgError } = await supabase
        .from("messages")
        .insert({ user_id: userId, sender_role: "client", body: text.trim() || null })
        .select("id, user_id, sender_role, sender_id, body, created_at, read_at")
        .single();
      if (msgError || !inserted) throw new Error("Could not send the message.");

      const attachmentRows: AttachmentRow[] = [];
      for (let i = 0; i < pending.length; i++) {
        const { file } = pending[i];
        const path = `${userId}/${inserted.id}/${Date.now()}-${i}-${file.name}`;
        const { error: upError } = await supabase.storage
          .from("client-files")
          .upload(path, file, { cacheControl: "3600" });
        if (upError) throw new Error(`Upload failed for “${file.name}”.`);
        setUploadProgress(Math.round(((i + 1) / pending.length) * 100));

        const { data: attRow, error: attError } = await supabase
          .from("message_attachments")
          .insert({
            message_id: inserted.id,
            user_id: userId,
            file_path: path,
            file_name: file.name,
            file_type: file.type || null,
            file_size: file.size,
          })
          .select("id, file_path, file_name, file_type, file_size")
          .single();
        if (attError) throw new Error("Could not record the attachment.");
        attachmentRows.push(attRow);
      }

      const withAtt: MessageRow = { ...inserted, message_attachments: attachmentRows };
      setMessages((prev) => (prev ? [...prev, withAtt] : [withAtt]));
      setText("");
      setPending([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function downloadAttachment(a: AttachmentRow) {
    const supabase = createClient();
    const { data } = await supabase.storage.from("client-files").createSignedUrl(a.file_path, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener");
    }
  }

  const loading = messages === null;

  return (
    <div className="glass-card p-6 flex flex-col" style={{ minHeight: "520px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="micro-label">Messages</p>
          <h2 className="text-lg font-bold">Chat with Webgreal</h2>
        </div>
        {unread > 0 && (
          <span className="text-xs font-semibold bg-[#1a7bff] text-white px-2.5 py-1 rounded-full">
            {unread} new
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-6">
            <p className="text-sm text-slate-500">
              No messages yet. Send us your logo, photos, text or any details for your website.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_role === "client";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine ? "bg-[#1a7bff] text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.message_attachments && m.message_attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.message_attachments.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => downloadAttachment(a)}
                          className="block w-full text-left rounded-xl overflow-hidden bg-black/10 hover:bg-black/20 transition-colors"
                        >
                          {isImageAttachment(a) ? (
                            <img
                              src={`data:${a.file_type};base64,${""}`}
                              alt=""
                              className="hidden"
                              onError={() => {}}
                            />
                          ) : null}
                          <div className="flex items-center gap-2 px-3 py-2">
                            {isImageAttachment(a) ? (
                              <FileImageThumb attachment={a} onOpen={downloadAttachment} />
                            ) : (
                              <FileText size={18} className="shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{a.file_name}</p>
                              <p className="text-[10px] opacity-70">
                                {a.file_size ? formatBytes(a.file_size) : ""} · click to download
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-slate-500"}`}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pending.map((p, i) => (
            <span
              key={i}
              className="flex items-center gap-2 text-xs bg-slate-100 border border-slate-200 rounded-full pl-2 pr-1 py-1"
            >
              {p.previewUrl && (
                <img src={p.previewUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
              )}
              <span className="max-w-[160px] truncate">{p.file.name}</span>
              <button
                type="button"
                onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
                className="text-slate-400 hover:text-slate-600"
                aria-label={`Remove ${p.file.name}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {uploading && (
        <div className="h-1 rounded-full bg-slate-100 overflow-hidden mb-2">
          <div
            className="h-full bg-[#1a7bff] transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <form onSubmit={handleSend} className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip"
          className="hidden"
          onChange={onFilesPicked}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#1a7bff] hover:border-[#1a7bff] transition-colors"
          aria-label="Attach files"
        >
          <Paperclip size={18} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as FormEvent);
            }
          }}
          rows={1}
          placeholder="Type a message..."
          className="input-field resize-none max-h-32"
        />
        <button
          type="submit"
          disabled={uploading || (!text.trim() && pending.length === 0)}
          className="shrink-0 w-10 h-10 rounded-xl bg-[#1a7bff] text-white flex items-center justify-center hover:bg-[#0f5fd6] transition-colors disabled:opacity-50"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

function FileImageThumb({
  attachment,
  onOpen,
}: {
  attachment: AttachmentRow;
  onOpen: (a: AttachmentRow) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from("client-files")
      .createSignedUrl(attachment.file_path, 300)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [attachment.file_path]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(attachment);
      }}
      className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-black/10"
    >
      {url ? (
        <img src={url} alt={attachment.file_name} className="w-full h-full object-cover" />
      ) : (
        <FileText size={18} className="m-auto mt-2.5" />
      )}
    </button>
  );
}
