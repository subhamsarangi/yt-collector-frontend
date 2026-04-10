type Step = { ts: string; text: string; ok?: boolean };

function formatTs(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function ProcessingLog({ steps }: { steps: Step[] }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300 transition select-none list-none flex items-center gap-1">
        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
        Processing log
      </summary>
      <div className="mt-2 flex flex-col gap-1.5 text-xs border border-neutral-800 rounded-lg p-3 bg-neutral-950">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-start gap-3 ${s.ok === false ? "text-red-400" : "text-neutral-400"}`}>
            <span className="text-neutral-600 font-mono flex-shrink-0">{formatTs(s.ts)}</span>
            <span className={`flex-shrink-0 ${s.ok === false ? "text-red-500" : "text-green-500"}`}>
              {s.ok === false ? "✗" : "✓"}
            </span>
            <span>{s.text}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
