# `@dss/editor`

Framework-neutral canonical contract for DSS Editor documents.

The package contains schema versions, profile capability definitions,
untrusted JSON validation, and rebuildable text/search projections. It does not
contain React, NestJS, persistence, authorization, or storage-provider code.

Consumers must validate documents on the server even when the frontend already
uses the corresponding Tiptap profile.
