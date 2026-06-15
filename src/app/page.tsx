import { Screener } from "@/components/Screener";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Mutual Fund Screener
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          All Indian direct · growth · open-ended funds — paginated from AMFI
          data. Optional AI explain on fund pages with{" "}
          <code className="rounded bg-[var(--surface-2)] px-1 text-emerald-400">
            OPENAI_API_KEY
          </code>
          .
        </p>
      </div>
      <Screener />
    </div>
  );
}
