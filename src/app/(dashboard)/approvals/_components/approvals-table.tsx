"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequisitionDetailSheet } from "@/shared/components/ui/requisition-detail-sheet";
import { RequisitionStatusBadge } from "@/shared/components/ui/requisition-status-badge";
import { InlineApprovalButtons } from "./inline-approval-buttons";
import { AdminEnrichmentSheet } from "./admin-enrichment-sheet";
import { URGENCY_LABELS } from "@/shared/constants";
import { formatNaira } from "@/shared/lib/utils";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  requisitions: any[];
  currentRole: string;
  currentUserId: string;
};

const URGENCY_STYLES = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

export function ApprovalsTable({
  requisitions,
  currentRole,
  currentUserId,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const openReqId = searchParams.get("req");

  // Keep URL in sync with the open sheet:
  //   open  → /approvals?req=<id>
  //   close → /approvals
  function handleSheetOpenChange(reqId: number, open: boolean) {
    if (open) {
      router.replace(`/approvals?req=${reqId}`, { scroll: false });
    } else {
      router.replace("/approvals", { scroll: false });
    }
  }

  if (requisitions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-16 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="font-medium text-slate-900 mb-1">All clear</h3>
        <p className="text-sm text-slate-400">
          No requisitions are pending your action right now.
        </p>
      </div>
    );
  }

  const isAdmin = currentRole === "admin";

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Req #</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requisitions.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="font-semibold text-sm">
                {req.reqNumber}
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm font-medium">{req.requester.name}</p>
                  <p className="text-xs text-slate-400">
                    {req.requester.email}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-sm">{req.department.name}</TableCell>
              <TableCell className="text-sm">
                {req.requestType === "other"
                  ? (req.requestTypeOther ?? "Other")
                  : req.requestType.replace(/_/g, " ")}
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    "text-xs",
                    URGENCY_STYLES[req.urgency as keyof typeof URGENCY_STYLES],
                  )}
                >
                  {URGENCY_LABELS[req.urgency as keyof typeof URGENCY_LABELS]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm font-medium">
                {req.totalAmount ? (
                  formatNaira(req.totalAmount)
                ) : (
                  <span className="text-slate-400 text-xs">Not set</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-slate-400">
                {new Date(req.createdAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                })}
              </TableCell>
              <TableCell>
                <div className="flex justify-end items-center gap-2">
                  {/* View details */}
                  <RequisitionDetailSheet
                    requisition={req}
                    defaultOpen={openReqId === String(req.id)}
                    onOpenChange={(open) => handleSheetOpenChange(req.id, open)}
                    footer={
                      <InlineApprovalButtons
                        requisitionId={req.id}
                        currentRole={currentRole}
                        currentStep={req.currentStep}
                      />
                    }
                  >
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1.5" />
                      View
                    </Button>
                  </RequisitionDetailSheet>

                  {/* Admin gets an enrichment button */}
                  {isAdmin && (
                    <AdminEnrichmentSheet requisition={req}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                      >
                        <Pencil className="h-4 w-4 mr-1.5" />
                        Enrich
                      </Button>
                    </AdminEnrichmentSheet>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
