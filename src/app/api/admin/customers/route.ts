import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================
// ADMIN CUSTOMER MANAGEMENT API
// PATCH: Update user profile (role, points, name, phone)
// DELETE: Delete customer account
// ============================================================

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { userId, full_name, phone, role, points } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }

    // Role updates can only be performed by full admins
    if (role && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only full admins can modify user roles' }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (full_name !== undefined) updates.full_name = String(full_name).trim();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
    if (role !== undefined) {
      const validRoles = ['customer', 'moderator', 'admin'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
      }
      updates.role = role;
    }
    if (points !== undefined) {
      const parsedPoints = parseInt(points, 10);
      if (isNaN(parsedPoints) || parsedPoints < 0) {
        return NextResponse.json({ error: 'Points must be a non-negative integer' }, { status: 400 });
      }
      updates.points = parsedPoints;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: updatedProfile, error: updateErr } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateErr) {
      console.error('Failed to update customer profile:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer profile updated successfully',
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error('Admin customer update error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) return auth.response!;

    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only full admins can delete customer accounts' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Safety: Prevent admin from deleting themselves
    if (auth.user?.id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account from customer directory' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Delete from auth.users (cascades to public.profiles)
    const { error: authDeleteErr } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteErr) {
      console.error('Failed to delete auth user:', authDeleteErr);
      // Fallback: delete profile row directly
      await adminClient.from('profiles').delete().eq('id', userId);
    }

    return NextResponse.json({
      success: true,
      message: 'Customer account deleted successfully',
    });
  } catch (err: any) {
    console.error('Admin customer delete error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
