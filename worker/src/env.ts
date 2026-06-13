export interface Env {
  // R2 Buckets
  R2_VIDEOS: R2Bucket;
  R2_THUMBNAILS: R2Bucket;
  R2_AVATARS: R2Bucket;
  R2_RESOURCES: R2Bucket;

  // Workers KV
  KV_CONFIG: KVNamespace;

  // D1 Database
  DB: D1Database;

  // Environment Variables
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  RESEND_SUPPORT_EMAIL: string;
  ADMIN_SECRET_KEY: string;
  ENVIRONMENT: string;

  // OneSignal Push Notifications
  ONE_SIGNAL_APP_ID: string;
  ONE_SIGNAL_REST_API_KEY: string;

  // VAPID Web Push (RFC 8291 / RFC 8292)
  VAPID_PRIVATE_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_SUBJECT: string;

  // R2 Support Attachments
  R2_SUPPORT_ATTACHMENTS: R2Bucket;

  // SSLCommerz (optional - plug & play)
  SSLCOMMERZ_STORE_ID?: string;
  SSLCOMMERZ_STORE_PASSWORD?: string;

  // bKash (optional - plug & play)
  BKASH_USERNAME?: string;
  BKASH_PASSWORD?: string;
  BKASH_APP_KEY?: string;
  BKASH_APP_SECRET?: string;

  // PipraPay (optional - plug & play)
  PIPRAPAY_API_KEY?: string;
  PIPRAPAY_BASE_URL?: string;

  // LiveKit (server-side token generation)
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
}
