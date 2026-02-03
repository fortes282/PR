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
