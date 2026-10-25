/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Guest demo search
 * 📄 File: apps/web/src/components/shell/use-demo-search-sequence.ts
 *
 * 🎯 Purpose:
 * Owns replay-safe local demo progression independently of arrival animation.
 *
 * 🧠 Responsibilities:
 * • schedules one timer for the committed active search step;
 * • rejects callbacks from replaced or cancelled search generations;
 * • releases its own timer on cleanup and reconnects on effect setup.
 *
 * 🏗️ Architecture:
 * Client-only sequence hook; no answer matching, content, network or UI ownership.
 *
 * ⚠️ Important:
 * Early interactions remain enabled; four 550ms advances produce the answer.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
"use client";

import { useCallback, useEffect, useReducer } from "react";

type SearchSequence = Readonly<{
  stage: "idle" | "searching" | "answer";
  step: number;
  generation: number;
}>;
type SearchAction =
  | { type: "start" }
  | { type: "reset" }
  | { type: "advance"; generation: number; step: number };

const initialSequence: SearchSequence = {
  stage: "idle",
  step: 0,
  generation: 0,
};

function reduceSequence(
  state: SearchSequence,
  action: SearchAction,
): SearchSequence {
  if (action.type === "start" || action.type === "reset") {
    return {
      stage: action.type === "start" ? "searching" : "idle",
      step: 0,
      generation: state.generation + 1,
    };
  }
  if (
    state.stage !== "searching" ||
    action.generation !== state.generation ||
    action.step !== state.step
  )
    return state;
  const step = state.step + 1;
  return { ...state, step, stage: step === 4 ? "answer" : "searching" };
}

export function useDemoSearchSequence() {
  const [sequence, dispatch] = useReducer(reduceSequence, initialSequence);
  const { stage, step, generation } = sequence;

  useEffect(() => {
    if (stage !== "searching") return;
    const timer = setTimeout(() => {
      dispatch({ type: "advance", generation, step });
    }, 550);
    return () => clearTimeout(timer);
  }, [stage, step, generation]);

  const startSearch = useCallback(() => dispatch({ type: "start" }), []);
  const resetSearch = useCallback(() => dispatch({ type: "reset" }), []);
  return { stage, searchStep: step, startSearch, resetSearch };
}

/** Arrival control may clear the runway, not the search clock. */
