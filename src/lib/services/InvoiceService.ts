import type { Order } from '@/types';
import { STORE_CONFIG } from '@/lib/store-config';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export class InvoiceService {
  generateInvoiceHtml(order: Order, storeName?: string, contactPhone?: string, contactEmail?: string): string {
    const name = storeName || STORE_CONFIG.name;
    const phone = contactPhone || STORE_CONFIG.contact.phone;
    const email = contactEmail || STORE_CONFIG.contact.email;

    const itemsRows = (order.items_snapshot || [])
      .map(
        (item, index) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.name_snapshot}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatCurrency(item.total_price)}</td>
      </tr>
    `
      )
      .join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice #${order.order_number}</title>
  <style>
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 30px;
      color: #1f2937;
      background: #ffffff;
      font-size: 14px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 26px;
      font-weight: 800;
      color: #2563eb;
    }
    .meta-table {
      width: 100%;
      margin-bottom: 30px;
    }
    .meta-box {
      width: 48%;
      vertical-align: top;
    }
    .meta-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    table.items th {
      background: #f8fafc;
      padding: 12px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #4b5563;
      border-bottom: 2px solid #e5e7eb;
    }
    .totals {
      float: right;
      width: 280px;
      margin-bottom: 30px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      color: #4b5563;
    }
    .totals-grand {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-top: 2px solid #e5e7eb;
      font-size: 18px;
      font-weight: 800;
      color: #2563eb;
    }
    .footer {
      clear: both;
      text-align: center;
      padding-top: 30px;
      border-top: 1px dashed #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
      <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">Print / Save as PDF</button>
    </div>

    <div class="header">
      <div>
        <div class="logo">${name}</div>
        <div style="color: #6b7280; margin-top: 4px;">${email} | ${phone}</div>
      </div>
      <div style="text-align: right;">
        <h1 style="margin: 0; font-size: 22px; color: #111827;">INVOICE</h1>
        <div style="font-weight: 700; color: #2563eb; margin-top: 4px;">#${order.order_number}</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">Date: ${formatDate(order.created_at)}</div>
      </div>
    </div>

    <table class="meta-table">
      <tr>
        <td class="meta-box">
          <div class="meta-title">BILLED & SHIPPED TO</div>
          <div style="font-weight: 700; font-size: 15px;">${order.shipping_address.full_name}</div>
          <div>${order.shipping_address.street_address}</div>
          <div>${order.shipping_address.upazila}, ${order.shipping_address.district}</div>
          <div>Phone: ${order.shipping_address.phone}</div>
        </td>
        <td class="meta-box" style="text-align: right;">
          <div class="meta-title">PAYMENT INFORMATION</div>
          <div style="font-weight: 600;">Method: ${order.payment_method.toUpperCase()}</div>
          <div>Status: <span style="font-weight: 700; color: ${order.payment_status === 'confirmed' ? '#10b981' : '#f59e0b'};">${order.payment_status.toUpperCase()}</span></div>
          ${order.payment_transaction_id ? `<div>TrxID: <code>${order.payment_transaction_id}</code></div>` : ''}
        </td>
      </tr>
    </table>

    <table class="items">
      <thead>
        <tr>
          <th style="width: 50px; text-align: center;">#</th>
          <th style="text-align: left;">Item Description</th>
          <th style="width: 80px; text-align: center;">Qty</th>
          <th style="width: 110px; text-align: right;">Price</th>
          <th style="width: 120px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(order.subtotal)}</span>
      </div>
      <div class="totals-row">
        <span>Shipping Charge</span>
        <span>${formatCurrency(order.shipping_fee)}</span>
      </div>
      ${
        order.discount_amount > 0
          ? `
      <div class="totals-row" style="color: #ef4444;">
        <span>Discount ${order.coupon_code ? `(${order.coupon_code})` : ''}</span>
        <span>-${formatCurrency(order.discount_amount)}</span>
      </div>
      `
          : ''
      }
      <div class="totals-grand">
        <span>Total Payable</span>
        <span>${formatCurrency(order.total)}</span>
      </div>
    </div>

    <div class="footer">
      Thank you for shopping with <strong>${name}</strong>!<br>
      For any queries or order assistance, please reach out to our customer support.
    </div>
  </div>
</body>
</html>
    `;
  }
}
