import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";

type Props = {
  label: string;
  value: number | string;
  color?: "default" | "blue" | "green" | "amber" | "red";
  icon?: React.ReactNode;
};

const COLOR_STYLES = {
  default: "text-slate-900",
  blue: "text-blue-600",
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-red-600",
};

export function StatCard({ label, value, color = "default", icon }: Props) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">{label}</p>
            <p className={cn("text-3xl font-bold", COLOR_STYLES[color])}>
              {value}
            </p>
          </div>
          {icon && <div className="text-slate-300">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
