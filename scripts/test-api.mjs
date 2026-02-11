#!/usr/bin/env node
/**
 * API integration tests. Run against a live API (e.g. pnpm dev:api).
 * Usage: node scripts/test-api.mjs [baseUrl]
 * Default baseUrl: http://localhost:3001
 */
const BASE = process.argv[2] || process.env.API_BASE_URL || "http://localhost:3001";

let token = null;

async function fetchApi(path, options = {}) {
  const url = `${BASE.replace(/\/$/, "")}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  return { res, data: res.headers.get("content-type")?.includes("json") ? await res.json().catch(() => null) : null };
}

function ok(name, condition, detail = "") {
  if (!condition) {
    console.error(`FAIL: ${name}${detail ? ` (${detail})` : ""}`);
    process.exit(1);
  }
  console.log(`OK: ${name}`);
}

async function run() {
  console.log(`Testing API at ${BASE}\n`);

  const { res } = await fetchApi("/ping");
  ok("GET /ping", res.ok, res.status);

  const { res: loginRes, data: loginData } = await fetchApi("/auth/login", {
    method: "POST",
    body: JSON.stringify({ role: "ADMIN" }),
  });
  ok("POST /auth/login", loginRes.ok && loginData?.accessToken, loginRes.status);
  token = loginData.accessToken;

  let { res: usersRes, data: usersData } = await fetchApi("/users?role=CLIENT&limit=5");
  ok("GET /users", usersRes.ok && Array.isArray(usersData?.users), usersRes.status);
  const clientId = usersData?.users?.[0]?.id;

  const { res: servicesRes, data: servicesData } = await fetchApi("/services");
  ok("GET /services", servicesRes.ok && Array.isArray(servicesData), servicesRes.status);
  const serviceId = servicesData?.[0]?.id;

  const { res: roomsRes, data: roomsData } = await fetchApi("/rooms");
  ok("GET /rooms", roomsRes.ok && Array.isArray(roomsData), roomsRes.status);
  const roomId = roomsData?.[0]?.id;

  const { res: empRes, data: empData } = await fetchApi("/users?role=EMPLOYEE&limit=1");
  ok("GET /users (employee)", empRes.ok && empData?.users?.length, empRes.status);
  const employeeId = empData?.users?.[0]?.id;

  const from = new Date();
  from.setDate(from.getDate() + 7);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  const fromStr = from.toISOString();
  const toStr = to.toISOString();

  const { res: availRes, data: availData } = await fetchApi(
    `/availability?employeeId=${employeeId}&from=${fromStr}&to=${toStr}`
  );
  ok("GET /availability", availRes.ok && Array.isArray(availData), availRes.status);

  const { res: bookRes, data: bookData } = await fetchApi("/availability/bookable-days?from=2026-02-01&to=2026-02-28");
  ok("GET /availability/bookable-days", bookRes.ok && Array.isArray(bookData), bookRes.status);

  const startAt = from.toISOString();
  const endAt = new Date(from.getTime() + 50 * 60 * 1000).toISOString();
  const { res: createAppRes, data: createAppData } = await fetchApi("/appointments", {
    method: "POST",
    body: JSON.stringify({
      clientId,
      employeeId,
      serviceId,
      roomId,
      startAt,
      endAt,
    }),
  });
  ok("POST /appointments", createAppRes.status === 201 && createAppData?.id, createAppRes.status);
  const appId = createAppData?.id;

  const { res: getAppRes } = await fetchApi(`/appointments/${appId}`);
  ok("GET /appointments/:id", getAppRes.ok, getAppRes.status);

  const { res: completeRes } = await fetchApi(`/appointments/${appId}/complete`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  ok("POST /appointments/:id/complete", completeRes.ok, completeRes.status);

  const { res: completeAgainRes } = await fetchApi(`/appointments/${appId}/complete`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  ok("POST /appointments/:id/complete (idempotent 409)", completeAgainRes.status === 409, completeAgainRes.status);

  const { res: creditsRes, data: creditsData } = await fetchApi(`/credits/${clientId}`);
  ok("GET /credits/:clientId", creditsRes.ok && creditsData && typeof creditsData.balanceCzk === "number", creditsRes.status);

  const { res: adjustRes } = await fetchApi(`/credits/${clientId}/adjust`, {
    method: "POST",
    body: JSON.stringify({ amountCzk: 100, reason: "Test adjust" }),
  });
  ok("POST /credits/:clientId/adjust", adjustRes.status === 201, adjustRes.status);

  const { res: billingRes, data: billingData } = await fetchApi("/billing/reports", {
    method: "POST",
    body: JSON.stringify({ period: { year: 2026, month: 2 } }),
  });
  ok("POST /billing/reports", billingRes.status === 201 && billingData?.id, billingRes.status);
  const reportId = billingData?.id;

  const { res: getReportRes } = await fetchApi(`/billing/reports/${reportId}`);
  ok("GET /billing/reports/:id", getReportRes.ok, getReportRes.status);

  const { res: waitlistRes, data: waitlistData } = await fetchApi("/waitlist");
  ok("GET /waitlist", waitlistRes.ok && Array.isArray(waitlistData), waitlistRes.status);

  const { res: settingsRes, data: settingsData } = await fetchApi("/settings");
  ok("GET /settings", settingsRes.ok && settingsData != null, settingsRes.status);

  const occFrom = "2026-01-01T00:00:00.000Z";
  const occTo = "2026-12-31T23:59:59.999Z";
  const { res: statsOccRes, data: statsOccData } = await fetchApi(`/stats/occupancy?from=${occFrom}&to=${occTo}`);
  ok("GET /stats/occupancy", statsOccRes.ok && Array.isArray(statsOccData), statsOccRes.status);

  const { res: statsTagsRes, data: statsTagsData } = await fetchApi("/stats/client-tags");
  ok("GET /stats/client-tags", statsTagsRes.ok && Array.isArray(statsTagsData), statsTagsRes.status);

  const { res: notifRes, data: notifData } = await fetchApi("/notifications");
  ok("GET /notifications", notifRes.ok && Array.isArray(notifData), notifRes.status);

  const { res: bankRes } = await fetchApi("/bank-transactions?from=2025-01-01&to=2026-12-31");
  ok("GET /bank-transactions", bankRes.ok, bankRes.status);

  const { res: reportsRes } = await fetchApi(`/reports?clientId=${clientId}`);
  ok("GET /reports", reportsRes.ok, reportsRes.status);

  const { res: activationsRes, data: activationsData } = await fetchApi(
    "/booking-activations?fromMonth=2026-02&toMonth=2026-02"
  );
  ok("GET /booking-activations", activationsRes.ok && activationsData?.activations != null, activationsRes.status);

  console.log("\nAll API integration checks passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
