export default function PageLoader() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-6 w-40 bg-neutral-800 rounded" />
      <div className="h-4 w-full bg-neutral-800 rounded" />
      <div className="h-4 w-5/6 bg-neutral-800 rounded" />
      <div className="h-4 w-4/6 bg-neutral-800 rounded" />
      <div className="flex flex-col gap-3 mt-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 bg-neutral-900 rounded-lg p-3">
            <div className="w-32 h-20 bg-neutral-800 rounded flex-shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 bg-neutral-800 rounded w-3/4" />
              <div className="h-3 bg-neutral-800 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
