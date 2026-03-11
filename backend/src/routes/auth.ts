import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { savePushToken } from '../services/notification.service';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, username, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    res.status(409).json({ error: 'Email or username already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, username, passwordHash },
    select: { id: true, email: true, username: true, credits: true },
  });

  const token = signToken(user.id, user.email);
  res.status(201).json({ token, user });
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken(user.id, user.email);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      credits: user.credits,
    },
  });
});

// POST /auth/push-token
router.post('/push-token', requireAuth, async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: 'token is required' });
    return;
  }

  try {
    await savePushToken(req.user!.userId, token);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
