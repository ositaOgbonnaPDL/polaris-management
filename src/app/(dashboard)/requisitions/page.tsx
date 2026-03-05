import { requireAuth } from "@/shared/lib/auth";
import { Header } from "@/shared/components/layout/header";
import { getMyRequisitions } from "@/modules/requisitions/actions";
import { RequisitionsList } from "./_components/requisitions-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function RequisitionsPage() {
  const session = await requireAuth();
  const requisitions = await getMyRequisitions();

  return (
    <div>
      <Header
        title="My Requisitions"
        description="Track all your submitted requests"
        userRole={session.user.role}
      >
        <Button asChild size="sm" className="bg-slate-800 hover:bg-slate-700">
          <Link href="/requisitions/new">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Link>
        </Button>
      </Header>
      <main className="p-6">
        <RequisitionsList requisitions={requisitions as any} />
      </main>
    </div>
  );
}
