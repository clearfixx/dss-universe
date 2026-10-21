"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site.config";

type Status = "working" | "success" | "error";

export function VerifyEmailForm() {
  const [status, setStatus] = useState<Status>("working");

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      queueMicrotask(() => setStatus("error"));
      return;
    }
    window.history.replaceState(null, "", window.location.pathname);
    void fetch(siteConfig.graphqlUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query:
          "mutation VerifyEmail($input: VerifyEmailInput!) { verifyEmail(input: $input) { success } }",
        variables: { input: { token } },
      }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: { verifyEmail?: { success?: boolean } };
        };
        setStatus(payload.data?.verifyEmail?.success ? "success" : "error");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-semibold">Підтвердження email</h1>
      <p className="mt-4">
        {status === "working"
          ? "Перевіряємо посилання…"
          : status === "success"
            ? "Email підтверджено."
            : "Посилання недійсне або прострочене."}
      </p>
      <Link
        className="mt-6 inline-block underline"
        href={status === "success" ? "/settings/profile" : "/login"}
      >
        Продовжити
      </Link>
    </main>
  );
}
