import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { ErrorState } from "@/components/states/async-states";
import { NewsEditorWorkspace } from "@/features/newsroom/news-editor-workspace";
import { loadEditorialArticle } from "@/features/newsroom/newsroom-data";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const article = await loadEditorialArticle(articleId).catch(() => null);
  return (
    <DssApplicationShell>
      {article ? (
        <NewsEditorWorkspace article={article} />
      ) : (
        <ErrorState
          title="Новину не знайдено"
          description="Матеріал недоступний або у вас немає редакційного доступу."
        />
      )}
    </DssApplicationShell>
  );
}
