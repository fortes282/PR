/**
 * Placeholder for email/SMS verification. Backend: implement POST /auth/verify with token.
 */
export default function VerifyPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-4">
      <div className="card w-full max-w-md p-6 text-center">
        <h1 className="text-xl font-bold text-primary-700">Ověření</h1>
        <p className="mt-2 text-gray-600">
          Stránka pro ověření e-mailu nebo SMS. Backend: POST /auth/verify s tokenem.
        </p>
      </div>
    </main>
  );
}
