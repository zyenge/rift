import { prisma } from '../config/prisma';

// 0.75 miles in meters
const DENSITY_RADIUS_METERS = 1207;
const PLATFORM_CUT = 0.2;

// Credit tiers based on nearby active user count
function tierFromDensity(nearbyCount: number): number {
  if (nearbyCount === 0) return 10;
  if (nearbyCount <= 5) return 8;
  if (nearbyCount <= 15) return 6;
  if (nearbyCount <= 30) return 4;
  return 2;
}

export async function calculateRequestCost(
  lat: number,
  lng: number,
  excludeUserId: string
): Promise<number> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count
    FROM users u
    WHERE u.id != ${excludeUserId}
      AND u."lastSeenAt" > ${thirtyMinutesAgo}
      AND u."lastKnownLat" IS NOT NULL
      AND u."lastKnownLng" IS NOT NULL
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(u."lastKnownLng", u."lastKnownLat"), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${DENSITY_RADIUS_METERS}
      )
  `;

  return tierFromDensity(Number(count));
}

export async function deductCredits(userId: string, amount: number): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  if (!user || user.credits < amount) {
    throw new Error('Insufficient credits');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: amount } },
  });
}

export async function awardCredits(userId: string, amount: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
}

export async function refundCredits(userId: string, amount: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
}

/** Returns how many credits the fulfiller earns (platform keeps 20%). */
export function fulfillerPayout(creditCost: number): number {
  return Math.floor(creditCost * (1 - PLATFORM_CUT));
}
