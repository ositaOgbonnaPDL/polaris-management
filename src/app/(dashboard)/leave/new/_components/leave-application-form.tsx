"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Upload, X } from "lucide-react";
import { submitLeaveRequest, calculateWorkingDaysAction } from "@/modules/leave/actions";
import { toast } from "sonner";

type LeaveTypeOption = {
  id: number;
  name: string;
  code: string;
  color: string;
  isPaid: boolean;
  requiresDocument: boolean;
  requiresReliever: boolean;
  relieverRoles: string; // JSON string
  availableDays: number;
  totalDays: number;
};

type RelieverOption = {
  id: number;
  name: string;
  role: string;
};

export function LeaveApplicationForm({
  leaveTypes,
  relieverOptions,
  userRole,
}: {
  leaveTypes: LeaveTypeOption[];
  relieverOptions: RelieverOption[];
  userRole: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [workingDays, setWorkingDays] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [reason, setReason] = useState("");
  const [relieverId, setRelieverId] = useState<string>("");
  const [relieverAddress, setRelieverAddress] = useState("");
  const [documentUrl, setDocumentUrl] = useState<string>("");
  const [documentName, setDocumentName] = useState<string>("");

  const selectedType = leaveTypes.find((lt) => lt.id === parseInt(selectedTypeId));
  const relieverRoles: string[] = selectedType?.relieverRoles
    ? JSON.parse(selectedType.relieverRoles)
    : [];
  const needsReliever = selectedType?.requiresReliever && relieverRoles.includes(userRole);
  const needsDocument = selectedType?.requiresDocument ?? false;
  const hasInsufficientBalance =
    selectedType && workingDays !== null && workingDays > selectedType.availableDays;

  // Recalculate working days whenever dates change
  useEffect(() => {
    if (!startDate || !endDate || startDate > endDate) {
      setWorkingDays(null);
      return;
    }
    setIsCalculating(true);
    calculateWorkingDaysAction(startDate, endDate).then(({ days }) => {
      setWorkingDays(days);
      setIsCalculating(false);
    });
  }, [startDate, endDate]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setDocumentUrl(data.url);
        setDocumentName(file.name);
        toast.success("Document uploaded");
      } else {
        toast.error(data.error ?? "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    }
    setIsUploading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTypeId) return toast.error("Select a leave type");
    if (!startDate || !endDate) return toast.error("Select start and end dates");
    if (needsReliever && !relieverId) return toast.error("Please select a reliever");
    if (needsDocument && !documentUrl) return toast.error("Please upload a supporting document");

    setIsLoading(true);
    const result = await submitLeaveRequest({
      leaveTypeId: parseInt(selectedTypeId),
      startDate,
      endDate,
      reason: reason || undefined,
      relieverId: relieverId ? parseInt(relieverId) : undefined,
      relieverAddress: relieverAddress || undefined,
      documentUrl: documentUrl || undefined,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Leave request ${result.reqNumber} submitted successfully`);
      router.push("/leave/my");
    }
    setIsLoading(false);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
    >
      {/* Leave Type */}
      <div className="space-y-1.5">
        <Label>Leave Type</Label>
        <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="Select leave type..." />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes.map((lt) => (
              <SelectItem key={lt.id} value={String(lt.id)}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: lt.color }}
                  />
                  <span>{lt.name}</span>
                  <span className="text-slate-400 text-xs ml-1">
                    ({lt.availableDays}d available)
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedType && (
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary" className={selectedType.isPaid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
              {selectedType.isPaid ? "Paid" : "Unpaid"}
            </Badge>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              {selectedType.availableDays}d of {selectedType.totalDays}d available
            </Badge>
          </div>
        )}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Working Days Indicator */}
      {(workingDays !== null || isCalculating) && (
        <div
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
            hasInsufficientBalance
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}
        >
          {isCalculating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasInsufficientBalance ? (
            <AlertCircle className="h-4 w-4" />
          ) : null}
          {isCalculating ? (
            "Calculating working days..."
          ) : hasInsufficientBalance ? (
            `${workingDays} working days — insufficient balance (${selectedType?.availableDays}d available)`
          ) : (
            `${workingDays} working day${workingDays !== 1 ? "s" : ""} (excluding weekends & public holidays)`
          )}
        </div>
      )}

      {/* Reason */}
      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Brief reason for leave..."
          rows={3}
          maxLength={1000}
        />
      </div>

      {/* Reliever — only shown when required for this user's role */}
      {needsReliever && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-700">
            Reliever Details
            <span className="ml-1 text-red-500">*</span>
          </p>

          <div className="space-y-1.5">
            <Label>Reliever</Label>
            <Select value={relieverId} onValueChange={setRelieverId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select who will cover for you..." />
              </SelectTrigger>
              <SelectContent>
                {relieverOptions.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">
              They will be notified and must accept before your request advances.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="relieverAddress">Your Address While Away (optional)</Label>
            <Input
              id="relieverAddress"
              value={relieverAddress}
              onChange={(e) => setRelieverAddress(e.target.value)}
              placeholder="Address or contact during leave..."
            />
          </div>
        </div>
      )}

      {/* Document Upload */}
      {needsDocument && (
        <div className="space-y-1.5 border-t border-slate-100 pt-4">
          <Label>
            Supporting Document
            <span className="ml-1 text-red-500">*</span>
          </Label>
          {documentUrl ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-sm text-green-700 flex-1 truncate">{documentName}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setDocumentUrl(""); setDocumentName(""); }}
                className="h-auto p-1 text-green-600 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  <Upload className="h-5 w-5 text-slate-400" />
                )}
                <span className="text-sm text-slate-500">
                  {isUploading ? "Uploading..." : "Click to upload (PDF, JPG, PNG, Word — max 5MB)"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/leave/dashboard")}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || isUploading || hasInsufficientBalance === true}
          className="bg-slate-800 hover:bg-slate-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Leave Request"
          )}
        </Button>
      </div>
    </form>
  );
}
