import { cookies } from "next/headers";

import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { ErrorState } from "@/components/states/async-states";
import { NewsEditorWorkspace } from "@/features/newsroom/news-editor-workspace";

export default async function NewNewsPage() {
  const authenticated = Boolean((await cookies()).get("dss_access_token"));
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
