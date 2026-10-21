import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NewsPagination, paginationItems } from "./news-pagination";

afterEach(cleanup);

describe("NewsPagination", () => {
  it("renders both controls and marks every loaded page active", () => {
    render(
      <NewsPagination
        mode="BOTH"
        totalPages={15}
        activePages={[1, 2]}
        canLoadMore
        onPageChange={vi.fn()}
        onLoadMore={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Завантажити ще" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сторінка 1" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("button", { name: "Сторінка 2" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByLabelText("Вибрати сторінку")).toBeInTheDocument();
    expect(screen.getByLabelText("Номер сторінки")).toBeInTheDocument();
  });

  it("supports select, manual input and load more independently", () => {
    const onPageChange = vi.fn();
    const onLoadMore = vi.fn();
    render(
      <NewsPagination
        mode="BOTH"
        totalPages={15}
        activePages={[1]}
        canLoadMore
        onPageChange={onPageChange}
        onLoadMore={onLoadMore}
      />,
    );
    fireEvent.change(screen.getByLabelText("Вибрати сторінку"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("Номер сторінки"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Перейти" }));
    fireEvent.click(screen.getByRole("button", { name: "Завантажити ще" }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 5);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 12);
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("hides every control when pagination is disabled", () => {
    const { container } = render(
      <NewsPagination
        mode="DISABLED"
        totalPages={15}
        activePages={[1]}
        canLoadMore
        onPageChange={vi.fn()}
        onLoadMore={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("paginationItems", () => {
  it("keeps boundary and nearby pages with ellipses", () => {
    expect(paginationItems(8, 15)).toEqual([
      1,
      "ellipsis",
      7,
      8,
      9,
      "ellipsis",
      15,
    ]);
  });
});
