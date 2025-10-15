import { Router, Response } from 'express';
import User from '../models/User';
import authenticateJWT, { AuthRequest } from '../middleware/auth';
import requireRole from '../middleware/requireRole';

const router = Router();

// GET /api/users?companyId=... - list users for a company
// Only admins can list users for a company
router.get('/', authenticateJWT, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req.query.companyId as string) || req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId required' });
    // ensure requester belongs to same company
    if (req.user?.companyId && req.user.companyId !== companyId) return res.status(403).json({ error: 'Forbidden' });
    const users = await User.find({ companyId }).select('_id name email role');
    res.json(users);
  } catch (err) {
    console.error('GET /api/users error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me - current user profile
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const u = await User.findById(userId).select('-password');
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json(u);
  } catch (err) {
    console.error('GET /api/users/me error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
