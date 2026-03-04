import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { redis } from '../config/redis';
import { env } from '../config/env';

const expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });

const DEDUP_TTL_SECONDS = 48 * 60 * 60; // 48 hours

export async function notifyNearbyUsers(
  requestId: string,
  userIds: string[],
  pushTokens: (string | null)[],
  title: string,
  body: string
): Promise<void> {
  const messages: ExpoPushMessage[] = [];
  const notifiedUserIds: string[] = [];

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const token = pushTokens[i];

    if (!token || !Expo.isExpoPushToken(token)) continue;

    // Dedup check
    const dedupKey = `notified:request:${requestId}:user:${userId}`;
    const already = await redis.get(dedupKey);
    if (already) continue;

    messages.push({
      to: token,
      sound: 'default',
      title,
      body,
      data: { requestId },
    });

    notifiedUserIds.push(userId);
  }

  if (messages.length === 0) return;

  // Fire notifications
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (err) {
      console.error('Expo push error:', err);
    }
  }

  // Set dedup keys for successfully notified users
  const pipeline = redis.pipeline();
  for (const userId of notifiedUserIds) {
    const dedupKey = `notified:request:${requestId}:user:${userId}`;
    pipeline.setex(dedupKey, DEDUP_TTL_SECONDS, '1');
  }
  await pipeline.exec();

  console.log(`Sent ${messages.length} push notifications for request ${requestId}`);
}

export async function notifyUser(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  if (!Expo.isExpoPushToken(pushToken)) return;
  try {
    await expo.sendPushNotificationsAsync([{ to: pushToken, sound: 'default', title, body, data }]);
  } catch (err) {
    console.error('Expo push error:', err);
  }
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  if (!Expo.isExpoPushToken(token)) {
    throw new Error('Invalid Expo push token');
  }
  const { prisma } = await import('../config/prisma');
  await prisma.user.update({
    where: { id: userId },
    data: { expoPushToken: token },
  });
}
