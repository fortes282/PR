import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { BookingActivationListParamsSchema, BookingActivationSetSchema } from "@pristav/shared/booking-activation";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { persistBookingActivation } from "../db/persist.js";

export default async function bookingActivationsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/booking-activations",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Querystring: { fromMonth: string; toMonth: string } }>, reply: FastifyReply) => {
      const parse = BookingActivationListParamsSchema.safeParse(request.query);
      if (!parse.success) {
        reply.status(400).send({
          code: "VALIDATION_ERROR",
          message: "Invalid query",
          details: parse.error.flatten(),
        });
        return;
      }
      const { fromMonth, toMonth } = parse.data;
      const employees = Array.from(store.users.values()).filter((u) => u.role === "EMPLOYEE");
      const activations: { employeeId: string; monthKey: string; active: boolean }[] = [];
      const [fromY, fromM] = fromMonth.split("-").map(Number);
      const [toY, toM] = toMonth.split("-").map(Number);
      let y = fromY;
      let m = fromM;
      while (y < toY || (y === toY && m <= toM)) {
        const monthKeyStr = `${y}-${String(m).padStart(2, "0")}`;
        for (const emp of employees) {
          const key = `${emp.id}:${monthKeyStr}`;
          activations.push({
            employeeId: emp.id,
            monthKey: monthKeyStr,
            active: store.bookingActivations.get(key) === true,
          });
        }
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
      reply.send({ activations });
    }
  );

  app.put("/booking-activations", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = BookingActivationSetSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    persistBookingActivation(store, parse.data.employeeId, parse.data.monthKey, parse.data.active);
    reply.status(204).send();
  });
}
