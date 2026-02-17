/**
 * Slot offer: create draft (manual) or send directly to clients (auto).
 * Used by POST /admin/slot-offer-approvals and by appointment cancel.
 */
import type { Store } from "../store.js";
import { nextId } from "./id.js";
import { persistNotification, persistSlotOfferApproval } from "../db/persist.js";
import { getSmtpTransport } from "./email.js";
import type { SlotOfferApproval } from "@pristav/shared/slot-offer-approval";
import type { FastifyBaseLogger } from "fastify";

const SLOT_OFFER_CANDIDATES_LIMIT = 20;

/** Get client IDs from waitlist for the given service, ordered by priority (lower first), deduplicated, max limit. */
export function getWaitlistCandidateClientIds(store: Store, serviceId: string, limit = SLOT_OFFER_CANDIDATES_LIMIT): string[] {
  const entries = Array.from(store.waitlist.values())
    .filter((w) => w.serviceId === serviceId)
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of entries) {
    if (seen.has(e.clientId)) continue;
    seen.add(e.clientId);
    result.push(e.clientId);
    if (result.length >= limit) break;
  }
  return result;
}

const DEFAULT_SLOT_OFFER_TITLE = "Nabídka volného termínu";

/** Send slot offer to clients immediately (Auto mode): in-app notification + optional email to each. */
export async function sendSlotOfferToClients(
  store: Store,
  clientIds: string[],
  messageTemplate: string,
  log?: FastifyBaseLogger,
  options?: { pushTitle?: string }
): Promise<void> {
  const transport = getSmtpTransport();
  const fromEnv = process.env.SMTP_USER?.trim();
  const fromSettings = store.settings.notificationEmailSender;
  const effectiveEmail = fromEnv || fromSettings?.email?.trim();
  const effectiveName = fromSettings?.name?.trim();
  const canSendEmail = Boolean(transport && effectiveEmail);
  const title = options?.pushTitle?.trim() || DEFAULT_SLOT_OFFER_TITLE;

  for (const clientId of clientIds) {
    const n = {
      id: nextId("n"),
      userId: clientId,
      channel: "IN_APP" as const,
      title,
      message: messageTemplate,
      read: false,
      createdAt: new Date().toISOString(),
      purpose: "SLOT_OFFER" as const,
    };
    store.notifications.set(n.id, n);
    persistNotification(store, n);

    if (canSendEmail) {
      const user = store.users.get(clientId);
      const to = user?.email?.trim();
      if (to) {
        try {
          await transport!.sendMail({
            from: effectiveName ? { name: effectiveName, address: effectiveEmail! } : effectiveEmail,
            to,
            subject: "Přístav radosti – nabídka volného termínu",
            text: messageTemplate,
          });
          log?.info({ to, clientId }, "Slot offer email sent");
        } catch (err) {
          log?.warn({ err, to, clientId }, "Slot offer email failed");
        }
      }
    }
  }
}

export async function createSlotOfferDraft(
  store: Store,
  params: { appointmentIds: string[]; clientIds: string[]; messageTemplate: string; pushTitle?: string },
  log?: FastifyBaseLogger
): Promise<SlotOfferApproval> {
  const { appointmentIds, clientIds, messageTemplate, pushTitle } = params;
  const id = nextId("soa");
  const createdAt = new Date().toISOString();
  const approval: SlotOfferApproval = {
    id,
    appointmentIds,
    clientIds,
    messageTemplate,
    pushTitle: pushTitle?.trim() || undefined,
    status: "PENDING",
    createdAt,
  };
  store.slotOfferApprovals.set(id, approval);
  persistSlotOfferApproval(store, approval);

  const message = `Čeká schválení: nabídka uvolněných termínů ${appointmentIds.length} slot(ů) pro ${clientIds.length} klientů.`;
  const adminAndReception = Array.from(store.users.values()).filter((u) => u.role === "ADMIN" || u.role === "RECEPTION");
  for (const u of adminAndReception) {
    const n = {
      id: nextId("n"),
      userId: u.id,
      channel: "IN_APP" as const,
      title: "Schválení nabídky slotů",
      message,
      read: false,
      createdAt: new Date().toISOString(),
      purpose: "APPROVAL_REQUEST" as const,
    };
    store.notifications.set(n.id, n);
    persistNotification(store, n);
  }

  const approvalNotifyEmails = (store.settings as { approvalNotifyEmails?: string[] }).approvalNotifyEmails;
  if (approvalNotifyEmails?.length) {
    const transport = getSmtpTransport();
    const fromEnv = process.env.SMTP_USER?.trim();
    const fromSettings = store.settings.notificationEmailSender;
    const effectiveEmail = fromEnv || fromSettings?.email?.trim();
    const effectiveName = fromSettings?.name?.trim();
    if (transport && effectiveEmail) {
      const emailText = `${message}\n\nPřihlaste se do aplikace a v sekci „Schválení nabídek“ nabídku schvalte nebo odmítněte.`;
      for (const to of approvalNotifyEmails) {
        if (!to?.trim()) continue;
        try {
          await transport.sendMail({
            from: effectiveName ? { name: effectiveName, address: effectiveEmail } : effectiveEmail,
            to: to.trim(),
            subject: "Přístav radosti – čeká schválení nabídky slotů",
            text: emailText,
          });
          log?.info({ to: to.trim() }, "Approval notify email sent");
        } catch (err) {
          log?.warn({ err, to }, "Approval notify email failed");
        }
      }
    }
  }

  return approval;
}
