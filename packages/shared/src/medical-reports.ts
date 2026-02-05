import { z } from "zod";

/**
 * Structured medical report written by therapist (search client → create report).
 * Prefilled from client + health record; therapist fills diagnosis, condition, treatment, recommendations.
 * Stored and visible in client detail; exportable as PDF and DOCX.
 */

export const MedicalReportSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  /** Prefilled: client full name */
  clientFullName: z.string(),
  /** Prefilled: client address (single line or structured) */
  clientAddress: z.string(),
  /** Prefilled: child's name */
  childName: z.string().optional(),
  /** Prefilled: child's date of birth (YYYY-MM-DD) */
  childDateOfBirth: z.string().optional(),
  /** Prefilled: report creation date (YYYY-MM-DD) */
  reportDate: z.string(),
  /** Manual: diagnosis */
  diagnosis: z.string().optional(),
  /** Manual: current condition */
  currentCondition: z.string().optional(),
  /** Manual: planned treatment */
  plannedTreatment: z.string().optional(),
  /** Manual: recommendations */
  recommendations: z.string().optional(),
});
export type MedicalReport = z.infer<typeof MedicalReportSchema>;

export const MedicalReportCreateSchema = z.object({
  clientId: z.string(),
  diagnosis: z.string().optional(),
  currentCondition: z.string().optional(),
  plannedTreatment: z.string().optional(),
  recommendations: z.string().optional(),
});
export type MedicalReportCreate = z.infer<typeof MedicalReportCreateSchema>;
