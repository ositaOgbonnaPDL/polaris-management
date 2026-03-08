import { requireAuth } from "@/shared/lib/auth";
import { ChangePasswordForm } from "./_components/change-password-form";
import { redirect } from "next/navigation";

export default async function ChangePasswordPage() {
  const session = await requireAuth();

  // If they've already changed it, no need to be here
  if (!session.user.mustChangePassword) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Set Your Password
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Please set a new password before continuing
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
