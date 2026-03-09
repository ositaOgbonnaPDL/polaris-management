"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createLeaveType, updateLeaveType } from "@/modules/leave/actions";
import { toast } from "sonner";

const RELIEVER_ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
  { value: "finance", label: "Finance" },
  { value: "md", label: "Managing Director" },
];

type LeaveTypeData = {
  id: number;
  name: string;
  code: string;
  defaultDays: number;
  isPaid: boolean;
  requiresDocument: boolean;
  allowDuringProbation: boolean;
  requiresReliever: boolean;
  relieverRoles: string;
  color: string;
};

export function LeaveTypeForm({ leaveType }: { leaveType?: LeaveTypeData }) {
  const router = useRouter();
  const isEdit = !!leaveType?.id;

  const parsedRelieverRoles: string[] = leaveType?.relieverRoles
    ? JSON.parse(leaveType.relieverRoles)
    : [];

  const [isLoading, setIsLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(leaveType?.isPaid ?? true);
  const [requiresDocument, setRequiresDocument] = useState(leaveType?.requiresDocument ?? false);
  const [allowDuringProbation, setAllowDuringProbation] = useState(leaveType?.allowDuringProbation ?? false);
  const [requiresReliever, setRequiresReliever] = useState(leaveType?.requiresReliever ?? false);
  const [relieverRoles, setRelieverRoles] = useState<string[]>(parsedRelieverRoles);

  function toggleRelieverRole(role: string) {
    setRelieverRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("isPaid", String(isPaid));
    formData.set("requiresDocument", String(requiresDocument));
    formData.set("allowDuringProbation", String(allowDuringProbation));
    formData.set("requiresReliever", String(requiresReliever));

    formData.delete("relieverRoles");
    relieverRoles.forEach((r) => formData.append("relieverRoles", r));

    const result = isEdit
      ? await updateLeaveType(leaveType.id, formData)
      : await createLeaveType(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEdit ? "Leave type updated" : "Leave type created");
      router.push("/superadmin/leave-types");
    }

    setIsLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={leaveType?.name}
          placeholder="e.g. Annual Leave"
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          name="code"
          defaultValue={leaveType?.code}
          placeholder="e.g. annual"
          required
          disabled={isEdit}
          className={isEdit ? "bg-slate-50 text-slate-500" : ""}
        />
        <p className="text-xs text-slate-400">
          Lowercase letters and underscores only. Cannot be changed after creation.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="defaultDays">Default Annual Days</Label>
        <Input
          id="defaultDays"
          name="defaultDays"
          type="number"
          min={0}
          defaultValue={leaveType?.defaultDays ?? 0}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="color">Calendar Color</Label>
        <div className="flex items-center gap-3">
          <input
            id="color"
            name="color"
            type="color"
            defaultValue={leaveType?.color ?? "#6366f1"}
            className="h-10 w-16 rounded border border-slate-200 cursor-pointer"
          />
          <span className="text-sm text-slate-500">Shown on the leave calendar</span>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        <p className="text-sm font-medium text-slate-700">Options</p>
        {(
          [
            { id: "isPaid", label: "Paid leave (no salary deduction)", value: isPaid, set: setIsPaid },
            { id: "requiresDocument", label: "Requires supporting document", value: requiresDocument, set: setRequiresDocument },
            { id: "allowDuringProbation", label: "Allow during probation period", value: allowDuringProbation, set: setAllowDuringProbation },
            { id: "requiresReliever", label: "Requires a reliever (cover person)", value: requiresReliever, set: setRequiresReliever },
          ] as { id: string; label: string; value: boolean; set: (v: boolean) => void }[]
        ).map(({ id, label, value, set }) => (
          <div key={id} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={id}
              checked={value}
              onChange={(e) => set(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 cursor-pointer"
            />
            <label htmlFor={id} className="text-sm text-slate-700 cursor-pointer">
              {label}
            </label>
          </div>
        ))}
      </div>

      {requiresReliever && (
        <div className="space-y-2 pl-6 border-l-2 border-purple-200">
          <p className="text-sm font-medium text-slate-700">
            Which roles must assign a reliever?
          </p>
          <div className="space-y-2">
            {RELIEVER_ROLE_OPTIONS.map((r) => (
              <div key={r.value} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`reliever_${r.value}`}
                  checked={relieverRoles.includes(r.value)}
                  onChange={() => toggleRelieverRole(r.value)}
                  className="h-4 w-4 rounded border-slate-300 cursor-pointer"
                />
                <label
                  htmlFor={`reliever_${r.value}`}
                  className="text-sm text-slate-700 cursor-pointer"
                >
                  {r.label}
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Only these roles will see and be required to fill in the reliever field.
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(
              isEdit
                ? `/superadmin/leave-types/${leaveType.id}`
                : "/superadmin/leave-types",
            )
          }
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-slate-800 hover:bg-slate-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEdit ? "Saving..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Create Leave Type"
          )}
        </Button>
      </div>
    </form>
  );
}
