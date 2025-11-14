import { describe, expect, it, vi, beforeEach } from 'vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import listHandler from './players/index';
import detailHandler from './players/[playerId]';
import restoreHandler from './players/[playerId]/restore';
import { prisma } from '../server/db/prisma';
import { createMockRequest, createMockResponse } from './agents';

vi.mock('../server/db/prisma', () => ({
  prisma: {
    player: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  player: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe('api/players/index', () => {
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
    await listHandler(req, res);
    expect(payload.status).toBe(200);
    expect(mockPrisma.player.findMany).toHaveBeenCalledWith({
      where: { teamId: 'team', removedAt: null },
      orderBy: { displayName: 'asc' },
    });
    expect(payload.json?.data).toHaveLength(1);
  });

  it('validates displayName when creating a player', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { teamId: 'team' },
      body: { squadNumber: 7 },
    });
    const { res, payload } = createMockResponse();
    await listHandler(req, res);
    expect(payload.status).toBe(400);
  });
});

describe('api/players/[playerId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a player', async () => {
    mockPrisma.player.update.mockResolvedValueOnce({ id: 'p1', displayName: 'Bob' });
    const req = createMockRequest({
      method: 'PATCH',
      query: { playerId: 'p1' },
      body: { displayName: 'Bob' },
    });
    const { res, payload } = createMockResponse();
    await detailHandler(req, res);
    expect(payload.status).toBe(200);
    expect(mockPrisma.player.update).toHaveBeenCalled();
  });

  it('soft deletes a player', async () => {
    mockPrisma.player.update.mockResolvedValueOnce({ id: 'p1', removedAt: new Date().toISOString() });
    const req = createMockRequest({
      method: 'DELETE',
      query: { playerId: 'p1' },
    });
    const { res, payload } = createMockResponse();
    await detailHandler(req, res);
    expect(payload.status).toBe(200);
    expect(mockPrisma.player.update).toHaveBeenCalled();
  });
});

describe('api/players/[playerId]/restore', () => {
  it('restores a player', async () => {
    mockPrisma.player.update.mockResolvedValueOnce({ id: 'p1', removedAt: null });
    const req = createMockRequest({
      method: 'POST',
      query: { playerId: 'p1' },
    });
    const { res, payload } = createMockResponse();
    await restoreHandler(req, res);
    expect(payload.status).toBe(200);
  });
});
