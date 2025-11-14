import { describe, expect, it, vi, beforeEach } from 'vitest';
import handler from './fixtures';
import { prisma } from '../server/db/prisma';
import { createMockRequest, createMockResponse } from './agents';

vi.mock('../server/db/prisma', () => ({
  prisma: {
    match: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  match: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('api/fixtures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fixtures list', async () => {
    mockPrisma.match.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        teamId: 'team',
        fixtureDate: new Date('2025-01-01'),
        opponent: 'Opp',
        venue: 'HOME',
        status: 'DRAFT',
        allocation: { summary: {} },
        result: null,
        editHistory: [],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
        players: [],
        awards: [],
      },
    ]);
    const req = createMockRequest({ method: 'GET', query: { teamId: 'team' } });
    const { res, payload } = createMockResponse();
    await handler(req, res);
    expect(payload.status).toBe(200);
    expect(payload.json?.data).toHaveLength(1);
  });
});
