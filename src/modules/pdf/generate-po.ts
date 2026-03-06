import { formatNaira } from "@/shared/lib/utils";

type POInput = {
  requisition: {
    reqNumber: string;
    requestType: string;
    requestTypeOther: string | null;
    reason: string;
    urgency: string;
    deliveryDate: string | null;
    totalAmount: number | null;
    createdAt: string;
    requester: { name: string; email: string };
    department: { name: string };
    items: {
      description: string | null;
      quantity: number | null;
      unitPrice: number | null;
      totalPrice: number | null;
      adminNotes: string | null;
    }[];
  };
  trail: {
    actor: { name: string; role: string };
    action: string;
    notes: string | null;
    createdAt: string;
  }[];
  generatedBy: string;
};

export async function generatePOPdf(input: POInput): Promise<Buffer> {
  // We use HTML → PDF via puppeteer
  // Install: npm install puppeteer
  const puppeteer = await import("puppeteer");
  const { requisition, trail, generatedBy } = input;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const itemsHtml = requisition.items
    .map(
      (item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.description || `Item ${i + 1}`}</td>
      <td style="text-align:center">${item.quantity ?? "—"}</td>
      <td style="text-align:right">${item.unitPrice ? formatNaira(item.unitPrice) : "—"}</td>
      <td style="text-align:right;font-weight:600">${item.totalPrice ? formatNaira(item.totalPrice) : "—"}</td>
    </tr>
    ${
      item.adminNotes
        ? `
    <tr>
      <td colspan="5" style="font-size:11px;color:#6b7280;padding-top:2px;">
        Note: ${item.adminNotes}
      </td>
    </tr>`
        : ""
    }
  `,
    )
    .join("");

  const trailHtml = trail
    .filter((t) => t.action === "approved")
    .map(
      (t) => `
      <tr>
        <td>${t.actor.name}</td>
        <td>${t.actor.role.replace(/_/g, " ")}</td>
        <td>${formatDate(t.createdAt)}</td>
        <td>${t.notes ?? "—"}</td>
      </tr>
    `,
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 40px; }
  .header { border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 24px; }
  .header h1 { font-size: 24px; font-weight: 700; }
  .header p { color: #64748b; font-size: 12px; margin-top: 2px; }
  .po-meta { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .po-meta .block { }
  .po-meta .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 3px; }
  .po-meta .value { font-weight: 600; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #1e293b; color: white; padding: 8px 12px; font-size: 11px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .total-row td { font-weight: 700; font-size: 14px; background: #f1f5f9; border-top: 2px solid #1e293b; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px; }
  .reason-box { background: #f8fafc; border-left: 4px solid #64748b; padding: 10px 14px; margin-bottom: 24px; font-size: 12px; }
  .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
</style>
</head>
<body>

<div class="header">
  <h1>Polaris Digitech Limited</h1>
  <p>Purchase Order</p>
</div>

<div class="po-meta">
  <div class="block">
    <div class="label">PO / Requisition Number</div>
    <div class="value">${requisition.reqNumber}</div>
  </div>
  <div class="block">
    <div class="label">Date Generated</div>
    <div class="value">${formatDate(new Date().toISOString())}</div>
  </div>
  <div class="block">
    <div class="label">Requested By</div>
    <div class="value">${requisition.requester.name}</div>
  </div>
  <div class="block">
    <div class="label">Department</div>
    <div class="value">${requisition.department.name}</div>
  </div>
  ${
    requisition.deliveryDate
      ? `
  <div class="block">
    <div class="label">Required By</div>
    <div class="value">${requisition.deliveryDate}</div>
  </div>`
      : ""
  }
</div>

<div class="section-title">Justification</div>
<div class="reason-box">${requisition.reason}</div>

<div class="section-title">Items</div>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Description</th>
      <th style="text-align:center">Qty</th>
      <th style="text-align:right">Unit Price</th>
      <th style="text-align:right">Total</th>
    </tr>
  </thead>
  <tbody>
    ${itemsHtml}
    <tr class="total-row">
      <td colspan="4" style="text-align:right">Grand Total</td>
      <td style="text-align:right">${requisition.totalAmount ? formatNaira(requisition.totalAmount) : "—"}</td>
    </tr>
  </tbody>
</table>

<div class="section-title">Approval Trail</div>
<table>
  <thead>
    <tr>
      <th>Approver</th>
      <th>Role</th>
      <th>Date Approved</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    ${trailHtml}
  </tbody>
</table>

<div class="footer">
  <span>Generated by: ${generatedBy}</span>
  <span>Generated: ${new Date().toLocaleString("en-NG")}</span>
  <span>Polaris Digitech Limited — Internal Document</span>
</div>

</body>
</html>`;

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdf = await page.pdf({
    format: "A4",
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    printBackground: true,
  });
  await browser.close();

  return Buffer.from(pdf);
}
