"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Ban } from "lucide-react";
import { cancelLeaveByHR } from "@/modules/leave/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function HRCancelPanel({ leaveRequestId }: { leaveRequestId: number }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleCancel() {
    if (!reason.trim()) return toast.error("Please provide a reason for cancellation");
    setLoading(true);
    const result = await cancelLeaveByHR(leaveRequestId, reason.trim());
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Leave request cancelled.");
      router.refresh();
    }
    setLoading(false);
    setConfirming(false);
  }

  return (
    <div className="bg-white border border-red-200 rounded-lg p-5 space-y-4">
      <h2 className="font-semibold text-slate-800">HR Override</h2>
      {confirming ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Reason for cancellation</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this leave is being cancelled..."
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              disabled={loading || !reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Cancel
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => { setConfirming(false); setReason(""); }}
            >
              Back
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setConfirming(true)}
          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        >
          <Ban className="h-4 w-4 mr-2" />
          Cancel This Leave
        </Button>
      )}
    </div>
  );
}
