# Task: Migrate Appwrite SDK to REST API Helper

## Summary
Migrated all API route files under `/src/app/api/admin/` from using the `node-appwrite` SDK's `databases` object to the custom `appwriteRest` REST API helper. This resolves 401 errors caused by the Appwrite API key lacking proper SDK scopes.

## Files Modified

### 1. `/src/app/api/admin/users/route.ts`
- Import: `databases, dbId, Query` → `appwriteRest, Query`
- `queries` type: `unknown[]` → `string[]`
- `databases.listDocuments(dbId, COLLECTION, queries)` → `appwriteRest.listDocuments(COLLECTION, queries)`
- `databases.updateDocument(dbId, COLLECTION, id, data)` → `appwriteRest.updateDocument(COLLECTION, id, data)`
- `databases.deleteDocument(dbId, COLLECTION, id)` → `appwriteRest.deleteDocument(COLLECTION, id)`

### 2. `/src/app/api/admin/courses/route.ts`
- Import: `databases, dbId, Query, ID` → `appwriteRest, Query`
- `queries` type: `unknown[]` → `string[]`
- All SDK calls migrated, `ID` import removed (unused after migration)

### 3. `/src/app/api/admin/videos/route.ts`
- Import: `databases, dbId, Query, ID` → `appwriteRest, Query`
- `queries` type: `unknown[]` → `string[]`
- All SDK calls migrated, `ID` import removed

### 4. `/src/app/api/admin/instructors/route.ts`
- Import: `databases, dbId, Query, ID` → `appwriteRest, Query`
- `queries` type: `unknown[]` → `string[]`
- All SDK calls migrated, `ID` import removed

### 5. `/src/app/api/admin/institutes/route.ts`
- Import: `databases, dbId, Query, ID` → `appwriteRest, Query`
- `queries` type: `unknown[]` → `string[]`
- All SDK calls migrated, `ID` import removed

### 6. `/src/app/api/admin/categories/route.ts`
- Import: `databases, dbId, Query, ID` → `appwriteRest, Query`
- All SDK calls migrated, `ID` import removed

### 7. `/src/app/api/admin/notifications/route.ts`
- Import: `databases, dbId, Query, ID` → `appwriteRest, Query`
- `queries` type: `unknown[]` → `string[]`
- All SDK calls migrated including nested loops for targetAll/targetInstitute
- `ID` import removed

### 8. `/src/app/api/admin/analytics/route.ts`
- Import: `databases, dbId, Query` → `appwriteRest, Query`
- All 6 `databases.listDocuments` calls migrated
- Includes Promise.all batch queries and individual sequential queries

### 9. `/src/app/api/admin/system/status/route.ts`
- Import: `databases, dbId, Query` → `appwriteRest`
- Replaced `databases.listDocuments(dbId, 'users', [Query.limit(1)])` health check with `appwriteRest.healthCheck()`

## Files NOT Modified (no SDK usage)
- `/src/app/api/admin/auth/route.ts` - Uses REST fetch directly + Prisma
- `/src/app/api/admin/auth/check/route.ts` - Uses Prisma only
- `/src/app/api/admin/config/route.ts` - Uses Prisma only
- `/src/app/api/admin/upload/route.ts` - Uses R2 storage only

## Key Pattern Changes
| Old (SDK) | New (REST) |
|-----------|------------|
| `databases.listDocuments(dbId, collectionId, queries)` | `appwriteRest.listDocuments(collectionId, queries)` |
| `databases.createDocument(dbId, collectionId, ID.unique(), data)` | `appwriteRest.createDocument(collectionId, '', data)` |
| `databases.updateDocument(dbId, collectionId, docId, data)` | `appwriteRest.updateDocument(collectionId, docId, data)` |
| `databases.deleteDocument(dbId, collectionId, docId)` | `appwriteRest.deleteDocument(collectionId, docId)` |

## Verification
- `bun run lint` passes with zero errors
- No remaining references to `databases.listDocuments`, `databases.createDocument`, `databases.updateDocument`, `databases.deleteDocument`, or `dbId` in any admin route file
