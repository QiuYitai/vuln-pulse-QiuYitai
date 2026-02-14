import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// List all tech stacks
router.get('/', async (req, res) => {
  try {
    const techStacks = await prisma.techStack.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { vulnerabilities: true }
        }
      }
    });
    res.json(techStacks);
  } catch (error) {
    console.error('Error fetching tech stacks:', error);
    res.status(500).json({ error: 'Failed to fetch tech stacks' });
  }
});

// Get single tech stack with its vulnerabilities
router.get('/:id', async (req, res) => {
  try {
    const techStack = await prisma.techStack.findUnique({
      where: { id: req.params.id },
      include: {
        vulnerabilities: {
          orderBy: { vulnerability: { createdAt: 'desc' } },
          take: 20,
          include: {
            vulnerability: true
          }
        }
      }
    });

    if (!techStack) {
      return res.status(404).json({ error: 'Tech stack not found' });
    }

    res.json(techStack);
  } catch (error) {
    console.error('Error fetching tech stack:', error);
    res.status(500).json({ error: 'Failed to fetch tech stack' });
  }
});

// Create tech stack
router.post('/', async (req, res) => {
  try {
    const { name, version, category } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Tech stack name is required' });
    }

    const techStack = await prisma.techStack.create({
      data: {
        name: name.trim(),
        version: version?.trim() || null,
        category: category?.trim() || null
      }
    });

    res.status(201).json(techStack);
  } catch (error: any) {
    console.error('Error creating tech stack:', error);
    res.status(500).json({ error: 'Failed to create tech stack' });
  }
});

// Update tech stack
router.put('/:id', async (req, res) => {
  try {
    const { name, version, category, isActive } = req.body;

    const techStack = await prisma.techStack.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(version !== undefined && { version: version?.trim() || null }),
        ...(category !== undefined && { category: category?.trim() || null }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json(techStack);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tech stack not found' });
    }
    console.error('Error updating tech stack:', error);
    res.status(500).json({ error: 'Failed to update tech stack' });
  }
});

// Delete tech stack
router.delete('/:id', async (req, res) => {
  try {
    await prisma.techStack.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tech stack not found' });
    }
    console.error('Error deleting tech stack:', error);
    res.status(500).json({ error: 'Failed to delete tech stack' });
  }
});

// Toggle active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const techStack = await prisma.techStack.findUnique({
      where: { id: req.params.id }
    });

    if (!techStack) {
      return res.status(404).json({ error: 'Tech stack not found' });
    }

    const updated = await prisma.techStack.update({
      where: { id: req.params.id },
      data: { isActive: !techStack.isActive }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling tech stack:', error);
    res.status(500).json({ error: 'Failed to toggle tech stack' });
  }
});

export default router;
