import { Response } from 'express';
import prisma from '../lib/prisma';

type SSEClient = {
  userId: string;
  res: Response;
};

const clients: Map<string, Set<Response>> = new Map();

export const addClient = (userId: string, res: Response) => {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(res);
};

export const removeClient = (userId: string, res: Response) => {
  const set = clients.get(userId);
  if (set) {
    set.delete(res);
    if (set.size === 0) {
      clients.delete(userId);
    }
  }
};

export const sendEvent = (userId: string, event: any) => {
  const set = clients.get(userId);
  if (!set) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) {
    res.write(data);
  }
};

export const broadcastToUsers = (userIds: Iterable<string>, event: any) => {
  for (const uid of userIds) {
    sendEvent(uid, event);
  }
};

export const getProjectUserIds = async (projectId: string): Promise<Set<string>> => {
  const ids = new Set<string>();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (project?.ownerId) ids.add(project.ownerId);

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });
  for (const m of members) ids.add(m.userId);
  return ids;
};

