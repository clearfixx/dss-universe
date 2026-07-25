/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Media Platform Web
 * 📄 File: apps/web/src/components/media/media-library.tsx
 *
 * 🎯 Purpose:
 * Renders the authenticated Mission Control Media Library workspace.
 *
 * 🧠 Responsibilities:
 * • queries the permission-protected GraphQL catalog and metrics;
 * • exposes URL-backed search and lifecycle filters;
 * • presents storage, orphan, quarantine, and failure visibility;
 * • provides an operator retry control for failed processing.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  AlertTriangle,
  Archive,
  Boxes,
  Database,
  File,
  FileImage,
  HardDrive,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

import { retryFailedMedia } from "@/app/media/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorState, EmptyState } from "@/components/states/async-states";
import { MediaLibraryDocument, type MediaStatus } from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { cn } from "@/lib/utils";

import {
  createMediaLibraryInput,
  createNextPageHref,
  formatBytes,
  MEDIA_KINDS,
  MEDIA_STATUSES,
  MEDIA_VISIBILITIES,
  type MediaLibrarySearchParams,
} from "./media-library.utils";

function statusClass(status: MediaStatus): string {
  if (status === "READY") return "border-emerald-400/25 text-emerald-300";
  if (status === "FAILED") return "border-red-400/25 text-red-300";
  if (status === "QUARANTINED") return "border-amber-400/25 text-amber-300";
  return "border-sky-400/25 text-sky-300";
}

export async function MediaLibrary({
  searchParams,
}: {
  searchParams: MediaLibrarySearchParams;
}) {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) {
    return (
      <ErrorState
        title="Mission Control authentication required"
        description="Sign in with an account that can access the Media Library."
      />
    );
  }

  let result;
  try {
    result = await getClient().query({
      query: MediaLibraryDocument,
      variables: { input: createMediaLibraryInput(searchParams) },
      context: {
        headers: { authorization: `Bearer ${token}` },
      },
      fetchPolicy: "no-cache",
    });
  } catch {
    return (
      <ErrorState
        title="Media Library is unavailable"
        description="The catalog could not be loaded or this account lacks the required permission."
      />
    );
  }

  const data = result.data;
  if (!data) {
    return (
      <ErrorState
        title="Media Library returned no data"
        description="The GraphQL request completed without a usable catalog response."
      />
    );
  }
  const { mediaLibrary, mediaLibraryMetrics: metrics } = data;
  const metricCards = [
    {
      label: "Managed media",
      value: metrics.totalMedia.toLocaleString(),
      hint: "active catalog records",
      icon: Boxes,
    },
    {
      label: "Storage used",
      value: formatBytes(metrics.totalBytes),
      hint: `${formatBytes(metrics.variantBytes)} in variants`,
      icon: HardDrive,
    },
    {
      label: "Orphaned",
      value: metrics.orphanedMedia.toLocaleString(),
      hint: "without active references",
      icon: Archive,
    },
    {
      label: "Needs attention",
      value: (metrics.failedMedia + metrics.quarantinedMedia).toLocaleString(),
      hint: `${metrics.failedMedia} failed · ${metrics.quarantinedMedia} quarantined`,
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
            Mission Control · Storage operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            DSS Media Platform
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Inspect assets, lifecycle states, visibility, storage usage, and
            processing failures across the Universe.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-400/25 bg-emerald-400/5 text-emerald-300"
        >
          <Database /> GraphQL catalog online
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} className="bg-white/[0.035]">
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <Icon className="size-5 text-cyan-300" />
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-semibold text-white">
                {value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white/[0.025]">
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_repeat(4,auto)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                type="search"
                name="search"
                defaultValue={searchParams.search}
                className="border-white/10 bg-black/20 pl-9"
                placeholder="Filename, MIME type or checksum"
                aria-label="Search Media Library"
              />
            </div>
            <select
              name="status"
              defaultValue={searchParams.status ?? ""}
              className="h-8 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm"
              aria-label="Filter by status"
            >
              <option value="">All states</option>
              {MEDIA_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <select
              name="kind"
              defaultValue={searchParams.kind ?? ""}
              className="h-8 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm"
              aria-label="Filter by kind"
            >
              <option value="">All kinds</option>
              {MEDIA_KINDS.map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
            <select
              name="visibility"
              defaultValue={searchParams.visibility ?? ""}
              className="h-8 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm"
              aria-label="Filter by visibility"
            >
              <option value="">All visibility</option>
              {MEDIA_VISIBILITIES.map((visibility) => (
                <option key={visibility}>{visibility}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <label className="flex h-8 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-slate-300">
                <input
                  type="checkbox"
                  name="orphaned"
                  value="true"
                  defaultChecked={searchParams.orphaned === "true"}
                />
                Orphaned
              </label>
              <Button type="submit">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {mediaLibrary.items.length === 0 ? (
        <EmptyState
          title="No media matched these filters"
          description="Adjust the search or lifecycle filters to inspect another catalog segment."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {mediaLibrary.items.map((item) => {
            const Icon = item.kind === "IMAGE" ? FileImage : File;
            return (
              <Card key={item.id} className="bg-white/[0.035]">
                <CardHeader>
                  <div className="mb-3 grid size-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="truncate">
                    {item.originalFilename}
                  </CardTitle>
                  <CardDescription className="truncate font-mono text-xs">
                    {item.mimeType}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={cn(statusClass(item.status))}
                    >
                      {item.status}
                    </Badge>
                    <Badge variant="outline">{item.kind}</Badge>
                    <Badge variant="outline">{item.visibility}</Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-500">Size</dt>
                      <dd className="mt-1 font-mono">
                        {formatBytes(item.size)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Dimensions</dt>
                      <dd className="mt-1 font-mono">
                        {item.width && item.height
                          ? `${item.width}×${item.height}`
                          : "—"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Media ID</dt>
                      <dd className="mt-1 truncate font-mono">{item.id}</dd>
                    </div>
                  </dl>
                  {item.failureCode ? (
                    <div className="flex items-center gap-2 rounded-lg border border-red-400/15 bg-red-400/5 p-2 text-xs text-red-300">
                      <AlertTriangle className="size-4" />
                      {item.failureCode}
                    </div>
                  ) : null}
                  {item.status === "FAILED" ? (
                    <form action={retryFailedMedia}>
                      <input type="hidden" name="mediaId" value={item.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full"
                      >
                        <RefreshCw /> Retry processing
                      </Button>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {mediaLibrary.pageInfo.hasNextPage && mediaLibrary.pageInfo.endCursor ? (
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link
              href={createNextPageHref(
                searchParams,
                mediaLibrary.pageInfo.endCursor,
              )}
            >
              Load next catalog page
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
