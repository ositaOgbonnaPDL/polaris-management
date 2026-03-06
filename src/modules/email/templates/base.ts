export function baseTemplate({
  headerColor,
  headerTitle,
  headerSubtitle,
  body,
  footerText = "Polaris Digitech Limited — Requisition Management System",
}: {
  headerColor: string;
  headerTitle: string;
  headerSubtitle?: string;
  body: string;
  footerText?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:${headerColor};padding:24px 32px;border-radius:8px 8px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
                      Polaris Digitech
                    </p>
                    <h1 style="margin:0;font-size:20px;font-weight:600;color:#ffffff;">
                      ${headerTitle}
                    </h1>
                    ${
                      headerSubtitle
                        ? `
                    <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">
                      ${headerSubtitle}
                    </p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:16px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
                ${footerText}
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
                This is an automated message. Do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Renders a detail table row — used in all templates
 */
export function detailRow(
  label: string,
  value: string,
  isEven = false,
  valueStyle = "",
): string {
  const bg = isEven ? "#f8fafc" : "#ffffff";
  return `
  <tr style="background:${bg};">
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#64748b;width:40%;border:1px solid #e2e8f0;">
      ${label}
    </td>
    <td style="padding:10px 14px;font-size:13px;color:#1e293b;border:1px solid #e2e8f0;${valueStyle}">
      ${value}
    </td>
  </tr>`;
}

/**
 * Renders a section of requisition details
 * used in multiple templates
 */
export function requisitionDetailsBlock(req: {
  reqNumber: string;
  requesterName: string;
  departmentName: string;
  requestType: string;
  requestTypeOther: string | null;
  reason: string;
  urgency: string;
  deliveryDate: string | null;
  totalAmount: number | null;
  items: {
    description: string | null;
    quantity: number | null;
    unitPrice: number | null;
    totalPrice: number | null;
  }[];
}): string {
  const urgencyLabel =
    { low: "Low", medium: "Medium", high: "High / Urgent" }[req.urgency] ??
    req.urgency;
  const typeLabel =
    req.requestType === "other"
      ? (req.requestTypeOther ?? "Other")
      : ({
          office_supplies: "Office Supplies",
          it_equipment: "IT Equipment",
          facility_maintenance: "Facility Maintenance",
          petty_cash: "Petty Cash",
          other: "Other",
        }[req.requestType] ?? req.requestType);

  const formatAmount = (n: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(n);

  // Build items table
  const itemsHtml = req.items
    .map(
      (item, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
      <td style="padding:8px 14px;font-size:13px;color:#1e293b;border:1px solid #e2e8f0;">
        ${item.description || `Item ${i + 1}`}
      </td>
      <td style="padding:8px 14px;font-size:13px;color:#1e293b;border:1px solid #e2e8f0;text-align:center;">
        ${item.quantity ?? "—"}
      </td>
      <td style="padding:8px 14px;font-size:13px;color:#1e293b;border:1px solid #e2e8f0;text-align:right;">
        ${item.unitPrice ? formatAmount(item.unitPrice) : "—"}
      </td>
      <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#1e293b;border:1px solid #e2e8f0;text-align:right;">
        ${item.totalPrice ? formatAmount(item.totalPrice) : "—"}
      </td>
    </tr>
  `,
    )
    .join("");

  return `
  <!-- Requisition Info -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
    ${detailRow("Requisition ID", `<strong>${req.reqNumber}</strong>`, false, "font-weight:700;")}
    ${detailRow("Requested By", req.requesterName, true)}
    ${detailRow("Department", req.departmentName, false)}
    ${detailRow("Request Type", typeLabel, true)}
    ${detailRow("Urgency", urgencyLabel, false)}
    ${req.deliveryDate ? detailRow("Required By", req.deliveryDate, true) : ""}
    ${req.totalAmount ? detailRow("Total Amount", `<strong>${formatAmount(req.totalAmount)}</strong>`, false, "font-weight:700;color:#1a5276;") : ""}
  </table>

  <!-- Reason -->
  <div style="background:#f8fafc;border-left:4px solid #64748b;padding:12px 16px;margin-bottom:24px;border-radius:0 4px 4px 0;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
      Reason / Justification
    </p>
    <p style="margin:0;font-size:14px;color:#374151;">${req.reason}</p>
  </div>

  <!-- Items -->
  <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Items Requested</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
    <tr style="background:#1e293b;">
      <th style="padding:8px 14px;font-size:12px;color:#ffffff;text-align:left;border:1px solid #1e293b;">Description</th>
      <th style="padding:8px 14px;font-size:12px;color:#ffffff;text-align:center;border:1px solid #1e293b;">Qty</th>
      <th style="padding:8px 14px;font-size:12px;color:#ffffff;text-align:right;border:1px solid #1e293b;">Unit Price</th>
      <th style="padding:8px 14px;font-size:12px;color:#ffffff;text-align:right;border:1px solid #1e293b;">Total</th>
    </tr>
    ${itemsHtml}
  </table>`;
}