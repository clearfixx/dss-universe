import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthForm } from "./auth-form";

const actions = vi.hoisted(() => ({
  login: vi.fn(),
  recovery: vi.fn(),
  register: vi.fn(),
}));

vi.mock("./auth-actions", () => ({
  loginAction: actions.login,
  recoveryAction: actions.recovery,
  registerAction: actions.register,
}));

describe("authentication form UX", () => {
  afterEach(cleanup);

  beforeEach(() => {
    actions.login.mockReset();
    actions.recovery.mockReset();
    actions.register.mockReset();
  });

  it("exposes the complete sign-in flow and toggles password visibility", () => {
    const { container } = render(
      <AuthForm mode="login" returnTo="/newsroom/new?draft=1" />,
    );

    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByText(/continue with GitHub/i)).not.toBeInTheDocument();
    expect(
      container.querySelector<HTMLInputElement>('input[name="returnTo"]')
        ?.value,
    ).toBe("/newsroom/new?draft=1");
    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toHaveAttribute(
      "href",
      "/register?returnTo=%2Fnewsroom%2Fnew%3Fdraft%3D1",
    );
  });

  it("renders registration identity, confirmation and consent controls", () => {
    render(<AuthForm mode="register" />);

    expect(screen.getByLabelText("Display name")).toBeRequired();
    expect(screen.getByLabelText(/Username/)).toHaveAttribute(
      "autocomplete",
      "username",
    );
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByRole("checkbox")).toHaveAttribute("name", "terms");
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });

  it("replaces recovery inputs with a non-enumerating success state", async () => {
    actions.recovery.mockResolvedValue({
      status: "success",
      message:
        "If an active account matches this email, you’ll receive a reset link shortly.",
    });
    render(<AuthForm mode="recovery" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "dev@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send recovery link" }));

    await waitFor(() =>
      expect(screen.getByText("Check your inbox")).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Back to sign in/ }),
    ).toHaveAttribute("href", "/login");
  });
});
