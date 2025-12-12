import prisma from '../lib/prisma';
import { sendEvent } from './realtime';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

export const createNotification = async ({
  userId,
  type,
  title,
  body,
  link,
}: CreateNotificationParams) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        link,
      },
    });

    // SSE 전송
    sendEvent(userId, {
      type: 'notification',
      payload: notification,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

