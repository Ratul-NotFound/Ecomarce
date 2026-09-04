'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Download,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  ShoppingBag,
  Award,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  X,
  Shield,
  FileSpreadsheet,
  FileCode,
  Check,
  ExternalLink,
  ChevronDown,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Crown,
  Lock,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { useToast } from '@/components/shared/ToastProvider';

export interface CustomerRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'super_admin' | 'admin' | 'moderator' | 'customer';
  points: number;
  referral_code: string;
  created_at: string;
  orderCount: number;
  totalSpent: number;
}

interface AdminCustomersManagerProps {
  initialCustomers: CustomerRecord[];
  currentAdminRole?: 'super_admin' | 'admin' | 'moderator';
  currentAdminId?: string;
}

// Available export fields
const EXPORTABLE_COLUMNS: { key: keyof CustomerRecord; label: string; defaultSelected: boolean }[] = [
  { key: 'full_name', label: 'Full Name', defaultSelected: true },
  { key: 'email', label: 'Email Address', defaultSelected: true },
  { key: 'phone', label: 'Phone Number', defaultSelected: true },
  { key: 'role', label: 'Account Role', defaultSelected: true },
  { key: 'points', label: 'Loyalty Points', defaultSelected: true },
  { key: 'orderCount', label: 'Total Orders', defaultSelected: true },
  { key: 'totalSpent', label: 'Total Spent (৳)', defaultSelected: true },
  { key: 'referral_code', label: 'Referral Code', defaultSelected: true },
  { key: 'created_at', label: 'Registration Date', defaultSelected: true },
  { key: 'id', label: 'Customer ID (UUID)', defaultSelected: false },
];

export default function AdminCustomersManager({
  initialCustomers,
  currentAdminRole = 'super_admin',
  currentAdminId,
}: AdminCustomersManagerProps) {
  const { showToast } = useToast();
  const isSuperAdmin = currentAdminRole === 'super_admin';
  const isModerator = currentAdminRole === 'moderator';

  const [customers, setCustomers] = useState<CustomerRecord[]>(initialCustomers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'moderator' | 'admin' | 'super_admin'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'buyers' | 'non_buyers' | 'vip'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_spent' | 'most_orders' | 'most_points' | 'name'>('newest');

  // Multi-selection state for targeted actions/export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit / Control Modal state
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'super_admin' | 'admin' | 'moderator' | 'customer'>('customer');
  const [editPoints, setEditPoints] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation modal state
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>('filtered');
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    EXPORTABLE_COLUMNS.forEach(col => {
      initial[col.key] = col.defaultSelected;
    });
    return initial;
  });

  // KPI calculations
  const stats = useMemo(() => {
    const total = customers.length;
    const activeBuyers = customers.filter(c => c.orderCount > 0).length;
    const totalPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    return { total, activeBuyers, totalPoints, totalRevenue };
  }, [customers]);

  // Filter and Sort Customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        // Search term
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchName = (c.full_name || '').toLowerCase().includes(q);
          const matchEmail = (c.email || '').toLowerCase().includes(q);
          const matchPhone = (c.phone || '').toLowerCase().includes(q);
          const matchRef = (c.referral_code || '').toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchPhone && !matchRef) return false;
        }

        // Role filter
        if (roleFilter !== 'all' && c.role !== roleFilter) return false;

        // Activity filter
        if (activityFilter === 'buyers' && c.orderCount === 0) return false;
        if (activityFilter === 'non_buyers' && c.orderCount > 0) return false;
        if (activityFilter === 'vip' && c.totalSpent < 5000) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === 'highest_spent') return b.totalSpent - a.totalSpent;
        if (sortBy === 'most_orders') return b.orderCount - a.orderCount;
        if (sortBy === 'most_points') return b.points - a.points;
        if (sortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
        return 0;
      });
  }, [customers, search, roleFilter, activityFilter, sortBy]);

  // Select all / Deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Open Edit Modal
  const openEditModal = (c: CustomerRecord) => {
    setEditingCustomer(c);
    setEditName(c.full_name || '');
    setEditPhone(c.phone || '');
    setEditRole(c.role);
    setEditPoints(c.points || 0);
  };

  // Save Customer Edits
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingCustomer.id,
          full_name: editName.trim(),
          phone: editPhone.trim() || null,
          role: editRole,
          points: editPoints,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update customer');

      showToast('Customer profile updated successfully!', 'success');
      setCustomers(prev =>
        prev.map(c =>
          c.id === editingCustomer.id
            ? {
                ...c,
                full_name: editName.trim(),
                phone: editPhone.trim() || null,
                role: editRole,
                points: editPoints,
              }
            : c
        )
      );
      setEditingCustomer(null);
    } catch (err: any) {
      showToast(err.message || 'Error updating customer', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Delete Customer
  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/customers?userId=${deletingCustomer.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete customer');

      showToast('Customer account deleted successfully', 'success');
      setCustomers(prev => prev.filter(c => c.id !== deletingCustomer.id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(deletingCustomer.id);
        return next;
      });
      setDeletingCustomer(null);
    } catch (err: any) {
      showToast(err.message || 'Error deleting customer', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // ROBUST DATA EXPORT ENGINE (CSV / JSON)
  // ────────────────────────────────────────────────────────────
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          if (document.body.contains(link)) document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch {}
      }, 30000);
    } catch (err: any) {
      console.error('Download failed:', err);
      showToast('Download failed: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  // Instant 1-click CSV export without modal
  const handleQuickExportCSV = () => {
    const dataset = selectedIds.size > 0 
      ? customers.filter(c => selectedIds.has(c.id)) 
      : (filteredCustomers.length > 0 ? filteredCustomers : customers);

    if (dataset.length === 0) {
      showToast('No customer records to export', 'error');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const activeColumns = EXPORTABLE_COLUMNS.filter(col => col.defaultSelected);
    const headers = activeColumns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const rows = dataset.map(item => {
      return activeColumns
        .map(c => {
          let val = (item as any)[c.key];
          if (val === null || val === undefined) val = '';
          if (c.key === 'created_at' && val) val = formatDate(val);
          if (c.key === 'role' && val) val = String(val).toUpperCase();
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    triggerDownload(csvContent, `shopbd_customers_${timestamp}.csv`, 'text/csv;charset=utf-8;');
    showToast(`Quick exported ${dataset.length} customer records to CSV!`, 'success');
  };

  // Customizable export with user-selected columns and format
  const handleExecuteExport = () => {
    // 1. Determine target dataset
    let dataset: CustomerRecord[] = [];
    if (exportScope === 'selected') {
      dataset = customers.filter(c => selectedIds.has(c.id));
      if (dataset.length === 0) {
        showToast('No customers selected. Exporting currently visible list instead.', 'info');
        dataset = filteredCustomers.length > 0 ? filteredCustomers : customers;
      }
    } else if (exportScope === 'filtered') {
      dataset = filteredCustomers.length > 0 ? filteredCustomers : customers;
    } else {
      dataset = customers;
    }

    if (dataset.length === 0) {
      showToast('No customer records to export', 'error');
      return;
    }

    // 2. Identify active columns
    const activeColumns = EXPORTABLE_COLUMNS.filter(col => selectedColumns[col.key]);
    if (activeColumns.length === 0) {
      showToast('Please select at least one column to export', 'error');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    if (exportFormat === 'csv') {
      // Build CSV with UTF-8 BOM for full Excel / Bangla compatibility
      const headers = activeColumns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
      const rows = dataset.map(item => {
        return activeColumns
          .map(c => {
            let val = (item as any)[c.key];
            if (val === null || val === undefined) val = '';
            if (c.key === 'created_at' && val) val = formatDate(val);
            if (c.key === 'role' && val) val = String(val).toUpperCase();
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',');
      });

      const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
      triggerDownload(csvContent, `shopbd_customers_${timestamp}.csv`, 'text/csv;charset=utf-8;');
      showToast(`Exported ${dataset.length} customer records to CSV!`, 'success');
    } else {
      // Build JSON
      const jsonContent = dataset.map(item => {
        const obj: Record<string, any> = {};
        activeColumns.forEach(c => {
          let val = (item as any)[c.key];
          if (c.key === 'created_at' && val) val = formatDate(val);
          obj[c.label] = val;
        });
        return obj;
      });

      triggerDownload(JSON.stringify(jsonContent, null, 2), `shopbd_customers_${timestamp}.json`, 'application/json');
      showToast(`Exported ${dataset.length} customer records to JSON!`, 'success');
    }

    setIsExportModalOpen(false);
  };

  return (
    <div>
      {/* ────────────────────────────────────────────────────────────
          PAGE HEADER & CONTROLS
      ──────────────────────────────────────────────────────────── */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Customer Directory & User Control</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Inspect full customer profiles, manage roles, adjust loyalty points, and run customizable data exports.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isModerator ? (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-admin-muted)',
                background: 'rgba(147, 51, 234, 0.08)',
                padding: '6px 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              <Lock size={13} color="#7e22ce" />
              <span>Bulk data export restricted to Admins</span>
            </span>
          ) : (
            <>
              {/* Instant 1-Click Quick CSV Download */}
              <button
                type="button"
                onClick={handleQuickExportCSV}
                className="btn btn-secondary btn-sm"
                title="Instant 1-Click CSV Download"
                style={{
                  background: '#ffffff',
                  borderColor: 'var(--color-admin-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Download size={15} color="#16a34a" />
                <span>Quick Export CSV</span>
              </button>

              {/* Full Customizer Modal */}
              <button
                type="button"
                onClick={() => {
                  if (selectedIds.size > 0) setExportScope('selected');
                  else setExportScope('filtered');
                  setIsExportModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                title="Choose format, columns, and scope"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <FileSpreadsheet size={15} />
                <span>Custom Export {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          KPI SUMMARY CARDS
      ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>Total Registered</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="var(--color-primary)" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-admin-text)' }}>{stats.total}</div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>Active Buyers</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={16} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-admin-text)' }}>{stats.activeBuyers}</div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>Loyalty Points In Circulation</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={16} color="#ca8a04" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-admin-text)' }}>{stats.totalPoints.toLocaleString()} pts</div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>Customer Lifetime Value</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={16} color="#9333ea" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-admin-text)' }}>{formatCurrency(stats.totalRevenue)}</div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          SEARCH & FILTER BAR
      ──────────────────────────────────────────────────────────── */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-admin-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, email, phone, referral code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', width: '100%' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-admin-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>Role:</span>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="form-input"
              style={{ height: '38px', fontSize: '13px', padding: '0 10px', minWidth: '120px' }}
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admins</option>
              <option value="admin">Admins</option>
              <option value="moderator">Moderators</option>
              <option value="customer">Customers</option>
            </select>
          </div>

          {/* Activity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>Activity:</span>
            <select
              value={activityFilter}
              onChange={e => setActivityFilter(e.target.value as any)}
              className="form-input"
              style={{ height: '38px', fontSize: '13px', padding: '0 10px', minWidth: '130px' }}
            >
              <option value="all">All Users</option>
              <option value="buyers">Has Orders</option>
              <option value="non_buyers">No Orders Yet</option>
              <option value="vip">VIP (&gt; ৳5,000)</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="form-input"
              style={{ height: '38px', fontSize: '13px', padding: '0 10px', minWidth: '140px' }}
            >
              <option value="newest">Newest Joined</option>
              <option value="oldest">Oldest Joined</option>
              <option value="highest_spent">Highest Spent</option>
              <option value="most_orders">Most Orders</option>
              <option value="most_points">Most Points</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Selected Rows Quick Bar */}
        {selectedIds.size > 0 && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: 'var(--color-primary)',
              fontWeight: 700,
            }}
          >
            <span>{selectedIds.size} customer{selectedIds.size > 1 ? 's' : ''} selected</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setExportScope('selected');
                  setIsExportModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                Export Selected ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 10px', fontSize: '12px', background: '#fff' }}
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────
          CUSTOMERS DATA TABLE
      ──────────────────────────────────────────────────────────── */}
      <div className="admin-card">
        {filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-admin-muted)' }}>
            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-admin-text)', marginBottom: '4px' }}>No Customers Found</h3>
            <p style={{ fontSize: '13px' }}>Try adjusting your search query or active filters.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer' }}
                      aria-label="Select all customers"
                    />
                  </th>
                  <th>Customer</th>
                  <th>Contact Info</th>
                  <th>Role</th>
                  <th>Orders & Spend</th>
                  <th>Loyalty Points</th>
                  <th>Referral Code</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(user => {
                  const isSelected = selectedIds.has(user.id);
                  return (
                    <tr key={user.id} style={{ background: isSelected ? 'rgba(37, 99, 235, 0.03)' : undefined }}>
                      {/* Checkbox */}
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(user.id)}
                          style={{ cursor: 'pointer' }}
                          aria-label={`Select ${user.full_name || 'user'}`}
                        />
                      </td>

                      {/* Customer Avatar & Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name || 'Customer'}
                              referrerPolicy="no-referrer"
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '9999px',
                                objectFit: 'cover',
                                border: '1px solid var(--color-admin-border)',
                                flexShrink: 0,
                                display: 'block',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '9999px',
                                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13px',
                                flexShrink: 0,
                                border: '1px solid var(--color-admin-border)',
                              }}
                            >
                              {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ color: 'var(--color-admin-text)', display: 'block', fontSize: '13.5px' }}>
                              {user.full_name || 'Customer'}
                            </strong>
                            <span style={{ fontSize: '12px', color: 'var(--color-admin-muted)', display: 'block' }}>
                              ID: {user.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info (Email & Phone) */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12.5px' }}>
                          {user.email ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-admin-text)' }}>
                              <Mail size={12} style={{ color: 'var(--color-admin-muted)' }} />
                              <span style={{ wordBreak: 'break-all' }}>{user.email}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-admin-muted)' }}>No email</span>
                          )}

                          {user.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-admin-muted)' }}>
                              <Phone size={12} />
                              <span>{user.phone}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-admin-muted)', fontSize: '11px' }}>Phone: —</span>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td>
                        {user.role === 'super_admin' ? (
                          <span
                            style={{
                              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                              color: '#92400e',
                              border: '1px solid #f59e0b',
                              padding: '3px 9px',
                              borderRadius: '9999px',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                              boxShadow: '0 1px 2px rgba(245, 158, 11, 0.2)',
                            }}
                          >
                            <Crown size={12} color="#d97706" />
                            SUPER ADMIN
                          </span>
                        ) : user.role === 'admin' ? (
                          <span className="badge badge-primary" style={{ fontWeight: 800, fontSize: '11px' }}>
                            ADMIN
                          </span>
                        ) : user.role === 'moderator' ? (
                          <span
                            style={{
                              background: 'rgba(147, 51, 234, 0.1)',
                              color: '#7e22ce',
                              border: '1px solid rgba(147, 51, 234, 0.25)',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                            }}
                          >
                            MODERATOR
                          </span>
                        ) : (
                          <span className="badge badge-secondary" style={{ fontWeight: 700, fontSize: '11px' }}>
                            CUSTOMER
                          </span>
                        )}
                      </td>

                      {/* Orders & Spend */}
                      <td>
                        <div>
                          <span style={{ fontWeight: 800, color: 'var(--color-admin-text)', display: 'block' }}>
                            {formatCurrency(user.totalSpent)}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                            {user.orderCount} order{user.orderCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>

                      {/* Loyalty Points */}
                      <td>
                        <span style={{ fontWeight: 800, color: '#ca8a04', background: 'rgba(234, 179, 8, 0.1)', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px' }}>
                          {user.points || 0} pts
                        </span>
                      </td>

                      {/* Referral Code */}
                      <td>
                        <code style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'rgba(37,99,235,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                          {user.referral_code || '—'}
                        </code>
                      </td>

                      {/* Joined Date */}
                      <td style={{ fontSize: '12px', color: 'var(--color-admin-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(user.created_at)}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '5px 9px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title={isModerator ? 'View customer details' : 'Manage customer & role'}
                          >
                            <Edit2 size={13} />
                            <span>{isModerator ? 'View' : 'Manage'}</span>
                          </button>

                          {user.orderCount > 0 && (
                            <Link
                              href={`/admin/orders?search=${encodeURIComponent(user.email || user.phone || user.full_name || '')}`}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 8px', background: '#fff' }}
                              title="View all customer orders"
                            >
                              <ShoppingBag size={13} />
                            </Link>
                          )}

                          {/* Account Deletion: Only Super Admin can delete customer or staff accounts */}
                          {isSuperAdmin && user.role !== 'super_admin' && (
                            <button
                              type="button"
                              onClick={() => setDeletingCustomer(user)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-danger, #ef4444)',
                                cursor: 'pointer',
                                padding: '5px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Delete customer account"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────
          EDIT / USER CONTROL MODAL
      ──────────────────────────────────────────────────────────── */}
      {editingCustomer && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.68)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
          }}
          onClick={() => setEditingCustomer(null)}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--color-admin-border, #cbd5e1)',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              width: '100%',
              maxWidth: '520px',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              padding: '24px',
              position: 'relative',
              zIndex: 1000000,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Customer Controls</h3>
                  <span style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>{editingCustomer.email || editingCustomer.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-admin-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 01712345678"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Account Role & Privileges</span>
                  {!isSuperAdmin && (
                    <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} /> Super Admin Only
                    </span>
                  )}
                </label>
                {isSuperAdmin ? (
                  <>
                    <select
                      value={editRole}
                      disabled={editingCustomer.role === 'super_admin'}
                      onChange={e => setEditRole(e.target.value as any)}
                      className="form-input"
                    >
                      <option value="customer">Customer (Default Shopper)</option>
                      <option value="moderator">Moderator (Orders fulfillment & reviews)</option>
                      <option value="admin">Administrator (Catalog & Operations manager)</option>
                    </select>
                    <span style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                      {editingCustomer.role === 'super_admin'
                        ? 'Root Super Admin account cannot be demoted.'
                        : 'Promote or demote user authority across the store management pipeline.'}
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      disabled
                      value={editingCustomer.role.toUpperCase()}
                      className="form-input"
                      style={{ background: '#f8fafc', color: 'var(--color-admin-muted)', cursor: 'not-allowed' }}
                    />
                    <span style={{ fontSize: '11.5px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                      Role changes require Super Admin authority.
                    </span>
                  </>
                )}
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Loyalty Points</label>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#ca8a04' }}>Current: {editingCustomer.points} pts</span>
                </div>
                {isModerator ? (
                  <>
                    <input
                      type="number"
                      disabled
                      value={editPoints}
                      className="form-input"
                      style={{ background: '#f8fafc', cursor: 'not-allowed' }}
                    />
                    <span style={{ fontSize: '11.5px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                      Moderators have read-only access to customer points.
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      min="0"
                      value={editPoints}
                      onChange={e => setEditPoints(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="form-input"
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      {[10, 50, 100, 200].map(pt => (
                        <button
                          key={pt}
                          type="button"
                          onClick={() => setEditPoints(prev => prev + pt)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--color-admin-border)',
                            background: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          +{pt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditPoints(0)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-admin-border)',
                          background: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          color: 'var(--color-danger, #ef4444)',
                          marginLeft: 'auto',
                        }}
                      >
                        Reset (0)
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {isSaving ? 'Saving Changes...' : 'Update Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          DELETE CONFIRMATION MODAL
      ──────────────────────────────────────────────────────────── */}
      {deletingCustomer && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.68)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
          }}
          onClick={() => setDeletingCustomer(null)}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--color-admin-border, #cbd5e1)',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1000000,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Delete Customer Account?</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to delete <strong>{deletingCustomer.full_name || deletingCustomer.email}</strong>? This will permanently remove their authentication credentials and profile record.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="btn btn-primary"
                style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          CUSTOMIZABLE EXPORT MODAL
      ──────────────────────────────────────────────────────────── */}
      {isExportModalOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.68)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
          }}
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--color-admin-border, #cbd5e1)',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              width: '100%',
              maxWidth: '580px',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              padding: '26px',
              position: 'relative',
              zIndex: 1000000,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileSpreadsheet size={20} color="#16a34a" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Customizable Customer Data Export</h3>
                  <span style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>Choose format, scope, and specific columns to download.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-admin-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Format Selection */}
            <div style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ marginBottom: '8px' }}>1. Export Format</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: exportFormat === 'csv' ? '2px solid var(--color-primary)' : '1px solid var(--color-admin-border)',
                    background: exportFormat === 'csv' ? 'rgba(37,99,235,0.05)' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <FileSpreadsheet size={22} color={exportFormat === 'csv' ? 'var(--color-primary)' : '#64748b'} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: 'var(--color-admin-text)' }}>CSV / Excel</strong>
                    <span style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>Compatible with Excel, Sheets</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: exportFormat === 'json' ? '2px solid var(--color-primary)' : '1px solid var(--color-admin-border)',
                    background: exportFormat === 'json' ? 'rgba(37,99,235,0.05)' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <FileCode size={22} color={exportFormat === 'json' ? 'var(--color-primary)' : '#64748b'} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: 'var(--color-admin-text)' }}>JSON Data</strong>
                    <span style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>Structured API object array</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            <div style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ marginBottom: '8px' }}>2. Export Scope</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setExportScope('filtered')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: exportScope === 'filtered' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-admin-border)',
                    background: exportScope === 'filtered' ? 'rgba(37,99,235,0.08)' : '#fff',
                    color: exportScope === 'filtered' ? 'var(--color-primary)' : 'var(--color-admin-text)',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                  }}
                >
                  Currently Filtered ({filteredCustomers.length})
                </button>

                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setExportScope('selected')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: exportScope === 'selected' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-admin-border)',
                      background: exportScope === 'selected' ? 'rgba(37,99,235,0.08)' : '#fff',
                      color: exportScope === 'selected' ? 'var(--color-primary)' : 'var(--color-admin-text)',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Selected Rows ({selectedIds.size})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: exportScope === 'all' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-admin-border)',
                    background: exportScope === 'all' ? 'rgba(37,99,235,0.08)' : '#fff',
                    color: exportScope === 'all' ? 'var(--color-primary)' : 'var(--color-admin-text)',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                  }}
                >
                  All Registered Customers ({customers.length})
                </button>
              </div>
            </div>

            {/* Selectable Columns */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>3. Select Information to Include</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      EXPORTABLE_COLUMNS.forEach(c => (all[c.key] = true));
                      setSelectedColumns(all);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <span style={{ color: 'var(--color-admin-border)' }}>|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const none: Record<string, boolean> = {};
                      EXPORTABLE_COLUMNS.forEach(c => (none[c.key] = false));
                      setSelectedColumns(none);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-admin-muted)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  background: 'var(--color-admin-surface-2, #f8fafc)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-admin-border)',
                }}
              >
                {EXPORTABLE_COLUMNS.map(col => {
                  const isChecked = Boolean(selectedColumns[col.key]);
                  return (
                    <label
                      key={col.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: 'var(--color-admin-text)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e =>
                          setSelectedColumns(prev => ({ ...prev, [col.key]: e.target.checked }))
                        }
                      />
                      <span>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteExport}
                className="btn btn-primary"
                style={{
                  flex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontWeight: 800,
                }}
              >
                <Download size={16} />
                <span>Download {exportFormat.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
