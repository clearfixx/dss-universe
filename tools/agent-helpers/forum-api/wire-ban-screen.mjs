// One-off wiring of the ban screen into login and the proxy; run from the repo root.
import { readFileSync, writeFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
function edit(file, search, replace) {
  const source = read(file);
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, () => replace));
}

const proxy = "apps/web/src/proxy.ts";
edit(
  proxy,
  "export async function proxy(request: NextRequest) {\n  const { pathname, search } = request.nextUrl;\n",
  `export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // A banned account has no session: while its ticket is held, every page
  // leads to the ban screen.
  if (request.cookies.has(BAN_COOKIE)) {
    if (!isOpenDuringBan(pathname))
      return NextResponse.redirect(new URL(BAN_PATH, request.url));
    if (pathname !== "/login") return NextResponse.next();
  }
`,
);
edit(
  proxy,
  'import {\n  ACCESS_COOKIE,',
  'import {\n  BAN_COOKIE,\n  BAN_PATH,\n  isOpenDuringBan,\n} from "@/features/ban/ban-contract";\nimport {\n  ACCESS_COOKIE,',
);
edit(
  proxy,
  'matcher: ["/((?!api|_next/static',
  'matcher: ["/((?!api|banned/files|_next/static',
);

const actions = "apps/web/src/features/auth/auth-actions.ts";
edit(
  actions,
  "  errors?: Array<{ message?: string }>;\n};",
  "  errors?: Array<{ message?: string; extensions?: unknown }>;\n};",
);
edit(
  actions,
  '  const result = await authenticate("login", LOGIN, parsed.data);\n  if ("error" in result)',
  '  const result = await authenticate("login", LOGIN, parsed.data);\n  if ("banTicket" in result) await openBanScreen(result.banTicket);\n  if ("error" in result)',
);
edit(
  actions,
  '): Promise<{ payload: AuthPayload } | { error: AuthFormState }> {\n  try {',
  `): Promise<
  | { payload: AuthPayload }
  | { error: AuthFormState }
  | { banTicket: string }
> {
  try {`,
);
edit(
  actions,
  "    const payload = body.data?.[field];\n",
  `    const banTicket =
      field === "login" ? banTicketFrom(body.errors?.[0]) : null;
    if (banTicket) return { banTicket };
    const payload = body.data?.[field];
`,
);
edit(
  actions,
  "  const cookieStore = await cookies();\n  const shared = sessionCookieOptions(",
  "  const cookieStore = await cookies();\n  // A successful sign-in ends any earlier ban screen on this browser.\n  cookieStore.delete(BAN_COOKIE);\n  const shared = sessionCookieOptions(",
);
edit(
  actions,
  "function clearSessionCookies(store:",
  `/** A banned sign-in: no session, only the ticket for the ban screen. */
async function openBanScreen(ticket: string): Promise<never> {
  const store = await cookies();
  clearSessionCookies(store);
  store.set(BAN_COOKIE, ticket, {
    ...sessionCookieOptions(process.env.NODE_ENV === "production"),
    maxAge: BAN_TICKET_MAX_AGE,
  });
  redirect(BAN_PATH);
}

function clearSessionCookies(store:`,
);
edit(
  actions,
  '} from "./session-contract";\n',
  '} from "./session-contract";\nimport {\n  BAN_COOKIE,\n  BAN_PATH,\n  BAN_TICKET_MAX_AGE,\n  banTicketFrom,\n} from "@/features/ban/ban-contract";\n',
);
