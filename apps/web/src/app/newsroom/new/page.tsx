import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { ErrorState } from "@/components/states/async-states";
import { NewsEditorWorkspace } from "@/features/newsroom/news-editor-workspace";
import { loadSessionViewer } from "@/features/auth/session-data";

export default async function NewNewsPage() {
  // A present cookie does not establish a valid session. The API remains
  // the authority for draft-creation permissions.
  const authenticated = Boolean(await loadSessionViewer());
  return (
    <DssApplicationShell>
      {authenticated ? (
        <NewsEditorWorkspace />
      ) : (
        <ErrorState
          title="Потрібна авторизація"
          description="Увійдіть, щоб створити новину."
        />
      )}
    </DssApplicationShell>
  );
}
