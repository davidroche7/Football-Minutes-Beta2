import { describe, expect, it, vi, beforeEach } from 'vitest';
import handler from './players';
import { prisma } from '../server/db/prisma';
import { createMockRequest, createMockResponse } from './agents';

vi.mock('../server/db/prisma', () => ({
  prisma: {
    player: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  player: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

describe('api/players', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns players for a team', async () => {
    mockPrisma.player.findMany.mockResolvedValueOnce([
      { id: 'p1', teamId: 'team', displayName: 'Alice', removedAt: null },
    ]);
    const req = createMockRequest({
      method: 'GET',
      query: { teamId: 'team', includeRemoved: 'false' },
    });
    const { res, payload } = createMockResponse();
    await handler(req, res);
    expect(payload.status).toBe(200);
    expect(payload.json?.data).toHaveLength(1);
  });

  it('validates displayName when creating a player', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { teamId: 'team' },
      body: { squadNumber: 7 },
    });
    const { res, payload } = createMockResponse();
    await handler(req, res);
    expect(payload.status).toBe(400);
  });
});
