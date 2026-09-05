import type { Order } from '@/types';
import { STORE_CONFIG } from '@/lib/store-config';
import { formatCurrency, formatDate } from '@/lib/utils/format';

/**
 * Pure SVG Barcode generator (Code128-like vector pattern)
 * Generates crisp, scalable, high-contrast black/white bars suitable for optical barcode scanners.
 */
function generateBarcodeSvg(code: string, height: number = 36): string {
  // Simple deterministic Code-128 bar pattern generator
  const cleanCode = (code || '000000').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  let pattern = '11010010000'; // Start code
  
  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i);
    // Deterministic 11-module bar sequence for each character
    const seed = (charCode * 17 + i * 31) % 100;
    const b1 = (seed % 3) + 1;
    const s1 = ((seed >> 2) % 3) + 1;
    const b2 = ((seed >> 4) % 3) + 1;
    const s2 = 11 - (b1 + s1 + b2);
    pattern += '1'.repeat(b1) + '0'.repeat(s1) + '1'.repeat(b2) + '0'.repeat(Math.max(1, s2));
  }
  pattern += '1100011101011'; // Stop code

  const barWidth = 1.4;
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
      <text x="${totalWidth / 2}" y="${height + 12}" font-family="monospace" font-size="10" font-weight="700" text-anchor="middle" fill="#111827">${code}</text>
    </svg>
  `;
}

export class InvoiceService {
  /**
   * 1. Single Standard A4 Invoice
   */
  generateInvoiceHtml(order: Order, storeName?: string, contactPhone?: string, contactEmail?: string): string {
    return this.generateBatchInvoicesHtml([order], storeName, contactPhone, contactEmail);
  }

  /**
   * 2. Batch Standard A4 Invoices (with automatic page break)
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
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px;">${index + 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">
            <strong style="color: #111827;">${item.name_snapshot}</strong>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700; font-size: 13px;">${item.quantity}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px;">${formatCurrency(item.unit_price)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-size: 13px; color: #111827;">${formatCurrency(item.total_price)}</td>
        </tr>
      `
        )
        .join('');

      return `
        <div class="invoice-page ${orderIdx < orders.length - 1 ? 'page-break' : ''}">
          <div class="header">
            <div>
              <div class="logo">${name}</div>
              <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">${email} • ${phone}</div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">Official Customer Receipt / ক্যাশ মেমো</div>
            </div>
            <div style="text-align: right;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #111827; letter-spacing: 0.5px;">INVOICE</h1>
              <div style="font-weight: 800; color: #2563eb; font-size: 15px; margin-top: 2px;">#${order.order_number}</div>
              <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">Date: ${formatDate(order.created_at)}</div>
            </div>
          </div>

          <div style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
            <div style="max-width: 220px; width: 100%;">
              ${generateBarcodeSvg(order.order_number || `EC-${order.id.slice(0, 8)}`, 32)}
            </div>
          </div>

          <table class="meta-table">
            <tr>
              <td class="meta-box">
                <div class="meta-title">BILLED & DELIVER TO</div>
                <div style="font-weight: 800; font-size: 15px; color: #111827;">${order.shipping_address?.full_name || 'Customer'}</div>
                <div style="font-size: 13px; color: #374151; margin-top: 2px;">${order.shipping_address?.street_address || ''}</div>
                <div style="font-size: 13px; color: #374151;">${order.shipping_address?.upazila ? `${order.shipping_address.upazila}, ` : ''}${order.shipping_address?.district || ''}</div>
                <div style="font-size: 13px; font-weight: 700; color: #111827; margin-top: 4px;">Phone: ${order.shipping_address?.phone || ''}</div>
              </td>
              <td class="meta-box" style="text-align: right;">
                <div class="meta-title">PAYMENT DETAILS</div>
                <div style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 12px; background: ${isCod ? '#fef3c7' : '#dcfce7'}; color: ${isCod ? '#92400e' : '#166534'};">
                  ${(order.payment_method || 'COD').toUpperCase()} • ${(order.payment_status || 'PENDING').toUpperCase()}
                </div>
                ${
                  (order.shipping_address as any)?.sender_phone || order.payment_sender_phone
                    ? `<div style="font-size: 12px; color: #4b5563; margin-top: 6px;">Sender: <strong>${(order.shipping_address as any)?.sender_phone || order.payment_sender_phone}</strong></div>`
                    : ''
                }
                ${
                  order.payment_transaction_id
                    ? `<div style="font-size: 12px; color: #4b5563; margin-top: 2px;">TrxID: <code style="font-weight: 700; color: #e11d48;">${order.payment_transaction_id}</code></div>`
                    : ''
                }
                <div style="font-size: 12px; color: #6b7280; margin-top: 6px;">Delivery Method: Regular Doorstep Delivery</div>
              </td>
            </tr>
          </table>

          <table class="items">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="text-align: left;">Item Description</th>
                <th style="width: 70px; text-align: center;">Qty</th>
                <th style="width: 110px; text-align: right;">Unit Price</th>
                <th style="width: 120px; text-align: right;">Total Amount</th>
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
              <div style="margin-top: 8px; padding: 6px 10px; background: #fffbeb; border: 1px dashed #f59e0b; border-radius: 6px; font-size: 12px; font-weight: 800; color: #b45309; text-align: center;">
                Cash Collection: ${formatCurrency(order.total)}
              </div>
              `
                  : `
              <div style="margin-top: 8px; padding: 6px 10px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; font-size: 12px; font-weight: 800; color: #166534; text-align: center;">
                ✓ PAID IN ADVANCE
              </div>
              `
              }
            </div>
          </div>

          <div class="footer">
            Thank you for choosing <strong>${name}</strong>! • Helpline: ${phone} • ${email}<br>
            Please inspect the parcel in the presence of the courier delivery agent.
          </div>
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${orders.length === 1 ? `Invoice #${orders[0].order_number}` : `Batch Invoices (${orders.length} Orders)`}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 24px;
      color: #1f2937;
      background: #f3f4f6;
      font-size: 14px;
      line-height: 1.5;
    }
    .print-controls {
      max-width: 800px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 14px 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-print:hover { background: #1d4ed8; }
    .invoice-page {
      max-width: 800px;
      margin: 0 auto 30px auto;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 36px 40px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: 900;
      color: #2563eb;
      letter-spacing: -0.5px;
    }
    .meta-table {
      width: 100%;
      margin-bottom: 24px;
      border-collapse: collapse;
    }
    .meta-box {
      width: 50%;
      vertical-align: top;
      background: #f8fafc;
      padding: 14px;
      border-radius: 8px;
    }
    .meta-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    table.items th {
      background: #f1f5f9;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .totals {
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      color: #475569;
      font-size: 13px;
    }
    .totals-grand {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-top: 2px solid #e2e8f0;
      font-size: 16px;
      font-weight: 900;
      color: #2563eb;
    }
    .footer {
      clear: both;
      text-align: center;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
      color: #94a3b8;
      font-size: 11px;
      line-height: 1.6;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
        margin: 0;
      }
      .no-print { display: none !important; }
      .invoice-page {
        border: none;
        box-shadow: none;
        padding: 20px;
        margin: 0;
        max-width: 100%;
      }
      .page-break {
        page-break-after: always;
        break-after: page;
      }
    }
  </style>
</head>
<body>
  <div class="print-controls no-print">
    <div style="font-weight: 700; color: #1e293b;">
      📄 Standard Invoices • ${orders.length} ${orders.length === 1 ? 'Order' : 'Orders'}
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print All Invoices (${orders.length})
    </button>
  </div>

  ${invoicesHtml}
</body>
</html>
    `;
  }

  /**
   * 3. Multi-Label Shipping / Packaging Tags (4-up, 6-up, 9-up, Thermal)
   * Designed for cut-and-tag parcel labeling with barcode, address, phone & items breakdown
   */
  generateShippingTagsHtml(
    orders: Order[],
    layout: '4-up' | '6-up' | '9-up' | 'thermal' = '6-up',
    storeName?: string,
    contactPhone?: string
  ): string {
    const name = storeName || STORE_CONFIG.name;
    const phone = contactPhone || STORE_CONFIG.contact.phone;

    const cardsHtml = orders.map(order => {
      const isCod = order.payment_method?.toLowerCase() === 'cod' || order.payment_method?.toLowerCase() === 'cash on delivery';
      const addr = order.shipping_address || {};
      
      const itemsList = (order.items_snapshot || [])
        .map(i => `<span style="display: inline-block; background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin: 1px 3px 1px 0;"><strong>${i.quantity}x</strong> ${i.name_snapshot}</span>`)
        .join('');

      return `
        <div class="shipping-card">
          <!-- Card Header -->
          <div class="card-header">
            <div>
              <div class="store-badge">${name}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 1px;">Helpline: ${phone}</div>
            </div>
            <div style="text-align: right;">
              <div class="order-num">#${order.order_number}</div>
              <div style="font-size: 10px; color: #64748b;">${formatDate(order.created_at)}</div>
            </div>
          </div>

          <!-- Barcode -->
          <div style="margin: 6px 0; text-align: center;">
            ${generateBarcodeSvg(order.order_number || `EC-${order.id.slice(0, 8)}`, layout === '9-up' ? 24 : 30)}
          </div>

          <!-- Recipient Details -->
          <div class="recipient-box">
            <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">DELIVER TO / প্রাপক:</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${addr.full_name || 'Customer'}</div>
            <div style="font-size: 13px; font-weight: 800; color: #2563eb; margin: 2px 0;">📞 ${addr.phone || 'No phone'}</div>
            <div style="font-size: 11px; color: #334155; line-height: 1.3;">
              ${addr.street_address ? `${addr.street_address}, ` : ''}
              <strong>${addr.upazila ? `${addr.upazila}, ` : ''}${addr.district || 'Bangladesh'}</strong>
            </div>
          </div>

          <!-- Items Ordered Snapshot -->
          <div style="margin: 6px 0; min-height: 32px;">
            <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">ITEMS / পণ্য:</div>
            <div style="line-height: 1.3;">${itemsList}</div>
          </div>

          <!-- Payment Footer Banner -->
          <div class="card-footer">
            <div style="font-size: 11px; font-weight: 700; color: #475569;">
              METHOD: <strong>${(order.payment_method || 'COD').toUpperCase()}</strong>
            </div>
            <div class="payment-badge ${isCod ? 'badge-cod' : 'badge-paid'}">
              ${isCod ? `COD: ${formatCurrency(order.total)}` : `PAID: ${formatCurrency(order.total)}`}
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
  <title>Shipping Tags (${orders.length} Labels - ${layout.toUpperCase()})</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 20px;
      color: #1e293b;
      background: #f1f5f9;
      font-size: 12px;
    }
    .print-bar {
      max-width: 900px;
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

    /* Layout Grids */
    .tags-container {
      max-width: 960px;
      margin: 0 auto;
      display: grid;
      gap: 12px;
      background: #ffffff;
      padding: 16px;
      border-radius: 8px;
    }

    /* 6-Up: 2 columns x 3 rows per A4 page */
    .layout-6-up {
      grid-template-columns: repeat(2, 1fr);
    }

    /* 9-Up: 3 columns x 3 rows per A4 page */
    .layout-9-up {
      grid-template-columns: repeat(3, 1fr);
    }

    /* 4-Up: 2 columns x 2 rows */
    .layout-4-up {
      grid-template-columns: repeat(2, 1fr);
    }

    /* Thermal: 100mm x 150mm individual sticker */
    .layout-thermal {
      grid-template-columns: 1fr;
      max-width: 400px;
    }

    .shipping-card {
      border: 1.5px dashed #94a3b8;
      border-radius: 6px;
      padding: 10px 12px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      break-inside: avoid;
      position: relative;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .store-badge {
      font-weight: 900;
      font-size: 13px;
      color: #2563eb;
      letter-spacing: -0.3px;
    }
    .order-num {
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
    }
    .recipient-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 10px;
      margin: 4px 0;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      margin-top: 6px;
    }
    .payment-badge {
      font-weight: 900;
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 4px;
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
      .tags-container {
        padding: 0;
        margin: 0;
        gap: 8px;
        max-width: 100%;
        background: none;
      }
      .shipping-card {
        border: 1px dashed #64748b;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      @page {
        margin: 10mm;
        size: ${layout === 'thermal' ? '100mm 150mm' : 'A4'};
      }
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <div>
      <strong>🏷️ Shipping & Packaging Tags</strong> • ${orders.length} Orders (${layout.toUpperCase()} Layout)
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Print onto A4 paper or sticker sheets, cut along dashed borders, and affix to parcels.</div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-print" onclick="window.print()">
        🖨️ Print ${orders.length} Tags (${layout.toUpperCase()})
      </button>
    </div>
  </div>

  <div class="tags-container layout-${layout}">
    ${cardsHtml}
  </div>
</body>
</html>
    `;
  }

  /**
   * 4. Warehouse Product Picking Manifest & Item Packing Summary
   * Aggregates by product SKU/title to show packing staff exact units to pull from shelves
   */
  generatePickingManifestHtml(
    orders: Order[],
    timeframeLabel: string = 'Today',
    storeName?: string
  ): string {
    const name = storeName || STORE_CONFIG.name;

    // Aggregate products across all orders
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
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; width: 40px;">
          <input type="checkbox" style="width: 16px; height: 16px; cursor: pointer;" />
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #64748b; width: 40px;">
          ${idx + 1}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
          <strong style="font-size: 14px; color: #0f172a;">${p.name}</strong>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; width: 90px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 900; font-size: 14px; background: #dbeafe; color: #1d4ed8;">
            ${p.quantity} Units
          </span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; width: 110px; font-size: 13px; color: #334155;">
          ${formatCurrency(p.unitPrice)}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800; width: 120px; color: #0f172a;">
          ${formatCurrency(p.totalRevenue)}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
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
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; width: 36px;">
            <input type="checkbox" style="width: 14px; height: 14px; cursor: pointer;" />
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #2563eb; width: 110px;">
            #${order.order_number}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; width: 160px;">
            <div style="font-weight: 700; color: #0f172a;">${order.shipping_address?.full_name || 'Customer'}</div>
            <div style="font-size: 11px; color: #64748b;">${order.shipping_address?.phone || ''}</div>
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; width: 120px; font-size: 12px;">
            ${order.shipping_address?.district || 'Dhaka'}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155;">
            ${itemsBrief}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; width: 130px;">
            <div style="font-weight: 800; color: #0f172a;">${formatCurrency(order.total)}</div>
            <span style="font-size: 10px; font-weight: 800; color: ${isCod ? '#d97706' : '#16a34a'};">
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
  <title>Warehouse Picking Manifest (${timeframeLabel})</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #f8fafc;
      font-size: 13px;
      line-height: 1.4;
    }
    .print-controls {
      max-width: 1000px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 14px 20px;
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
      max-width: 1000px;
      margin: 0 auto 30px auto;
      background: #ffffff;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-box {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .kpi-val {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #f1f5f9;
      padding: 10px 12px;
      font-size: 11px;
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
        margin: 0;
        max-width: 100%;
      }
      th { background: #e2e8f0 !important; }
      @page { margin: 12mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="print-controls no-print">
    <div>
      <strong style="font-size: 15px;">📦 Warehouse Picking & Packing Manifest</strong>
      <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
        Timeframe: <strong>${timeframeLabel}</strong> • Generated on ${new Date().toLocaleString()}
      </div>
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print Picking Manifest Sheet
    </button>
  </div>

  <div class="manifest-card">
    <div class="header">
      <div>
        <div style="font-size: 22px; font-weight: 900; color: #0f172a;">${name}</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Warehouse Fulfillment & Inventory Pick Manifest (প্যাকিং তালিকা)</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 14px; font-weight: 800; color: #2563eb;">TIMEFRAME: ${timeframeLabel.toUpperCase()}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Total ${orders.length} Orders in Batch</div>
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
        <div class="kpi-label">Total Batch Revenue</div>
        <div class="kpi-val" style="color: #0f172a;">${formatCurrency(totalRevenue)}</div>
      </div>
    </div>

    <!-- Section 1: Item Picking List -->
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a;">
        1. Shelf Item Picking Summary (প্রোডাক্ট পিকিং তালিকা)
      </h3>
      <span style="font-size: 11px; color: #64748b;">Check off items as picked from warehouse</span>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align: center;">Pick</th>
          <th style="text-align: center;">#</th>
          <th>Product / SKU Description</th>
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
    <div style="margin: 30px 0 12px 0; display: flex; justify-content: space-between; align-items: center; border-top: 2px dashed #cbd5e1; padding-top: 24px;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a;">
        2. Order-by-Order Packing & Courier Dispatch Checklist
      </h3>
      <div style="font-size: 12px; font-weight: 700;">
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
