import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./table";

describe("Data display primitives", () => {
  it("preserves native table semantics and column scope", () => {
    render(
      <Table>
        <TableCaption>Activity</TableCaption>
        <TableHeader><TableRow><TableHead>State</TableHead></TableRow></TableHeader>
        <TableBody><TableRow><TableCell>Ready</TableCell></TableRow></TableBody>
      </Table>,
    );
    expect(screen.getByRole("table", { name: "Activity" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "State" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("cell", { name: "Ready" })).toBeInTheDocument();
  });

  it("renders semantic status variants with visible text", () => {
    render(<><Badge variant="success">Ready</Badge><Badge variant="warning">Pending</Badge><Badge variant="info">Notice</Badge></>);
    expect(screen.getByText("Ready")).toHaveAttribute("data-variant", "success");
    expect(screen.getByText("Pending")).toHaveAttribute("data-variant", "warning");
    expect(screen.getByText("Notice")).toHaveAttribute("data-variant", "info");
  });
});
