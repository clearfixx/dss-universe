"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Orbit, RotateCcw, Search, Sparkles } from "lucide-react";

import { CoreSphere } from "./core-sphere";
import styles from "./universe-arrival.module.css";

const visitKey = "dss:arrival:v1";
const sources = ["Knowledge Forge", "Research Lab", "Community Hub", "Academy"];
const examples = [
  "How do I build JWT authentication?",
  "How should I structure a React app?",
  "Where do I start learning TypeScript?",
];
const answers = [
  "Start with short-lived access tokens and a server-managed refresh session. Verify the signature, issuer and audience on every protected request. Keep refresh tokens in secure HttpOnly cookies, rotate them after use, and revoke the session on logout.",
  "Organize the application by product feature. Keep shared UI primitives small, place state near the components that use it, and separate server data from temporary interface state. Extract shared code when a second feature actually needs it.",
  "Begin with inference, object types and unions. Then practice narrowing, generics and typed API boundaries in a small project. Enable strict mode early and validate external data at runtime: TypeScript types disappear when the app runs.",
];

export function UniverseArrival() {
  const root = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<"idle" | "searching" | "answer">("idle");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout>;
    const finish = () => {
      element.dataset.arrival = "ready";
      try {
        localStorage.setItem(visitKey, "seen");
      } catch {
        /* Storage is optional. */
      }
    };
    let seen = false;
    try {
      seen = localStorage.getItem(visitKey) === "seen";
    } catch {
      /* Play once per mount when storage is unavailable. */
    }
    if (!seen && !motion.matches) {
      element.dataset.arrival = "playing";
      timer = setTimeout(finish, 3000);
    }
    const replay = () => {
      clearTimeout(timer);
      if (motion.matches) return;
      element.dataset.arrival = "ready";
      // Restart the same mounted scene; Core never swaps to another illustration.
      void element.offsetWidth;
      element.dataset.arrival = "playing";
      timer = setTimeout(finish, 3000);
    };
    const skip = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearTimeout(timer);
        finish();
      }
    };
    const reduced = () => {
      if (motion.matches) {
        clearTimeout(timer);
        finish();
      }
    };
    const skipArrival = () => {
      clearTimeout(timer);
      finish();
    };
    element.addEventListener("replay-arrival", replay);
    element.addEventListener("skip-arrival", skipArrival);
    window.addEventListener("keydown", skip);
    motion.addEventListener("change", reduced);
    return () => {
      clearTimeout(timer);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      element.removeEventListener("replay-arrival", replay);
      element.removeEventListener("skip-arrival", skipArrival);
      window.removeEventListener("keydown", skip);
      motion.removeEventListener("change", reduced);
    };
  }, []);

  function search(value: string) {
    if (!value.trim()) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setQuery(value);
    setAnswer(/react/i.test(value) ? 1 : /typescript/i.test(value) ? 2 : 0);
    setStage("searching");
    searchTimer.current = setTimeout(() => setStage("answer"), 2200);
  }

  return (
    <div ref={root} className={styles.universe} data-arrival="ready">
      <button
        className={styles.skip}
        onClick={() => root.current?.dispatchEvent(new Event("skip-arrival"))}
      >
        Skip arrival <span>ESC</span>
      </button>
      <header className={styles.navbar}>
        <Link href="/" className={styles.brand}>
          <Orbit size={25} />
          <span>
            DSS UNIVERSE <small>DEVELOPER SPACE STATION</small>
          </span>
        </Link>
        <nav aria-label="Universe">
          <a href="#modules">Modules</a>
          <a href="#mission">Our mission</a>
          <Link href="/command-deck">
            Command Deck <ArrowRight size={13} />
          </Link>
        </nav>
        <span className={styles.preview}>EXPERIENCE PREVIEW</span>
      </header>
      <section className={styles.hero} aria-label="Welcome to DSS Universe">
        <div className={styles.sphere}>
          <CoreSphere active={stage === "searching"} />
        </div>
        <div className={styles.beams} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className={styles.wave} aria-hidden="true" />
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <span /> A UNIVERSE BUILT BY YOU
          </p>
          <h1>
            DSS Universe
            <span>
              Alive. Connected. <br />
              Limitless.
            </span>
          </h1>
          <p className={styles.description}>
            One shared universe for developers.
            <br />
            Knowledge. Community. AI. All connected.
          </p>
          <div className={styles.actions}>
            <Link href="/command-deck" className={styles.primary}>
              Enter Station <ArrowRight size={16} />
            </Link>
            <a href="#modules">
              Explore the Universe <span>↗</span>
            </a>
          </div>
          <div className={styles.activity}>
            <span className={styles.activityIcon}>✧</span>
            <div>
              <small>FROM AROUND THE UNIVERSE · DEMO</small>
              <p>A new idea becomes shared knowledge.</p>
              <span>
                Knowledge Forge <b>·</b> just now
              </span>
            </div>
          </div>
        </div>
        <aside
          className={styles.telemetry}
          aria-label="Demonstration station activity"
        >
          <div>
            <small>◉ &nbsp; Explorers online</small>
            <strong>584</strong>
            <span>+8 joined the station</span>
          </div>
          <div>
            <small>✧ &nbsp; AI conversations</small>
            <strong>41</strong>
            <span>Ideas in motion</span>
          </div>
          <div>
            <small>☆ &nbsp; Community points</small>
            <strong>123,587</strong>
            <span>Knowledge creates value</span>
          </div>
        </aside>
        <div className={styles.coreLabel}>
          <span /> CORE <b>/</b>{" "}
          <span className={styles.readyLabel}>STATION OPERATIONAL</span>
        </div>
        <div className={styles.console}>
          <div className={styles.consoleHeading}>
            <Sparkles size={16} />
            <span>What would you like to build today?</span>
            <small>DEMO</small>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              search(query);
            }}
          >
            <label className={styles.inputLabel} htmlFor="universe-query">
              Explore a demo question
            </label>
            <span aria-hidden="true">›</span>
            <input
              id="universe-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask a question. Find your next idea."
              maxLength={500}
            />
            <button
              aria-label="Search demo"
              disabled={!query.trim() || stage === "searching"}
            >
              <ArrowRight size={20} />
            </button>
          </form>
          {stage === "idle" && (
            <div className={styles.suggestions}>
              {examples.map((text, index) => (
                <button key={text} onClick={() => search(text)}>
                  {
                    [
                      "JWT authentication",
                      "React architecture",
                      "Learn TypeScript",
                    ][index]
                  }{" "}
                  <span>↗</span>
                </button>
              ))}
            </div>
          )}
          <div aria-live="polite" aria-atomic="true">
            {stage === "searching" && (
              <div className={styles.searching}>
                <Search size={15} />
                <span>Exploring the Universe…</span>
                <div className={styles.sourceChips}>
                  {sources.map((source) => (
                    <span key={source}>{source}</span>
                  ))}
                </div>
              </div>
            )}
            {stage === "answer" && (
              <div className={styles.answer}>
                <small>PREWRITTEN DEMO · {examples[answer]}</small>
                <p>{answers[answer]}</p>
                <div className={styles.sourceChips}>
                  {sources.map((source) => (
                    <span key={source}>{source}</span>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setStage("idle");
                    setQuery("");
                  }}
                >
                  Explore another question <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
      <div className={styles.bottomBar}>
        <span>
          <i /> ALL SYSTEMS CONNECTED <small>Simulated activity</small>
        </span>
        <button
          onClick={() =>
            root.current?.dispatchEvent(new Event("replay-arrival"))
          }
        >
          <RotateCcw size={13} /> Replay arrival
        </button>
      </div>
    </div>
  );
}
