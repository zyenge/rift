import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { findNearbyActiveUsers, findNearbyRequests } from '../services/geo.service';
import { notifyNearbyUsers } from '../services/notification.service';

const router = Router();

const createRequestSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['INSTANT', 'GLOBAL']).default('INSTANT'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(100).max(50000).optional(),
});

// POST /requests
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { title, description, type, lat, lng, radiusMeters } = parsed.data;
  const requesterId = req.user!.userId;

  // Determine radius and expiry based on type
  const radius = radiusMeters ?? (type === 'INSTANT' ? 1000 : 10000);
  const expiresAt = new Date(
    Date.now() + (type === 'INSTANT' ? 15 * 60 * 1000 : 48 * 60 * 60 * 1000)
  );

  const request = await prisma.request.create({
    data: {
      requesterId,
      title,
      description,
      type,
      lat,
      lng,
      radiusMeters: radius,
      expiresAt,
    },
    include: {
      requester: { select: { id: true, username: true, karmaPoints: true } },
    },
  });

  // Geo query + push notifications (async, don't await)
  (async () => {
    try {
      const nearbyUsers = await findNearbyActiveUsers(lat, lng, radius, requesterId);
      if (nearbyUsers.length > 0) {
        await notifyNearbyUsers(
          request.id,
          nearbyUsers.map((u) => u.id),
          nearbyUsers.map((u) => u.expoPushToken),
          `📍 New Rift nearby: ${title}`,
          `Someone needs a ${type === 'INSTANT' ? 'quick' : 'global'} shot. Tap to fulfill!`
        );
      }
    } catch (err) {
      console.error('[Requests] Notification error:', err);
    }
  })();

  res.status(201).json(request);
});

// GET /requests?lat&lng&radius
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseInt(req.query.radius as string) || 5000;

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng query params are required' });
    return;
  }

  const requests = await findNearbyRequests(lat, lng, radius);
  res.json(requests);
});

// GET /requests/mine
router.get('/mine', requireAuth, async (req: Request, res: Response) => {
  const requests = await prisma.request.findMany({
    where: { requesterId: req.user!.userId },
    include: {
      fulfillments: {
        select: { id: true, status: true, mediaType: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

// GET /requests/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const request = await prisma.request.findUnique({
    where: { id: req.params.id },
    include: {
      requester: { select: { id: true, username: true, karmaPoints: true } },
      fulfillments: {
        include: {
          fulfiller: { select: { id: true, username: true, karmaPoints: true } },
          rating: true,
        },
      },
    },
  });

  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  res.json(request);
});

// DELETE /requests/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const request = await prisma.request.findUnique({
    where: { id: req.params.id },
  });

  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  if (request.requesterId !== req.user!.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (request.status !== 'OPEN') {
    res.status(400).json({ error: 'Only OPEN requests can be cancelled' });
    return;
  }

  await prisma.request.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
  });

  res.json({ success: true });
});

export default router;
