import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Step 1: Create email session via Appwrite REST API
    const sessionRes = await fetch(`${APPWRITE_ENDPOINT}/account/sessions/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!sessionRes.ok) {
      const errData = await sessionRes.json();
      return NextResponse.json(
        { error: errData.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Step 2: Extract session cookie from response
    const setCookieHeaders = sessionRes.headers.getSetCookie?.() || [];
    let sessionCookie = '';

    for (const cookie of setCookieHeaders) {
      if (cookie.includes(`a_session_${APPWRITE_PROJECT}=`) && !cookie.includes('legacy')) {
        const match = cookie.match(new RegExp(`a_session_${APPWRITE_PROJECT}=([^;]+)`));
        if (match) {
          sessionCookie = match[1];
        }
      }
    }

    // Also check x-fallback-cookies header
    if (!sessionCookie) {
      const fallbackCookies = sessionRes.headers.get('x-fallback-cookies');
      if (fallbackCookies) {
        try {
          const parsed = JSON.parse(fallbackCookies);
          sessionCookie = parsed[`a_session_${APPWRITE_PROJECT}`] || '';
        } catch {}
      }
    }

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Failed to establish session' },
        { status: 500 }
      );
    }

    // Step 3: Get account info using the session cookie
    const accountRes = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT,
        'Cookie': `a_session_${APPWRITE_PROJECT}=${sessionCookie}`,
      },
    });

    if (!accountRes.ok) {
      return NextResponse.json(
        { error: 'Failed to get account info' },
        { status: 500 }
      );
    }

    const user = await accountRes.json();

    // Step 4: Check admin role from preferences
    const userPrefs = user.prefs || {};

    if (userPrefs?.role !== 'admin') {
      // Delete the Appwrite session
      try {
        await fetch(`${APPWRITE_ENDPOINT}/account/sessions/current`, {
          method: 'DELETE',
          headers: {
            'X-Appwrite-Project': APPWRITE_PROJECT,
            'Cookie': `a_session_${APPWRITE_PROJECT}=${sessionCookie}`,
          },
        });
      } catch {}
      return NextResponse.json(
        { error: 'Access denied. Admin role required. Your account does not have admin privileges.' },
        { status: 403 }
      );
    }

    // Step 5: Create admin session in local database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.adminSession.upsert({
      where: { userId: user.$id },
      update: { email: user.email, name: user.name, role: 'admin', expiresAt },
      create: { userId: user.$id, email: user.email, name: user.name, role: 'admin', expiresAt },
    });

    // Step 6: Delete the Appwrite session (we use our own cookie-based auth)
    try {
      await fetch(`${APPWRITE_ENDPOINT}/account/sessions/current`, {
        method: 'DELETE',
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT,
          'Cookie': `a_session_${APPWRITE_PROJECT}=${sessionCookie}`,
        },
      });
    } catch {}

    // Step 7: Set admin session cookie and return success
    const response = NextResponse.json({
      success: true,
      user: { id: user.$id, email: user.email, name: user.name, role: 'admin' },
    });

    response.cookies.set('dakkho-admin-session', user.$id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    console.error('Login error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('dakkho-admin-session', '', { maxAge: 0, path: '/' });
  return response;
}
