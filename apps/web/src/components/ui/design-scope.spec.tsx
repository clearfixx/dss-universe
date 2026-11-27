import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DesignScope } from "./design-scope";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

describe("DesignScope overlays", () => {
  it("passes scope through a dialog portal and restores trigger focus", async () => {
    const { container } = render(
      <DesignScope>
        <Dialog>
          <DialogTrigger>Open dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Scoped dialog</DialogTitle>
            <DialogDescription>Preview content</DialogDescription>
          </DialogContent>
        </Dialog>
      </DesignScope>,
    );

    const trigger = screen.getByRole("button", { name: "Open dialog" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Scoped dialog" });
    expect(dialog).toHaveAttribute("data-dss-design", "v1");
    expect(container.contains(dialog)).toBe(false);
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("keeps unscoped dialogs on the legacy contract", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Legacy dialog</DialogTitle>
          <DialogDescription>Legacy content</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(await screen.findByRole("dialog")).not.toHaveAttribute("data-dss-design");
  });

  it("passes scope to a sheet without moving its portal", async () => {
    const { container } = render(
      <DesignScope>
        <Sheet defaultOpen>
          <SheetContent>
            <SheetTitle>Scoped sheet</SheetTitle>
            <SheetDescription>Preview content</SheetDescription>
          </SheetContent>
        </Sheet>
      </DesignScope>,
    );
    const sheet = await screen.findByRole("dialog", { name: "Scoped sheet" });
    expect(sheet).toHaveAttribute("data-dss-design", "v1");
    expect(container.contains(sheet)).toBe(false);
  });

  it("passes scope to dropdown content", async () => {
    const { container } = render(
      <DesignScope>
        <DropdownMenu defaultOpen modal={false}>
          <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </DesignScope>,
    );
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveAttribute("data-dss-design", "v1");
    expect(container.contains(menu)).toBe(false);
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
  });
});
