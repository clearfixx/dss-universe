import {
  Activity,
  BookOpen,
  Bot,
  CheckCircle2,
  Code2,
  GraduationCap,
  MessageSquare,
  Orbit,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AuthForm } from "./auth-form";
import { ResetPasswordForm } from "./reset-password-form";
import type { AuthMode } from "./auth-contracts";
import styles from "./auth-gateway.module.css";

const copy = {
  reset: {
    eyebrow: "SECURE ACCESS",
    title: "Choose a new password",
    description: "Restore access to your DSS account with a new password.",
  },
  login: {
    eyebrow: "DEVELOPERS SPACE STATION",
    title: "Welcome back",
    description:
      "Pick up where you left off. Your work, learning and community are waiting.",
  },
  register: {
    eyebrow: "DEVELOPERS SPACE STATION",
    title: "Join DSS",
    description:
      "Create your developer identity. The rest of your profile grows with you inside the station.",
  },
  recovery: {
    eyebrow: "SECURE ACCESS",
    title: "Recover access",
    description:
      "Enter your email and we’ll help you return safely. Existing sessions remain protected.",
  },
} as const;

export function AuthGateway({
  mode,
  returnTo,
  notice,
}: {
  mode: AuthMode;
  returnTo?: string;
  notice?: string;
}) {
  const current = copy[mode];
  return (
    <main className={styles.gateway}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Orbit aria-hidden="true" />
          <span>
            <strong>DSS</strong>
            <small>DEVELOPERS SPACE STATION</small>
          </span>
        </Link>
        <nav aria-label="DSS Universe">
          <Link href="/">Universe</Link>
          <Link href="/news">Research Lab</Link>
          <Link href="/#modules">Community Hub</Link>
          <Link href="/#modules">Academy</Link>
        </nav>
        <span className={styles.online}>
          <i /> System online
        </span>
      </header>

      <section className={styles.workspace}>
        <div className={styles.product}>
          <div className={styles.productIntro}>
            <span>BUILD WITH THE COMMUNITY</span>
            <h1>
              Build. <b>Share.</b> Inspire.
            </h1>
            <p>
              A connected workspace for developers to learn, publish, discuss
              and create what comes next.
            </p>
          </div>

          <section
            className={styles.activityPanel}
            aria-label="Live developer activity preview"
          >
            <PanelHeading
              icon={<Activity />}
              title="Live developer activity"
              detail="DEMO"
            />
            <ul>
              <li>
                <i className={styles.cyan} />
                <span>
                  <strong>Maya Patel</strong> published a TypeScript guide
                </span>
                <time>3m</time>
              </li>
              <li>
                <i className={styles.violet} />
                <span>
                  <strong>Alex Chen</strong> opened a Next.js discussion
                </span>
                <time>8m</time>
              </li>
              <li>
                <i className={styles.green} />
                <span>
                  <strong>Sam Rivera</strong> completed an Academy path
                </span>
                <time>14m</time>
              </li>
            </ul>
          </section>

          <section
            className={styles.modulePanel}
            aria-label="DSS module status preview"
          >
            <PanelHeading
              icon={<Orbit />}
              title="Connected modules"
              detail="4 ONLINE"
            />
            <div className={styles.modules}>
              <span>
                <BookOpen /> Research Lab <i />
              </span>
              <span>
                <MessageSquare /> Community Hub <i />
              </span>
              <span>
                <GraduationCap /> Academy <i />
              </span>
              <span>
                <Bot /> AI Core <i />
              </span>
            </div>
          </section>

          <section className={styles.codePanel} aria-label="DSS code preview">
            <PanelHeading icon={<Code2 />} title="Code together" detail="TS" />
            <pre>
              <code>
                <span>const</span> mission = {`{`}
                <br /> build: <b>true</b>,<br /> share: <b>true</b>,<br />{" "}
                inspire: <b>&quot;what comes next&quot;</b>
                <br />
                {`}`};
              </code>
            </pre>
            <p>
              <Sparkles /> Knowledge compounds when we build in public.
            </p>
          </section>

          <aside className={styles.mascotNote}>
            <span aria-hidden="true">◉</span>
            <p>
              <strong>Astronautus says hello.</strong> Small guide. Serious
              mission.
            </p>
          </aside>
        </div>

        <aside className={styles.authPanel}>
          <div className={styles.authHeading}>
            <span>{current.eyebrow}</span>
            <h2>{current.title}</h2>
            <p>{current.description}</p>
          </div>
          {notice ? (
            <p className={styles.authNotice} role="status">
              {notice}
            </p>
          ) : null}
          {mode === "reset" ? (
            <ResetPasswordForm />
          ) : (
            <AuthForm mode={mode} returnTo={returnTo} />
          )}
          <footer>
            {mode === "recovery" ? <ShieldCheck /> : <CheckCircle2 />}
            <span>
              {mode === "recovery"
                ? "Reset links are single-use and expire automatically."
                : "Your credentials are sent only to the DSS authentication service."}
            </span>
          </footer>
        </aside>
      </section>
    </main>
  );
}

function PanelHeading({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <header className={styles.panelHeading}>
      <span>
        {icon}
        {title}
      </span>
      <small>{detail}</small>
    </header>
  );
}
