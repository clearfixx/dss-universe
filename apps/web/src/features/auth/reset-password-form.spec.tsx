import { StrictMode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "./reset-password-form";

const reset = vi.hoisted(() => vi.fn());
vi.mock("./auth-actions", () => ({ resetPasswordAction: reset }));
describe("reset password link", () => {
  afterEach(cleanup);
  beforeEach(() => {
    window.history.replaceState(null, "", "/reset-password");
    reset.mockReset();
  });
  it("captures the credential exactly once under StrictMode and removes it from the URL", async () => {
    const token = "a".repeat(64);
    window.history.replaceState(null, "", `/reset-password#token=${token}`);
    const { container } = render(
      <StrictMode>
        <ResetPasswordForm />
      </StrictMode>,
    );
    await screen.findByRole("button", { name: "Set new password" });
    expect(window.location.hash).toBe("");
    expect(
      container.querySelector<HTMLInputElement>('input[name="token"]')?.value,
    ).toBe(token);
  });
  it("rejects missing or malformed credentials without presenting a password form", async () => {
    render(<ResetPasswordForm />);
    await screen.findByText(/missing or invalid/);
    expect(
      screen.queryByRole("button", { name: "Set new password" }),
    ).not.toBeInTheDocument();
  });
  it("replaces the form with a sign-in link after a successful reset", async () => {
    reset.mockResolvedValue({
      status: "success",
      message: "Password changed.",
    });
    window.history.replaceState(
      null,
      "",
      `/reset-password#token=${"a".repeat(64)}`,
    );
    render(<ResetPasswordForm />);
    fireEvent.change(await screen.findByLabelText("New password"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "new-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });
});
