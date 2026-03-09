"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Pencil } from "lucide-react";
import { setIndividualEntitlement } from "@/modules/leave/actions";
import { ROLE_LABELS } from "@/shared/constants";
import { toast } from "sonner";

type LeaveTypeCol = { id: number; name: string; color: string };

type StaffRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  confirmedAt: string | null;
  entitlements: {
    leaveTypeId: number;
    leaveTypeName: string;
    leaveTypeColor: string;
    totalDays: number | null; // null = not yet assigned
  }[];
};

export function StaffEntitlementsTable({
  rows,
  leaveTypes,
  year,
}: {
  rows: StaffRow[];
  leaveTypes: LeaveTypeCol[];
  year: number;
}) {
  // editing: `${userId}:${leaveTypeId}` → value string
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  function startEdit(userId: number, leaveTypeId: number, currentDays: number | null) {
    const key = `${userId}:${leaveTypeId}`;
    setEditing((prev) => ({ ...prev, [key]: String(currentDays ?? 0) }));
  }

  function cancelEdit(userId: number, leaveTypeId: number) {
    const key = `${userId}:${leaveTypeId}`;
    setEditing((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  async function handleSave(userId: number, leaveTypeId: number) {
    const key = `${userId}:${leaveTypeId}`;
    const days = parseInt(editing[key] ?? "0");

    setSaving(key);
    const result = await setIndividualEntitlement(userId, leaveTypeId, year, days);

    if (result.success) {
      setSaved((prev) => new Set([...prev, key]));
      setEditing((prev) => { const n = { ...prev }; delete n[key]; return n; });
      setTimeout(() => setSaved((prev) => { const n = new Set(prev); n.delete(key); return n; }), 2000);
    } else {
      toast.error(result.error ?? "Failed to save");
    }
    setSaving(null);
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-10 text-center text-slate-400">
        No confirmed staff found. Confirm employees from the User Management page.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Staff Member</TableHead>
            <TableHead>Role</TableHead>
            {leaveTypes.map((lt) => (
              <TableHead key={lt.id} className="min-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: lt.color }}
                  />
                  <span className="text-xs leading-tight">{lt.name}</span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-400">{row.email}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {ROLE_LABELS[row.role as keyof typeof ROLE_LABELS] ?? row.role}
                </Badge>
              </TableCell>
              {row.entitlements.map((e) => {
                const key = `${row.id}:${e.leaveTypeId}`;
                const isEditing = key in editing;
                const isSaving = saving === key;
                const isSaved = saved.has(key);

                return (
                  <TableCell key={e.leaveTypeId}>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          value={editing[key]}
                          onChange={(ev) =>
                            setEditing((prev) => ({ ...prev, [key]: ev.target.value }))
                          }
                          className="w-16 h-7 text-xs"
                          autoFocus
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") handleSave(row.id, e.leaveTypeId);
                            if (ev.key === "Escape") cancelEdit(row.id, e.leaveTypeId);
                          }}
                        />
                        <Button
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleSave(row.id, e.leaveTypeId)}
                          className="h-7 w-7 p-0 bg-slate-800 hover:bg-slate-700"
                        >
                          {isSaving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(row.id, e.leaveTypeId, e.totalDays)}
                        className={`flex items-center gap-1.5 group text-left ${
                          isSaved ? "text-green-600" : e.totalDays === null ? "text-slate-300" : "text-slate-700"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {isSaved ? "✓" : e.totalDays === null ? "—" : `${e.totalDays}d`}
                        </span>
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
