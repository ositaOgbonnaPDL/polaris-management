'use client'

import { useState } from 'react'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import { RequisitionStatusBadge } from '@/shared/components/ui/requisition-status-badge'
import { RequisitionDetailSheet } from '@/shared/components/ui/requisition-detail-sheet'
import { Button } from '@/components/ui/button'
import { formatNaira } from '@/shared/lib/utils'
import { Eye, Search } from 'lucide-react'
import { REQUISITION_STATUSES } from '@/db/schema/requisitions'
import { STATUS_LABELS } from '@/shared/constants'

type Props = { requisitions: any[] }

export function AllRequisitionsTable({ requisitions }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = requisitions.filter(req => {
    const matchesSearch =
      req.reqNumber.toLowerCase().includes(search.toLowerCase()) ||
      req.requester.name.toLowerCase().includes(search.toLowerCase()) ||
      req.department.name.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, name, department..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {REQUISITION_STATUSES.map(status => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Req #</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  No requisitions found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(req => (
                <TableRow key={req.id}>
                  <TableCell className="font-semibold text-sm">
                    {req.reqNumber}
                  </TableCell>
                  <TableCell className="text-sm">{req.requester.name}</TableCell>
                  <TableCell className="text-sm">{req.department.name}</TableCell>
                  <TableCell className="text-sm">
                    {req.requestType === 'other'
                      ? req.requestTypeOther ?? 'Other'
                      : req.requestType.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {req.totalAmount ? formatNaira(req.totalAmount) : (
                      <span className="text-slate-400 text-xs">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RequisitionStatusBadge status={req.status} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {new Date(req.createdAt).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <RequisitionDetailSheet requisition={req}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </RequisitionDetailSheet>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}