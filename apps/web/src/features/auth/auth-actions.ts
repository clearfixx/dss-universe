"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site.config";

import {
  loginSchema,
  recoverySchema,
  resetPasswordSchema,
  registerSchema,
  type AuthFormState,
} from "./auth-contracts";
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  PERSISTENT_SESSION_COOKIE,
  REFRESH_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  safeReturnTo,
  sessionCookieOptions,
} from "./session-contract";

type AuthPayload = {
  user: { id: string };
  tokens: { accessToken: string; refreshToken: string };
};

type GraphqlResponse = {
  data?: { login?: AuthPayload; register?: AuthPayload };
  errors?: Array<{ message?: string }>;
};

const LOGIN = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      user { id }
      tokens { accessToken refreshToken }
    }
  }
`;

const REGISTER = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      user { id }
      tokens { accessToken refreshToken }
    }
  }
`;

export async function loginAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    twoFactorCode: formData.get("twoFactorCode"),
  });
  const values = {
    email: String(formData.get("email") ?? ""),
    remember: formData.get("remember") === "on",
  };
  if (!parsed.success)
    return validationFailure(parsed.error.flatten().fieldErrors, values);

  const result = await authenticate("login", LOGIN, parsed.data);
  if ("error" in result) return { ...result.error, values };
  await persistSession(result.payload, values.remember);
  redirect(safeReturnTo(String(formData.get("returnTo") ?? "")));
}

export async function registerAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    terms: formData.get("terms"),
  });
  const values = {
    displayName: String(formData.get("displayName") ?? ""),
    username: String(formData.get("username") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  if (!parsed.success)
    return validationFailure(parsed.error.flatten().fieldErrors, values);

  const input = {
    displayName: parsed.data.displayName,
    username: parsed.data.username,
    email: parsed.data.email,
    password: parsed.data.password,
  };
  const result = await authenticate("register", REGISTER, input);
  if ("error" in result) return { ...result.error, values };
  await persistSession(result.payload);
  redirect(safeReturnTo(String(formData.get("returnTo") ?? "")));
}

export async function recoveryAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = recoverySchema.safeParse({ email: formData.get("email") });
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success)
    return validationFailure(parsed.error.flatten().fieldErrors, values);

  const result = await recoveryMutation("requestPasswordRecovery", parsed.data);
  if (!result)
    return {
      status: "error",
      message:
        "Password recovery is temporarily unavailable. Please try again later.",
      values,
    };
  return {
    status: "success",
    message:
      "If an active account matches this email, you’ll receive a reset link shortly. Check your inbox and spam folder.",
  };
}

export async function resetPasswordAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success)
    return validationFailure(parsed.error.flatten().fieldErrors);
  const result = await recoveryMutation("resetPassword", {
    token: parsed.data.token,
    password: parsed.data.password,
  });
  if (!result)
    return {
      status: "error",
      message:
        "This link could not be used. It may have expired or already been used. Request a new link, or try again later.",
    };
  const store = await cookies();
  clearSessionCookies(store);
  return {
    status: "success",
    message:
      "Your password has been changed. All previous sessions have been signed out. Sign in with your new password.",
  };
}

export async function logoutAction(): Promise<never> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;

  if (accessToken) {
    try {
      await fetch(siteConfig.graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
        body: JSON.stringify({
          query: "mutation Logout { logout { success } }",
        }),
      });
    } catch {
      // Local credentials are still removed when the API is unavailable.
    }
  }

  clearSessionCookies(store);
  redirect("/login?loggedOut=1");
}

async function recoveryMutation(
  operation: "requestPasswordRecovery" | "resetPassword",
  input: Record<string, string>,
): Promise<boolean> {
  const inputType =
    operation === "resetPassword"
      ? "ResetPasswordInput"
      : "RequestPasswordRecoveryInput";
  try {
    const response = await fetch(siteConfig.graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        query: `mutation Recovery($input: ${inputType}!) { ${operation}(input: $input) { success } }`,
        variables: { input },
      }),
    });
    const body = (await response.json()) as {
      data?: Record<string, { success: boolean }>;
      errors?: unknown[];
    };
    return (
      response.ok &&
      !body.errors?.length &&
      body.data?.[operation]?.success === true
    );
  } catch {
    return false;
  }
}

async function authenticate(
  field: "login" | "register",
  query: string,
  input: Record<string, string>,
): Promise<{ payload: AuthPayload } | { error: AuthFormState }> {
  try {
    const response = await fetch(siteConfig.graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { input } }),
      cache: "no-store",
    });
    const body = (await response.json()) as GraphqlResponse;
    const payload = body.data?.[field];
    if (!response.ok || !payload) {
      return {
        error: {
          status: "error",
          message: publicAuthError(body.errors?.[0]?.message, field),
        },
      };
    }
    return { payload };
  } catch {
    return {
      error: {
        status: "error",
        message:
          "The station could not reach the authentication service. Try again in a moment.",
      },
    };
  }
}

async function persistSession(
  payload: AuthPayload,
  remember = false,
): Promise<void> {
  const cookieStore = await cookies();
  const shared = sessionCookieOptions(process.env.NODE_ENV === "production");
  cookieStore.set(ACCESS_COOKIE, payload.tokens.accessToken, {
    ...shared,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(REFRESH_COOKIE, payload.tokens.refreshToken, {
    ...shared,
    ...(remember ? { maxAge: REFRESH_TOKEN_MAX_AGE } : {}),
  });
  if (remember) {
    cookieStore.set(PERSISTENT_SESSION_COOKIE, "1", {
      ...shared,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  } else {
    cookieStore.delete(PERSISTENT_SESSION_COOKIE);
  }
}

function clearSessionCookies(store: Awaited<ReturnType<typeof cookies>>) {
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(PERSISTENT_SESSION_COOKIE);
}

function validationFailure(
  fields: Record<string, string[] | undefined>,
  values?: AuthFormState["values"],
): AuthFormState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    fields: Object.fromEntries(
      Object.entries(fields).filter((entry): entry is [string, string[]] =>
        Boolean(entry[1]),
      ),
    ),
    values,
  };
}

function publicAuthError(
  message: string | undefined,
  field: "login" | "register",
): string {
  if (field === "register" && /email|already|exist/i.test(message ?? "")) {
    return "An account with this email already exists.";
  }
  if (field === "login" && /two-factor|recovery code/i.test(message ?? "")) {
    return "Enter a valid authenticator or recovery code.";
  }
  if (field === "login") return "Email or password is incorrect.";
  return "The account could not be created. Please review your details.";
}
