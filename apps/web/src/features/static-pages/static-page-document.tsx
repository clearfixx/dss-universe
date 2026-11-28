/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Static Pages
 * 📄 File: apps/web/src/features/static-pages/static-page-document.tsx
 *
 * 🎯 Purpose:
 * Server rendering of a published static page document: every node of the
 * ADMIN editor profile, files through the page's public file route.
 *
 * ⚠️ Important:
 * Only http(s), mailto and site-relative links become anchors.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export {
  EditorDocumentView as StaticPageDocument,
  indexDocument,
  safeHref,
  type DocumentNode as PageNode,
} from "@/features/editor/editor-document-view";
