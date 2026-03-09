"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle, X } from "lucide-react";
import { createAWOLRecord } from "@/modules/leave/actions";
import { toast } from "sonner";

export function AWOLDialog({
  users,
}: {
  users: { id: number; name: string; email: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    workingDays: number;
    annualDaysDeducted: number;
    lwpDays: number;
  } | null>(null);

  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  function reset() {
    setUserId("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !startDate || !endDate || !reason.trim()) {
      return toast.error("Please fill in all fields");
    }
    if (startDate > endDate) return toast.error("Start date must be before end date");

    setLoading(true);
    const res = await createAWOLRecord({
      userId: parseInt(userId),
      startDate,
      endDate,
      reason: reason.trim(),
    });

    if ("error" in res && res.error) {
      toast.error(res.error as string);
    } else if ("workingDays" in res) {
      setResult({
        workingDays: (res.workingDays as number),
        annualDaysDeducted: (res.annualDaysDeducted as number),
        lwpDays: (res.lwpDays as number),
      });
      toast.success("AWOL recorded and employee notified.");
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Record AWOL
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="font-semibold text-slate-800">Record AWOL</h2>
          </div>
          <button
            onClick={() => { setOpen(false); reset(); }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="p-5 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <p className="font-medium text-red-800">AWOL Recorded</p>
              <div className="text-sm text-red-700 space-y-1">
                <p>Working days absent: <strong>{result.workingDays}d</strong></p>
                {result.annualDaysDeducted > 0 && (
                  <p>Deducted from Annual Leave: <strong>-{result.annualDaysDeducted}d</strong></p>
                )}
                {result.lwpDays > 0 && (
                  <p>Leave Without Pay: <strong>-{result.lwpDays}d</strong> (payroll flagged)</p>
                )}
              </div>
            </div>
            <Button
              className="w-full bg-slate-800 hover:bg-slate-700"
              onClick={() => { setOpen(false); reset(); }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-sm text-slate-500">
              Annual leave will be deducted first. Any remaining days become Leave Without Pay (flagged for payroll).
            </p>

            <div className="space-y-1.5">
              <Label>Staff Member</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="awol-start">Start Date</Label>
                <Input
                  id="awol-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="awol-end">End Date</Label>
                <Input
                  id="awol-end"
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="awol-reason">Reason / Notes</Label>
              <Textarea
                id="awol-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the unauthorized absence..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setOpen(false); reset(); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Record AWOL
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
