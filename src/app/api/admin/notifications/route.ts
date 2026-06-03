import { NextRequest, NextResponse } from 'next/server';
import { appwriteRest, Query } from '@/lib/appwrite-server';
import { APPWRITE_COLLECTIONS } from '@/lib/constants';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId') || '';

    const queries: string[] = [Query.limit(limit), Query.offset((page - 1) * limit), Query.orderDesc('$createdAt')];
    if (userId) queries.push(Query.equal('userId', userId));

    const result = await appwriteRest.listDocuments(APPWRITE_COLLECTIONS.NOTIFICATIONS, queries);

    return NextResponse.json({ documents: result.documents, total: result.total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { targetAll, targetUserId, targetInstitute, ...notificationData } = data;

    const created: unknown[] = [];

    if (targetAll) {
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const usersResult = await appwriteRest.listDocuments(APPWRITE_COLLECTIONS.USERS, [
          Query.limit(limit),
          Query.offset(offset),
        ]);

        for (const user of usersResult.documents) {
          const doc = await appwriteRest.createDocument(APPWRITE_COLLECTIONS.NOTIFICATIONS, '', {
            ...notificationData,
            userId: user.$id,
          });
          created.push(doc);
        }

        offset += limit;
        hasMore = usersResult.documents.length === limit;
      }
    } else if (targetInstitute) {
      const usersResult = await appwriteRest.listDocuments(APPWRITE_COLLECTIONS.USERS, [
        Query.equal('institute', targetInstitute),
        Query.limit(500),
      ]);

      for (const user of usersResult.documents) {
        const doc = await appwriteRest.createDocument(APPWRITE_COLLECTIONS.NOTIFICATIONS, '', {
          ...notificationData,
          userId: user.$id,
        });
        created.push(doc);
      }
    } else if (targetUserId) {
      const doc = await appwriteRest.createDocument(APPWRITE_COLLECTIONS.NOTIFICATIONS, '', {
        ...notificationData,
        userId: targetUserId,
      });
      created.push(doc);
    }

    const adminId = req.cookies.get('dakkho-admin-session')?.value || 'unknown';
    await logAudit(adminId, 'SEND_NOTIFICATION', 'notifications', undefined, { targetAll, targetUserId, targetInstitute, count: created.length });

    return NextResponse.json({ created, count: created.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
