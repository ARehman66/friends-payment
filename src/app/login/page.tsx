import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-10">
      <div className="w-full max-w-[420px] rounded-2xl border border-[#e8edf2] bg-white px-6 py-8 shadow-[0_12px_40px_rgba(16,42,67,0.08)] sm:px-8 sm:py-10">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex flex-col items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-base font-bold text-white shadow-[0_8px_20px_rgba(31,111,120,0.35)]">
              BL
            </span>
            <p className="text-lg font-bold tracking-tight text-ink">
              BreakLedger
            </p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Sign in to manage expenses and deposits.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
