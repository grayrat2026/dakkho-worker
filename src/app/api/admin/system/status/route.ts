import { NextResponse } from 'next/server';
import { appwriteRest } from '@/lib/appwrite-server';
import { checkR2Bucket } from '@/lib/r2';
import { R2_BUCKETS } from '@/lib/constants';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const status: Record<string, unknown> = {};

    try {
      const healthy = await appwriteRest.healthCheck();
      status.appwrite = healthy ? 'connected' : 'error';
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      status.appwrite = `error: ${message}`;
    }

    status.r2 = {};
    for (const [name, bucket] of Object.entries(R2_BUCKETS)) {
      (status.r2 as Record<string, unknown>)[name.toLowerCase()] = await checkR2Bucket(bucket) ? 'connected' : 'error';
    }

    try {
      const { error } = await supabase.auth.getSession();
      status.supabase = error ? 'limited' : 'connected';
    } catch {
      status.supabase = 'error';
    }

    try {
      await db.appConfig.findFirst();
      status.prisma = 'connected';
    } catch {
      status.prisma = 'error';
    }

    return NextResponse.json(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
