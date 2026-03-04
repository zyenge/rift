import { prisma } from '../config/prisma';
import { MediaType } from '@prisma/client';

const KARMA_PHOTO = 10;
const KARMA_VIDEO = 15;
const KARMA_BONUS_GOOD_RATING = 5;  // rating >= 4
const KARMA_PENALTY_BAD_RATING = -2; // rating <= 2

export async function awardFulfillmentKarma(
  fulfillerId: string,
  fulfillmentId: string,
  mediaType: MediaType
): Promise<number> {
  const points = mediaType === 'VIDEO' ? KARMA_VIDEO : KARMA_PHOTO;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: fulfillerId },
      data: { karmaPoints: { increment: points } },
    }),
    prisma.fulfillment.update({
      where: { id: fulfillmentId },
      data: { karmaAwarded: points },
    }),
  ]);

  return points;
}

export async function applyRatingKarma(
  fulfillerId: string,
  fulfillmentId: string,
  score: number
): Promise<void> {
  let delta = 0;
  if (score >= 4) delta = KARMA_BONUS_GOOD_RATING;
  else if (score <= 2) delta = KARMA_PENALTY_BAD_RATING;
  else return; // score 3 — no change

  if (delta !== 0) {
    // Ensure karma never goes below 0
    if (delta < 0) {
      const user = await prisma.user.findUnique({
        where: { id: fulfillerId },
        select: { karmaPoints: true },
      });
      if (user && user.karmaPoints + delta < 0) {
        delta = -user.karmaPoints; // floor at 0
      }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: fulfillerId },
        data: { karmaPoints: { increment: delta } },
      }),
      prisma.fulfillment.update({
        where: { id: fulfillmentId },
        data: { karmaAwarded: { increment: delta } },
      }),
    ]);
  }
}
