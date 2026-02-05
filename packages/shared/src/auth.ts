import { z } from "zod";

export const Role = z.enum(["ADMIN", "RECEPTION", "EMPLOYEE", "CLIENT"]);
export type Role = z.infer<typeof Role>;

export const LoginCredentialsSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional(),
  role: Role.optional(),
});
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

export const SessionSchema = z.object({
  userId: z.string(),
  role: Role,
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
});
export type Session = z.infer<typeof SessionSchema>;

/** Client self-registration (before or after SMS verification, depending on flow). */
export const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  /** If using SMS verification: code sent to phone */
  smsCode: z.string().optional(),
});
export type RegisterBody = z.infer<typeof RegisterBodySchema>;

/** Request SMS verification code for registration or login. */
export const RequestSmsCodeBodySchema = z.object({
  phone: z.string().min(9),
  purpose: z.enum(["REGISTRATION", "LOGIN"]).optional(),
});
export type RequestSmsCodeBody = z.infer<typeof RequestSmsCodeBodySchema>;

/** Verify SMS code (returns token or marks registration step complete). */
export const VerifySmsCodeBodySchema = z.object({
  phone: z.string().min(9),
  code: z.string().min(4),
});
export type VerifySmsCodeBody = z.infer<typeof VerifySmsCodeBodySchema>;

/** Admin resets client password and sends email with link to set new one. */
export const ResetPasswordByAdminBodySchema = z.object({
  clientId: z.string(),
  /** Optional: custom message in email */
  message: z.string().optional(),
});
export type ResetPasswordByAdminBody = z.infer<typeof ResetPasswordByAdminBodySchema>;
