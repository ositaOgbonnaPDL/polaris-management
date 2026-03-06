import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./_components/login-form";
import { getSession } from "@/shared/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login — Polaris Digitech Staff Portal",
};

export default async function LoginPage() {
  // Already logged in — go to dashboard
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Company Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">P</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Polaris Digitech
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Requisition Management System
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-slate-400 mt-6">
          Having trouble logging in? Contact your system administrator.
        </p>
      </div>
    </div>
  );
}
