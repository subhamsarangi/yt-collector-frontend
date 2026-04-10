import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="YT Collector" width={40} height={40} className="rounded-lg" />
        <h1 className="text-2xl font-bold">YT Collector</h1>
      </div>
      <LoginForm />
    </div>
  );
}
