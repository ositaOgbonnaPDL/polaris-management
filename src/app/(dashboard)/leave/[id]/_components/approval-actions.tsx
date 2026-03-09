"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { processLeaveApproval } from "@/modules/leave/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ApprovalActions({ leaveRequestId }: { leaveRequestId: number }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);

  async function handleAction(action: "approved" | "rejected") {
    setLoading(action);
    const result = await processLeaveApproval(leaveRequestId, action, notes || undefined);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success(action === "approved" ? "Request approved." : "Request rejected.");
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="font-semibold text-slate-800">Your Decision</h2>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a comment or reason..."
          rows={3}
          maxLength={500}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => handleAction("approved")}
          disabled={!!loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {loading === "approved" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Approve
        </Button>
        <Button
          variant="outline"
          onClick={() => handleAction("rejected")}
          disabled={!!loading}
          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        >
          {loading === "rejected" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          Reject
        </Button>
      </div>
    </div>
  );
}
