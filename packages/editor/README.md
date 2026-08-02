# `@dss/editor`

Framework-neutral canonical contract for DSS Editor documents.

The package contains schema versions, product profile definitions, capability
and toolbar registries, untrusted JSON validation, and rebuildable text/search
projections. It does not contain React, Tiptap, NestJS, persistence,
authorization, or storage-provider code.

Its autosave coordinator is also storage-neutral. It debounces canonical
documents, serializes versioned saves, preserves failed content for retry, and
reports conflicts while every host module supplies its own draft command and
persistence boundary.

Consumers must validate documents on the server even when the frontend already
uses the corresponding Tiptap profile.

Editor permissions only filter the client surface. Every owning module must
authorize privileged operations again when persisting content.
