import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_CONFIG, ServerConfig } from '@/lib/types';
import { broadcastConfigUpdate } from '@/lib/mqtt';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const configs = await db.appConfig.findMany();

    const configMap: Record<string, unknown> = {};
    for (const c of configs) {
      configMap[c.key] = JSON.parse(c.value);
    }

    const config: ServerConfig = {
      featureToggles: { ...DEFAULT_CONFIG.featureToggles, ...(configMap.featureToggles as Partial<ServerConfig['featureToggles']>) },
      homePageSections: (configMap.homePageSections as ServerConfig['homePageSections']) || DEFAULT_CONFIG.homePageSections,
      sidebarVisibility: { ...DEFAULT_CONFIG.sidebarVisibility, ...(configMap.sidebarVisibility as Partial<ServerConfig['sidebarVisibility']>) },
      bottomNavTabs: (configMap.bottomNavTabs as ServerConfig['bottomNavTabs']) || DEFAULT_CONFIG.bottomNavTabs,
      topBarElements: { ...DEFAULT_CONFIG.topBarElements, ...(configMap.topBarElements as Partial<ServerConfig['topBarElements']>) },
      cardStyle: (configMap.cardStyle as ServerConfig['cardStyle']) || DEFAULT_CONFIG.cardStyle,
      contentProtection: { ...DEFAULT_CONFIG.contentProtection, ...(configMap.contentProtection as Partial<ServerConfig['contentProtection']>) },
    };

    return NextResponse.json(config);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const config: ServerConfig = await req.json();

    const sections: Record<string, unknown> = {
      featureToggles: config.featureToggles,
      homePageSections: config.homePageSections,
      sidebarVisibility: config.sidebarVisibility,
      bottomNavTabs: config.bottomNavTabs,
      topBarElements: config.topBarElements,
      cardStyle: config.cardStyle,
      contentProtection: config.contentProtection,
    };

    for (const [key, value] of Object.entries(sections)) {
      await db.appConfig.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) },
      });
    }

    await broadcastConfigUpdate(config);

    const adminId = req.cookies.get('dakkho-admin-session')?.value || 'unknown';
    await logAudit(adminId, 'UPDATE_CONFIG', 'config', undefined, config);

    return NextResponse.json({ success: true, config });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
