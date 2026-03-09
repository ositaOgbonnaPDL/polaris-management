"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserCheck } from "lucide-react";
import { updateReliever } from "@/modules/leave/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function UpdateRelieverPanel({
  leaveRequestId,
  relieverOptions,
}: {
  leaveRequestId: number;
  relieverOptions: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [relieverId, setRelieverId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!relieverId) return toast.error("Please select a reliever");
    setLoading(true);
    const result = await updateReliever(leaveRequestId, parseInt(relieverId));
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("New reliever selected. They will be notified.");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="bg-white border border-amber-200 rounded-lg p-5 space-y-4">
      <h2 className="font-semibold text-slate-800">Select New Reliever</h2>
      <p className="text-xs text-amber-700">
        Your previous reliever declined. Choose someone else to cover for you.
      </p>
      <div className="space-y-1.5">
        <Label>Reliever</Label>
        <Select value={relieverId} onValueChange={setRelieverId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a colleague..." />
          </SelectTrigger>
          <SelectContent>
            {relieverOptions.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={loading || !relieverId}
        className="w-full bg-slate-800 hover:bg-slate-700"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <UserCheck className="h-4 w-4 mr-2" />
        )}
        Update Reliever
      </Button>
    </div>
  );
}
