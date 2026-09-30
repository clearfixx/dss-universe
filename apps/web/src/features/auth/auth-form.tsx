"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { loginAction, recoveryAction, registerAction } from "./auth-actions";
import { initialAuthFormState, type AuthMode } from "./auth-contracts";
import { AuthField } from "./auth-field";
import styles from "./auth-gateway.module.css";

const actions = {
  login: loginAction,
  register: registerAction,
  recovery: recoveryAction,
};

export function AuthForm({
  mode,
  returnTo = "/",
}: {
  mode: Exclude<AuthMode, "reset">;
  returnTo?: string;
}) {
  const [state, action, pending] = useActionState(
    actions[mode],
    initialAuthFormState,
  );
  const [passwordVisible, setPasswordVisible] = useState(false);

  if (mode === "recovery" && state.status === "success") {
    return (
      <div className={styles.recoveryComplete} role="status">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <h3>Check your inbox</h3>
          <p>{state.message}</p>
        </div>
        <Link className={styles.submit} href="/login">
          Back to sign in <ArrowRight />
        </Link>
      </div>
    );
  }

  return (
    <form
      action={action}
      className={styles.form}
      aria-busy={pending}
      noValidate
    >
      {mode !== "recovery" ? (
        <input type="hidden" name="returnTo" value={returnTo} />
      ) : null}
      {mode === "register" ? (
        <>
          <AuthField
            name="displayName"
            label="Display name"
            icon={<UserRound />}
            autoComplete="name"
            placeholder="How the community sees you"
            errors={state.fields?.displayName}
            defaultValue={state.values?.displayName}
          />
          <AuthField
            name="username"
            label="Username"
            icon={<span aria-hidden="true">@</span>}
            autoComplete="username"
            placeholder="choose_a_username"
            errors={state.fields?.username}
            defaultValue={state.values?.username}
          />
        </>
      ) : null}

      <AuthField
        name="email"
        label="Email"
        type="email"
        icon={<Mail />}
        autoComplete="email"
        placeholder="you@company.com"
        errors={state.fields?.email}
        defaultValue={state.values?.email}
      />

      {mode !== "recovery" ? (
        <AuthField
          name="password"
          label="Password"
          type={passwordVisible ? "text" : "password"}
          icon={<LockKeyhole />}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={
            mode === "login" ? "Enter your password" : "At least 8 characters"
          }
          errors={state.fields?.password}
          trailing={
            <button
              type="button"
              className={styles.reveal}
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
            >
              {passwordVisible ? <EyeOff /> : <Eye />}
            </button>
          }
        />
      ) : null}

      {mode === "register" ? (
        <>
          <AuthField
            name="confirmPassword"
            label="Confirm password"
            type={passwordVisible ? "text" : "password"}
            icon={<LockKeyhole />}
            autoComplete="new-password"
            placeholder="Repeat your password"
            errors={state.fields?.confirmPassword}
          />
          <label className={styles.checkbox}>
            <input type="checkbox" name="terms" />
            <span>
              I agree to the <Link href="/terms">Terms of Service</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </span>
          </label>
          {state.fields?.terms?.length ? (
            <span className={styles.fieldError}>{state.fields.terms[0]}</span>
          ) : null}
        </>
      ) : null}

      {mode === "login" ? (
        <div className={styles.formOptions}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="remember"
              defaultChecked={state.values?.remember}
            />
            <span>Keep me signed in</span>
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      ) : null}

      {state.message ? (
        <p
          className={styles.formMessage}
          data-status={state.status}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}

      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? <LoaderCircle className={styles.spinner} /> : null}
        {mode === "login"
          ? pending
            ? "Opening station…"
            : "Sign in"
          : mode === "register"
            ? pending
              ? "Creating account…"
              : "Create account"
            : pending
              ? "Checking access…"
              : "Send recovery link"}
        {!pending ? <ArrowRight /> : null}
      </button>

      <p className={styles.switchMode}>
        {mode === "login" ? (
          <>
            New to DSS?{" "}
            <Link href={withReturnTo("/register", returnTo)}>
              Create account
            </Link>
          </>
        ) : mode === "register" ? (
          <>
            Already have an account?{" "}
            <Link href={withReturnTo("/login", returnTo)}>Sign in</Link>
          </>
        ) : (
          <Link href="/login">
            <ArrowLeft /> Back to sign in
          </Link>
        )}
      </p>
    </form>
  );
}

function withReturnTo(pathname: string, returnTo: string) {
  return returnTo === "/"
    ? pathname
    : `${pathname}?returnTo=${encodeURIComponent(returnTo)}`;
}
