"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Loader2,
  Upload,
  X,
  FileText,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { resubmitRequisition } from "@/modules/requisitions/actions";
import { REQUEST_TYPE_LABELS, URGENCY_LABELS } from "@/shared/constants";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

type LineItem = {
  id: string;
  description: string;
};

type Props = {
  requisition: {
    id: number;
    reqNumber: string;
    requestType: string;
    requestTypeOther: string | null;
    reason: string;
    urgency: string;
    deliveryDate: string | null;
    revisionNote: string | null;
    requesterAttachmentUrl: string | null;
    items: {
      id: number;
      description: string | null;
    }[];
  };
};

export function ResubmitForm({ requisition }: Props) {
  const router = useRouter();

  // Pre-fill everything from the existing requisition
  const [requestType, setRequestType] = useState(
    requisition.requestType === "other" ? "other" : requisition.requestType,
  );
  const [requestTypeOther, setRequestTypeOther] = useState(
    requisition.requestTypeOther ?? "",
  );
  const [reason, setReason] = useState(requisition.reason);
  const [urgency, setUrgency] = useState<"low" | "medium" | "high" | "">(
    requisition.urgency as "low" | "medium" | "high",
  );
  const [deliveryDate, setDeliveryDate] = useState(
    requisition.deliveryDate ?? "",
  );

  // Pre-fill line items
  const [items, setItems] = useState<LineItem[]>(
    requisition.items.length > 0
      ? requisition.items.map((item) => ({
          id: crypto.randomUUID(),
          description: item.description ?? "",
        }))
      : [{ id: crypto.randomUUID(), description: "" }],
  );

  // Attachment
  const [attachment, setAttachment] = useState<{
    url: string;
    name: string;
  } | null>(
    requisition.requesterAttachmentUrl
      ? { url: requisition.requesterAttachmentUrl, name: "Existing attachment" }
      : null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Line items ─────────────────────────────────────
  function addItem() {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), description: "" }]);
  }

  function removeItem(id: string) {
    if (items.length === 1) {
      toast.error("At least one item is required");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id: string, description: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item)),
    );
  }

  // ── File upload ─────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }

      setAttachment({ url: data.url, name: data.originalName });
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Submit ──────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!urgency) {
      setError("Please select an urgency level");
      return;
    }

    if (requestType === "other" && !requestTypeOther.trim()) {
      setError("Please describe the request type");
      return;
    }

    setIsSubmitting(true);

    const result = await resubmitRequisition(requisition.id, {
      requestType,
      requestTypeOther: requestTypeOther || undefined,
      reason,
      urgency,
      deliveryDate: deliveryDate || undefined,
      requesterAttachmentUrl: attachment?.url || undefined,
      items: items.map((item) => ({
        description: item.description || undefined,
      })),
    });

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
    // success → resubmitRequisition redirects automatically
  }

  const urgencyConfig = {
    low: {
      label: "Low",
      class: "border-green-300 bg-green-50 text-green-700",
    },
    medium: {
      label: "Medium",
      class: "border-amber-300 bg-amber-50 text-amber-700",
    },
    high: {
      label: "High / Urgent",
      class: "border-red-300 bg-red-50 text-red-700",
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Revision feedback callout */}
      {requisition.revisionNote && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <span className="font-semibold block mb-1">
              Feedback from approver:
            </span>
            {requisition.revisionNote}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Request details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Type of Request <span className="text-red-500">*</span>
            </Label>
            <Select value={requestType} onValueChange={setRequestType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requestType === "other" && (
            <div className="space-y-1.5">
              <Label>
                Please specify <span className="text-red-500">*</span>
              </Label>
              <Input
                value={requestTypeOther}
                onChange={(e) => setRequestTypeOther(e.target.value)}
                placeholder="Describe the request type"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              Reason / Justification <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this is needed..."
              className="min-h-25"
              required
              minLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Urgency <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {(
                Object.keys(urgencyConfig) as Array<keyof typeof urgencyConfig>
              ).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level)}
                  className={cn(
                    "px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                    urgency === level
                      ? urgencyConfig[level].class
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                  )}
                >
                  {urgencyConfig[level].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Required By{" "}
              <span className="text-slate-400 text-xs font-normal">
                (optional)
              </span>
            </Label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Items Requested</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Update your items based on the feedback received.
              </p>
            </div>
            <Badge variant="secondary">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-start gap-2">
              <div className="shrink-0 w-6 h-9 flex items-center justify-center">
                <span className="text-xs text-slate-400 font-medium">
                  {index + 1}
                </span>
              </div>
              <Input
                value={item.description}
                onChange={(e) => updateItem(item.id, e.target.value)}
                placeholder={`Item ${index + 1} description (optional)`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                className="shrink-0 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="w-full mt-2 border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Item
          </Button>
        </CardContent>
      </Card>

      {/* Attachment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Supporting Document{" "}
            <span className="text-slate-400 text-xs font-normal">
              (optional)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attachment ? (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <FileText className="h-5 w-5 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-700 flex-1 truncate">
                {attachment.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setAttachment(null)}
                className="shrink-0 h-6 w-6 text-slate-400 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isUploading
                  ? "border-slate-300 bg-slate-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                  <p className="text-sm text-slate-400">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-slate-400" />
                  <p className="text-sm text-slate-600">
                    Click to upload a supporting document
                  </p>
                  <p className="text-xs text-slate-400">
                    PDF, JPG, PNG or Word — max 5MB
                  </p>
                </div>
              )}
            </div>
          )}
          <input
          title='file'
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting || isUploading || !requestType || !urgency || !reason
          }
          className="bg-amber-600 hover:bg-amber-700 min-w-45"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Resubmitting...
            </>
          ) : (
            "Resubmit for Approval"
          )}
        </Button>
      </div>
    </form>
  );
}
