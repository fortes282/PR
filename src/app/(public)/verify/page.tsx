"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function VerifyContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    setStatus("success");
  }, [token]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-4">
      <div className="card w-full max-w-md p-6 text-center">
        <h1 className="text-xl font-bold text-primary-700">Ověření účtu</h1>
        {status === "checking" && (
          <p className="mt-4 text-gray-600">Ověřuji...</p>
        )}
        {status === "success" && (
          <>
            <p className="mt-4 text-emerald-600 font-medium">
              Účet byl ověřen. Nyní se můžete přihlásit.
            </p>
            <Link href="/login" className="btn-primary mt-4 inline-block">
              Přihlásit se
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="mt-4 text-gray-600">
              {token
                ? "Ověřovací odkaz je neplatný nebo vypršel."
                : "Chybí ověřovací token. Zkontrolujte odkaz z e-mailu."}
            </p>
            <Link href="/login" className="btn-primary mt-4 inline-block">
              Přejít na přihlášení
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage(): React.ReactElement {
  return (
    <Suspense fallback={<p className="text-gray-600">Načítám…</p>}>
      <VerifyContent />
    </Suspense>
  );
}
