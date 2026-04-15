import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
      <h1 className="text-2xl font-bold">YT Collector</h1>
      <LoginForm />
    </div>
  );
}
