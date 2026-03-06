"use client";

import { useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { enrichRequisitionItems } from "@/modules/requisitions/admin-actions";
import { formatNaira } from "@/shared/lib/utils";
import { toast } from "sonner";

type LineItem = {
  id: number;
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  quoteInvoiceUrl: string | null;
  adminNotes: string | null;
  isEnriched: boolean;
};

type Props = {
  requisition: {
    id: number;
    reqNumber: string;
    items: LineItem[];
  };
  children: React.ReactNode;
};

type ItemData = {
  id: number;
  quantity: string;
  unitPrice: string;
  quoteInvoiceUrl: string;
  adminNotes: string;
  uploadedFile: { url: string; name: string } | null;
  isUploading: boolean;
};

export function AdminEnrichmentSheet({ requisition, children }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [itemData, setItemData] = useState<ItemData[]>(
    requisition.items.map((item) => ({
      id: item.id,
      quantity: item.quantity?.toString() ?? "",
      unitPrice: item.unitPrice?.toString() ?? "",
      quoteInvoiceUrl: item.quoteInvoiceUrl ?? "",
      adminNotes: item.adminNotes ?? "",
      uploadedFile: item.quoteInvoiceUrl
        ? { url: item.quoteInvoiceUrl, name: "Existing file" }
        : null,
      isUploading: false,
    })),
  );

  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  function updateItem<K extends keyof ItemData>(
    index: number,
    field: K,
    value: ItemData[K],
  ) {
    setItemData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleFileUpload(index: number, file: File) {
    updateItem(index, "isUploading", true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      updateItem(index, "uploadedFile", {
        url: data.url,
        name: data.originalName,
      });
      updateItem(index, "quoteInvoiceUrl", data.url);
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      updateItem(index, "isUploading", false);
    }
  }

  // Compute line totals for preview
  function getLineTotal(item: ItemData): string {
    const qty = parseFloat(item.quantity);
    const price = parseFloat(item.unitPrice);
    if (!isNaN(qty) && !isNaN(price)) return formatNaira(qty * price);
    return "—";
  }

  async function handleSave() {
    setIsLoading(true);
    const result = await enrichRequisitionItems(
      requisition.id,
      itemData.map((item) => ({
        id: item.id,
        quantity: item.quantity ? parseInt(item.quantity) : null,
        unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null,
        quoteInvoiceUrl: item.quoteInvoiceUrl || null,
        adminNotes: item.adminNotes || null,
      })),
    );

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Items enriched successfully");
      setOpen(false);
    }
    setIsLoading(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Enrich Items — {requisition.reqNumber}</SheetTitle>
          <p className="text-sm text-slate-500">
            Add quantities, pricing and vendor quotes for each line item. These
            details are required before the requisition can proceed to Finance.
          </p>
        </SheetHeader>

        <div className="space-y-6">
          {itemData.map((item, index) => {
            const original = requisition.items[index];
            return (
              <div
                key={item.id}
                className="border border-slate-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-medium text-sm">
                      {original.description || `Item ${index + 1}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Line total:{" "}
                      <span className="font-semibold text-slate-700">
                        {getLineTotal(item)}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">#{index + 1}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit Price (₦)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, "unitPrice", e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Quote/Invoice upload */}
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs">Quote / Invoice</Label>
                  {item.uploadedFile ? (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border text-sm">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="flex-1 truncate text-xs">
                        {item.uploadedFile.name}
                      </span>
                      <button
                        title="uploaded file"
                        type="button"
                        onClick={() => {
                          updateItem(index, "uploadedFile", null);
                          updateItem(index, "quoteInvoiceUrl", "");
                        }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRefs.current[index]?.click()}
                      disabled={item.isUploading}
                      className="w-full border border-dashed border-slate-300 rounded p-3 text-xs
                                 text-slate-400 hover:border-slate-400 transition-colors flex
                                 items-center justify-center gap-2"
                    >
                      {item.isUploading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          Upload quote or invoice
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={(el) => void (fileRefs.current[index] = el)}
                    type="file"
                    className="hidden"
                    title="Upload quote or invoice"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(index, file);
                    }}
                  />
                </div>

                {/* Admin notes */}
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs">Admin Notes (optional)</Label>
                  <Textarea
                    value={item.adminNotes}
                    onChange={(e) =>
                      updateItem(index, "adminNotes", e.target.value)
                    }
                    placeholder="Any notes about sourcing, vendor, etc."
                    className="min-h-15 text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-slate-800 hover:bg-slate-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Enrichment"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
