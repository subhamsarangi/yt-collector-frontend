export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-neutral-800 flex-shrink-0" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-40 bg-neutral-800 rounded" />
          <div className="h-3 w-24 bg-neutral-800 rounded" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 bg-neutral-900 rounded-lg p-3">
            <div className="w-32 h-20 bg-neutral-800 rounded flex-shrink-0" />
            <div className="flex flex-col gap-2 justify-center flex-1">
              <div className="h-4 bg-neutral-800 rounded w-3/4" />
              <div className="h-3 bg-neutral-800 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
