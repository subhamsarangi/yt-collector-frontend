type LogEntry = Record<string, unknown>;

function renderEntry(entry: LogEntry, i: number) {
  if (entry.step) return (
    <div key={i} className="flex items-start gap-2 text-neutral-400">
      <span className="mt-0.5 flex-shrink-0 text-neutral-600">✓</span>
      <span>{entry.step as string}</span>
    </div>
  );

  if (entry.queries) return (
    <div key={i} className="flex flex-col gap-1 pl-5">
      <span className="text-neutral-500">
        Queries generated
        {typeof entry.model === "string" && <span className="text-neutral-600 font-mono ml-1">({entry.model})</span>}:
      </span>
      {(entry.queries as string[]).map((q, qi) => (
        <span key={qi} className="text-neutral-300 font-mono pl-2">→ {q}</span>
      ))}
    </div>
  );

  if (entry.query_done) return (
    <div key={i} className="flex items-center gap-2 pl-5 text-neutral-400">
      <span className="text-green-500 flex-shrink-0">✓</span>
      <span className="font-mono text-neutral-300">{entry.query_done as string}</span>
      <span className="text-neutral-600">— {entry.hits as number} result{(entry.hits as number) !== 1 ? "s" : ""} ({entry.completed as number}/{entry.total as number})</span>
    </div>
  );

  if (entry.query_failed) return (
    <div key={i} className="flex items-center gap-2 pl-5 text-red-400">
      <span className="flex-shrink-0">✗</span>
      <span className="font-mono">{entry.query_failed as string}</span>
      <span className="text-red-600">— {entry.error as string}</span>
    </div>
  );

  if (entry.error) return (
    <div key={i} className="flex items-center gap-2 text-red-400">
      <span>✗</span>
      <span>{entry.error as string}</span>
    </div>
  );

  return null;
}

export default function SearchLog({ log }: { log: LogEntry[] }) {
  // Filter out the final results payload (too large to display)
  const displayLog = log.filter((e) => !e.results || Object.keys(e).length > 1);

  return (
    <details className="group">
      <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300 transition select-none list-none flex items-center gap-1">
        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
        Search log
      </summary>
      <div className="mt-2 flex flex-col gap-1.5 text-xs border border-neutral-800 rounded-lg p-3 bg-neutral-950">
        {displayLog.map((entry, i) => renderEntry(entry, i))}
      </div>
    </details>
  );
}
