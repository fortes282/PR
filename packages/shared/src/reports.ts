import { z } from "zod";

export const TherapyReportFileSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  uploadedBy: z.string(),
  fileName: z.string(),
  mimeType: z.string().optional(),
  visibleToClient: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type TherapyReportFile = z.infer<typeof TherapyReportFileSchema>;

export const ReportUploadResultSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  createdAt: z.string().datetime(),
});
export type ReportUploadResult = z.infer<typeof ReportUploadResultSchema>;

export const ReportVisibilityUpdateSchema = z.object({
  visibleToClient: z.boolean(),
});
export type ReportVisibilityUpdate = z.infer<typeof ReportVisibilityUpdateSchema>;
