import { z } from "zod";

export const ServiceType = z.enum(["INDIVIDUAL", "GROUP", "ASSESSMENT", "OTHER"]);
export type ServiceType = z.infer<typeof ServiceType>;

export const ServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ServiceType,
  durationMinutes: z.number().min(1),
  priceCzk: z.number().min(0),
  active: z.boolean().default(true),
});
export type Service = z.infer<typeof ServiceSchema>;

export const ServiceCreateSchema = ServiceSchema.omit({ id: true });
export type ServiceCreate = z.infer<typeof ServiceCreateSchema>;

export const ServiceUpdateSchema = ServiceSchema.partial().omit({ id: true });
export type ServiceUpdate = z.infer<typeof ServiceUpdateSchema>;
