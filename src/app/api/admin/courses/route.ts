import { NextRequest, NextResponse } from 'next/server';
import { appwriteRest, Query } from '@/lib/appwrite-server';
import { APPWRITE_COLLECTIONS } from '@/lib/constants';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const level = searchParams.get('level') || '';
    const published = searchParams.get('published') || '';
    const featured = searchParams.get('featured') || '';

    const queries: string[] = [];
    if (search) queries.push(Query.search('title', search));
    if (level) queries.push(Query.equal('level', level));
    if (published === 'true') queries.push(Query.equal('isPublished', true));
    if (published === 'false') queries.push(Query.equal('isPublished', false));
    if (featured === 'true') queries.push(Query.equal('isFeatured', true));

    queries.push(Query.limit(limit));
    queries.push(Query.offset((page - 1) * limit));
    queries.push(Query.orderDesc('$createdAt'));

    const result = await appwriteRest.listDocuments(APPWRITE_COLLECTIONS.COURSES, queries);

    return NextResponse.json({ documents: result.documents, total: result.total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const result = await appwriteRest.createDocument(APPWRITE_COLLECTIONS.COURSES, '', data);

    const adminId = req.cookies.get('dakkho-admin-session')?.value || 'unknown';
    await logAudit(adminId, 'CREATE_COURSE', 'courses', result.$id, data);

    return NextResponse.json({ document: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { courseId, ...updates } = data;

    if (!courseId) return NextResponse.json({ error: 'Course ID required' }, { status: 400 });

    const result = await appwriteRest.updateDocument(APPWRITE_COLLECTIONS.COURSES, courseId, updates);

    const adminId = req.cookies.get('dakkho-admin-session')?.value || 'unknown';
    await logAudit(adminId, 'UPDATE_COURSE', 'courses', courseId, updates);

    return NextResponse.json({ document: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('id');

    if (!courseId) return NextResponse.json({ error: 'Course ID required' }, { status: 400 });

    await appwriteRest.deleteDocument(APPWRITE_COLLECTIONS.COURSES, courseId);

    const adminId = req.cookies.get('dakkho-admin-session')?.value || 'unknown';
    await logAudit(adminId, 'DELETE_COURSE', 'courses', courseId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
