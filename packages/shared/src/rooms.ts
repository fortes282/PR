import { z } from "zod";

export const RoomType = z.enum(["THERAPY", "ASSESSMENT", "GROUP", "OTHER"]);
export type RoomType = z.infer<typeof RoomType>;

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: RoomType,
  active: z.boolean().default(true),
});
export type Room = z.infer<typeof RoomSchema>;

export const RoomCreateSchema = RoomSchema.omit({ id: true });
export type RoomCreate = z.infer<typeof RoomCreateSchema>;

export const RoomUpdateSchema = RoomSchema.partial().omit({ id: true });
export type RoomUpdate = z.infer<typeof RoomUpdateSchema>;
