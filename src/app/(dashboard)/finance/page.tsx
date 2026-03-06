import { requireRole } from '@/shared/lib/auth'
import { ROLES } from '@/shared/constants'
import { Header } from '@/shared/components/layout/header'
import { db } from '@/db'
import { requisitions } from '@/db/schema'
import { eq, inArray, count } from 'drizzle-orm'
import { StatCard } from '@/shared/components/ui/stat-card'
import {
  ClipboardCheck, CheckCircle,
  Receipt, TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RequisitionStatusBadge } from '@/shared/components/ui/requisition-status-badge'
import Link from 'next/link'
import { sql } from 'drizzle-orm'
import { formatNaira } from '@/shared/lib/utils'

export default async function FinancePage() {
  const session = await requireRole(ROLES.FINANCE)

  const [pendingFinance, approved, pendingMD, totalSpend] =
    await Promise.all([
      db.select({ count: count() })
        .from(requisitions)
        .where(eq(requisitions.status, 'pending_finance')),

      db.select({ count: count() })
        .from(requisitions)
        .where(eq(requisitions.status, 'approved')),

      db.select({ count: count() })
        .from(requisitions)
        .where(eq(requisitions.status, 'pending_md')),

      db.select({
        total: sql<number>`coalesce(sum(${requisitions.totalAmount}), 0)`
      })
        .from(requisitions)
        .where(eq(requisitions.status, 'approved'))
    ])

  // Pending finance items for preview
  const pendingItems = await db.query.requisitions.findMany({
    where: eq(requisitions.status, 'pending_finance'),
    with: { requester: true, department: true },
    orderBy: (req, { asc }) => [asc(req.createdAt)],
    limit: 5
  })

  // Recent approved — available for PO
  const recentApproved = await db.query.requisitions.findMany({
    where: inArray(requisitions.status, ['approved', 'pending_md']),
    with: { requester: true, department: true },
    orderBy: (req, { desc }) => [desc(req.updatedAt)],
    limit: 5
  })

  return (
    <div>
      <Header
        title={`Welcome, ${session.user.name}`}
        description="Finance overview"
        userRole={session.user.role}
      />
      <main className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pending Your Approval"
            value={pendingFinance[0].count}
            color={pendingFinance[0].count > 0 ? 'amber' : 'default'}
            icon={<ClipboardCheck className="h-6 w-6" />}
          />
          <StatCard
            label="Awaiting MD"
            value={pendingMD[0].count}
            color="blue"
            icon={<ClipboardCheck className="h-6 w-6" />}
          />
          <StatCard
            label="Fully Approved"
            value={approved[0].count}
            color="green"
            icon={<CheckCircle className="h-6 w-6" />}
          />
          <StatCard
            label="Total Approved Spend"
            value={formatNaira(totalSpend[0].total)}
            color="green"
            icon={<TrendingUp className="h-6 w-6" />}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* Pending finance approvals */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Pending Your Approval
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/approvals">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {pendingItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-green-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">
                    Nothing pending — all clear
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingItems.map(req => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3
                                 rounded-lg border border-slate-200"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {req.reqNumber}
                          </p>
                          <RequisitionStatusBadge status={req.status} />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {req.requester.name} • {req.department.name}
                          {req.totalAmount
                            ? ` • ${formatNaira(req.totalAmount)}`
                            : ''
                          }
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/approvals">Review</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ready for PO */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Ready for Purchase Order
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/finance/purchase-orders">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentApproved.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">
                    No approved requisitions yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentApproved.map(req => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3
                                 rounded-lg border border-slate-200"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {req.reqNumber}
                          </p>
                          <RequisitionStatusBadge status={req.status} />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {req.requester.name}
                          {req.totalAmount
                            ? ` • ${formatNaira(req.totalAmount)}`
                            : ''
                          }
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/finance/purchase-orders">
                          <Receipt className="h-3.5 w-3.5 mr-1.5" />
                          PO
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}