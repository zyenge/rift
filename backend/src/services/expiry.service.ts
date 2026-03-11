import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { refundCredits } from './credit.service';

export function startExpiryJob(): void {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      // Find open requests that have expired
      const expired = await prisma.request.findMany({
        where: {
          status: 'OPEN',
          expiresAt: { lt: new Date() },
        },
        select: { id: true, requesterId: true, creditCost: true },
      });

      if (expired.length === 0) return;

      // Mark all as EXPIRED
      await prisma.request.updateMany({
        where: { id: { in: expired.map((r) => r.id) } },
        data: { status: 'EXPIRED' },
      });

      // Refund credits to requesters
      for (const request of expired) {
        if (request.creditCost > 0) {
          await refundCredits(request.requesterId, request.creditCost).catch((err) =>
            console.error(`[Expiry] Refund failed for request ${request.id}:`, err)
          );
        }
      }

      console.log(`[Expiry] Marked ${expired.length} requests as EXPIRED, refunded credits`);
    } catch (err) {
      console.error('[Expiry] Job failed:', err);
    }
  });

  console.log('[Expiry] Cron job started (every 2 minutes)');
}
