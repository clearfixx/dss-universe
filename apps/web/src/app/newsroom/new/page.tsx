import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { DesignScope } from "@/components/ui/design-scope";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/feedback";
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
        <DesignScope className="mx-auto max-w-6xl">
          <Alert variant="warning" role="alert">
            <AlertTitle>Потрібна авторизація</AlertTitle>
            <AlertDescription>Увійдіть, щоб створити новину.</AlertDescription>
          </Alert>
        </DesignScope>
      )}
    </DssApplicationShell>
  );
}
