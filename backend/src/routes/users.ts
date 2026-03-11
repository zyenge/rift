import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { requireAuth } from '../middleware/auth';

const router = Router();

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// GET /users/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      username: true,
      credits: true,
      lastKnownLat: true,
      lastKnownLng: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

// PUT /users/me/location
router.put('/me/location', requireAuth, async (req: Request, res: Response) => {
  const parsed = locationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { lat, lng } = parsed.data;
  const userId = req.user!.userId;
  const now = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: { lastKnownLat: lat, lastKnownLng: lng, lastSeenAt: now },
  });

  // Cache in Redis with 10min TTL
  await redis.setex(
    `user:location:${userId}`,
    600,
    JSON.stringify({ lat, lng, updatedAt: now.toISOString() })
  );

  res.json({ success: true });
});

export default router;
