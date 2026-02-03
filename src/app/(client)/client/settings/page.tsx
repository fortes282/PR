"use client";

import { useState } from "react";
import { getSession } from "@/lib/auth/session";

export default function ClientSettingsPage(): React.ReactElement {
  const session = getSession();
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nastavení</h1>
      <p className="text-gray-600">Preference oznámení (mock). Backend: PATCH /users/me/preferences</p>
      <div className="card max-w-md space-y-4 p-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={emailNotif}
            onChange={(e) => setEmailNotif(e.target.checked)}
            className="rounded border-gray-300"
          />
          E-mailová oznámení
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={smsNotif}
            onChange={(e) => setSmsNotif(e.target.checked)}
            className="rounded border-gray-300"
          />
          SMS oznámení
        </label>
      </div>
    </div>
  );
}
