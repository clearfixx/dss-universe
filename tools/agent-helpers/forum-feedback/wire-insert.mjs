import { sub } from "./sub.mjs";
sub(
  "apps/web/src/features/editor/dss-editor.tsx",
  `      doc.firstChild.content.size === 0;
    editor
      .chain()
      .insertContentAt(
        blank ? { from: 0, to: doc.content.size } : doc.content.size,
        blocks,
      )`,
  `      doc.firstChild.content.size === 0;
    // An empty last line is filled instead of leaving a gap above the blocks.
    const last = doc.lastChild;
    const trailing =
      last?.type.name === "paragraph" && last.content.size === 0
        ? last.nodeSize
        : 0;
    editor
      .chain()
      .insertContentAt(
        blank
          ? { from: 0, to: doc.content.size }
          : { from: doc.content.size - trailing, to: doc.content.size },
        blocks,
      )`,
);
