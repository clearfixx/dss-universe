import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

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
    <nav aria-label="Навігаційний шлях" className="mb-5 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link
            href="/"
            aria-label="DSS Universe"
            className="flex items-center text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Home className="size-4" aria-hidden="true" />
          </Link>
        </li>
        {parts.map((part, index) => (
          <li key={`${part.href}-${index}`} className="flex items-center gap-2">
            <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
            {index === parts.length - 1 && (routeTrail || pathname === part.href) ? (
              <span aria-current="page" className="font-medium text-foreground">
                {part.label}
              </span>
            ) : part.href ? (
              <Link href={part.href} className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {part.label}
              </Link>
            ) : (
              <span>{part.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
