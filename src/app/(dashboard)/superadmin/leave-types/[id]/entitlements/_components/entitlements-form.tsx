"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { upsertLeaveRoleEntitlement } from "@/modules/leave/actions";
import { toast } from "sonner";

type Row = {
  role: string;
  label: string;
  fullDays: number;
  confirmationDays: number;
};

export function EntitlementsForm({
  leaveTypeId,
  rows,
}: {
  leaveTypeId: number;
  rows: Row[];
}) {
  const [values, setValues] = useState<Record<string, { fullDays: string; confirmationDays: string }>>(
    Object.fromEntries(
      rows.map((r) => [
        r.role,
        {
          fullDays: String(r.fullDays),
          confirmationDays: String(r.confirmationDays),
        },
      ]),
    ),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  async function handleSave(role: string) {
    setSaving(role);
    const v = values[role];
    const result = await upsertLeaveRoleEntitlement(
      leaveTypeId,
      role,
      parseInt(v.fullDays) || 0,
      parseInt(v.confirmationDays) || 0,
    );

    if (result.success) {
      setSaved((prev) => new Set([...prev, role]));
      setTimeout(() => setSaved((prev) => { const n = new Set(prev); n.delete(role); return n; }), 2000);
    } else {
      toast.error(result.error ?? "Failed to save");
    }
    setSaving(null);
  }

  function update(role: string, field: "fullDays" | "confirmationDays", value: string) {
    setValues((prev) => ({
      ...prev,
      [role]: { ...prev[role], [field]: value },
    }));
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Role</th>
          <th className="text-left text-xs font-medium text-slate-500 uppercase px-3 py-3">Full Days</th>
          <th className="text-left text-xs font-medium text-slate-500 uppercase px-3 py-3">Confirmation Days</th>
          <th className="px-3 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {rows.map((row) => {
          const v = values[row.role];
          const isSaving = saving === row.role;
          const isSaved = saved.has(row.role);

          return (
            <tr key={row.role} className="hover:bg-slate-50/50">
              <td className="px-5 py-3 font-medium text-slate-800 text-sm">{row.label}</td>
              <td className="px-3 py-3">
                <Input
                  type="number"
                  min={0}
                  value={v.fullDays}
                  onChange={(e) => update(row.role, "fullDays", e.target.value)}
                  className="w-24 h-8 text-sm"
                />
              </td>
              <td className="px-3 py-3">
                <Input
                  type="number"
                  min={0}
                  value={v.confirmationDays}
                  onChange={(e) => update(row.role, "confirmationDays", e.target.value)}
                  className="w-24 h-8 text-sm"
                />
              </td>
              <td className="px-3 py-3 text-right">
                <Button
                  size="sm"
                  variant={isSaved ? "outline" : "default"}
                  disabled={isSaving}
                  onClick={() => handleSave(row.role)}
                  className={
                    isSaved
                      ? "border-green-300 text-green-700 hover:bg-green-50"
                      : "bg-slate-800 hover:bg-slate-700 h-8"
                  }
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isSaved ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Saved
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
