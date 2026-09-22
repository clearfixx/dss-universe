import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { ErrorState } from "@/components/states/async-states";
import { loadEditorialNews } from "@/features/newsroom/newsroom-data";
import { NewsroomList } from "@/features/newsroom/newsroom-list";

export default async function NewsroomPage() {
  const page = await loadEditorialNews().catch(() => null);
  return (
    <DssApplicationShell>
      {page ? (
        <NewsroomList page={page} />
      ) : (
        <ErrorState
          title="Newsroom недоступний"
          description="Увійдіть, щоб створювати новини та працювати з редакційною чергою."
        />
      )}
    </DssApplicationShell>
  );
}
