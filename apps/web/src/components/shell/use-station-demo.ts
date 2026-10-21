"use client";

import { useEffect, useState, type RefObject } from "react";

// A repeating, bounded storyboard; these values never represent production data.
const events = [
  {
    text: "A new idea becomes shared knowledge.",
    module: "Knowledge Forge",
    online: 584,
    conversations: 41,
    points: 123587,
  },
  {
    text: "Alex shared a guide to React architecture.",
    module: "Knowledge Forge",
    online: 588,
    conversations: 43,
    points: 123612,
  },
  {
    text: "Maria helped a developer find their next step.",
    module: "Community Hub",
    online: 591,
    conversations: 42,
    points: 123647,
  },
  {
    text: "A new TypeScript learning path is ready.",
    module: "Academy",
    online: 589,
    conversations: 46,
    points: 123692,
  },
  {
    text: "John published a discovery worth exploring.",
    module: "Research Lab",
    online: 594,
    conversations: 44,
    points: 123727,
  },
];

export function useStationDemo(viewport: RefObject<HTMLDivElement | null>) {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = viewport.current;
    if (!element || paused) return;
    let visible = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (visible && !document.hidden) {
        timer = setInterval(() => {
          if (element.dataset.arrival !== "playing")
            setTick((value) => value + 1);
        }, 6500);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [paused, viewport]);
  return {
    tick,
    paused,
    setPaused,
    event: events[tick % events.length]!,
  };
}
