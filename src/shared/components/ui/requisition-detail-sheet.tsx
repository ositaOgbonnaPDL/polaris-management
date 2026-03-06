"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RequisitionStatusBadge } from "./requisition-status-badge";
import { URGENCY_LABELS, REQUEST_TYPE_LABELS } from "@/shared/constants";
import { formatNaira } from "@/shared/lib/utils";
import { ExternalLink, FileText } from "lucide-react";

type RequisitionItem = {
  id: number;
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  adminNotes: string | null;
  quoteInvoiceUrl?: string | null;
  isEnriched: boolean;
};

type RequisitionDetail = {
  id: number;
  reqNumber: string;
  requestType: string;
  requestTypeOther: string | null;
  reason: string;
  urgency: string;
  status: string;
  currentStep: number;
  deliveryDate: string | null;
  totalAmount: number | null;
  revisionNote: string | null;
  requesterAttachmentUrl: string | null;
  createdAt: string;
  requester: { name: string; email: string };
  department: { name: string };
  items: RequisitionItem[];
};

type Props = {
  requisition: RequisitionDetail;
  children: React.ReactNode; // trigger element
  footer?: React.ReactNode; // action buttons
  defaultOpen?: boolean; // open on mount (e.g. from URL deep-link)
  onOpenChange?: (open: boolean) => void;
};

export function RequisitionDetailSheet({
  requisition,
  children,
  footer,
  defaultOpen,
  onOpenChange,
}: Props) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  // Sync when defaultOpen prop changes (e.g. URL param changes)
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  function handleOpenChange(value: boolean) {
    setOpen(value);
    onOpenChange?.(value);
  }

  const req = requisition;

  const typeLabel =
    req.requestType === "other"
      ? (req.requestTypeOther ?? "Other")
      : REQUEST_TYPE_LABELS[
          req.requestType as keyof typeof REQUEST_TYPE_LABELS
        ];

  const hasEnrichedItems = req.items.some((i) => i.isEnriched);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="border-b mt-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{req.reqNumber}</SheetTitle>
            <RequisitionStatusBadge status={req.status} />
          </div>
          <p className="text-sm text-slate-500">
            {req.requester.name} • {req.department.name}
          </p>
        </SheetHeader>

        <div className="space-y-6 p-6">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                Type
              </p>
              <p className="font-medium">{typeLabel}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                Urgency
              </p>
              <p className="font-medium">
                {URGENCY_LABELS[req.urgency as keyof typeof URGENCY_LABELS]}
              </p>
            </div>
            {req.deliveryDate && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                  Required By
                </p>
                <p className="font-medium">{req.deliveryDate}</p>
              </div>
            )}
            {req.totalAmount && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                  Total Amount
                </p>
                <p className="font-semibold text-slate-900">
                  {formatNaira(req.totalAmount)}
                </p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                Submitted
              </p>
              <p className="font-medium">
                {new Date(req.createdAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <Separator />

          {/* Reason */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
              Reason / Justification
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {req.reason}
            </p>
          </div>

          {/* Revision note */}
          {req.revisionNote && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                Revision Feedback
              </p>
              <p className="text-sm text-amber-800">{req.revisionNote}</p>
            </div>
          )}

          <Separator />

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Items ({req.items.length})
              </p>
              {hasEnrichedItems && (
                <Badge
                  variant="outline"
                  className="text-xs text-green-600 border-green-300"
                >
                  Commercially enriched
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {req.items.map((item, i) => (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-lg p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-800">
                      {item.description || `Item ${i + 1}`}
                    </p>
                    {item.isEnriched && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Enriched
                      </Badge>
                    )}
                  </div>
                  {item.isEnriched && (
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-slate-500">
                      <div>
                        <span className="block text-slate-400">Qty</span>
                        {item.quantity}
                      </div>
                      <div>
                        <span className="block text-slate-400">Unit Price</span>
                        {item.unitPrice ? formatNaira(item.unitPrice) : "—"}
                      </div>
                      <div>
                        <span className="block text-slate-400">Total</span>
                        {item.totalPrice ? formatNaira(item.totalPrice) : "—"}
                      </div>
                    </div>
                  )}
                  {item.adminNotes && (
                    <p className="text-xs text-slate-400 mt-1.5 italic">
                      Note: {item.adminNotes}
                    </p>
                  )}
                  {item.quoteInvoiceUrl && (
                    <a
                      href={item.quoteInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1.5 hover:underline"
                    >
                      <FileText className="h-3 w-3" />
                      View Quote/Invoice
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Requester attachment */}
          {req.requesterAttachmentUrl && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                  Supporting Document
                </p>
                <a
                  href={req.requesterAttachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  View Attachment
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          )}

          {/* Footer actions */}
          {footer && (
            <>
              <Separator />
              <div>{footer}</div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
