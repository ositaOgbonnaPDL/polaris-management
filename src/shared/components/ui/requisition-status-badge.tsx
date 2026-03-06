import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/shared/constants";
import { cn } from "@/shared/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 hover:bg-slate-100",
  pending_manager: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  pending_admin: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  pending_finance: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  pending_md: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  approved: "bg-green-100 text-green-700 hover:bg-green-100",
  rejected: "bg-red-100 text-red-700 hover:bg-red-100",
  revision_requester: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  revision_admin: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
};

export function RequisitionStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={cn(
        "text-xs",
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
