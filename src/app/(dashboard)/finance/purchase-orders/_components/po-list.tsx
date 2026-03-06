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
import { Button } from "@/components/ui/button";
import { RequisitionStatusBadge } from "@/shared/components/ui/requisition-status-badge";
import { formatNaira } from "@/shared/lib/utils";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = { requisitions: any[] };

export function POList({ requisitions }: Props) {
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  async function handleGeneratePO(requisitionId: number, reqNumber: string) {
    setGeneratingId(requisitionId);
    try {
      const res = await fetch(`/api/finance/generate-po/${requisitionId}`);
      if (!res.ok) {
        toast.error("Failed to generate PO");
        return;
      }

      // Download the PDF
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PO-${reqNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`PO-${reqNumber}.pdf downloaded`);
    } catch {
      toast.error("Failed to generate PO");
    } finally {
      setGeneratingId(null);
    }
  }

  if (requisitions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-16 text-center">
        <p className="text-slate-400">
          No requisitions available for PO generation yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Req #</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Generate PO</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requisitions.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="font-semibold text-sm">
                {req.reqNumber}
              </TableCell>
              <TableCell className="text-sm">{req.requester.name}</TableCell>
              <TableCell className="text-sm">{req.department.name}</TableCell>
              <TableCell className="text-sm font-medium">
                {req.totalAmount ? formatNaira(req.totalAmount) : "—"}
              </TableCell>
              <TableCell>
                <RequisitionStatusBadge status={req.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={generatingId === req.id}
                  onClick={() => handleGeneratePO(req.id, req.reqNumber)}
                >
                  {generatingId === req.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 mr-2" />
                      Generate PO
                    </>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
