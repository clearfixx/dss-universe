# Agent helper scripts

Write all ad hoc diagnostic, investigation and local maintenance scripts in
`tools/agent-helpers/`, using task subdirectories when useful. Do not author
helper scripts in dependency caches or OS temporary directories.

Established component build/test scripts stay with their owning module.
Generated reports, test fixtures and tool-managed artifacts may use caches.

Historical originals in `tools/agent-helpers/archive/` are preservation assets:
keep their bytes unchanged, do not execute or modernize them automatically.
Read credentials from local environment/configuration; never commit secrets.
