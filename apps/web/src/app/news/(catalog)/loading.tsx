export default function NewsLoading() {
  return (
    <div role="status" aria-label="Завантаження новин" className="mx-auto max-w-7xl animate-pulse space-y-6 p-4 sm:p-6">
      <div className="h-64 rounded-3xl bg-muted" />
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-96 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
