import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import Run from '../models/Run';
import Workflow from '../models/Workflow';
import authenticateJWT, { AuthRequest } from '../middleware/auth';
import executeWorkflow from '../utils/executeWorkflow';

const router = Router();

// GET /api/runs - fetch all runs for the current user's company
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    // Only fetch runs for the user's company
    const companyId = req.user?.companyId;
    const companyName = req.user?.name;
    let query: any = {};
    if (companyId) {
      query['meta.companyId'] = companyId;
    } else if (companyName) {
      query['meta.companyName'] = companyName;
    }
    const runs = await Run.find(query).sort({ createdAt: -1 }).limit(50);
    res.json(runs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/runs/:id
router.get('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const run = await Run.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    // verify tenant
    const runWorkflow = await Workflow.findById(run.workflowId);
    if (req.user?.companyId && runWorkflow && String(runWorkflow.companyId) !== String(req.user.companyId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(run);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/runs/:runId/steps/:index/action { action: 'approve'|'reject', comment }
router.post('/:runId/steps/:index/action', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { action, comment } = req.body;
    const { runId, index } = req.params;
    const idx = parseInt(index as any, 10);
    const run = await Run.findById(runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    // verify tenant ownership
    const workflow = await Workflow.findById(run.workflowId);
    if (req.user?.companyId && workflow && String(workflow.companyId) !== String(req.user.companyId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const step = run.steps[idx];
    if (!step) return res.status(400).json({ error: 'Step not found' });

    // Basic permission: only assignee can act
    const userId = (req as any).user?.id;
    if (step.assigneeId && String(step.assigneeId) !== String(userId)) {
      return res.status(403).json({ error: 'Not assigned to you' });
    }

    if (action === 'approve') {
      step.decision = 'approved';
    } else if (action === 'reject') {
      step.decision = 'rejected';
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    step.comment = comment;
    step.actedAt = new Date();

    // Persist
    await run.save();

  // If approved, attempt to continue execution from next nodes (naive approach: re-load workflow and execute remaining nodes)
  if (!workflow) return res.json({ run });

    // For simplicity, re-run executeWorkflow with current run steps used as history.
    // A more robust approach would resume from the next node index.
    const { status, steps } = await executeWorkflow(workflow, {});
    run.steps = run.steps.concat(steps);
    run.status = status;
    run.finishedAt = status === 'approved' || status === 'rejected' ? new Date() : run.finishedAt;
    await run.save();

    res.json(run);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/runs/:id/download - download final output CSV for a run
router.get('/:id/download', async (req, res) => {
  try {
    const run = await Run.findById(req.params.id);
    if (!run || !run.meta || !run.meta.outputCsv) {
      return res.status(404).json({ error: 'CSV not found for this run' });
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=run_${run._id}.csv`);
    res.send(run.meta.outputCsv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download CSV' });
  }
});

export default router;
