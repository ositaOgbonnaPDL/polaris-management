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
import { EditDepartmentDialog } from "./edit-department-dialog";
import { toggleDepartmentStatus } from "@/modules/users/actions";
import { toast } from "sonner";

type Department = {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
};

export function DepartmentsTable({
  departments,
}: {
  departments: Department[];
}) {
  const [loading, setLoading] = useState<number | null>(null);

  async function handleToggle(id: number, currentStatus: boolean) {
    setLoading(id);
    const result = await toggleDepartmentStatus(id, !currentStatus);
    if (result.success) {
      toast.success(
        `Department ${currentStatus ? "deactivated" : "activated"}`,
      );
    } else {
      toast.error("Failed to update department");
    }
    setLoading(null);
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department</TableHead>
            <TableHead>Staff Count</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-10 text-slate-400"
              >
                No departments yet. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            departments.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell>{dept.userCount} staff</TableCell>
                <TableCell>
                  <Badge
                    variant={dept.isActive ? "default" : "secondary"}
                    className={
                      dept.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-slate-100 text-slate-500"
                    }
                  >
                    {dept.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">
                  {new Date(dept.createdAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <EditDepartmentDialog department={dept} />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading === dept.id}
                      onClick={() => handleToggle(dept.id, dept.isActive)}
                      className={
                        dept.isActive
                          ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                          : "text-green-600 hover:text-green-700 hover:bg-green-50"
                      }
                    >
                      {dept.isActive ? "Deactivate" : "Activate"}
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
