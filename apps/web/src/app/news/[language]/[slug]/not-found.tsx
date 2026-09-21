import Link from "next/link";

export default function NewsNotFound() {
  return (
    <div className="mx-auto my-24 max-w-xl rounded-2xl border border-white/10 bg-slate-950/60 p-10 text-center">
      <h1 className="text-2xl font-semibold">Сигнал не знайдено</h1>
      <p className="my-4 text-slate-400">
        Новина не існує, ще не опублікована або недоступна.
      </p>
      <Link href="/news" className="text-cyan-300 hover:text-cyan-200">
        Повернутися до новин
      </Link>
    </div>
  );
}
