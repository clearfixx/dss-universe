import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { breadcrumbsForPath, type TrustedPageTitle } from "./shell-navigation";

/** A route-owned breadcrumb trail; the last item is the current page. */
export type TrustedBreadcrumb = Readonly<{ href?: string; label: string }>;

export function Breadcrumbs({
  pathname,
  pageTitle,
  trail,
}: {
  pathname: string;
  pageTitle?: TrustedPageTitle;
  trail?: readonly TrustedBreadcrumb[];
}) {
  // A non-link final crumb is accepted only with matching route-owned metadata.
  const last = trail?.at(-1);
  const routeTrail = Boolean(
    last && (last.href === pathname || (!last.href && pageTitle?.pathname === pathname && last.label === pageTitle.title)),
  );
  const parts = routeTrail ? trail! : breadcrumbsForPath(pathname, pageTitle);
  if (!parts.length) return null;
  return (
    <nav aria-label="Навігаційний шлях" className="mb-4 min-w-0 text-sm text-muted-foreground">
      <ol className="flex min-w-0 items-center gap-2 sm:flex-wrap">
        <li className={cn("shrink-0", parts.length > 1 && "hidden sm:block")}>
          <Link
            href="/"
            aria-label="DSS Universe"
            className="flex items-center text-link hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Home className="size-4" aria-hidden="true" />
          </Link>
        </li>
        {parts.map((part, index) => (
          <li key={`${part.href}-${index}`} className={cn("flex min-w-0 items-center gap-2", index < parts.length - 2 && "hidden sm:flex", index === parts.length - 1 ? "flex-1 sm:flex-none" : "max-w-[45%] sm:max-w-none")}>
            <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground", parts.length > 1 && index === parts.length - 2 && "hidden sm:block")} aria-hidden="true" />
            {index === parts.length - 1 && (routeTrail || pathname === part.href) ? (
              <span aria-current="page" className="min-w-0 truncate sm:whitespace-normal sm:break-words font-medium text-foreground">
                {part.label}
              </span>
            ) : part.href ? (
              <Link href={part.href} className="min-w-0 truncate sm:whitespace-normal sm:break-words text-link hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {part.label}
              </Link>
            ) : (
              <span className="min-w-0 truncate sm:whitespace-normal sm:break-words">{part.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
