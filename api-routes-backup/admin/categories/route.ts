import { NextRequest, NextResponse } from 'next/server';
import { appwriteRest, Query } from '@/lib/appwrite-server';
import { APPWRITE_COLLECTIONS } from '@/lib/constants';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await appwriteRest.listDocuments(APPWRITE_COLLECTIONS.CATEGORIES, [
      Query.limit(limit),
      Query.orderAsc('sort_order'),
    ]);

    return NextResponse.json({ documents: result.documents, total: result.total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const result = await appwriteRest.createDocument(APPWRITE_COLLECTIONS.CATEGORIES, '', data);

    const adminId = req.cookies.get('dakkho-admin-session')?.value || 'unknown';
    await logAudit(adminId, 'CREATE_CATEGORY', 'categories', result.$id, data);

    return NextResponse.json({ document: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { categoryId, ...updates } = data;
    if (!categoryId) return NextResponse.json({ error: 'Category ID required' }, { status: 400 });

    const result = await appwriteRest.updateDocument(APPWRITE_COLLECTIONS.CATEGORIES, categoryId, updates);

    const adminId = req.cookies.get('dakkho-admin-session')?.value || 'unknown';
    await logAudit(adminId, 'UPDATE_CATEGORY', 'categories', categoryId, updates);

    return NextResponse.json({ document: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('id');
    if (!categoryId) return NextResponse.json({ error: 'Category ID required' }, { status: 400 });

    await appwriteRest.deleteDocument(APPWRITE_COLLECTIONS.CATEGORIES, categoryId);

    const adminId = req.cookies.get('dakkho-admin-session')?.value || 'unknown';
    await logAudit(adminId, 'DELETE_CATEGORY', 'categories', categoryId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
