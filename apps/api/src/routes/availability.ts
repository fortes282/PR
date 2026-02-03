import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { WorkingHoursSlot, LunchBreak } from "@pristav/shared/users";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  startOfDay,
  setHours,
  setMinutes,
  getDayOfWeek,
  parseTimeHHmm,
  monthKey,
} from "../lib/date.js";

const DEFAULT_HOURS: WorkingHoursSlot[] = [
  { dayOfWeek: 1, start: "08:00", end: "17:00" },
  { dayOfWeek: 2, start: "08:00", end: "17:00" },
  { dayOfWeek: 3, start: "08:00", end: "17:00" },
  { dayOfWeek: 4, start: "08:00", end: "17:00" },
  { dayOfWeek: 5, start: "08:00", end: "17:00" },
];

export default async function availabilityRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/availability",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Querystring: { employeeId: string; from: string; to: string } }>, reply: FastifyReply) => {
      const { employeeId, from, to } = request.query;
      const user = store.users.get(employeeId);
      if (!user) {
        reply.send([]);
        return;
      }
      const fromDate = new Date(from);
      const toDate = new Date(to);
      const slots: { startAt: string; endAt: string }[] = [];
      const workingHours = user.workingHours?.length ? user.workingHours : DEFAULT_HOURS;
      const lunchBreaks = user.lunchBreaks ?? [];
      const existing = Array.from(store.appointments.values()).filter(
        (a) => a.employeeId === employeeId && a.status !== "CANCELLED"
      );
      let d = startOfDay(new Date(fromDate));
      while (d <= toDate) {
        const dayOfWeek = getDayOfWeek(d);
        const dayLunch = lunchBreaks.find((b: LunchBreak) => b.dayOfWeek === dayOfWeek);
        const daySlots = workingHours.filter((wh) => wh.dayOfWeek === dayOfWeek);
        for (const wh of daySlots) {
          const { h: startH, m: startM } = parseTimeHHmm(wh.start);
          const { h: endH, m: endM } = parseTimeHHmm(wh.end);
          for (let h = startH; h < endH || (h === endH && startM < endM); h++) {
            const slotStart = setMinutes(setHours(new Date(d), h), 0);
            const slotEnd = setMinutes(setHours(new Date(d), h + 1), 0);
            if (slotStart < fromDate || slotEnd > toDate) continue;
            const overlapsApp = existing.some(
              (a) => new Date(a.startAt) < slotEnd && new Date(a.endAt) > slotStart
            );
            if (overlapsApp) continue;
            if (dayLunch) {
              const { h: lStartH, m: lStartM } = parseTimeHHmm(dayLunch.start);
              const { h: lEndH, m: lEndM } = parseTimeHHmm(dayLunch.end);
              const lunchStart = setMinutes(setHours(new Date(d), lStartH), lStartM);
              const lunchEnd = setMinutes(setHours(new Date(d), lEndH), lEndM);
              const overlapsLunch = slotStart < lunchEnd && slotEnd > lunchStart;
              if (overlapsLunch) continue;
            }
            slots.push({ startAt: slotStart.toISOString(), endAt: slotEnd.toISOString() });
          }
        }
        d.setDate(d.getDate() + 1);
      }
      const filtered = slots.filter((slot) => {
        const key = `${employeeId}:${monthKey(new Date(slot.startAt))}`;
        return store.bookingActivations.get(key) === true;
      });
      filtered.sort((a, b) => a.startAt.localeCompare(b.startAt));
      reply.send(filtered);
    }
  );

  app.get(
    "/availability/bookable-days",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Querystring: { from: string; to: string } }>, reply: FastifyReply) => {
      const { from, to } = request.query;
      const fromDate = startOfDay(new Date(from));
      const toDate = new Date(to);
      const employees = Array.from(store.users.values()).filter((u) => u.role === "EMPLOYEE");
      const result: { date: string; availableCount: number }[] = [];
      const day = new Date(fromDate);
      while (day <= toDate) {
        const dateStr = day.toISOString().slice(0, 10);
        const mKey = monthKey(day);
        const hasActivatedMonth = employees.some(
          (emp) => store.bookingActivations.get(`${emp.id}:${mKey}`) === true
        );
        if (!hasActivatedMonth) {
          day.setDate(day.getDate() + 1);
          continue;
        }
        let total = 0;
        for (const emp of employees) {
          const key = `${emp.id}:${mKey}`;
          if (store.bookingActivations.get(key) !== true) continue;
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          const existing = Array.from(store.appointments.values()).filter(
            (a) => a.employeeId === emp.id && a.status !== "CANCELLED"
          );
          const workingHours = emp.workingHours?.length ? emp.workingHours : DEFAULT_HOURS;
          const lunchBreaks = emp.lunchBreaks ?? [];
          const dayOfWeek = getDayOfWeek(day);
          const daySlots = workingHours.filter((wh) => wh.dayOfWeek === dayOfWeek);
          const dayLunch = lunchBreaks.find((b: LunchBreak) => b.dayOfWeek === dayOfWeek);
          for (const wh of daySlots) {
            const { h: startH, m: startM } = parseTimeHHmm(wh.start);
            const { h: endH, m: endM } = parseTimeHHmm(wh.end);
            for (let h = startH; h < endH || (h === endH && startM < endM); h++) {
              const slotStart = setMinutes(setHours(new Date(day), h), 0);
              const slotEnd = setMinutes(setHours(new Date(day), h + 1), 0);
              if (slotStart < dayStart || slotEnd > dayEnd) continue;
              const overlapsApp = existing.some(
                (a) => new Date(a.startAt) < slotEnd && new Date(a.endAt) > slotStart
              );
              if (overlapsApp) continue;
              if (dayLunch) {
                const { h: lStartH, m: lStartM } = parseTimeHHmm(dayLunch.start);
                const { h: lEndH, m: lEndM } = parseTimeHHmm(dayLunch.end);
                const lunchStart = setMinutes(setHours(new Date(day), lStartH), lStartM);
                const lunchEnd = setMinutes(setHours(new Date(day), lEndH), lEndM);
                if (slotStart < lunchEnd && slotEnd > lunchStart) continue;
              }
              total++;
            }
          }
        }
        result.push({ date: dateStr, availableCount: total });
        day.setDate(day.getDate() + 1);
      }
      reply.send(result);
    }
  );
}
