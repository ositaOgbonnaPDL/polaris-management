"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Pencil, Loader2 } from "lucide-react";
import { updateUser } from "@/modules/users/actions";
import { ROLE_LABELS, ROLES } from "@/shared/constants";
import { toast } from "sonner";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  departmentId: number | null;
};

type Department = { id: number; name: string };
type UserOption = { id: number; name: string; role: string };

export function EditUserDialog({
  user,
  departments,
  users,
  asMenuItem,
}: {
  user: User;
  departments: Department[];
  users: UserOption[];
  asMenuItem?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);

  const managers = users.filter(
    (u) => u.id !== user.id && (u.role === ROLES.MANAGER || u.role === ROLES.ADMIN),
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("isActive", String(user.isActive));

    const result = await updateUser(user.id, formData);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    toast.success("User updated");
    setOpen(false);
    setIsLoading(false);
  }

  function handleClose() {
    setOpen(false);
    setSelectedRole(user.role);
  }

  const trigger = asMenuItem ? (
    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>
      <Pencil className="h-4 w-4 mr-2" />
      Edit
    </DropdownMenuItem>
  ) : (
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
      <Pencil className="h-4 w-4 mr-2" />
      Edit
    </Button>
  );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={open ? handleClose : setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update details for {user.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={user.name}
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
                    defaultValue={user.email}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    name="role"
                    defaultValue={user.role}
                    onValueChange={setSelectedRole}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Select
                    name="departmentId"
                    defaultValue={user.departmentId ? String(user.departmentId) : undefined}
                    required
                  >
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

              {selectedRole === ROLES.STAFF && managers.length > 0 && (
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
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
