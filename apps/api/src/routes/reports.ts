import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ReportVisibilityUpdateSchema } from "@pristav/shared/reports";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";

export default async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.post("/reports/upload", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    let clientId: string | null = null;
    let fileData: { buffer: Buffer; filename: string; mimetype: string } | null = null;
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === "field" && part.fieldname === "clientId") {
        clientId = (part as { value: string }).value;
      }
      if (part.type === "file" && part.fieldname === "file") {
        const buffer = await part.toBuffer();
        fileData = { buffer, filename: part.filename, mimetype: part.mimetype };
      }
    }
    if (!clientId || !fileData) {
      reply.status(400).send({ code: "VALIDATION_ERROR", message: "Missing clientId or file" });
      return;
    }
    const id = nextId("rep");
    const userId = (request as FastifyRequest & { user?: { userId: string } }).user?.userId ?? "unknown";
    const rec = {
      id,
      clientId,
      uploadedBy: userId,
      fileName: fileData.filename,
      mimeType: fileData.mimetype,
      visibleToClient: false,
      createdAt: new Date().toISOString(),
    };
    store.therapyReports.set(id, rec);
    store.therapyReportBlobs.set(id, fileData.buffer);
    reply.status(201).send({ id, fileName: rec.fileName, createdAt: rec.createdAt });
  });

  app.get("/reports", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Querystring: { clientId: string } }>, reply: FastifyReply) => {
    const list = Array.from(store.therapyReports.values())
      .filter((r) => r.clientId === request.query.clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    reply.send(list);
  });

  app.get("/reports/:id/download", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const buffer = store.therapyReportBlobs.get(request.params.id);
    const rec = store.therapyReports.get(request.params.id);
    if (!rec) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Report not found" });
      return;
    }
    if (buffer) {
      reply.type(rec.mimeType ?? "application/octet-stream").send(buffer);
      return;
    }
    reply.type("application/pdf").send(Buffer.from(`Placeholder PDF for ${rec.fileName}`));
  });

  app.patch("/reports/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const r = store.therapyReports.get(request.params.id);
    if (!r) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Report not found" });
      return;
    }
    const parse = ReportVisibilityUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const updated = { ...r, ...parse.data };
    store.therapyReports.set(r.id, updated);
    reply.send(updated);
  });
}
