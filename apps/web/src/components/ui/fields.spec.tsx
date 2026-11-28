import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./input";
import { Textarea } from "./textarea";

describe("Text fields", () => {
  it("preserves input ref, name, validation and change events", () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();

    render(
      <Input
        ref={ref}
        aria-label="Email"
        aria-invalid
        name="email"
        type="email"
        className="rounded-full bg-card"
        onChange={onChange}
      />,
    );

    const field = screen.getByRole("textbox", { name: "Email" });
    expect(ref.current).toBe(field);
    expect(field.getAttribute("name")).toBe("email");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.classList.contains("rounded-full")).toBe(true);
    expect(field.classList.contains("bg-card")).toBe(true);
    expect(field.classList.contains("bg-field")).toBe(false);
    fireEvent.change(field, { target: { value: "test@example.com" } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("preserves textarea ref and native form attributes", () => {
    const ref = createRef<HTMLTextAreaElement>();

    render(
      <Textarea ref={ref} aria-label="Description" name="description" disabled required />,
    );

    const field = screen.getByRole("textbox", { name: "Description" });
    expect(ref.current).toBe(field);
    expect(field.getAttribute("name")).toBe("description");
    expect(field.hasAttribute("disabled")).toBe(true);
    expect(field.hasAttribute("required")).toBe(true);
  });
});
