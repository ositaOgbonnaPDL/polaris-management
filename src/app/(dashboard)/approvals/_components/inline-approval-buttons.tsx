"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { processInternalApproval } from "@/modules/approvals/internal-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
// import { cn } from "@/shared/lib/utils";

type Props = {
  requisitionId: number;
  currentRole: string;
  currentStep: number;
};

export function InlineApprovalButtons({
  requisitionId,
  currentRole,
  currentStep,
}: Props) {
  const [action, setAction] = useState<
    "approve" | "reject" | "revision" | null
  >(null);
  const [revisionTarget, setRevisionTarget] = useState<"requester" | "admin">(
    "requester",
  );
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canRevisionToAdmin = ["finance", "md"].includes(currentRole);

  async function handleSubmit() {
    if (!action) return;
    if (action !== "approve" && !notes.trim()) {
      toast.error("Please add notes before submitting");
      return;
    }

    setIsLoading(true);
    const result = await processInternalApproval({
      requisitionId,
      action,
      revisionTarget: action === "revision" ? revisionTarget : undefined,
      notes: notes.trim() || undefined,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message ?? "Action recorded");
      setAction(null);
      setNotes("");
    }
    setIsLoading(false);
  }

  if (action) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {action === "approve"
              ? "✓ Approving"
              : action === "reject"
                ? "✗ Rejecting"
                : "↩ Requesting Revision"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAction(null);
              setNotes("");
            }}
            className="text-xs text-slate-400"
          >
            Cancel
          </Button>
        </div>

        {action === "revision" && canRevisionToAdmin && (
          <div className="grid grid-cols-2 gap-2">
            {(["requester", "admin"] as const).map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => setRevisionTarget(target)}
                className={cn(
                  "py-1.5 rounded border text-xs font-medium transition-all capitalize",
                  revisionTarget === target
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-200 text-slate-600",
                )}
              >
                Send to {target}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">
            {action === "approve" ? "Notes (optional)" : "Notes (required)"}
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              action === "approve"
                ? "Any comments..."
                : action === "reject"
                  ? "Reason for rejection..."
                  : "What needs to be changed..."
            }
            className="min-h-17.5 text-sm"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLoading || (action !== "approve" && !notes.trim())}
          size="sm"
          className={cn(
            "w-full",
            action === "approve"
              ? "bg-green-600 hover:bg-green-700"
              : action === "reject"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-600 hover:bg-amber-700",
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Processing...
            </>
          ) : (
            "Confirm"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => setAction("approve")}
        className="bg-green-600 hover:bg-green-700 flex-1"
      >
        ✓ Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setAction("revision")}
        className="text-amber-600 border-amber-300 hover:bg-amber-50 flex-1"
      >
        ↩ Revise
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setAction("reject")}
        className="text-red-600 border-red-300 hover:bg-red-50"
      >
        ✗
      </Button>
    </div>
  );
}
