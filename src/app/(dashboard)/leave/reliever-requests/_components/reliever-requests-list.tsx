"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, CalendarDays, User } from "lucide-react";
import { respondToRelieverRequest } from "@/modules/leave/actions";
import { toast } from "sonner";

type PendingRequest = {
  id: number;
  reqNumber: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  relieverAddress: string | null;
  leaveTypeName: string;
  leaveTypeColor: string;
  requesterName: string;
};

type HistoryRequest = {
  id: number;
  reqNumber: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  relieverStatus: string;
  leaveTypeName: string;
  leaveTypeColor: string;
  requesterName: string;
};

export function RelieverRequestsList({
  pendingRequests: initial,
  historyRequests,
}: {
  pendingRequests: PendingRequest[];
  historyRequests: HistoryRequest[];
}) {
  const [pending, setPending] = useState(initial);
  const [acting, setActing] = useState<number | null>(null);

  async function handleRespond(id: number, response: "accepted" | "declined") {
    setActing(id);
    const result = await respondToRelieverRequest(id, response);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success(response === "accepted" ? "You have accepted to cover." : "Request declined.");
      setPending((prev) => prev.filter((r) => r.id !== id));
    }
    setActing(null);
  }

  return (
    <>
      {/* Pending */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400">
            No pending reliever requests.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-amber-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: r.leaveTypeColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800 text-sm">
                        {r.requesterName}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-sm text-slate-600">{r.leaveTypeName}</span>
                      <span className="font-mono text-xs text-slate-400">{r.reqNumber}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {r.startDate} → {r.endDate} ({r.totalDays}d)
                      </span>
                    </div>
                    {r.reason && (
                      <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{r.reason}&rdquo;</p>
                    )}
                    {r.relieverAddress && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        Contact: {r.relieverAddress}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <Button
                    size="sm"
                    disabled={acting === r.id}
                    onClick={() => handleRespond(r.id, "accepted")}
                    className="bg-green-600 hover:bg-green-700 text-white h-8"
                  >
                    {acting === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={acting === r.id}
                    onClick={() => handleRespond(r.id, "declined")}
                    className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    {acting === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      {historyRequests.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            History
          </h2>
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {historyRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: r.leaveTypeColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {r.requesterName} · {r.leaveTypeName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.startDate} → {r.endDate} · {r.totalDays}d
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-xs flex-shrink-0 ${
                    r.relieverStatus === "accepted"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {r.relieverStatus === "accepted" ? "Accepted" : "Declined"}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
