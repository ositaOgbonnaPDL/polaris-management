"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarCheck } from "lucide-react";
import { runYearStartGrant } from "@/modules/leave/actions";
import { toast } from "sonner";

export function AssignLeaveDaysButton({ year }: { year: number }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleAssign() {
    const confirmed = window.confirm(
      `This will assign ${year} leave entitlements (full days) to all confirmed staff who weren't confirmed in ${year}.\n\nStaff confirmed during ${year} already have their confirmation-year entitlements and will be skipped.\n\nProceed?`,
    );
    if (!confirmed) return;

    setIsLoading(true);
    const result = await runYearStartGrant(year);

    if (result.success) {
      toast.success(
        `Leave days assigned to ${result.processed} staff member${result.processed !== 1 ? "s" : ""}. ${result.skipped} skipped (confirmed this year).`,
        { duration: 6000 },
      );
    } else {
      toast.error("Failed to assign leave days");
    }
    setIsLoading(false);
  }

  return (
    <Button
      onClick={handleAssign}
      disabled={isLoading}
      size="sm"
      className="bg-slate-800 hover:bg-slate-700"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Assigning...
        </>
      ) : (
        <>
          <CalendarCheck className="h-4 w-4 mr-2" />
          Assign Leave Days to All Staff
        </>
      )}
    </Button>
  );
}
