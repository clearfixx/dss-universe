import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { DesignScope } from "@/components/ui/design-scope";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/feedback";
import { loadEditorialNews } from "@/features/newsroom/newsroom-data";
import { NewsroomList } from "@/features/newsroom/newsroom-list";

export default async function NewsroomPage() {
  const page = await loadEditorialNews().catch(() => null);
  return (
    <DssApplicationShell>
      {page ? (
        <NewsroomList page={page} />
      ) : (
        <DesignScope className="mx-auto max-w-6xl">
          <Alert variant="warning" role="alert">
            <AlertTitle>Newsroom недоступний</AlertTitle>
            <AlertDescription>Увійдіть, щоб створювати новини та працювати з редакційною чергою.</AlertDescription>
          </Alert>
        </DesignScope>
      )}
    </DssApplicationShell>
  );
}
