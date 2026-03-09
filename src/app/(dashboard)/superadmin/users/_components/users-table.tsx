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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/shared/constants";
import { EditUserDialog } from "./edit-user-dialog";
import { toggleUserStatus, resetUserPassword } from "@/modules/users/actions";
import { confirmEmployee } from "@/modules/leave/actions";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, KeyRound, UserX, UserCheck, ShieldCheck } from "lucide-react";
import { EMPLOYMENT_STATUS_LABELS } from "@/shared/constants";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  departmentId: number | null;
  employmentStatus: string;
  department: { name: string } | null;
};

type Department = { id: number; name: string };

export function UsersTable({
  users,
  departments,
}: {
  users: User[];
  departments: Department[];
}) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function handleToggle(id: number, isActive: boolean) {
    setLoadingId(id);
    const result = await toggleUserStatus(id, !isActive);
    if (result.success) {
      toast.success(`User ${isActive ? "deactivated" : "activated"}`);
    } else {
      toast.error("Failed to update user");
    }
    setLoadingId(null);
  }

  async function handleConfirm(id: number, name: string) {
    if (!confirm(`Confirm ${name} as a permanent employee? This will grant them their confirmation-year leave entitlements.`)) return;
    setLoadingId(id);
    const result = await confirmEmployee(id);
    if (result.success) {
      toast.success(`${name} has been confirmed. Leave entitlements granted.`);
    } else {
      toast.error(result.error ?? "Failed to confirm employee");
    }
    setLoadingId(null);
  }

  async function handleResetPassword(id: number, name: string) {
    setLoadingId(id);
    const result = await resetUserPassword(id);
    if (result.success) {
      toast.success(
        `Password reset. Temporary password: ${result.tempPassword}`,
        { duration: 10000 }, // show longer so admin can copy it
      );
    } else {
      toast.error("Failed to reset password");
    }
    setLoadingId(null);
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
          <TableHead>Employment</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-10 text-slate-400"
              >
                No users yet.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow
                key={user.id}
                className={!user.isActive ? "opacity-60" : ""}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {user.department?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={user.isActive ? "default" : "secondary"}
                      className={
                        user.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-slate-100 text-slate-500"
                      }
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {user.mustChangePassword && user.isActive && (
                      <Badge
                        variant="outline"
                        className="text-xs text-amber-600 border-amber-300 bg-amber-50"
                      >
                        Pwd pending
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      user.employmentStatus === "confirmed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }
                  >
                    {EMPLOYMENT_STATUS_LABELS[user.employmentStatus] ?? user.employmentStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingId === user.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <EditUserDialog
                        user={user}
                        departments={departments}
                        users={users}
                        asMenuItem
                      />
                      <DropdownMenuItem
                        onClick={() => handleResetPassword(user.id, user.name)}
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                      {user.employmentStatus === "probation" &&
                        user.role !== "super_admin" &&
                        user.role !== "md" && (
                          <DropdownMenuItem
                            onClick={() => handleConfirm(user.id, user.name)}
                            className="text-emerald-600 focus:text-emerald-600"
                          >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Confirm Employee
                          </DropdownMenuItem>
                        )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleToggle(user.id, user.isActive)}
                        className={
                          user.isActive
                            ? "text-red-600 focus:text-red-600"
                            : "text-green-600 focus:text-green-600"
                        }
                      >
                        {user.isActive ? (
                          <>
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
