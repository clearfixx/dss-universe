import { readFileSync, writeFileSync } from "node:fs";
import { sub } from "./sub.mjs";
const dir = "apps/web/src/features/editor";

const actions = `${dir}/editor-actions.ts`;
sub(
  actions,
  ` * • reads authentication only from the server-side session cookie;`,
  ` * • reads authentication only from the server-side session cookie;
 * • searches the actor's media and mentionable members (the browser holds no token);`,
);
sub(
  actions,
  `export async function runEditorAiCommand(`,
  `/** The actor's own READY media. The browser cannot read the session token. */
export async function searchEditorMedia(input: MediaLibraryInput) {
  const authorization = await sessionHeaders();
  if (!authorization)
    return { ok: false as const, error: "SIGNED_OUT" as const };
  try {
    const { data } = await getClient().query({
      query: EditorMediaDocument,
      variables: { input },
      context: { headers: authorization },
      fetchPolicy: "no-cache",
    });
    return { ok: true as const, items: data?.editorMedia.items ?? [] };
  } catch {
    return { ok: false as const, error: "UNAVAILABLE" as const };
  }
}

export async function searchMentionMembers(search: string) {
  const authorization = await sessionHeaders();
  if (!authorization)
    return { ok: false as const, error: "SIGNED_OUT" as const };
  try {
    const { data } = await getClient().query({
      query: EditorMentionSuggestionsDocument,
      variables: {
        input: { page: 1, limit: 8, search, sort: "USERNAME_ASC" },
      },
      context: { headers: authorization },
      fetchPolicy: "no-cache",
    });
    return { ok: true as const, items: data?.members.items ?? [] };
  } catch {
    return { ok: false as const, error: "UNAVAILABLE" as const };
  }
}

async function sessionHeaders() {
  const token = (await cookies()).get("dss_access_token")?.value;
  return token ? { authorization: \`Bearer \${token}\` } : null;
}

export async function runEditorAiCommand(`
    .replace(/\\`/g, "`")
    .replace(/\\\$/g, "$"),
);
sub(
  actions,
  `  type EditorAiCommand,
} from "@/gql/graphql";`,
  `  type EditorAiCommand,
  EditorMediaDocument,
  EditorMentionSuggestionsDocument,
  type MediaLibraryInput,
} from "@/gql/graphql";`,
);

const dialog = `${dir}/editor-resource-dialog.tsx`;
sub(
  dialog,
  `import { useLazyQuery } from "@apollo/client/react";
`,
  "",
);
sub(
  dialog,
  `import { useEffect, useState } from "react";

import {
  EditorMediaDocument,
  EditorMentionSuggestionsDocument,
  type MediaKind,
} from "@/gql/graphql";

import styles from "./editor-resource-dialog.module.css";
import { uploadEditorMedia } from "./editor-actions";
`,
  `import { useCallback, useEffect, useRef, useState } from "react";

import type { MediaKind } from "@/gql/graphql";

import styles from "./editor-resource-dialog.module.css";
import {
  searchEditorMedia,
  searchMentionMembers,
  uploadEditorMedia,
} from "./editor-actions";
`,
);
sub(
  dialog,
  ` * • loads only the current actor's READY media through editorMedia;`,
  ` * • loads only the current actor's READY media through a server action;`,
);
sub(
  dialog,
  `  const [load, { data, loading, error }] = useLazyQuery(EditorMediaDocument, {
    fetchPolicy: "network-only",
  });
  const kind =
    mode === "image" ? "IMAGE" : mode === "video" ? "VIDEO" : undefined;

  const refresh = (): void => {
    void load({
      variables: {
        input: {
          first: 24,
          ...(kind ? { kind } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      },
    });
  };
`,
  `  const { items, loading, error, run } = useServerSearch<MediaItem>(
    "Не вдалося завантажити медіатеку.",
  );
  const kind =
    mode === "image" ? "IMAGE" : mode === "video" ? "VIDEO" : undefined;

  const load = useCallback((): void => {
    run(() =>
      searchEditorMedia({
        first: 24,
        ...(kind ? { kind } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      }),
    );
  }, [kind, run, search]);
`,
);
sub(
  dialog,
  `  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void load({
          variables: {
            input: {
              first: 24,
              ...(kind ? { kind } : {}),
              ...(search.trim() ? { search: search.trim() } : {}),
            },
          },
        });
      },
      search ? 250 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [kind, load, search]);
`,
  `  useEffect(() => {
    const timer = window.setTimeout(load, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);
`,
);
sub(dialog, `onClick={refresh}>`, `onClick={load}>`);
sub(
  dialog,
  `      <ResourceState loading={loading} error={error?.message} />
      {!loading && !error && data?.editorMedia.items.length === 0 ? (`,
  `      <ResourceState loading={loading} error={error} />
      {!loading && !error && items?.length === 0 ? (`,
);
sub(
  dialog,
  `        {data?.editorMedia.items.map((item) => {`,
  `        {items?.map((item) => {`,
);
sub(
  dialog,
  `  const [load, { data, loading, error }] = useLazyQuery(
    EditorMentionSuggestionsDocument,
    { fetchPolicy: "network-only" },
  );
`,
  `  const {
    items: found,
    loading,
    error,
    run,
  } = useServerSearch<EditorMentionSelection & MemberExtras>(
    "Пошук учасників тимчасово недоступний.",
  );
`,
);
sub(
  dialog,
  `    const timer = window.setTimeout(() => {
      void load({
        variables: {
          input: { page: 1, limit: 8, search: query, sort: "USERNAME_ASC" },
        },
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const items = search.trim().length >= 2 ? data?.members.items : undefined;`,
  `    const timer = window.setTimeout(
      () => run(() => searchMentionMembers(query)),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [run, search]);

  const items = search.trim().length >= 2 ? found : undefined;`,
);
sub(
  dialog,
  `        <ResourceState loading={loading} error={error?.message} />
      )}`,
  `        <ResourceState loading={loading} error={error} />
      )}`,
);
sub(
  dialog,
  `type MediaDialogProps = {`,
  `type MediaItem = {
  id: string;
  kind: MediaKind;
  originalFilename: string;
  mimeType: string;
};

type MemberExtras = { avatarUrl?: string | null; isOnline: boolean };

type SearchResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; error: "SIGNED_OUT" | "UNAVAILABLE" };

/** Runs a search server action; only the newest answer is shown. */
function useServerSearch<T>(unavailable: string) {
  const latest = useRef(0);
  const [state, setState] = useState<{
    items?: T[];
    loading: boolean;
    error?: string;
  }>({ loading: false });
  const run = useCallback(
    (request: () => Promise<SearchResult<T>>): void => {
      const ticket = ++latest.current;
      setState((current) => ({ items: current.items, loading: true }));
      const settle = (result: SearchResult<T>): void => {
        if (ticket !== latest.current) return;
        setState(
          result.ok
            ? { items: result.items, loading: false }
            : {
                loading: false,
                error:
                  result.error === "SIGNED_OUT"
                    ? "Сесія закінчилась. Увійдіть знову."
                    : unavailable,
              },
        );
      };
      request().then(settle, () => settle({ ok: false, error: "UNAVAILABLE" }));
    },
    [unavailable],
  );
  return { ...state, run };
}

type MediaDialogProps = {`,
);

sub(
  "apps/web/next.config.ts",
  `  allowedDevOrigins: ["127.0.0.1"],`,
  `  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Editor uploads travel through a server action: attachments are up to
    // 25 MiB (Media upload policy), plus multipart overhead.
    serverActions: { bodySizeLimit: "26mb" },
    proxyClientMaxBodySize: "26mb",
  },`,
);

// The dialog tests now mock the server actions instead of Apollo.
const spec = `${dir}/editor-resource-dialog.spec.tsx`;
const old = readFileSync(spec, "utf8").replace(/\r\n/g, "\n");
const between = (from, to) => old.slice(old.indexOf(from), old.indexOf(to));
const next =
  old.slice(0, old.indexOf("import { MockedProvider }")) +
  `import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EditorMediaDialog,
  EditorMentionDialog,
} from "./editor-resource-dialog";
import {
  searchEditorMedia,
  searchMentionMembers,
  uploadEditorMedia,
} from "./editor-actions";

vi.mock("./editor-actions", () => ({
  searchEditorMedia: vi.fn(),
  searchMentionMembers: vi.fn(),
  uploadEditorMedia: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("DSS Editor resource dialogs", () => {
  it("loads actor-scoped READY images and returns a Media Reference selection", async () => {
    vi.mocked(searchEditorMedia).mockResolvedValue({
      ok: true,
      items: [
        {
          id: "media-1",
          kind: "IMAGE",
          originalFilename: "nebula.png",
          mimeType: "image/png",
          width: 1280,
          height: 720,
        },
      ],
    });
    const select = vi.fn();
    render(
      <EditorMediaDialog mode="image" onClose={vi.fn()} onSelect={select} />,
    );

    expect(await screen.findByText("nebula.png")).toBeInTheDocument();
    expect(searchEditorMedia).toHaveBeenCalledWith({
      first: 24,
      kind: "IMAGE",
    });
    fireEvent.click(screen.getByText("nebula.png"));
    expect(select).toHaveBeenCalledWith({
      id: "media-1",
      kind: "IMAGE",
      label: "nebula.png",
    });
  });

  it("explains an ended session instead of showing a raw API error", async () => {
    vi.mocked(searchEditorMedia).mockResolvedValue({
      ok: false,
      error: "SIGNED_OUT",
    });
    render(
      <EditorMediaDialog mode="image" onClose={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(await screen.findByText(/Сесія закінчилась/)).toBeInTheDocument();
  });

  it("sends a new image through the Media upload server action", async () => {
    vi.mocked(searchEditorMedia).mockResolvedValue({ ok: true, items: [] });
    vi.mocked(uploadEditorMedia).mockResolvedValue({
      sessionId: "session-1",
      filename: "new-nebula.png",
      status: "COMPLETED",
    });
    const { container } = render(
      <EditorMediaDialog mode="image" onClose={vi.fn()} onSelect={vi.fn()} />,
    );

` +
  between(
    '    const file = new File(["png"]',
    '  it("debounces member search',
  ) +
  `  it("debounces member search and returns a structured mention selection", async () => {
    const member = {
      id: "user-1",
      username: "alex",
      displayName: "Alex Frost",
      avatarUrl: null,
      isOnline: true,
    };
    vi.mocked(searchMentionMembers).mockResolvedValue({
      ok: true,
      items: [member],
    });
    const select = vi.fn();
    render(<EditorMentionDialog onClose={vi.fn()} onSelect={select} />);

    fireEvent.change(
      screen.getByLabelText("Search by username or display name"),
      { target: { value: "al" } },
    );
    await waitFor(() => expect(screen.getByText("@alex")).toBeInTheDocument());
    fireEvent.click(screen.getByText("@alex"));
    expect(select).toHaveBeenCalledWith(member);
  });
});

` +
  old.slice(old.indexOf("/** Suggestions guide"));
writeFileSync(spec, next);
