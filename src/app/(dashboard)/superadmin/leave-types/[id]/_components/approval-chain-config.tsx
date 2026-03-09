"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, GripVertical, ArrowDown } from "lucide-react";
import { upsertApprovalConfig } from "@/modules/leave/actions";
import { toast } from "sonner";

type StepRole = "manager" | "hr_manager" | "md";

type Step = {
  role: StepRole;
  stepNumber: number;
  isRequired: boolean;
};

const ROLE_LABELS: Record<StepRole, string> = {
  manager: "Manager (HOD)",
  hr_manager: "HR Manager",
  md: "Managing Director",
};

const ROLE_COLORS: Record<StepRole, string> = {
  manager: "bg-blue-100 text-blue-700",
  hr_manager: "bg-green-100 text-green-700",
  md: "bg-slate-100 text-slate-700",
};

export function ApprovalChainConfig({
  leaveTypeId,
  initialSteps,
}: {
  leaveTypeId: number;
  initialSteps: Step[];
}) {
  const [steps, setSteps] = useState<Step[]>(
    initialSteps.length > 0 ? initialSteps : [],
  );
  const [newRole, setNewRole] = useState<StepRole>("manager");
  const [isSaving, setIsSaving] = useState(false);

  function addStep() {
    const nextStepNumber = steps.length + 1;
    setSteps((prev) => [
      ...prev,
      { role: newRole, stepNumber: nextStepNumber, isRequired: true },
    ]);
  }

  function removeStep(index: number) {
    setSteps((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Re-number steps
      return updated.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    });
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await upsertApprovalConfig(leaveTypeId, steps);
    if (result.success) {
      toast.success("Approval chain saved");
    } else {
      toast.error(result.error ?? "Failed to save approval chain");
    }
    setIsSaving(false);
  }

  const availableRoles: StepRole[] = ["manager", "hr_manager", "md"];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
      {/* Chain preview */}
      <div>
        <p className="text-xs text-slate-500 mb-3">
          Note: Reliever acknowledgement (if configured) always happens before Step 1.
        </p>

        {steps.length === 0 ? (
          <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
            No approval steps configured. Add steps below.
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                  <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                  <span className="text-xs font-mono text-slate-400 w-6">
                    {step.stepNumber}
                  </span>
                  <Badge className={`${ROLE_COLORS[step.role]} border-0 font-medium`}>
                    {ROLE_LABELS[step.role]}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStep(idx)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {steps.length > 1 && (
              <div className="flex items-center gap-1 pl-9 text-xs text-slate-400">
                <ArrowDown className="h-3 w-3" />
                Each step is notified after the previous approves
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add step */}
      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <Select
          value={newRole}
          onValueChange={(v) => setNewRole(v as StepRole)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStep}
          className="flex-shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Step
        </Button>
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-slate-800 hover:bg-slate-700"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Approval Chain"
        )}
      </Button>
    </div>
  );
}
