"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-edit-scope.tsx
 *
 * 🎯 Purpose:
 * Per-post editing state shared by the body (inline editor) and the
 * footer "Ред." button, which live in different parts of the card.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type EditScope = Readonly<{
  canEdit: boolean;
  editing: boolean;
  setEditing: (editing: boolean) => void;
}>;

const Context = createContext<EditScope>({
  canEdit: false,
  editing: false,
  setEditing: () => {},
});

export function ForumPostEditScope({
  canEdit,
  children,
}: PropsWithChildren<{ canEdit: boolean }>) {
  const [editing, setEditing] = useState(false);
  const value = useMemo(
    () => ({ canEdit, editing: canEdit && editing, setEditing }),
    [canEdit, editing],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useForumPostEdit() {
  return useContext(Context);
}
