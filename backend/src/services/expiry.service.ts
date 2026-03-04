import cron from 'node-cron';
import { prisma } from '../config/prisma';

export function startExpiryJob(): void {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      const result = await prisma.request.updateMany({
        where: {
          status: 'OPEN',
          expiresAt: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
      });

      if (result.count > 0) {
        console.log(`[Expiry] Marked ${result.count} requests as EXPIRED`);
      }
    } catch (err) {
      console.error('[Expiry] Job failed:', err);
    }
  });

  console.log('[Expiry] Cron job started (every 2 minutes)');
}
