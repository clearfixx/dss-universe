import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { DesignScope } from "@/components/ui/design-scope";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/feedback";
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
    <DssApplicationShell
      pageTitle={article ? { pathname: `/newsroom/${encodeURIComponent(articleId)}`, title: article.title } : undefined}
    >
      {article ? (
        <NewsEditorWorkspace article={article} />
      ) : (
        <DesignScope className="mx-auto max-w-6xl">
          <Alert variant="warning" role="alert">
            <AlertTitle>Новину не знайдено</AlertTitle>
            <AlertDescription>Матеріал недоступний або у вас немає редакційного доступу.</AlertDescription>
          </Alert>
        </DesignScope>
      )}
    </DssApplicationShell>
  );
}
