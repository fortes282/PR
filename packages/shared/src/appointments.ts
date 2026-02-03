import { z } from "zod";

export const AppointmentStatus = z.enum(["SCHEDULED", "PAID", "UNPAID", "COMPLETED", "CANCELLED", "INVOICED", "NO_SHOW"]);
export type AppointmentStatus = z.infer<typeof AppointmentStatus>;

export const PaymentStatus = z.enum(["PENDING", "PAID", "UNPAID", "REFUNDED", "INVOICED"]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const AppointmentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  employeeId: z.string().optional(),
  serviceId: z.string(),
  roomId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: AppointmentStatus,
  paymentStatus: PaymentStatus,
  internalNotes: z.string().optional(),
  cancelReason: z.string().optional(),
  cancelledAt: z.string().datetime().optional(),
  blockId: z.string().optional(),
});
export type Appointment = z.infer<typeof AppointmentSchema>;

export const AppointmentCreateSchema = z.object({
  clientId: z.string(),
  employeeId: z.string().optional(),
  serviceId: z.string(),
  roomId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  blockId: z.string().optional(),
});
export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>;

export const TherapyBlockSlotSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
export type TherapyBlockSlot = z.infer<typeof TherapyBlockSlotSchema>;

export const TherapyBlockCreateSchema = z.object({
  clientId: z.string(),
  employeeId: z.string(),
  serviceId: z.string(),
  roomId: z.string(),
  slots: z.array(TherapyBlockSlotSchema).min(1).max(40),
});
export type TherapyBlockCreate = z.infer<typeof TherapyBlockCreateSchema>;

export const AppointmentUpdateSchema = z.object({
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  roomId: z.string().optional(),
  internalNotes: z.string().optional(),
  employeeId: z.string().optional(),
  paymentStatus: PaymentStatus.optional(),
});
export type AppointmentUpdate = z.infer<typeof AppointmentUpdateSchema>;

export const AppointmentCancelBodySchema = z.object({
  refund: z.boolean().optional(),
  reason: z.string().optional(),
});
export type AppointmentCancelBody = z.infer<typeof AppointmentCancelBodySchema>;
