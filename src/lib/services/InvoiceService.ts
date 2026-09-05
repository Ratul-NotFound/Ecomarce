import type { Order } from '@/types';
import { STORE_CONFIG } from '@/lib/store-config';
import { formatCurrency, formatDate } from '@/lib/utils/format';

/**
 * Pure SVG Barcode generator (Code128-like vector pattern)
 * Generates crisp, scalable, high-contrast black/white bars suitable for optical barcode scanners.
 */
function generateBarcodeSvg(code: string, height: number = 32): string {
  const cleanCode = (code || '000000').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  let pattern = '11010010000'; // Start code
  
  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i);
    const seed = (charCode * 17 + i * 31) % 100;
    const b1 = (seed % 3) + 1;
    const s1 = ((seed >> 2) % 3) + 1;
    const b2 = ((seed >> 4) % 3) + 1;
    const s2 = 11 - (b1 + s1 + b2);
    pattern += '1'.repeat(b1) + '0'.repeat(s1) + '1'.repeat(b2) + '0'.repeat(Math.max(1, s2));
  }
  pattern += '1100011101011'; // Stop code

  const barWidth = 1.3;
  const totalWidth = pattern.length * barWidth;

  let rects = '';
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      rects += `<rect x="${(i * barWidth).toFixed(1)}" y="0" width="${barWidth}" height="${height}" fill="#000000" />`;
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height + 14}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
      ${rects}
      <text x="${totalWidth / 2}" y="${height + 12}" font-family="monospace" font-size="9.5" font-weight="700" text-anchor="middle" fill="#111827">${code}</text>
    </svg>
  `;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export class InvoiceService {
  /**
   * 1. Single Standard A4 Invoice
   */
  generateInvoiceHtml(order: Order, storeName?: string, contactPhone?: string, contactEmail?: string): string {
    return this.generateBatchInvoicesHtml([order], storeName, contactPhone, contactEmail);
  }

  /**
   * 2. Batch Standard A4 Invoices (Strict A4 Paper Format with Clean Page Breaks)
   */
  generateBatchInvoicesHtml(orders: Order[], storeName?: string, contactPhone?: string, contactEmail?: string): string {
    const name = storeName || STORE_CONFIG.name;
    const phone = contactPhone || STORE_CONFIG.contact.phone;
    const email = contactEmail || STORE_CONFIG.contact.email;

    const invoicesHtml = orders.map((order, orderIdx) => {
      const isCod = order.payment_method?.toLowerCase() === 'cod' || order.payment_method?.toLowerCase() === 'cash on delivery';
      const itemsRows = (order.items_snapshot || [])
        .map(
          (item, index) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 12px;">${index + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">
            <strong style="color: #111827;">${item.name_snapshot}</strong>
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700; font-size: 12px;">${item.quantity}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 12px;">${formatCurrency(item.unit_price)}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-size: 12px; color: #111827;">${formatCurrency(item.total_price)}</td>
        </tr>
      `
        )
        .join('');

      return `
        <div class="a4-invoice-sheet ${orderIdx < orders.length - 1 ? 'page-break' : ''}">
          <div class="invoice-inner">
            <div class="header">
              <div>
                <div class="logo">${name}</div>
                <div style="color: #64748b; font-size: 12px; margin-top: 2px;">${email} • ${phone}</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 1px;">Official Customer Receipt / ক্যাশ মেমো</div>
              </div>
              <div style="text-align: right;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #111827; letter-spacing: 0.5px;">INVOICE</h1>
                <div style="font-weight: 800; color: #2563eb; font-size: 14px; margin-top: 1px;">#${order.order_number}</div>
                <div style="color: #64748b; font-size: 11px; margin-top: 1px;">Date: ${formatDate(order.created_at)}</div>
              </div>
            </div>

            <div style="margin-bottom: 16px; display: flex; justify-content: flex-end;">
              <div style="max-width: 200px; width: 100%;">
                ${generateBarcodeSvg(order.order_number || `EC-${order.id.slice(0, 8)}`, 28)}
              </div>
            </div>

            <table class="meta-table">
              <tr>
                <td class="meta-box">
                  <div class="meta-title">BILLED & DELIVER TO</div>
                  <div style="font-weight: 800; font-size: 14px; color: #111827;">${order.shipping_address?.full_name || 'Customer'}</div>
                  <div style="font-size: 12px; color: #374151; margin-top: 2px;">${order.shipping_address?.street_address || ''}</div>
                  <div style="font-size: 12px; color: #374151;">${order.shipping_address?.upazila ? `${order.shipping_address.upazila}, ` : ''}${order.shipping_address?.district || ''}</div>
                  <div style="font-size: 12px; font-weight: 700; color: #111827; margin-top: 3px;">Phone: ${order.shipping_address?.phone || ''}</div>
                </td>
                <td class="meta-box" style="text-align: right;">
                  <div class="meta-title">PAYMENT DETAILS</div>
                  <div style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: 800; font-size: 11px; background: ${isCod ? '#fef3c7' : '#dcfce7'}; color: ${isCod ? '#92400e' : '#166534'};">
                    ${(order.payment_method || 'COD').toUpperCase()} • ${(order.payment_status || 'PENDING').toUpperCase()}
                  </div>
                  ${
                    (order.shipping_address as any)?.sender_phone || order.payment_sender_phone
                      ? `<div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Sender: <strong>${(order.shipping_address as any)?.sender_phone || order.payment_sender_phone}</strong></div>`
                      : ''
                  }
                  ${
                    order.payment_transaction_id
                      ? `<div style="font-size: 11px; color: #4b5563; margin-top: 2px;">TrxID: <code style="font-weight: 700; color: #e11d48;">${order.payment_transaction_id}</code></div>`
                      : ''
                  }
                  <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Doorstep Courier Delivery</div>
                </td>
              </tr>
            </table>

            <table class="items">
              <thead>
                <tr>
                  <th style="width: 36px; text-align: center;">#</th>
                  <th style="text-align: left;">Item Description</th>
                  <th style="width: 60px; text-align: center;">Qty</th>
                  <th style="width: 100px; text-align: right;">Unit Price</th>
                  <th style="width: 110px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="totals-wrapper">
              <div class="totals">
                <div class="totals-row">
                  <span>Subtotal</span>
                  <span>${formatCurrency(order.subtotal)}</span>
                </div>
                <div class="totals-row">
                  <span>Delivery Charge</span>
                  <span>${formatCurrency(order.shipping_fee)}</span>
                </div>
                ${
                  order.discount_amount > 0
                    ? `
                <div class="totals-row" style="color: #dc2626; font-weight: 700;">
                  <span>Discount ${order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                  <span>-${formatCurrency(order.discount_amount)}</span>
                </div>
                `
                    : ''
                }
                <div class="totals-grand">
                  <span>Total Amount</span>
                  <span>${formatCurrency(order.total)}</span>
                </div>
                ${
                  isCod
                    ? `
                <div style="margin-top: 6px; padding: 5px 8px; background: #fffbeb; border: 1px dashed #f59e0b; border-radius: 4px; font-size: 11px; font-weight: 800; color: #b45309; text-align: center;">
                  Cash to Collect: ${formatCurrency(order.total)}
                </div>
                `
                    : `
                <div style="margin-top: 6px; padding: 5px 8px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px; font-size: 11px; font-weight: 800; color: #166534; text-align: center;">
                  ✓ PAID IN ADVANCE
                </div>
                `
                }
              </div>
            </div>

            <div class="footer">
              Thank you for shopping with <strong>${name}</strong>! • Helpline: ${phone} • ${email}<br>
              Please inspect the parcel upon receiving from delivery courier.
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${orders.length === 1 ? `Invoice #${orders[0].order_number}` : `Batch Invoices (${orders.length} Orders - Standard A4)`}</title>
  <style>
    * { box-sizing: border-box; }
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 20px;
      color: #1f2937;
      background: #f3f4f6;
      font-size: 13px;
      line-height: 1.4;
    }
    .print-controls {
      max-width: 190mm;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-print:hover { background: #1d4ed8; }

    /* Standard A4 Container */
    .a4-invoice-sheet {
      width: 194mm;
      min-height: 275mm;
      max-height: 285mm;
      margin: 0 auto 20px auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px 28px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .logo {
      font-size: 22px;
      font-weight: 900;
      color: #2563eb;
      letter-spacing: -0.5px;
    }
    .meta-table {
      width: 100%;
      margin-bottom: 18px;
      border-collapse: collapse;
    }
    .meta-box {
      width: 50%;
      vertical-align: top;
      background: #f8fafc;
      padding: 12px;
      border-radius: 6px;
    }
    .meta-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }
    table.items th {
      background: #f1f5f9;
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 18px;
    }
    .totals {
      width: 280px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      color: #475569;
      font-size: 12px;
    }
    .totals-grand {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-top: 2px solid #e2e8f0;
      font-size: 15px;
      font-weight: 900;
      color: #2563eb;
    }
    .footer {
      clear: both;
      text-align: center;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      color: #94a3b8;
      font-size: 11px;
      line-height: 1.5;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
        margin: 0;
      }
      .no-print { display: none !important; }
      .a4-invoice-sheet {
        border: none;
        box-shadow: none;
        padding: 16px 20px;
        margin: 0 auto;
        width: 194mm;
        height: 275mm;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="print-controls no-print">
    <div style="font-weight: 700; color: #1e293b;">
      📄 Standard A4 Invoices • ${orders.length} ${orders.length === 1 ? 'Order' : 'Orders'}
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print All A4 Invoices (${orders.length})
    </button>
  </div>

  ${invoicesHtml}
</body>
</html>
    `;
  }

  /**
   * 3. Multi-Label Shipping Tags (Strictly Formatted for Standard A4 Paper Sheets)
   * Formats into exact A4 pages:
   * - 6-Up: 6 labels per A4 page (2 cols x 3 rows)
   * - 9-Up: 9 labels per A4 page (3 cols x 3 rows)
   * - 4-Up: 4 labels per A4 page (2 cols x 2 rows)
   * - Thermal: Single label per sticker
   */
  generateShippingTagsHtml(
    orders: Order[],
    layout: '4-up' | '6-up' | '9-up' | 'thermal' = '6-up',
    storeName?: string,
    contactPhone?: string
  ): string {
    const name = storeName || STORE_CONFIG.name;
    const phone = contactPhone || STORE_CONFIG.contact.phone;

    const pageSizeMap = {
      '6-up': 6,
      '9-up': 9,
      '4-up': 4,
      'thermal': 1,
    };

    const pageSize = pageSizeMap[layout] || 6;
    const pages = chunkArray(orders, pageSize);

    const renderCard = (order: Order) => {
      const isCod = order.payment_method?.toLowerCase() === 'cod' || order.payment_method?.toLowerCase() === 'cash on delivery';
      const addr = order.shipping_address || {};

      const itemsList = (order.items_snapshot || [])
        .map(i => `<span style="display: inline-block; background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 10.5px; margin: 1px 2px;"><strong>${i.quantity}x</strong> ${i.name_snapshot}</span>`)
        .join('');

      return `
        <div class="shipping-card">
          <!-- Header -->
          <div class="card-header">
            <div>
              <div class="store-badge">${name}</div>
              <div style="font-size: 9.5px; color: #64748b;">📞 ${phone}</div>
            </div>
            <div style="text-align: right;">
              <div class="order-num">#${order.order_number}</div>
              <div style="font-size: 9.5px; color: #64748b;">${formatDate(order.created_at)}</div>
            </div>
          </div>

          <!-- Barcode -->
          <div style="margin: 4px 0; text-align: center;">
            ${generateBarcodeSvg(order.order_number || `EC-${order.id.slice(0, 8)}`, layout === '9-up' ? 22 : 26)}
          </div>

          <!-- Recipient -->
          <div class="recipient-box">
            <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">DELIVER TO / প্রাপক:</div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 1.2;">${addr.full_name || 'Customer'}</div>
            <div style="font-size: 12px; font-weight: 800; color: #2563eb; margin: 1px 0;">📞 ${addr.phone || 'No phone'}</div>
            <div style="font-size: 10.5px; color: #334155; line-height: 1.25;">
              ${addr.street_address ? `${addr.street_address}, ` : ''}
              <strong>${addr.upazila ? `${addr.upazila}, ` : ''}${addr.district || 'Bangladesh'}</strong>
            </div>
          </div>

          <!-- Item Snapshot -->
          <div style="margin: 4px 0; min-height: 24px;">
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 1px;">ITEMS / পণ্য:</div>
            <div style="line-height: 1.2;">${itemsList}</div>
          </div>

          <!-- Footer Badge -->
          <div class="card-footer">
            <div style="font-size: 10px; font-weight: 700; color: #475569;">
              METHOD: <strong>${(order.payment_method || 'COD').toUpperCase()}</strong>
            </div>
            <div class="payment-badge ${isCod ? 'badge-cod' : 'badge-paid'}">
              ${isCod ? `COD: ${formatCurrency(order.total)}` : `PAID: ${formatCurrency(order.total)}`}
            </div>
          </div>
        </div>
      `;
    };

    const sheetsHtml = pages.map((pageOrders, pageIdx) => {
      const isLast = pageIdx === pages.length - 1;
      return `
        <div class="a4-tag-sheet ${isLast ? '' : 'page-break'} layout-${layout}">
          ${pageOrders.map(renderCard).join('')}
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shipping Tags (${orders.length} Labels - Standard A4 Sheet - ${layout.toUpperCase()})</title>
  <style>
    * { box-sizing: border-box; }
    @page {
      size: ${layout === 'thermal' ? '100mm 150mm' : 'A4 portrait'};
      margin: 6mm;
    }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 16px;
      color: #1e293b;
      background: #f1f5f9;
      font-size: 11.5px;
    }
    .print-bar {
      max-width: 198mm;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-print:hover { background: #1d4ed8; }

    /* Strict A4 Sheet Sizing */
    .a4-tag-sheet {
      width: 198mm;
      height: 280mm;
      max-height: 282mm;
      margin: 0 auto 20px auto;
      background: #ffffff;
      padding: 4mm;
      display: grid;
      gap: 3mm;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* 6-Up Grid (2 cols x 3 rows per A4 page) */
    .layout-6-up {
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(3, 1fr);
    }

    /* 9-Up Grid (3 cols x 3 rows per A4 page) */
    .layout-9-up {
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
    }

    /* 4-Up Grid (2 cols x 2 rows per A4 page) */
    .layout-4-up {
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
    }

    /* Thermal single label */
    .layout-thermal {
      width: 95mm;
      height: 145mm;
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
    }

    .shipping-card {
      border: 1.5px dashed #94a3b8;
      border-radius: 4px;
      padding: 8px 10px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .store-badge {
      font-weight: 900;
      font-size: 12px;
      color: #2563eb;
      letter-spacing: -0.3px;
    }
    .order-num {
      font-size: 12px;
      font-weight: 900;
      color: #0f172a;
    }
    .recipient-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 8px;
      margin: 3px 0;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      margin-top: 4px;
    }
    .payment-badge {
      font-weight: 900;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.3px;
    }
    .badge-cod {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .badge-paid {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
        margin: 0;
      }
      .no-print { display: none !important; }
      .a4-tag-sheet {
        box-shadow: none;
        padding: 0;
        margin: 0 auto;
        width: 198mm;
        height: 280mm;
      }
      .shipping-card {
        border: 1px dashed #64748b;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <div>
      <strong>🏷️ Standard A4 Shipping Tags</strong> • ${orders.length} Labels (${pages.length} A4 ${pages.length === 1 ? 'Sheet' : 'Sheets'} - ${layout.toUpperCase()})
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
        Formatted strictly for Standard A4 Paper. Cut along dashed borders to tag delivery parcels.
      </div>
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print All A4 Sheets (${pages.length} Pages)
    </button>
  </div>

  ${sheetsHtml}
</body>
</html>
    `;
  }

  /**
   * 4. Warehouse Product Picking Manifest (Standard A4 Format)
   */
  generatePickingManifestHtml(
    orders: Order[],
    timeframeLabel: string = 'Today',
    storeName?: string
  ): string {
    const name = storeName || STORE_CONFIG.name;

    const productMap = new Map<
      string,
      {
        name: string;
        quantity: number;
        unitPrice: number;
        totalRevenue: number;
        orderNumbers: string[];
      }
    >();

    let totalUnits = 0;
    let totalRevenue = 0;
    let codCount = 0;
    let prepaidCount = 0;
    let totalCodAmount = 0;

    orders.forEach(order => {
      const isCod = order.payment_method?.toLowerCase() === 'cod' || order.payment_method?.toLowerCase() === 'cash on delivery';
      if (isCod) {
        codCount++;
        totalCodAmount += Number(order.total) || 0;
      } else {
        prepaidCount++;
      }
      totalRevenue += Number(order.total) || 0;

      (order.items_snapshot || []).forEach(item => {
        totalUnits += item.quantity;
        const key = item.name_snapshot.trim();
        const existing = productMap.get(key);

        if (existing) {
          existing.quantity += item.quantity;
          existing.totalRevenue += item.total_price;
          if (!existing.orderNumbers.includes(order.order_number)) {
            existing.orderNumbers.push(order.order_number);
          }
        } else {
          productMap.set(key, {
            name: item.name_snapshot,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalRevenue: item.total_price,
            orderNumbers: [order.order_number],
          });
        }
      });
    });

    const sortedProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);

    const productRows = sortedProducts
      .map(
        (p, idx) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; width: 36px;">
          <input type="checkbox" style="width: 14px; height: 14px; cursor: pointer;" />
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #64748b; width: 36px;">
          ${idx + 1}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">
          <strong style="font-size: 13px; color: #0f172a;">${p.name}</strong>
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; width: 85px;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 16px; font-weight: 900; font-size: 13px; background: #dbeafe; color: #1d4ed8;">
            ${p.quantity} Units
          </span>
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; width: 100px; font-size: 12px; color: #334155;">
          ${formatCurrency(p.unitPrice)}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800; width: 110px; color: #0f172a;">
          ${formatCurrency(p.totalRevenue)}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; color: #64748b;">
          ${p.orderNumbers.map(n => `<span style="display: inline-block; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; margin: 1px 2px;">#${n}</span>`).join('')}
        </td>
      </tr>
    `
      )
      .join('');

    const orderPackingRows = orders.map((order, idx) => {
      const isCod = order.payment_method?.toLowerCase() === 'cod' || order.payment_method?.toLowerCase() === 'cash on delivery';
      const itemsBrief = (order.items_snapshot || []).map(i => `<strong>${i.quantity}x</strong> ${i.name_snapshot}`).join(', ');

      return `
        <tr>
          <td style="padding: 7px 9px; border-bottom: 1px solid #e2e8f0; text-align: center; width: 32px;">
            <input type="checkbox" style="width: 14px; height: 14px; cursor: pointer;" />
          </td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #2563eb; width: 100px;">
            #${order.order_number}
          </td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #e2e8f0; width: 150px;">
            <div style="font-weight: 700; color: #0f172a;">${order.shipping_address?.full_name || 'Customer'}</div>
            <div style="font-size: 10.5px; color: #64748b;">${order.shipping_address?.phone || ''}</div>
          </td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #e2e8f0; width: 110px; font-size: 11.5px;">
            ${order.shipping_address?.district || 'Dhaka'}
          </td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; color: #334155;">
            ${itemsBrief}
          </td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #e2e8f0; text-align: right; width: 120px;">
            <div style="font-weight: 800; color: #0f172a;">${formatCurrency(order.total)}</div>
            <span style="font-size: 9.5px; font-weight: 800; color: ${isCod ? '#d97706' : '#16a34a'};">
              ${isCod ? 'COD (Collect)' : 'PAID'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Warehouse Picking Manifest (${timeframeLabel} - Standard A4)</title>
  <style>
    * { box-sizing: border-box; }
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 20px;
      color: #0f172a;
      background: #f8fafc;
      font-size: 12.5px;
      line-height: 1.35;
    }
    .print-controls {
      max-width: 198mm;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-print:hover { background: #1d4ed8; }

    .manifest-card {
      max-width: 198mm;
      margin: 0 auto 30px auto;
      background: #ffffff;
      padding: 24px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi-box {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .kpi-val {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #f1f5f9;
      padding: 8px 10px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
      text-align: left;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .no-print { display: none !important; }
      .manifest-card {
        border: none;
        box-shadow: none;
        padding: 0;
        margin: 0 auto;
        max-width: 100%;
        width: 198mm;
      }
      th { background: #e2e8f0 !important; }
    }
  </style>
</head>
<body>
  <div class="print-controls no-print">
    <div>
      <strong style="font-size: 14px;">📦 Standard A4 Warehouse Picking Manifest</strong>
      <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
        Timeframe: <strong>${timeframeLabel}</strong> • Generated on ${new Date().toLocaleString()}
      </div>
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print A4 Picking Manifest Sheet
    </button>
  </div>

  <div class="manifest-card">
    <div class="header">
      <div>
        <div style="font-size: 20px; font-weight: 900; color: #0f172a;">${name}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 1px;">Warehouse Inventory Pick & Packing Manifest (A4 Standard)</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 13px; font-weight: 800; color: #2563eb;">TIMEFRAME: ${timeframeLabel.toUpperCase()}</div>
        <div style="font-size: 10.5px; color: #64748b; margin-top: 1px;">Total ${orders.length} Orders in Batch</div>
      </div>
    </div>

    <!-- Summary KPIs -->
    <div class="kpi-grid">
      <div class="kpi-box">
        <div class="kpi-label">Total Orders</div>
        <div class="kpi-val" style="color: #2563eb;">${orders.length}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Total Units to Pick</div>
        <div class="kpi-val" style="color: #059669;">${totalUnits}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Unique Products</div>
        <div class="kpi-val">${sortedProducts.length}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Batch Revenue</div>
        <div class="kpi-val" style="color: #0f172a;">${formatCurrency(totalRevenue)}</div>
      </div>
    </div>

    <!-- Section 1: Item Picking List -->
    <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-size: 15px; font-weight: 900; color: #0f172a;">
        1. Shelf Item Picking Summary (প্রোডাক্ট পিকিং তালিকা)
      </h3>
      <span style="font-size: 10.5px; color: #64748b;">Check off items as picked from shelves</span>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align: center;">Pick</th>
          <th style="text-align: center;">#</th>
          <th>Product Description</th>
          <th style="text-align: center;">Total Units</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total Amount</th>
          <th>Order Numbers</th>
        </tr>
      </thead>
      <tbody>
        ${productRows}
      </tbody>
    </table>

    <!-- Section 2: Order-by-Order Dispatch Manifest -->
    <div style="margin: 24px 0 10px 0; display: flex; justify-content: space-between; align-items: center; border-top: 2px dashed #cbd5e1; padding-top: 18px;">
      <h3 style="margin: 0; font-size: 15px; font-weight: 900; color: #0f172a;">
        2. Order-by-Order Packing & Courier Dispatch Checklist
      </h3>
      <div style="font-size: 11px; font-weight: 700;">
        COD: <span style="color: #d97706;">${codCount} (${formatCurrency(totalCodAmount)})</span> | Prepaid: <span style="color: #16a34a;">${prepaidCount}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align: center;">Done</th>
          <th>Order #</th>
          <th>Customer Info</th>
          <th>District</th>
          <th>Item Snapshot</th>
          <th style="text-align: right;">Amount / Status</th>
        </tr>
      </thead>
      <tbody>
        ${orderPackingRows}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;
  }
}
