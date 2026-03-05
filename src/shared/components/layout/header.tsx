import { ROLE_LABELS } from "@/shared/constants";
import { Badge } from "@/components/ui/badge";

type HeaderProps = {
  title: string;
  description?: string;
  userRole: string;
  children?: React.ReactNode; // for action buttons
};

export function Header({
  title,
  description,
  userRole,
  children,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            <Badge variant="secondary" className="text-xs">
              {ROLE_LABELS[userRole as keyof typeof ROLE_LABELS]}
            </Badge>
          </div>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </header>
  );
}
