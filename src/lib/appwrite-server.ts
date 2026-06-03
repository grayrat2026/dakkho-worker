import { Client, Databases, Query, ID } from 'node-appwrite';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;
const DB_ID = process.env.APPWRITE_DATABASE_ID!;

// Server client with API key (may not work if key lacks proper scopes)
const client = new Client();
client
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

export const databases = new Databases(client);
export const dbId = DB_ID;
export { client, Query, ID };

/**
 * Appwrite REST API helper
 * Uses direct fetch calls with the server API key.
 * This is more reliable than the SDK when API key auth has issues.
 */
export const appwriteRest = {
  async listDocuments(collectionId: string, queries: string[] = []) {
    const params = new URLSearchParams();
    queries.forEach(q => params.append('queries[]', q));

    const res = await fetch(
      `${ENDPOINT}/databases/${DB_ID}/collections/${collectionId}/documents?${params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `Failed to list documents from ${collectionId}`);
    }

    return res.json();
  },

  async getDocument(collectionId: string, documentId: string) {
    const res = await fetch(
      `${ENDPOINT}/databases/${DB_ID}/collections/${collectionId}/documents/${documentId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to get document');
    }

    return res.json();
  },

  async createDocument(collectionId: string, documentId: string, data: Record<string, unknown>) {
    const res = await fetch(
      `${ENDPOINT}/databases/${DB_ID}/collections/${collectionId}/documents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY,
        },
        body: JSON.stringify({
          documentId: documentId || ID.unique(),
          data,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create document');
    }

    return res.json();
  },

  async updateDocument(collectionId: string, documentId: string, data: Record<string, unknown>) {
    const res = await fetch(
      `${ENDPOINT}/databases/${DB_ID}/collections/${collectionId}/documents/${documentId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY,
        },
        body: JSON.stringify({ data }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to update document');
    }

    return res.json();
  },

  async deleteDocument(collectionId: string, documentId: string) {
    const res = await fetch(
      `${ENDPOINT}/databases/${DB_ID}/collections/${collectionId}/documents/${documentId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to delete document');
    }

    return true;
  },

  async healthCheck() {
    try {
      const res = await fetch(`${ENDPOINT}/health`, {
        headers: {
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
