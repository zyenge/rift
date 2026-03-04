import { prisma } from '../config/prisma';

export interface NearbyUser {
  id: string;
  expoPushToken: string | null;
}

/**
 * Find users who were active in the last 30 minutes and are within
 * radiusMeters of (lat, lng) using PostGIS ST_DWithin.
 */
export async function findNearbyActiveUsers(
  lat: number,
  lng: number,
  radiusMeters: number,
  excludeUserId: string
): Promise<NearbyUser[]> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const result = await prisma.$queryRaw<NearbyUser[]>`
    SELECT u.id, u."expoPushToken"
    FROM users u
    WHERE u.id != ${excludeUserId}
      AND u."lastSeenAt" > ${thirtyMinutesAgo}
      AND u."lastKnownLat" IS NOT NULL
      AND u."lastKnownLng" IS NOT NULL
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(u."lastKnownLng", u."lastKnownLat"), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
  `;

  return result;
}

/**
 * Find open requests near a location (for the map feed).
 */
export async function findNearbyRequests(lat: number, lng: number, radiusMeters: number) {
  const result = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      description: string | null;
      type: string;
      status: string;
      lat: number;
      lng: number;
      radiusMeters: number;
      expiresAt: Date;
      createdAt: Date;
      requesterId: string;
      requesterUsername: string;
      distance: number;
    }>
  >`
    SELECT
      r.id, r.title, r.description, r.type, r.status,
      r.lat, r.lng, r."radiusMeters", r."expiresAt", r."createdAt",
      r."requesterId", u.username AS "requesterUsername",
      ST_Distance(
        ST_SetSRID(ST_MakePoint(r.lng, r.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) AS distance
    FROM requests r
    JOIN users u ON u.id = r."requesterId"
    WHERE r.status = 'OPEN'
      AND r."expiresAt" > NOW()
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(r.lng, r.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
    ORDER BY distance ASC
  `;

  return result;
}
