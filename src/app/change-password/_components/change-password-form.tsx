"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export function ChangePasswordForm() {
  const router = useRouter();
  const { update } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to change password");
        return;
      }

      // Update the JWT token so middleware sees mustChangePassword: false
      await update({ mustChangePassword: false });
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Simple password strength indicator
  const strength =
    newPassword.length === 0
      ? null
      : newPassword.length < 8
        ? "weak"
        : newPassword.length < 12
          ? "fair"
          : "strong";

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Create New Password</CardTitle>
        <CardDescription>
          Choose a strong password you haven't used before
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              required
              autoFocus
            />
            {strength && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-1">
                  {["weak", "fair", "strong"].map((level, i) => (
                    <div
                      key={level}
                      className={`h-1 w-8 rounded-full transition-colors ${
                        ["weak", "fair", "strong"].indexOf(strength) >= i
                          ? strength === "weak"
                            ? "bg-red-400"
                            : strength === "fair"
                              ? "bg-yellow-400"
                              : "bg-green-400"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500 capitalize">
                  {strength}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            {confirmPassword && newPassword === confirmPassword && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-500">Passwords match</span>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-700"
            disabled={isLoading || newPassword !== confirmPassword}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Set Password & Continue"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
