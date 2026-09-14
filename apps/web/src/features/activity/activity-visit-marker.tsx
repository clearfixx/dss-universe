"use client";

import { useEffect } from "react";

import { markActivityFeedVisited } from "./activity-actions";

export function ActivityVisitMarker() {
  useEffect(() => {
    void markActivityFeedVisited().catch(() => undefined);
  }, []);

  return null;
}
