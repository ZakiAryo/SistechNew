"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, LifeBuoy, Loader2, RefreshCw, Send } from "lucide-react";
import AppLayout from "./AppLayout";
import FormInput from "./FormInput";
import PageHeader from "./PageHeader";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const categoryOptions = [
  { value: "bug", label: "Bug / Error" },
  { value: "data", label: "Data issue" },
  { value: "access", label: "Login / Access" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" }
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];

function createInitialForm() {
  return {
    subject: "",
    category: "bug",
    priority: "normal",
    page_url: "",
    description: ""
  };
}

function getReportedPageUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const from = new URLSearchParams(window.location.search).get("from");

  if (from) {
    return `${window.location.origin}${from.startsWith("/") ? from : `/${from}`}`;
  }

  return document.referrer || window.location.href;
}

function badgeClass(value) {
  if (value === "urgent" || value === "high") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  if (value === "resolved" || value === "closed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (value === "in_progress") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-cyan-50 text-cyan-700 ring-cyan-100";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export default function SupportTicketPage() {
  const [formData, setFormData] = useState(createInitialForm);
  const [formErrors, setFormErrors] = useState({});
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const loadTickets = useCallback(async () => {
    if (!supabase) {
      setError("Supabase environment is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, category, priority, status, email_sent, email_error, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (queryError) {
      setTickets([]);
      setError(queryError.message);
    } else {
      setTickets(data || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      page_url: getReportedPageUrl()
    }));
    loadTickets();
  }, [loadTickets]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: undefined }));
  }

  function validateForm() {
    const errors = {};

    if (!formData.subject.trim()) {
      errors.subject = "Subject is required.";
    }

    if (!formData.description.trim() || formData.description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          browser_info: typeof navigator === "undefined" ? "" : navigator.userAgent
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Support ticket failed.");
      }

      const ticketNumber = payload.ticket?.ticket_number || "ticket";
      setFormData({
        ...createInitialForm(),
        page_url: getReportedPageUrl()
      });
      setMessage(
        payload.emailSent
          ? `Support ticket ${ticketNumber} created and email notification sent.`
          : `Support ticket ${ticketNumber} created. Email notification is pending: ${payload.emailError || "not configured"}.`
      );
      await loadTickets();
    } catch (submitError) {
      setError(submitError.message || "Support ticket failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Support Service"
        description="Create a bug/error report and notify support service by email from a secure server endpoint."
        eyebrow="System"
        actions={
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={loadTickets}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {message ? (
        <div className="mb-4 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
          <span>{message}</span>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">New Support Ticket</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Describe the bug clearly. Current page and browser information will be included for support.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormInput
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Example: Account Payable table error"
                required
                error={formErrors.subject}
              />
            </div>
            <FormInput
              label="Category"
              name="category"
              type="select"
              value={formData.category}
              onChange={handleInputChange}
              options={categoryOptions}
            />
            <FormInput
              label="Priority"
              name="priority"
              type="select"
              value={formData.priority}
              onChange={handleInputChange}
              options={priorityOptions}
            />
            <div className="sm:col-span-2">
              <FormInput
                label="Page URL"
                name="page_url"
                value={formData.page_url}
                onChange={handleInputChange}
                helperText="Auto-filled from the current browser page. You can adjust it if needed."
              />
            </div>
            <div className="sm:col-span-2">
              <FormInput
                label="Description"
                name="description"
                type="textarea"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                placeholder="Explain what happened, what you clicked, expected result, and any error message shown."
                required
                error={formErrors.description}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Ticket
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">Recent Tickets</h2>
            <p className="mt-1 text-sm text-slate-500">Your latest reports and email delivery status.</p>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-5 text-sm text-slate-500">Loading support tickets...</div>
            ) : tickets.length ? (
              tickets.map((ticket) => (
                <div key={ticket.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{ticket.ticket_number || "-"}</p>
                      <p className="mt-1 truncate text-sm text-slate-700">{ticket.subject}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ring-1 ${badgeClass(ticket.status)}`}>
                      {String(ticket.status || "open").replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-medium capitalize text-slate-600">
                      {ticket.category}
                    </span>
                    <span className={`rounded-full px-2 py-1 font-medium capitalize ring-1 ${badgeClass(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`rounded-full px-2 py-1 font-medium ${ticket.email_sent ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {ticket.email_sent ? "Email sent" : "Email pending"}
                    </span>
                  </div>
                  {ticket.email_error ? <p className="mt-2 text-xs text-amber-700">{ticket.email_error}</p> : null}
                  <p className="mt-3 text-xs text-slate-500">{formatDate(ticket.created_at)}</p>
                </div>
              ))
            ) : (
              <div className="p-5 text-sm text-slate-500">No support ticket found.</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
