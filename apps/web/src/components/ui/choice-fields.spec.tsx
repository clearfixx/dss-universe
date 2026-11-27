import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Checkbox, Label, NativeSelect, Radio, Switch } from "./choice-fields";

describe("Native choice fields", () => {
  it("retains labels, refs, native values and form submission", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <form aria-label="Preferences">
        <Label htmlFor="sort">Sort</Label>
        <NativeSelect id="sort" name="sort" defaultValue="new" ref={ref}>
          <option value="new">Newest</option>
          <option value="old">Oldest</option>
        </NativeSelect>
        <Label><Checkbox name="notify" defaultChecked /> Notifications</Label>
        <Label><Radio name="visibility" value="public" defaultChecked /> Public</Label>
        <Label><Radio name="visibility" value="private" /> Private</Label>
        <Label><Switch name="digest" /> Digest</Label>
      </form>,
    );
    const select = screen.getByRole("combobox", { name: "Sort" });
    expect(ref.current).toBe(select);
    fireEvent.change(select, { target: { value: "old" } });
    fireEvent.click(screen.getByRole("radio", { name: "Private" }));
    fireEvent.click(screen.getByRole("switch", { name: "Digest" }));
    expect(screen.getByRole("switch")).toBeChecked();
    const form = screen.getByRole("form", { name: "Preferences" }) as HTMLFormElement;
    expect(Object.fromEntries(new FormData(form))).toEqual({ sort: "old", notify: "on", visibility: "private", digest: "on" });
  });

  it("keeps disabled and invalid attributes and caller overrides", () => {
    render(<Checkbox aria-label="Locked" disabled aria-invalid className="size-6" />);
    const field = screen.getByRole("checkbox", { name: "Locked" });
    expect(field).toBeDisabled();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveClass("size-6");
    expect(field).not.toHaveClass("size-4");
  });
});
