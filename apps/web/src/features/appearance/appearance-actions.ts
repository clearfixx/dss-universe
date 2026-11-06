"use server";

import { cookies } from "next/headers";

import { isShellVariant } from "@/components/shell/shell-navigation";
import { siteConfig } from "@/config/site.config";
import { ACCESS_COOKIE } from "@/features/auth/session-contract";

export type AppearanceActionState = {
  status: "idle" | "success" | "error";
  message: string;
  savedVariant?: string;
};

export async function savePlatformShellVariant(
  _previous: AppearanceActionState,
  formData: FormData,
): Promise<AppearanceActionState> {
  const selected = formData.get("variant");
  if (!isShellVariant(selected)) {
    return { status: "error", message: "Невідомий варіант оболонки." };
  }
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) {
    return { status: "error", message: "Потрібна авторизація." };
  }

  try {
    const response = await fetch(siteConfig.graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `mutation UpdatePlatformAppearance($variant: ShellVariant!) {
          updatePlatformAppearance(activeShellVariant: $variant) { activeShellVariant }
        }`,
        variables: { variant: selected },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return { status: "error", message: "Сервер не зміг зберегти налаштування." };
    }
    const payload = (await response.json()) as {
      data?: { updatePlatformAppearance?: { activeShellVariant?: string } };
      errors?: { message?: string }[];
    };
    if (payload.errors?.length ||
        payload.data?.updatePlatformAppearance?.activeShellVariant !== selected) {
      return { status: "error", message: "Зміни відхилено. Перевірте права доступу." };
    }
    return { status: "success", message: "Варіант навігації збережено.", savedVariant: selected };
  } catch {
    return { status: "error", message: "Немає зв’язку з API. Повторіть збереження." };
  }
}
