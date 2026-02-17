import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// List vulnerabilities (paginated, filterable)
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      source,
      severity,
      techStackId,
      timeRange,
      timeFrom,
      timeTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      cveId,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (source) {
      where.source = source;
    }

    if (severity) {
      where.severity = severity;
    }

    if (techStackId) {
      where.techStacks = {
        some: {
          techStackId,
          isAffected: true,
        }
      };
    }

    if (cveId) {
      where.cveId = { contains: cveId };
    }

    // Time range shortcuts
    if (timeRange && !timeFrom) {
      const now = new Date();
      let since: Date;
      switch (timeRange) {
        case '1h': since = new Date(now.getTime() - 3600000); break;
        case 'today': since = new Date(now.toDateString()); break;
        case '7d': since = new Date(now.getTime() - 7 * 86400000); break;
        case '30d': since = new Date(now.getTime() - 30 * 86400000); break;
        default: since = new Date(0);
      }
      where.publishedAt = { gte: since };
    }

    if (timeFrom) {
      where.publishedAt = { ...where.publishedAt, gte: new Date(timeFrom as string) };
    }
    if (timeTo) {
      where.publishedAt = { ...where.publishedAt, lte: new Date(timeTo as string) };
    }

    const orderBy: any = {};
    const allowedSortFields = ['createdAt', 'publishedAt', 'cvssScore', 'severity'];
    const field = allowedSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    orderBy[field] = sortOrder === 'asc' ? 'asc' : 'desc';

    const [vulnerabilities, total] = await Promise.all([
      prisma.vulnerability.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          techStacks: {
            include: {
              techStack: {
                select: { id: true, name: true, version: true, category: true }
              }
            }
          }
        }
      }),
      prisma.vulnerability.count({ where })
    ]);

    res.json({
      data: vulnerabilities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    res.status(500).json({ error: 'Failed to fetch vulnerabilities' });
  }
});

// Stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, critical, high, medium, low, bySource] = await Promise.all([
      prisma.vulnerability.count(),
      prisma.vulnerability.count({ where: { createdAt: { gte: today } } }),
      prisma.vulnerability.count({ where: { severity: 'critical' } }),
      prisma.vulnerability.count({ where: { severity: 'high' } }),
      prisma.vulnerability.count({ where: { severity: 'medium' } }),
      prisma.vulnerability.count({ where: { severity: 'low' } }),
      prisma.vulnerability.groupBy({
        by: ['source'],
        _count: { id: true }
      })
    ]);

    const sourceMap: Record<string, number> = {};
    for (const item of bySource) {
      sourceMap[item.source] = item._count.id;
    }

    res.json({
      total,
      today: todayCount,
      critical,
      high,
      medium,
      low,
      bySource: sourceMap
    });
  } catch (error) {
    console.error('Error fetching vulnerability stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get single vulnerability with linked tech stacks
router.get('/:id', async (req, res) => {
  try {
    const vulnerability = await prisma.vulnerability.findUnique({
      where: { id: req.params.id },
      include: {
        techStacks: {
          include: {
            techStack: {
              select: { id: true, name: true, version: true, category: true }
            }
          }
        }
      }
    });

    if (!vulnerability) {
      return res.status(404).json({ error: 'Vulnerability not found' });
    }

    res.json(vulnerability);
  } catch (error) {
    console.error('Error fetching vulnerability:', error);
    res.status(500).json({ error: 'Failed to fetch vulnerability' });
  }
});

// Delete vulnerability
router.delete('/:id', async (req, res) => {
  try {
    await prisma.vulnerability.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Vulnerability not found' });
    }
    console.error('Error deleting vulnerability:', error);
    res.status(500).json({ error: 'Failed to delete vulnerability' });
  }
});

export default router;
