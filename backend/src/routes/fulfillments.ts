import { Router, Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { awardFulfillmentKarma, applyRatingKarma } from '../services/karma.service';
import { getIo } from '../sockets/fulfillment.socket';
import { notifyUser } from '../services/notification.service';
import { MediaType } from '@prisma/client';

const router = Router();

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// POST /requests/:id/fulfill
router.post(
  '/:id/fulfill',
  requireAuth,
  upload.single('media'),
  async (req: Request, res: Response) => {
    const requestId = req.params.id;
    const fulfillerId = req.user!.userId;

    if (!req.file) {
      res.status(400).json({ error: 'Media file is required' });
      return;
    }

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: { select: { id: true, username: true, expoPushToken: true } } },
    });
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (request.status !== 'OPEN') {
      res.status(400).json({ error: 'Request is no longer open' });
      return;
    }

    if (request.requesterId === fulfillerId) {
      res.status(400).json({ error: 'Cannot fulfill your own request' });
      return;
    }

    const mediaType: MediaType = IMAGE_TYPES.includes(req.file.mimetype) ? 'PHOTO' : 'VIDEO';
    const mediaUrl = `/api/v1/media/${req.file.filename}`;

    const fulfillment = await prisma.fulfillment.create({
      data: {
        requestId,
        fulfillerId,
        mediaUrl,
        mediaType,
        status: 'PENDING',
      },
      include: {
        fulfiller: { select: { id: true, username: true, karmaPoints: true } },
      },
    });

    // Award provisional karma
    await awardFulfillmentKarma(fulfillerId, fulfillment.id, mediaType);

    // Emit real-time event to the request room
    try {
      const io = getIo();
      io.to(`request:${requestId}`).emit('fulfillment:new', fulfillment);
    } catch {
      // Socket.io not available — not fatal
    }

    // Push notification to the requester
    if (request.requester.expoPushToken) {
      notifyUser(
        request.requester.expoPushToken,
        '📸 New fulfillment!',
        `Someone fulfilled your request "${request.title}"`,
        { requestId }
      ).catch(() => {}); // non-fatal
    }

    res.status(201).json(fulfillment);
  }
);

// GET /requests/:id/fulfillments
router.get('/:id/fulfillments', requireAuth, async (req: Request, res: Response) => {
  const requestId = req.params.id;
  const userId = req.user!.userId;

  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  if (request.requesterId !== userId) {
    res.status(403).json({ error: 'Only the requester can view fulfillments' });
    return;
  }

  const fulfillments = await prisma.fulfillment.findMany({
    where: { requestId },
    include: {
      fulfiller: { select: { id: true, username: true, karmaPoints: true } },
      rating: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(fulfillments);
});

// PUT /fulfillments/:id/status
router.put('/:id/status', requireAuth, async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };
  if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
    res.status(400).json({ error: 'status must be ACCEPTED or REJECTED' });
    return;
  }

  const fulfillment = await prisma.fulfillment.findUnique({
    where: { id: req.params.id },
    include: {
      request: true,
      fulfiller: { select: { expoPushToken: true } },
    },
  });

  if (!fulfillment) {
    res.status(404).json({ error: 'Fulfillment not found' });
    return;
  }

  if (fulfillment.request.requesterId !== req.user!.userId) {
    res.status(403).json({ error: 'Only the requester can accept/reject fulfillments' });
    return;
  }

  const updated = await prisma.fulfillment.update({
    where: { id: req.params.id },
    data: { status: status as 'ACCEPTED' | 'REJECTED' },
    include: {
      fulfiller: { select: { id: true, username: true, karmaPoints: true } },
      rating: true,
    },
  });

  // If accepted, mark the request as fulfilled
  if (status === 'ACCEPTED') {
    await prisma.request.update({
      where: { id: fulfillment.requestId },
      data: { status: 'FULFILLED' },
    });
  }

  // Emit status update
  try {
    const io = getIo();
    io.to(`request:${fulfillment.requestId}`).emit('fulfillment:updated', updated);
  } catch {
    // Not fatal
  }

  // Notify the fulfiller of the decision
  const fulfillerToken = fulfillment.fulfiller?.expoPushToken;
  if (fulfillerToken) {
    const accepted = status === 'ACCEPTED';
    notifyUser(
      fulfillerToken,
      accepted ? '✅ Fulfillment accepted!' : '❌ Fulfillment rejected',
      accepted
        ? `Your submission was accepted for "${fulfillment.request.title}"`
        : `Your submission was rejected for "${fulfillment.request.title}"`,
      { requestId: fulfillment.requestId }
    ).catch(() => {});
  }

  res.json(updated);
});

// POST /fulfillments/:id/rate
const rateSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(300).optional(),
});

router.post('/:id/rate', requireAuth, async (req: Request, res: Response) => {
  const parsed = rateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const fulfillment = await prisma.fulfillment.findUnique({
    where: { id: req.params.id },
    include: { request: true, rating: true },
  });

  if (!fulfillment) {
    res.status(404).json({ error: 'Fulfillment not found' });
    return;
  }

  if (fulfillment.request.requesterId !== req.user!.userId) {
    res.status(403).json({ error: 'Only the requester can rate fulfillments' });
    return;
  }

  if (fulfillment.rating) {
    res.status(409).json({ error: 'Already rated' });
    return;
  }

  const rating = await prisma.rating.create({
    data: {
      fulfillmentId: fulfillment.id,
      raterId: req.user!.userId,
      score: parsed.data.score,
      comment: parsed.data.comment,
    },
  });

  // Apply karma adjustment
  await applyRatingKarma(fulfillment.fulfillerId, fulfillment.id, parsed.data.score);

  res.status(201).json(rating);
});

export default router;
