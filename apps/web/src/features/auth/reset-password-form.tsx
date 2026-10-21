"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { resetPasswordAction } from "./auth-actions";
import { initialAuthFormState } from "./auth-contracts";
import { AuthField } from "./auth-field";
import styles from "./auth-gateway.module.css";

export function ResetPasswordForm() {
  const captured = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [state, action, pending] = useActionState(
    resetPasswordAction,
    initialAuthFormState,
  );
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    setToken(/^[a-f0-9]{64}$/.test(value) ? value : "");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  if (token === null)
    return (
      <p className={styles.secureLinkStatus} role="status">
        <LoaderCircle className={styles.spinner} /> Opening secure link…
      </p>
    );
  if (!token)
    return (
      <p className={styles.formMessage} role="alert">
        This reset link is missing or invalid.{" "}
        <Link href="/forgot-password">Request a new link</Link>.
      </p>
    );
  if (state.status === "success")
    return (
      <div className={styles.form}>
        <p className={styles.formMessage} data-status="success" role="status">
          {state.message}
        </p>
        <Link className={styles.submit} href="/login">
          Sign in
        </Link>
      </div>
    );
  return (
    <form
      className={styles.form}
      action={action}
      aria-busy={pending}
      noValidate
    >
      <input type="hidden" name="token" value={token} />
      <AuthField
        name="password"
        label="New password"
        type={passwordVisible ? "text" : "password"}
        icon={<LockKeyhole />}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        minLength={8}
        maxLength={72}
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
      <AuthField
        name="confirmPassword"
        label="Confirm password"
        type={passwordVisible ? "text" : "password"}
        icon={<LockKeyhole />}
        autoComplete="new-password"
        placeholder="Repeat your password"
        minLength={8}
        maxLength={72}
        errors={state.fields?.confirmPassword}
      />
      <p className={styles.passwordHint}>
        Use at least 8 characters. All existing sessions will be signed out.
      </p>
      {state.message && (
        <p
          className={styles.formMessage}
          data-status={state.status}
          role="alert"
        >
          {state.message}
        </p>
      )}
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? <LoaderCircle className={styles.spinner} /> : null}
        {pending ? "Updating password…" : "Set new password"}
        {!pending ? <ArrowRight /> : null}
      </button>
      <Link className={styles.switchMode} href="/forgot-password">
        Request another link
      </Link>
    </form>
  );
}
