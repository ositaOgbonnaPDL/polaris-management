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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deletePublicHoliday } from "@/modules/leave/actions";
import { toast } from "sonner";

type Holiday = {
  id: number;
  name: string;
  date: string;
  year: number;
  isActive: boolean;
};

export function HolidaysTable({ holidays }: { holidays: Holiday[] }) {
  const [deleting, setDeleting] = useState<number | null>(null);

  async function handleDelete(id: number) {
    if (!confirm("Remove this public holiday?")) return;
    setDeleting(id);
    const result = await deletePublicHoliday(id);
    if (result.success) {
      toast.success("Holiday removed");
    } else {
      toast.error("Failed to remove holiday");
    }
    setDeleting(null);
  }

  // Group by year
  const byYear = holidays.reduce<Record<number, Holiday[]>>((acc, h) => {
    if (!acc[h.year]) acc[h.year] = [];
    acc[h.year].push(h);
    return acc;
  }, {});

  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  if (holidays.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-10 text-center text-slate-400">
        No public holidays configured. Add one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {years.map((year) => (
        <div key={year} className="bg-white rounded-lg border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">{year} Holidays</h3>
            <Badge variant="secondary">{byYear[year].length} holidays</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holiday</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byYear[year].map((h) => {
                const date = new Date(h.date + "T00:00:00");
                return (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell className="text-slate-600">
                      {date.toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {date.toLocaleDateString("en-NG", { weekday: "long" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleting === h.id}
                        onClick={() => handleDelete(h.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
