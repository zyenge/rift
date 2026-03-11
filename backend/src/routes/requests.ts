import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { findNearbyActiveUsers, findNearbyRequests } from '../services/geo.service';
import { notifyNearbyUsers } from '../services/notification.service';
import { calculateRequestCost, deductCredits, refundCredits } from '../services/credit.service';

const router = Router();

const createRequestSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['INSTANT', 'GLOBAL']).default('INSTANT'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(100).max(50000).optional(),
});

// GET /requests/cost?lat&lng — preview credit cost before submitting
router.get('/cost', requireAuth, async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng query params are required' });
    return;
  }

  const cost = await calculateRequestCost(lat, lng, req.user!.userId);
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { credits: true },
  });

  res.json({ cost, balance: user?.credits ?? 0 });
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

  const radius = radiusMeters ?? (type === 'INSTANT' ? 1000 : 10000);
  const expiresAt = new Date(
    Date.now() + (type === 'INSTANT' ? 15 * 60 * 1000 : 48 * 60 * 60 * 1000)
  );

  // Calculate cost based on local density, then deduct
  const creditCost = await calculateRequestCost(lat, lng, requesterId);
  try {
    await deductCredits(requesterId, creditCost);
  } catch {
    res.status(402).json({ error: 'Insufficient credits' });
    return;
  }

  const request = await prisma.request.create({
    data: {
      requesterId,
      title,
      description,
      type,
      lat,
      lng,
      radiusMeters: radius,
      creditCost,
      expiresAt,
    },
    include: {
      requester: { select: { id: true, username: true, credits: true } },
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
          `${creditCost} credits up for grabs. Tap to fulfill!`
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
      requester: { select: { id: true, username: true, credits: true } },
      fulfillments: {
        include: {
          fulfiller: { select: { id: true, username: true, credits: true } },
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

// DELETE /requests/:id — cancel and refund
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

  if (request.creditCost > 0) {
    await refundCredits(request.requesterId, request.creditCost);
  }

  res.json({ success: true });
});

export default router;
