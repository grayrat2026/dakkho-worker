import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get('dakkho-admin-session')?.value;

    if (!sessionId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await db.adminSession.findUnique({ where: { userId: sessionId } });

    if (!session || new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: session.userId, email: session.email, name: session.name, role: session.role },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
