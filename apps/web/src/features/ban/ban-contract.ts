/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Ban
 * 📄 File: apps/web/src/features/ban/ban-contract.ts
 *
 * 🎯 Purpose:
 * Pure rules of the ban screen: the ticket cookie, appeal limits and texts.
 *
 * ⚠️ Important:
 * The ticket is not a session. The API re-checks every limit shown here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const BAN_COOKIE = "dss_ban_ticket";
/** Matches the lifetime of the API ticket. */
export const BAN_TICKET_MAX_AGE = 30 * 60;

export const BAN_PATH = "/banned";
export const APPEAL_TEXT_MIN = 3;
export const APPEAL_TEXT_MAX = 1000;
export const APPEAL_MAX_FILES = 5;
export const APPEAL_MAX_BYTES = 10 * 1024 * 1024;
export const APPEAL_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const APPEAL_FILE_ACCEPT = ".jpg,.jpeg,.png,.webp";

/** The ticket of a failed login, when the account is banned. */
export function banTicketFrom(
  error: { message?: string; extensions?: unknown } | undefined,
): string | null {
  if (error?.message !== "ACCOUNT_BANNED") return null;
  const ticket = (error.extensions as { banTicket?: unknown } | undefined)
    ?.banTicket;
  return typeof ticket === "string" && ticket ? ticket : null;
}

/** While a ticket is held, every other page leads back to the ban screen. */
export function isOpenDuringBan(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === BAN_PATH ||
    pathname.startsWith(`${BAN_PATH}/`)
  );
}

export function appealFileError(
  file: Readonly<{ type: string; size: number }>,
): string | null {
  if (!APPEAL_FILE_TYPES.includes(file.type))
    return "Можна додати лише картинки JPG, PNG або WebP.";
  if (file.size > APPEAL_MAX_BYTES) return "Картинка більша за 10 МБ.";
  return file.size > 0 ? null : "Файл порожній.";
}

const bannedAtFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Kyiv",
  timeZoneName: "short",
});

export function formatBanDate(value: unknown): string {
  return bannedAtFormatter.format(new Date(String(value)));
}
