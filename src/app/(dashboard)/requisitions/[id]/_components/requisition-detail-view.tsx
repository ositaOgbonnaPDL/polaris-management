'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { RequisitionStatusBadge } from '@/shared/components/ui/requisition-status-badge'
import { URGENCY_LABELS, REQUEST_TYPE_LABELS } from '@/shared/constants'
import { formatNaira } from '@/shared/lib/utils'
import { FileText, ExternalLink, Pencil } from 'lucide-react'
import Link from 'next/link'

type RequisitionItem = {
  id: number
  description: string | null
  quantity: number | null
  unitPrice: number | null
  totalPrice: number | null
  isEnriched: boolean
}

type RequisitionDetail = {
  id: number
  requesterId: number
  status: string
  requestType: string
  requestTypeOther: string | null
  urgency: string
  deliveryDate: string | null
  totalAmount: number | null
  createdAt: string
  reason: string
  revisionNote: string | null
  requesterAttachmentUrl: string | null
  department: { name: string }
  items: RequisitionItem[]
}

type Props = {
  requisition: RequisitionDetail
  currentUserId: string
}

export function RequisitionDetailView({ requisition: req, currentUserId }: Props) {
  const isOwner = req.requesterId === parseInt(currentUserId)
  const canResubmit = isOwner && req.status === 'revision_requester'

  const typeLabel = req.requestType === 'other'
    ? req.requestTypeOther ?? 'Other'
    : REQUEST_TYPE_LABELS[req.requestType as keyof typeof REQUEST_TYPE_LABELS]

  return (
    <div className="space-y-6">
      {/* Status card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Current Status</p>
              <RequisitionStatusBadge status={req.status} />
            </div>
            {canResubmit && (
              <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
                <Link href={`/requisitions/${req.id}/resubmit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit & Resubmit
                </Link>
              </Button>
            )}
          </div>

          {req.revisionNote && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">
                Revision Feedback
              </p>
              <p className="text-sm text-amber-800">{req.revisionNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-1">Request Type</p>
              <p className="font-medium">{typeLabel}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Urgency</p>
              <p className="font-medium">
                {URGENCY_LABELS[req.urgency as keyof typeof URGENCY_LABELS]}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Department</p>
              <p className="font-medium">{req.department.name}</p>
            </div>
            {req.deliveryDate && (
              <div>
                <p className="text-slate-400 text-xs mb-1">Required By</p>
                <p className="font-medium">{req.deliveryDate}</p>
              </div>
            )}
            {req.totalAmount && (
              <div>
                <p className="text-slate-400 text-xs mb-1">Total Amount</p>
                <p className="font-semibold">{formatNaira(req.totalAmount)}</p>
              </div>
            )}
            <div>
              <p className="text-slate-400 text-xs mb-1">Submitted</p>
              <p className="font-medium">
                {new Date(req.createdAt).toLocaleDateString('en-NG', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-slate-400 text-xs mb-1">Reason</p>
            <p className="text-sm text-slate-700">{req.reason}</p>
          </div>

          {req.requesterAttachmentUrl && (
            <a
              href={req.requesterAttachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <FileText className="h-4 w-4" />
              View Attachment
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Items ({req.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {req.items.map((item, i) => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-lg p-3 text-sm"
            >
              <p className="font-medium">{item.description || `Item ${i + 1}`}</p>
              {item.isEnriched && (
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-slate-500">
                  <div>
                    <span className="block text-slate-400">Qty</span>
                    {item.quantity}
                  </div>
                  <div>
                    <span className="block text-slate-400">Unit Price</span>
                    {item.unitPrice ? formatNaira(item.unitPrice) : '—'}
                  </div>
                  <div>
                    <span className="block text-slate-400">Total</span>
                    {item.totalPrice ? formatNaira(item.totalPrice) : '—'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
