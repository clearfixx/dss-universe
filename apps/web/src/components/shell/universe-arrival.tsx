"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Orbit, RotateCcw, Search, Sparkles } from "lucide-react";

import { CoreSphere } from "./core-sphere";
import styles from "./universe-arrival.module.css";
import { useStationDemo } from "./use-station-demo";
import { demoSources } from "./demo-sources";

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
  const { tick, paused, setPaused, event } = useStationDemo(root);
  const [stage, setStage] = useState<"idle" | "searching" | "answer">("idle");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(0);
  const [searchStep, setSearchStep] = useState(0);
  const [unsupported, setUnsupported] = useState(false);
  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLInputElement>(null);
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
    const revealFocusedControl = () => {
      if (document.activeElement?.classList.contains(styles.skip)) return;
      if (element.dataset.arrival === "playing") skipArrival();
    };
    element.addEventListener("replay-arrival", replay);
    element.addEventListener("skip-arrival", skipArrival);
    element.addEventListener("focusin", revealFocusedControl);
    window.addEventListener("keydown", skip);
    motion.addEventListener("change", reduced);
    return () => {
      clearTimeout(timer);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      element.removeEventListener("replay-arrival", replay);
      element.removeEventListener("skip-arrival", skipArrival);
      element.removeEventListener("focusin", revealFocusedControl);
      window.removeEventListener("keydown", skip);
      motion.removeEventListener("change", reduced);
    };
  }, []);

  function search(value: string) {
    if (!value.trim()) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setQuery(value);
    setSelectedSource(null);
    const match = /react/i.test(value)
      ? 1
      : /typescript/i.test(value)
        ? 2
        : /jwt|auth/i.test(value)
          ? 0
          : -1;
    setUnsupported(match < 0);
    if (match < 0) {
      setStage("idle");
      return;
    }
    setAnswer(match);
    setSearchStep(0);
    setStage("searching");
    let step = 0;
    const advance = () => {
      step += 1;
      setSearchStep(step);
      if (step === 4) {
        setStage("answer");
        return;
      }
      searchTimer.current = setTimeout(advance, 550);
    };
    searchTimer.current = setTimeout(advance, 550);
  }

  return (
    <div ref={root} className={styles.universe} data-arrival="ready">
      <noscript>
        <style>{"[data-demo-interactive] { display: none !important; }"}</style>
        <p className={styles.noScriptNotice}>
          The station is ready to explore. Enable JavaScript for the animated
          Core and interactive demo.
        </p>
      </noscript>
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
          <CoreSphere
            active={stage === "searching"}
            signal={`${tick}:${stage}:${selectedSource}`}
            paused={paused}
          />
          <div
            className={styles.satellites}
            data-demo-interactive
            aria-label="Explore connected demo modules"
          >
            <svg viewBox="0 0 600 600" aria-hidden="true">
              <path d="M300 300 L108 138 M300 300 L486 174 M300 300 L108 414 M300 300 L480 444" />
            </svg>
            {sources.map((source, index) => (
              <button
                key={source}
                disabled={stage === "searching"}
                data-active={
                  stage === "searching"
                    ? searchStep === index
                    : selectedSource === index ||
                      (selectedSource === null && event.module === source)
                }
                aria-label={`Explore ${source} demo`}
                onClick={() => {
                  search(examples[index === 3 ? 2 : index === 1 ? 1 : 0]!);
                  consoleRef.current?.scrollIntoView({
                    block: "nearest",
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "instant"
                      : "smooth",
                  });
                }}
              >
                <span aria-hidden="true">{["◇", "✧", "◈", "⌁"][index]}</span>
                {source}
                <i />
              </button>
            ))}
          </div>
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
            <div key={tick} className={styles.activityEvent}>
              <small>FROM AROUND THE UNIVERSE · DEMO</small>
              <p>{event.text}</p>
              <span>
                {event.module} <b>·</b> simulated event
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
            <strong>{event.online}</strong>
            <span>Exploring together · demo</span>
          </div>
          <div>
            <small>✧ &nbsp; AI conversations</small>
            <strong>{event.conversations}</strong>
            <span>Ideas in motion</span>
          </div>
          <div>
            <small>☆ &nbsp; Community points</small>
            <strong>{event.points.toLocaleString("en-US")}</strong>
            <span>Knowledge creates value</span>
          </div>
        </aside>
        <div className={styles.coreLabel}>
          <span /> CORE <b>/</b>{" "}
          <span className={styles.readyLabel}>
            {paused
              ? "AMBIENT ACTIVITY PAUSED"
              : stage === "searching"
                ? "EXPLORING CONNECTIONS"
                : stage === "answer"
                  ? "RESPONSE READY"
                  : "STATION OPERATIONAL"}
          </span>
        </div>
        <div ref={consoleRef} className={styles.console} data-demo-interactive>
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
              ref={queryRef}
              id="universe-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask a question. Find your next idea."
              maxLength={500}
              readOnly={stage === "searching"}
            />
            <button
              aria-label="Search demo"
              disabled={!query.trim() || stage === "searching"}
            >
              <ArrowRight size={20} />
            </button>
          </form>
          {unsupported && (
            <p role="status" className={styles.demoNotice}>
              This preview has three prepared examples. Choose one below to
              explore the experience.
            </p>
          )}
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
                  {sources.map((source, index) => (
                    <span key={source} data-complete={index < searchStep}>
                      {index < searchStep ? "✓ " : "◌ "}
                      {source}
                    </span>
                  ))}
                </div>
                <p className={styles.searchStatus}>
                  {searchStep === 0
                    ? "Opening module connections…"
                    : `${searchStep} of 4 demo modules explored`}
                </p>
                <button
                  className={styles.cancelSearch}
                  onClick={() => {
                    if (searchTimer.current) clearTimeout(searchTimer.current);
                    setStage("idle");
                    queryRef.current?.focus();
                  }}
                >
                  Cancel search
                </button>
              </div>
            )}
            {stage === "answer" && (
              <div className={styles.answer}>
                <small>PREWRITTEN DEMO · {examples[answer]}</small>
                <p>{answers[answer]}</p>
                <div className={styles.sourceChips}>
                  {sources.map((source, index) => (
                    <button
                      key={source}
                      aria-expanded={selectedSource === index}
                      aria-controls="demo-source-preview"
                      onClick={() =>
                        setSelectedSource((current) =>
                          current === index ? null : index,
                        )
                      }
                    >
                      {source} <span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
                {selectedSource !== null && (
                  <section
                    id="demo-source-preview"
                    className={styles.sourcePreview}
                    aria-label={`${sources[selectedSource]} demo source`}
                  >
                    <small>
                      ILLUSTRATIVE SOURCE · {sources[selectedSource]}
                    </small>
                    <h2>{demoSources[answer]?.[selectedSource]?.title}</h2>
                    <p>{demoSources[answer]?.[selectedSource]?.excerpt}</p>
                    <span>Demo content — not a published resource.</span>
                  </section>
                )}
                <button
                  onClick={() => {
                    setStage("idle");
                    setQuery("");
                    queryRef.current?.focus();
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
        <div className={styles.playbackControls} data-demo-interactive>
          <button
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "Resume ambient activity" : "Pause ambient activity"}
          </button>
          <button
            onClick={() =>
              root.current?.dispatchEvent(new Event("replay-arrival"))
            }
          >
            <RotateCcw size={13} /> Replay arrival
          </button>
        </div>
      </div>
    </div>
  );
}
