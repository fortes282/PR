export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Naplánováno",
  COMPLETED: "Dokončeno",
  CANCELLED: "Zrušeno",
  NO_SHOW: "Nedostavil se",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Zaplaceno",
  UNPAID: "Nezaplaceno",
  REFUNDED: "Vráceno",
  INVOICED: "Vyfakturováno",
};

export function appointmentStatusLabel(status: string): string {
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function appointmentStatusColor(status: string): string {
  switch (status) {
    case "SCHEDULED": return "text-sky-700 bg-sky-50";
    case "COMPLETED": return "text-emerald-700 bg-emerald-50";
    case "CANCELLED": return "text-red-700 bg-red-50";
    case "NO_SHOW": return "text-amber-700 bg-amber-50";
    default: return "text-gray-700 bg-gray-50";
  }
}

export function paymentStatusColor(status: string): string {
  switch (status) {
    case "PAID": return "text-emerald-700 bg-emerald-50";
    case "UNPAID": return "text-amber-700 bg-amber-50";
    case "REFUNDED": return "text-sky-700 bg-sky-50";
    case "INVOICED": return "text-violet-700 bg-violet-50";
    default: return "text-gray-700 bg-gray-50";
  }
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Koncept",
  SENT: "Odesláno",
  PAID: "Zaplaceno",
  OVERDUE: "Po splatnosti",
  CANCELLED: "Stornováno",
};

export function invoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABELS[status] ?? status;
}

export function invoiceStatusColor(status: string): string {
  switch (status) {
    case "DRAFT": return "text-gray-700 bg-gray-50";
    case "SENT": return "text-sky-700 bg-sky-50";
    case "PAID": return "text-emerald-700 bg-emerald-50";
    case "OVERDUE": return "text-red-700 bg-red-50";
    case "CANCELLED": return "text-gray-500 bg-gray-50";
    default: return "text-gray-700 bg-gray-50";
  }
}
