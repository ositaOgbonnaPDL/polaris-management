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
import { Loader2, Plus, X } from "lucide-react";
import { createLeaveAdjustment } from "@/modules/leave/actions";
import { toast } from "sonner";
import { LEAVE_ADJUSTMENT_TYPE_LABELS } from "@/shared/constants";

type AdjType = "credit_paid" | "credit_unpaid" | "awol_deduction" | "correction" | "adhoc_probation";

const ADJ_TYPES: { value: AdjType; label: string }[] = Object.entries(
  LEAVE_ADJUSTMENT_TYPE_LABELS,
).map(([value, label]) => ({ value: value as AdjType, label }));

export function AddAdjustmentDialog({
  users,
  leaveTypes,
  currentYear,
}: {
  users: { id: number; name: string; email: string }[];
  leaveTypes: { id: number; name: string; color: string }[];
  currentYear: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [userId, setUserId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [year, setYear] = useState(String(currentYear));
  const [adjType, setAdjType] = useState<AdjType | "">("");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");

  function reset() {
    setUserId("");
    setLeaveTypeId("");
    setYear(String(currentYear));
    setAdjType("");
    setDays("");
    setReason("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !leaveTypeId || !adjType || !days || !reason.trim()) {
      return toast.error("Please fill in all fields");
    }
    const daysNum = parseFloat(days);
    if (isNaN(daysNum)) return toast.error("Days must be a number");

    setLoading(true);
    const isDeduction = adjType === "awol_deduction";
    const result = await createLeaveAdjustment({
      userId: parseInt(userId),
      leaveTypeId: parseInt(leaveTypeId),
      year: parseInt(year),
      adjustmentType: adjType as AdjType,
      days: isDeduction ? -Math.abs(daysNum) : daysNum,
      isPaid: adjType !== "credit_unpaid" && adjType !== "awol_deduction",
      reason: reason.trim(),
    });

    toast.success("Adjustment recorded.");
    setOpen(false);
    reset();
    setLoading(false);
  }

  if (!open) {
    return (
      <Button
        size="sm"
        className="bg-slate-800 hover:bg-slate-700"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Adjustment
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Add Leave Adjustment</h2>
          <button
            onClick={() => { setOpen(false); reset(); }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

          <div className="space-y-1.5">
            <Label>Leave Type</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type..." />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={String(lt.id)}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: lt.color }}
                      />
                      {lt.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={2020}
                max={2030}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="days">Days</Label>
              <Input
                id="days"
                type="number"
                step="0.5"
                min="0.5"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="e.g. 2"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adjustment Type</Label>
            <Select value={adjType} onValueChange={(v) => setAdjType(v as AdjType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {ADJ_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for this adjustment..."
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
              className="flex-1 bg-slate-800 hover:bg-slate-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Adjustment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
