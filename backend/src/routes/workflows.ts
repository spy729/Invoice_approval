import { Router } from 'express';
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  runWorkflow,
} from '../controllers/workflow.controller';
import authenticateJWT from '../middleware/auth';
import requireRole from '../middleware/requireRole';

const router = Router();

// Create workflow (admin only)
router.post('/', authenticateJWT, requireRole('admin'), createWorkflow);

// List workflows for a company (admin/manager)
router.get('/', authenticateJWT, requireRole(['admin', 'manager']), getWorkflows);

// Run a workflow with input (admin/manager)
router.post('/:id/run', authenticateJWT, requireRole(['admin', 'manager']), runWorkflow);

// Get specific workflow (admin/manager)
router.get('/:id', authenticateJWT, requireRole(['admin', 'manager']), getWorkflowById);

// Update workflow (admin only)
router.put('/:id', authenticateJWT, requireRole('admin'), updateWorkflow);

// Delete workflow (admin only)
router.delete('/:id', authenticateJWT, requireRole('admin'), deleteWorkflow);

export default router;
