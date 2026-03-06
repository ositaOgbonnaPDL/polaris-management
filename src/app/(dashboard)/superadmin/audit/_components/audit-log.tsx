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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ROLE_LABELS } from "@/shared/constants";

type AuditAction = {
  id: number;
  action: string;
  step: number;
  notes: string | null;
  previousStatus: string;
  newStatus: string;
  createdAt: string;
  actor: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  requisition: {
    id: number;
    reqNumber: string;
    requester: { name: string };
    department: { name: string };
  };
};

type Props = { actions: AuditAction[] };

const ACTION_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  revision_requester: "bg-amber-100 text-amber-700",
  revision_admin: "bg-amber-100 text-amber-700",
  resubmitted: "bg-blue-100 text-blue-700",
  enriched: "bg-purple-100 text-purple-700",
};

const ACTION_LABELS: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  revision_requester: "Revision → Requester",
  revision_admin: "Revision → Admin",
  resubmitted: "Resubmitted",
  enriched: "Enriched",
};

const STEP_LABELS: Record<number, string> = {
  1: "Manager",
  2: "Admin",
  3: "Finance",
  4: "MD",
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

export function AuditLog({ actions }: Props) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [stepFilter, setStepFilter] = useState("all");

  const filtered = actions.filter((a) => {
    const matchesSearch =
      a.requisition.reqNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.actor.name.toLowerCase().includes(search.toLowerCase()) ||
      a.requisition.requester.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      a.requisition.department.name
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesAction = actionFilter === "all" || a.action === actionFilter;

    const matchesStep = stepFilter === "all" || String(a.step) === stepFilter;

    return matchesSearch && matchesAction && matchesStep;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-50 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by req #, actor, requester..."
            className="pl-9"
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ALL_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stepFilter} onValueChange={setStepFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by step" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Steps</SelectItem>
            {Object.entries(STEP_LABELS).map(([step, label]) => (
              <SelectItem key={step} value={step}>
                Step {step} — {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center text-sm text-slate-400 ml-auto">
          {filtered.length} of {actions.length} entries
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Req #</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Status Change</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-12 text-slate-400"
                >
                  No audit entries found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    <span className="block text-slate-400">
                      {new Date(entry.createdAt).toLocaleTimeString("en-NG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </TableCell>

                  <TableCell className="font-semibold text-sm whitespace-nowrap">
                    {entry.requisition.reqNumber}
                  </TableCell>

                  <TableCell className="text-sm">
                    {entry.requisition.requester.name}
                  </TableCell>

                  <TableCell className="text-sm">
                    {entry.requisition.department.name}
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{entry.actor.name}</p>
                      <p className="text-xs text-slate-400">
                        {
                          ROLE_LABELS[
                            entry.actor.role as keyof typeof ROLE_LABELS
                          ]
                        }
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-slate-500">
                    {STEP_LABELS[entry.step] ?? `Step ${entry.step}`}
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={cn(
                        "text-xs whitespace-nowrap",
                        ACTION_STYLES[entry.action] ??
                          "bg-slate-100 text-slate-600",
                      )}
                    >
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                        {entry.previousStatus.replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-300">→</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                        {entry.newStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-500 max-w-45">
                    {entry.notes ? (
                      <span className="line-clamp-2" title={entry.notes}>
                        {entry.notes}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
