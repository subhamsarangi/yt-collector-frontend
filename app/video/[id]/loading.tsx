export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="w-full h-64 bg-neutral-800 rounded-lg" />
      <div className="h-6 w-3/4 bg-neutral-800 rounded" />
      <div className="flex gap-4">
        <div className="h-4 w-20 bg-neutral-800 rounded" />
        <div className="h-4 w-24 bg-neutral-800 rounded" />
        <div className="h-4 w-16 bg-neutral-800 rounded" />
      </div>
      <div className="flex flex-col gap-2 mt-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-4 w-12 bg-neutral-800 rounded flex-shrink-0" />
            <div className="h-4 bg-neutral-800 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
