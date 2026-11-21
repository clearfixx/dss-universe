/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-errors.ts
 *
 * 🎯 Purpose:
 * Turns API failures into a small, typed set of forum errors that screens
 * can render without parsing messages themselves.
 *
 * ⚠️ Important:
 * Pure and framework-free so server actions and client components share it.
 * The API reports read-only mode as FORBIDDEN with a stable message prefix.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { CombinedGraphQLErrors } from "@apollo/client/errors";

export type ForumErrorCode =
  | "NOT_SIGNED_IN"
  | "READ_ONLY"
  | "RATE_LIMITED"
  | "ACCESS_DENIED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_INPUT"
  | "UNKNOWN";

export type ForumError = Readonly<{
  code: ForumErrorCode;
  message: string;
  /** Present for READ_ONLY when the API names the end of the restriction. */
  readOnlyUntil?: string;
}>;

export type ForumResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: ForumError }>;

const MESSAGES: Record<ForumErrorCode, string> = {
  NOT_SIGNED_IN: "Увійдіть, щоб писати та голосувати на форумі.",
  READ_ONLY: "Ваш акаунт тимчасово в режимі лише читання.",
  RATE_LIMITED: "Зачекайте хвилину між дописами.",
  ACCESS_DENIED: "Недостатньо прав для цієї дії.",
  NOT_FOUND: "Тему або допис не знайдено.",
  CONFLICT: "Дані щойно змінилися. Оновіть сторінку й спробуйте ще раз.",
  INVALID_INPUT: "Перевірте введені дані.",
  UNKNOWN: "Щось пішло не так. Спробуйте пізніше.",
};

const READ_ONLY_PREFIX = "Your account is read-only until ";

const BY_API_CODE: Record<string, ForumErrorCode> = {
  UNAUTHENTICATED: "NOT_SIGNED_IN",
  RATE_LIMITED: "RATE_LIMITED",
  FORBIDDEN: "ACCESS_DENIED",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  BAD_USER_INPUT: "INVALID_INPUT",
};

export function forumError(code: ForumErrorCode, detail?: string): ForumError {
  return { code, message: detail ?? MESSAGES[code] };
}

/** Maps a thrown Apollo/API error to a forum error; never throws. */
export function toForumError(error: unknown): ForumError {
  if (error instanceof ForumSignInRequired) return forumError("NOT_SIGNED_IN");
  if (!CombinedGraphQLErrors.is(error)) return forumError("UNKNOWN");
  const first = error.errors[0];
  const apiCode =
    typeof first?.extensions?.code === "string" ? first.extensions.code : "";
  const message = first?.message ?? "";
  if (apiCode === "FORBIDDEN" && message.startsWith(READ_ONLY_PREFIX)) {
    const until = message.slice(READ_ONLY_PREFIX.length).replace(/\.$/, "");
    return { ...forumError("READ_ONLY"), readOnlyUntil: until };
  }
  const code = BY_API_CODE[apiCode] ?? "UNKNOWN";
  // Validation messages from the API are specific and safe to show as-is.
  return code === "INVALID_INPUT" && message
    ? forumError(code, message)
    : forumError(code);
}

/** Thrown by actions when no session token exists. */
export class ForumSignInRequired extends Error {
  constructor() {
    super("Forum action requires a signed-in user.");
  }
}

export async function forumResult<T>(
  run: () => Promise<T>,
): Promise<ForumResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    return { ok: false, error: toForumError(error) };
  }
}
