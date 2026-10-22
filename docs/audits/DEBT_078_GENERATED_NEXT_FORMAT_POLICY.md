# DEBT-078 — Generated Next declaration enters authored-source formatting gate

The consolidated gate after DEBT-077 fails at format check, before any tests.
Next dev regenerated `apps/web/next-env.d.ts` with CRLF on Windows. It is
Git-ignored and explicitly says not to edit it, but was absent from the existing
Prettier generated-artifact exclusions. Byte comparison confirms the first
difference is CR13 versus LF10; original303/formatted296 characters.

The narrow D6 formatting correction adds only this exact path to
`.prettierignore`, consistent with existing generated SDL/GraphQL exclusions.
No generated file, UI or runtime source is changed. A regression uses the actual
Prettier API/ignore file to require this path ignored while Web Vitest config
and authored arrival tests stay checked. This is not File Passport cleanup.

Failed-wrapper evidence: `dss-d6-quality-full-after077.log` in temporary storage.
Full consolidated acceptance remains open; earlier passing API and smoke results
do not turn that wrapper green.

The five full-quality policy controls pass, including the actual Prettier ignore
regression. Root `pnpm format:check` passes with the generated CRLF file left
untouched. Evidence: `dss-d6-078-format.log` in temporary storage.
