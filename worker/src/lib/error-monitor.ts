/**
 * Error Monitoring for DAKKHO Worker API
 * Uses KV for structured error logging with TTL-based auto-cleanup
 */

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  error: string;
  message: string;
  stack?: string;
  route: string;
  method: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

const ERROR_TTL = 7 * 24 * 60 * 60; // 7 days
const MAX_ERRORS_PER_KEY = 50;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log an error to KV for monitoring
 */
export async function logError(
  kv: KVNamespace,
  params: {
    error: unknown;
    route: string;
    method: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    statusCode?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const entry: ErrorLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      error: params.error instanceof Error ? params.error.constructor.name : 'UnknownError',
      message: params.error instanceof Error ? params.error.message : String(params.error),
      stack: params.error instanceof Error ? params.error.stack : undefined,
      route: params.route,
      method: params.method,
      userId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      statusCode: params.statusCode,
      metadata: params.metadata,
    };

    const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const kvKey = `errors:${dateKey}`;
    
    // Get existing errors for today
    const existing = await kv.get(kvKey, 'json') as ErrorLogEntry[] | null;
    const errors = existing || [];
    
    // Add new error (prepend for newest-first)
    errors.unshift(entry);
    
    // Keep only the most recent MAX_ERRORS_PER_KEY
    const trimmed = errors.slice(0, MAX_ERRORS_PER_KEY);
    
    await kv.put(kvKey, JSON.stringify(trimmed), { expirationTtl: ERROR_TTL });
  } catch (logErr) {
    // Error logging should never fail the request
    console.error('Failed to log error:', logErr);
  }
}

/**
 * Get error logs from KV
 */
export async function getErrorLogs(
  kv: KVNamespace,
  params?: {
    date?: string; // YYYY-MM-DD format
    limit?: number;
  }
): Promise<{ errors: ErrorLogEntry[]; date: string }> {
  const date = params?.date || new Date().toISOString().split('T')[0];
  const kvKey = `errors:${date}`;
  
  const errors = await kv.get(kvKey, 'json') as ErrorLogEntry[] | null;
  const limit = params?.limit || 50;
  
  return {
    errors: (errors || []).slice(0, limit),
    date,
  };
}

/**
 * Get error summary for the last N days
 */
export async function getErrorSummary(
  kv: KVNamespace,
  days: number = 7
): Promise<{ date: string; count: number; topErrors: { error: string; count: number }[] }[]> {
  const summary = [];
  const now = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split('T')[0];
    const kvKey = `errors:${dateKey}`;
    
    const errors = await kv.get(kvKey, 'json') as ErrorLogEntry[] | null;
    const errorList = errors || [];
    
    // Count by error type
    const errorCounts: Record<string, number> = {};
    for (const err of errorList) {
      errorCounts[err.error] = (errorCounts[err.error] || 0) + 1;
    }
    
    const topErrors = Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));
    
    summary.push({
      date: dateKey,
      count: errorList.length,
      topErrors,
    });
  }
  
  return summary;
}
