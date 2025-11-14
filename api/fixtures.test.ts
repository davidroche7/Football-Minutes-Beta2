import { describe, expect, it, vi, beforeEach } from 'vitest';
import listHandler from './fixtures/index';
import detailHandler from './fixtures/[fixtureId]/index';
import lineupHandler from './fixtures/[fixtureId]/lineup';
import resultHandler from './fixtures/[fixtureId]/result';
import { prisma } from '../server/db/prisma';
import { createMockRequest, createMockResponse } from './agents';

vi.mock('../server/db/prisma', () => ({
  prisma: {
    match: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    matchPlayer: {
      createMany: vi.fn(),
      update: vi.fn(),
    },
    matchAward: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    player: {
      findFirst: vi.fn(),
    },
  },
}));

const mockPrisma = prisma as any;

const mockMatch = {
  id: 'm1',
  teamId: 'team',
  fixtureDate: new Date('2025-01-01'),
  kickoffTime: '10:00',
  opponent: 'Opp',
  venue: 'HOME',
  status: 'DRAFT',
  allocation: { quarters: [], summary: {}, warnings: [] },
  result: null,
  editHistory: [],
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  players: [],
  awards: [],
};

describe('api/fixtures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists fixtures', async () => {
    mockPrisma.match.findMany.mockResolvedValueOnce([mockMatch]);
    const req = createMockRequest({ method: 'GET', query: { teamId: 'team' } });
    const { res, payload } = createMockResponse();
    await listHandler(req, res);
    expect(payload.status).toBe(200);
    expect(payload.json?.data).toHaveLength(1);
  });

  it('creates fixture with squad', async () => {
    mockPrisma.match.create.mockResolvedValueOnce({ id: 'm1' });
    mockPrisma.match.findUnique.mockResolvedValueOnce(mockMatch);
    mockPrisma.player.findFirst.mockResolvedValue({ id: 'p1', displayName: 'Alice' });
    const req = createMockRequest({
      method: 'POST',
      body: {
        teamId: 'team',
        opponent: 'Opp',
        fixtureDate: '2025-01-01',
        squad: [{ playerId: 'p1', role: 'STARTER' }],
      },
    });
    const { res, payload } = createMockResponse();
    await listHandler(req, res);
    expect(payload.status).toBe(201);
  });

  it('returns fixture detail', async () => {
    mockPrisma.match.findUnique.mockResolvedValueOnce(mockMatch);
    const req = createMockRequest({ method: 'GET', query: { fixtureId: 'm1' } });
    const { res, payload } = createMockResponse();
    await detailHandler(req, res);
    expect(payload.status).toBe(200);
  });

  it('updates lineup', async () => {
    mockPrisma.match.findUnique.mockResolvedValueOnce({
      ...mockMatch,
      players: [{ id: 'mp1', playerId: 'p1', player: { displayName: 'Alice' } }],
    });
    const req = createMockRequest({
      method: 'POST',
      query: { fixtureId: 'm1' },
      body: {
        slots: [
          {
            quarterNumber: 1,
            wave: 'FIRST',
            position: 'DEF',
            playerId: 'p1',
            minutes: 10,
          },
        ],
      },
    });
    const { res, payload } = createMockResponse();
    await lineupHandler(req, res);
    expect(payload.status).toBe(200);
  });

  it('saves result', async () => {
    mockPrisma.match.findUnique.mockResolvedValueOnce(mockMatch);
    mockPrisma.player.findFirst.mockResolvedValue({ id: 'p1', displayName: 'Alice' });
    const req = createMockRequest({
      method: 'POST',
      query: { fixtureId: 'm1' },
      body: {
        resultCode: 'WIN',
        teamGoals: 2,
        opponentGoals: 1,
        playerOfMatchId: 'p1',
        awards: [{ playerId: 'p1', awardType: 'SCORER', count: 1 }],
      },
    });
    const { res, payload } = createMockResponse();
    await resultHandler(req, res);
    expect(payload.status).toBe(200);
  });
});
