export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-6 w-40 bg-neutral-800 rounded" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-3">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-48 bg-neutral-800 rounded" />
            <div className="h-3 w-32 bg-neutral-800 rounded" />
          </div>
          <div className="h-7 w-16 bg-neutral-800 rounded" />
        </div>
      ))}
    </div>
  );
}
