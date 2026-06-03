import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey || !apiKey.startsWith('standard_')) {
      return NextResponse.json(
        { error: 'Invalid API key format. Must start with "standard_"' },
        { status: 400 }
      );
    }

    // Update the .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = readFileSync(envPath, 'utf-8');

    // Replace the APPWRITE_API_KEY line
    envContent = envContent.replace(
      /APPWRITE_API_KEY=.*/,
      `APPWRITE_API_KEY=${apiKey}`
    );

    await writeFile(envPath, envContent, 'utf-8');

    const adminId = req.cookies.get('dakkho-admin-session')?.value || 'unknown';
    await logAudit(adminId, 'UPDATE_API_KEY', 'system', undefined, { keyPrefix: apiKey.substring(0, 20) + '...' });

    return NextResponse.json({
      success: true,
      message: 'API key updated. Please restart the server for changes to take effect.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update API key';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
