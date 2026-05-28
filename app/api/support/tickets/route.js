import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const validCategories = new Set(["bug", "data", "access", "feature", "other"]);
const validPriorities = new Set(["low", "normal", "high", "urgent"]);

function cleanText(value, maxLength = 2000) {
  return String(value || "").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmail({ ticket, profile }) {
  const reporter = profile.full_name || profile.email || profile.id;
  const lines = [
    `Ticket: ${ticket.ticket_number}`,
    `Subject: ${ticket.subject}`,
    `Category: ${ticket.category}`,
    `Priority: ${ticket.priority}`,
    `Reporter: ${reporter}`,
    `Email: ${profile.email || "-"}`,
    `Role: ${profile.role || "-"}`,
    `Page URL: ${ticket.page_url || "-"}`,
    "",
    "Description:",
    ticket.description,
    "",
    "Browser:",
    ticket.browser_info || "-"
  ];

  const htmlRows = [
    ["Ticket", ticket.ticket_number],
    ["Subject", ticket.subject],
    ["Category", ticket.category],
    ["Priority", ticket.priority],
    ["Reporter", reporter],
    ["Email", profile.email || "-"],
    ["Role", profile.role || "-"],
    ["Page URL", ticket.page_url || "-"]
  ]
    .map(
      ([label, value]) =>
        `<tr><th style="text-align:left;border:1px solid #cbd5e1;padding:8px;background:#f8fafc">${escapeHtml(label)}</th><td style="border:1px solid #cbd5e1;padding:8px">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return {
    text: lines.join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
        <h2 style="margin:0 0 12px">SISTECH Support Ticket</h2>
        <table style="border-collapse:collapse;width:100%;max-width:760px">${htmlRows}</table>
        <h3 style="margin:18px 0 8px">Description</h3>
        <div style="white-space:pre-wrap;border:1px solid #cbd5e1;background:#f8fafc;padding:12px">${escapeHtml(ticket.description)}</div>
        <h3 style="margin:18px 0 8px">Browser</h3>
        <div style="white-space:pre-wrap;border:1px solid #cbd5e1;background:#f8fafc;padding:12px">${escapeHtml(ticket.browser_info || "-")}</div>
      </div>`
  };
}

async function sendSupportEmail({ ticket, profile }) {
  const apiKey = process.env.RESEND_API_KEY;
  const supportEmail = process.env.SUPPORT_EMAIL;
  const fromEmail = process.env.SUPPORT_FROM_EMAIL || "SISTECH Support <onboarding@resend.dev>";

  if (!apiKey || !supportEmail) {
    return {
      sent: false,
      error: "Support email is not configured. Set RESEND_API_KEY and SUPPORT_EMAIL in Vercel/server environment."
    };
  }

  const email = buildEmail({ ticket, profile });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [supportEmail],
      subject: `[SISTECH Support] ${ticket.ticket_number} - ${ticket.subject}`,
      text: email.text,
      html: email.html
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      sent: false,
      error: payload?.message || payload?.error || "Support email failed to send."
    };
  }

  return { sent: true, providerId: payload?.id || null };
}

export async function POST(request) {
  try {
    const sessionClient = await createSupabaseServerClient();
    const { data: userData, error: userError } = await sessionClient.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please login before submitting a support ticket." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await sessionClient
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found. Please contact administrator." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const subject = cleanText(body.subject, 160);
    const description = cleanText(body.description, 5000);
    const category = validCategories.has(body.category) ? body.category : "bug";
    const priority = validPriorities.has(body.priority) ? body.priority : "normal";

    if (!subject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (!description || description.length < 10) {
      return NextResponse.json({ error: "Description must be at least 10 characters." }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    const { data: ticket, error: ticketError } = await adminClient
      .from("support_tickets")
      .insert({
        user_id: profile.id,
        reporter_name: profile.full_name,
        reporter_email: profile.email,
        reporter_role: profile.role,
        subject,
        category,
        priority,
        page_url: cleanText(body.page_url, 1000),
        description,
        browser_info: cleanText(body.browser_info, 2000),
        status: "open"
      })
      .select("*")
      .single();

    if (ticketError) {
      throw new Error(ticketError.message);
    }

    const emailResult = await sendSupportEmail({ ticket, profile });

    const updatePayload = emailResult.sent
      ? { email_sent: true, email_sent_at: new Date().toISOString(), email_provider_id: emailResult.providerId }
      : { email_sent: false, email_error: emailResult.error };

    await adminClient.from("support_tickets").update(updatePayload).eq("id", ticket.id);

    await adminClient.from("audit_logs").insert({
      user_id: profile.id,
      action: "create_support_ticket",
      module: "Support",
      table_name: "support_tickets",
      record_id: ticket.id,
      metadata: {
        ticket_number: ticket.ticket_number,
        category,
        priority,
        email_sent: emailResult.sent,
        email_error: emailResult.error || null
      }
    });

    return NextResponse.json({
      ticket: { ...ticket, ...updatePayload },
      emailSent: emailResult.sent,
      emailError: emailResult.error || null
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Support ticket failed." }, { status: 500 });
  }
}
