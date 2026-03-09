"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Copy, Check } from "lucide-react";
import { createUser } from "@/modules/users/actions";
import { ROLE_LABELS, ROLES } from "@/shared/constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

type Department = { id: number; name: string };
type User = { id: number; name: string; role: string };

export function CreateUserDialog({
  departments,
  users,
}: {
  departments: Department[];
  users: User[];
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  // HOD-level users that can appear as "reports to"
  const managers = users.filter(
    (u) => u.role === ROLES.MANAGER || u.role === ROLES.ADMIN || u.role === ROLES.HR_MANAGER,
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createUser(formData);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    // Show temp password before closing
    setTempPassword(result.tempPassword!);
    setIsLoading(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setOpen(false);
    setTempPassword("");
    setCopied(false);
    setSelectedRole("");
  }

  return (
    <Dialog open={open} onOpenChange={open ? handleClose : setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-slate-800 hover:bg-slate-700">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {tempPassword ? "User Created" : "Create User"}
          </DialogTitle>
          {!tempPassword && (
            <DialogDescription>
              A temporary password will be generated. Share it with the staff
              member — they'll be required to change it on first login.
            </DialogDescription>
          )}
        </DialogHeader>

        {tempPassword ? (
          // Show temp password after creation
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                User created successfully. Share these credentials with them
                securely.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono">
                  {tempPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                They will be prompted to change this on first login.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={handleClose}
                className="bg-slate-800 hover:bg-slate-700"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@polarisdigitech.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select name="role" required onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select name="departmentId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Show "Reports To" for staff, manager, admin, and hr_manager */}
              {[ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.HR_MANAGER].includes(selectedRole) && managers.length > 0 && (
                <div className="space-y-2">
                  <Label>Reports To</Label>
                  <Select name="reportsToId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
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
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
