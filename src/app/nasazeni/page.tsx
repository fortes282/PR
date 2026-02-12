import Link from "next/link";

export const metadata = {
  title: "Návod k nasazení | Přístav radosti",
  description: "Jak nasadit backend a frontend aplikace Přístav radosti.",
};

export default function NasazeniPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link href="/" className="text-sm text-primary-600 hover:underline">
            ← Zpět
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Návod k nasazení — Přístav radosti
          </h1>
          <p className="mt-2 text-gray-600">
            Aplikace vyžaduje běžící backend (API). Bez něj se zobrazí hláška „Backend neběží“. Mock režim není podporován.
          </p>
        </div>

        <section className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">1. Lokální spuštění</h2>
          <h3 className="font-medium text-gray-800">Backend (API)</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
            <li>Z kořene repozitáře: <code className="rounded bg-gray-200 px-1">pnpm install</code></li>
            <li>Případně: <code className="rounded bg-gray-200 px-1">pnpm build:sqlite</code> (pokud API hlásí chybu „bindings“)</li>
            <li>Spusťte API: <code className="rounded bg-gray-200 px-1">pnpm dev:api</code> → běží na http://localhost:3001</li>
          </ol>
          <h3 className="font-medium text-gray-800 mt-4">Frontend (Next.js)</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
            <li>Vytvořte <code className="rounded bg-gray-200 px-1">.env.local</code> s:
              <pre className="mt-2 rounded bg-gray-100 p-3 text-xs overflow-x-auto">
{`NEXT_PUBLIC_API_MODE=http
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`}
              </pre>
            </li>
            <li>Spusťte: <code className="rounded bg-gray-200 px-1">pnpm dev</code> → http://localhost:3000</li>
            <li>Po změně NEXT_PUBLIC_* vždy restartujte Next.js</li>
          </ol>
          <p className="text-sm text-gray-600">
            Nebo obojí najednou: <code className="rounded bg-gray-200 px-1">pnpm dev:all</code>
          </p>
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">2. Nasazení na produkci (Railway)</h2>
          <h3 className="font-medium text-gray-800">Backend (API)</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
            <li>Nový service v Railway, root podle toho, odkud budete buildit (kořen nebo apps/api)</li>
            <li>Build: <code className="rounded bg-gray-200 px-1">pnpm install && pnpm --filter api build</code> (z kořene)</li>
            <li>Start: <code className="rounded bg-gray-200 px-1">node apps/api/dist/index.js</code></li>
            <li>Env: <strong>JWT_SECRET</strong>, <strong>CORS_ORIGIN</strong> (URL frontendu), <strong>DATABASE_PATH</strong>, popř. FAYN_SMS_PASSWORD, SMTP_*, VAPID_*</li>
          </ul>
          <h3 className="font-medium text-gray-800 mt-4">Frontend (Next.js)</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
            <li>Druhý service, root = kořen repa</li>
            <li>Build: <code className="rounded bg-gray-200 px-1">pnpm install && pnpm build</code></li>
            <li>Start: <code className="rounded bg-gray-200 px-1">pnpm start</code></li>
            <li>Env: <strong>NEXT_PUBLIC_API_MODE=http</strong>, <strong>NEXT_PUBLIC_API_BASE_URL</strong> = URL API, doporučeno <strong>NEXT_PUBLIC_USE_API_PROXY=true</strong></li>
            <li>Na serveru Next.js nastavit <strong>API_BACKEND_URL</strong> na URL API (pro proxy)</li>
          </ul>
        </section>

        <section className="card p-6 space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">3. Kontrola</h2>
          <p className="text-sm text-gray-700">
            API: <code className="rounded bg-gray-200 px-1">curl https://vase-api.../</code> → {"{\"ok\":true}"}. Health: <code className="rounded bg-gray-200 px-1">/health</code> → database connected.
          </p>
          <p className="text-sm text-gray-700">
            Frontend: otevřít URL → přihlášení bez hlášky „Backend neběží“.
          </p>
        </section>

        <section className="card p-6 space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">4. Časté problémy</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li><strong>„Backend neběží“</strong> — Chybí NEXT_PUBLIC_API_MODE=http nebo restart Next.js po změně env.</li>
            <li><strong>CORS / 404</strong> — Použijte proxy: NEXT_PUBLIC_USE_API_PROXY=true a API_BACKEND_URL na serveru.</li>
            <li><strong>SMS při registraci</strong> — V API nastavit FAYN v Nastavení a env FAYN_SMS_PASSWORD.</li>
          </ul>
        </section>

        <p className="text-sm text-gray-500">
          Podrobný návod je v souboru <strong>NASAZENI.md</strong> v kořeni repozitáře. Více o funkcích v docs/About.md.
        </p>
      </div>
    </main>
  );
}
