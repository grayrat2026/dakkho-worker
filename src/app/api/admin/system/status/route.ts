import { NextResponse } from 'next/server';
import { checkR2Bucket } from '@/lib/r2';
import { R2_BUCKETS } from '@/lib/constants';
import { db } from '@/lib/db';

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!;
const APPWRITE_DB_ID = process.env.APPWRITE_DATABASE_ID!;

interface ServiceStatus {
  status: 'connected' | 'error' | 'limited';
  message?: string;
}

export async function GET() {
  try {
    const status: Record<string, unknown> = {};

    // --- Appwrite Health Check ---
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      };

      // Step 1: Try listing collections (needs databases.read + collections.read)
      const dbRes = await fetch(
        `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DB_ID}/collections`,
        { headers }
      );

      if (dbRes.ok) {
        const dbData = await dbRes.json().catch(() => ({}));
        const collectionCount = dbData?.total || 0;
        status.appwrite = { status: 'connected', message: `Database & auth working (${collectionCount} collections)` } as ServiceStatus;
      } else {
        // Step 2: Try health endpoint
        const healthRes = await fetch(`${APPWRITE_ENDPOINT}/health`, { headers });

        if (healthRes.ok) {
          status.appwrite = { status: 'limited', message: 'Server reachable but API key lacks database scopes' } as ServiceStatus;
        } else {
          // Step 3: Server unreachable or key completely invalid
          status.appwrite = {
            status: 'error',
            message: `API key unauthorized - missing scopes. Create a new key with: databases.read, databases.write, collections.read, collections.write, documents.read, documents.write, users.read, users.write, health.read`,
          } as ServiceStatus;
        }
      }
    } catch {
      status.appwrite = { status: 'error', message: 'Server unreachable' } as ServiceStatus;
    }

    // --- R2 Bucket Checks ---
    status.r2 = {};
    for (const [name, bucket] of Object.entries(R2_BUCKETS)) {
      try {
        const ok = await checkR2Bucket(bucket);
        (status.r2 as Record<string, ServiceStatus>)[name.toLowerCase()] = ok
          ? { status: 'connected', message: `Bucket "${bucket}" accessible` }
          : { status: 'error', message: `Bucket "${bucket}" not found or inaccessible` };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        (status.r2 as Record<string, ServiceStatus>)[name.toLowerCase()] = { status: 'error', message: msg };
      }
    }

    // --- Supabase Check ---
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error } = await supabase.auth.getSession();
      status.supabase = error
        ? { status: 'limited', message: error.message }
        : { status: 'connected', message: 'Edge functions & realtime working' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      status.supabase = { status: 'error', message: msg };
    }

    // --- Prisma/SQLite Check ---
    try {
      await db.appConfig.findFirst();
      status.prisma = { status: 'connected', message: 'Local database working' } as ServiceStatus;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      status.prisma = { status: 'error', message: msg } as ServiceStatus;
    }

    // --- MQTT Check ---
    try {
      const mqttResult = await checkMqttConnection();
      status.mqtt = mqttResult;
    } catch {
      status.mqtt = { status: 'error', message: 'Connection failed' };
    }

    return NextResponse.json(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function checkMqttConnection(): Promise<ServiceStatus> {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  const username = process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD;

  if (!brokerUrl || !username || !password) {
    return { status: 'error', message: 'MQTT credentials not configured in .env' };
  }

  return new Promise((resolve) => {
    import('mqtt').then(({ default: mqtt }) => {
      const client = mqtt.connect(brokerUrl, {
        username,
        password,
        protocolVersion: 4,
        connectTimeout: 5000,
        reconnectPeriod: 0,
      });

      const timeout = setTimeout(() => {
        client.end(true);
        resolve({ status: 'error', message: 'Connection timeout - check broker URL and credentials' });
      }, 6000);

      client.on('connect', () => {
        clearTimeout(timeout);
        client.end();
        resolve({ status: 'connected', message: 'MQTT broker connected' });
      });

      client.on('error', (err: Error) => {
        clearTimeout(timeout);
        client.end(true);
        const msg = err.message || 'Unknown error';
        if (msg.includes('Not authorized')) {
          resolve({ status: 'error', message: 'Authentication failed - check MQTT username & password in HiveMQ Cloud console' });
        } else {
          resolve({ status: 'error', message: msg });
        }
      });
    }).catch(() => {
      resolve({ status: 'error', message: 'mqtt package not available' });
    });
  });
}
