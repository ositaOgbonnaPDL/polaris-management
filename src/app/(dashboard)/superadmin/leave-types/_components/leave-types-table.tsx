"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Pencil, ChevronRight } from "lucide-react";
import { toggleLeaveTypeStatus } from "@/modules/leave/actions";
import { toast } from "sonner";

type LeaveType = {
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
  isActive: boolean;
};

export function LeaveTypesTable({ leaveTypes }: { leaveTypes: LeaveType[] }) {
  const [loading, setLoading] = useState<number | null>(null);

  async function handleToggle(id: number, current: boolean) {
    setLoading(id);
    const result = await toggleLeaveTypeStatus(id, !current);
    if (result.success) {
      toast.success(`Leave type ${current ? "deactivated" : "activated"}`);
    } else {
      toast.error("Failed to update leave type");
    }
    setLoading(null);
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Leave Type</TableHead>
            <TableHead>Default Days</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Probation</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Reliever</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaveTypes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                No leave types configured yet.
              </TableCell>
            </TableRow>
          ) : (
            leaveTypes.map((lt) => (
              <TableRow key={lt.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lt.color }}
                    />
                    <div>
                      <p className="font-medium text-slate-900">{lt.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{lt.code}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{lt.defaultDays} days</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      lt.isPaid
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }
                  >
                    {lt.isPaid ? "Paid" : "Unpaid"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      lt.allowDuringProbation
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    }
                  >
                    {lt.allowDuringProbation ? "Allowed" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      lt.requiresDocument
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-slate-100 text-slate-400"
                    }
                  >
                    {lt.requiresDocument ? "Required" : "Not required"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lt.requiresReliever ? (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      Required
                    </Badge>
                  ) : (
                    <span className="text-slate-400 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={lt.isActive ? "default" : "secondary"}
                    className={
                      lt.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-slate-100 text-slate-500"
                    }
                  >
                    {lt.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/superadmin/leave-types/${lt.id}`}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Configure
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading === lt.id}
                      onClick={() => handleToggle(lt.id, lt.isActive)}
                      className={
                        lt.isActive
                          ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                          : "text-green-600 hover:text-green-700 hover:bg-green-50"
                      }
                    >
                      {lt.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
