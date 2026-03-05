"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  STATUS_LABELS,
  URGENCY_LABELS,
  REQUEST_TYPE_LABELS,
} from "@/shared/constants";
import { formatNaira } from "@/shared/lib/utils";
import { FileText, ChevronRight, Calendar, Package } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

type Requisition = {
  id: number;
  reqNumber: string;
  requestType: string;
  requestTypeOther: string | null;
  reason: string;
  urgency: string;
  status: string;
  totalAmount: number | null;
  createdAt: string;
  items: { id: number; description: string | null }[];
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_manager: "bg-blue-100 text-blue-700",
  pending_admin: "bg-purple-100 text-purple-700",
  pending_finance: "bg-amber-100 text-amber-700",
  pending_md: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  revision_requester: "bg-yellow-100 text-yellow-700",
  revision_admin: "bg-yellow-100 text-yellow-700",
};

const URGENCY_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

export function RequisitionsList({
  requisitions,
}: {
  requisitions: Requisition[];
}) {
  if (requisitions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="font-medium text-slate-900 mb-1">No requisitions yet</h3>
        <p className="text-sm text-slate-400 max-w-xs">
          Submit your first request using the "New Request" button above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requisitions.map((req) => {
        const typeLabel =
          req.requestType === "other"
            ? req.requestTypeOther || "Other"
            : REQUEST_TYPE_LABELS[
                req.requestType as keyof typeof REQUEST_TYPE_LABELS
              ];

        return (
          <Link key={req.id} href={`/requisitions/${req.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {req.reqNumber}
                      </span>
                      <Badge
                        className={cn(
                          "text-xs px-2 py-0 h-5",
                          STATUS_STYLES[req.status],
                        )}
                      >
                        {STATUS_LABELS[req.status] ?? req.status}
                      </Badge>
                      <Badge
                        className={cn(
                          "text-xs px-2 py-0 h-5",
                          URGENCY_STYLES[req.urgency],
                        )}
                      >
                        {
                          URGENCY_LABELS[
                            req.urgency as keyof typeof URGENCY_LABELS
                          ]
                        }
                      </Badge>
                    </div>

                    {/* Type and item count */}
                    <div className="flex items-center gap-3 text-sm text-slate-600 mb-1.5">
                      <span>{typeLabel}</span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {req.items.length} item
                        {req.items.length !== 1 ? "s" : ""}
                      </span>
                      {req.totalAmount && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-medium text-slate-900">
                            {formatNaira(req.totalAmount)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Reason preview */}
                    <p className="text-xs text-slate-400 truncate">
                      {req.reason}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(req.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
