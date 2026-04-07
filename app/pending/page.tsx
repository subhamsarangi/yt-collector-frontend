export default function PendingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <p className="text-4xl">⏳</p>
      <h1 className="text-xl font-bold">Waiting for approval</h1>
      <p className="text-neutral-400 text-sm max-w-xs">
        Your account is pending approval by the owner. You'll get access once it's approved.
      </p>
    </div>
  );
}
