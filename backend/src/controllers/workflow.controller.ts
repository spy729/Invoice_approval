import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import type { IWorkflow } from '../models/Workflow';
import WorkflowModel from '../models/Workflow';
import mongoose from 'mongoose';

// Create a new workflow
export async function createWorkflow(req: AuthRequest, res: Response) {
  try {
    const { name, nodes, edges, isActive } = req.body;
    const companyName = req.user?.name;
    if (!companyName || !name) {
      return res.status(400).json({ error: 'companyName and name are required' });
    }

    // Save workflow by company name instead of companyId
    const workflow = new WorkflowModel({ companyId: companyName, name, nodes: nodes || [], edges: edges || [], isActive: isActive ?? true, createdBy: req.user?.id });
    await workflow.save();
    return res.status(201).json(workflow);
  } catch (err) {
    console.error('createWorkflow error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// List all workflows for a company
export async function getWorkflows(req: AuthRequest, res: Response) {
  try {
    const companyName = req.user?.name;
    if (!companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }

    // List workflows by company name
    const workflows = await WorkflowModel.find({ companyId: companyName }).sort({ createdAt: -1 });
    return res.json(workflows);
  } catch (err) {
    console.error('getWorkflows error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get one workflow by ID
export async function getWorkflowById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid workflow id' });
    }

    const workflow = await WorkflowModel.findById(id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    // ensure same company by name
    if (req.user?.name && String(workflow.companyId) !== String(req.user.name)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json(workflow);
  } catch (err) {
    console.error('getWorkflowById error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Update workflow (nodes or edges or name/isActive)
export async function updateWorkflow(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid workflow id' });
    }

    const update: any = {};
    if (req.body.nodes) update.nodes = req.body.nodes;
    if (req.body.edges) update.edges = req.body.edges;
    if (typeof req.body.isActive === 'boolean') update.isActive = req.body.isActive;
    if (req.body.name) update.name = req.body.name;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const workflow = await WorkflowModel.findById(id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (req.user?.name && String(workflow.companyId) !== String(req.user.name)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    Object.assign(workflow, update);
    await workflow.save();
    return res.json(workflow);
  } catch (err) {
    console.error('updateWorkflow error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Delete a workflow
export async function deleteWorkflow(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid workflow id' });
    }

    const workflow = await WorkflowModel.findById(id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (req.user?.name && String(workflow.companyId) !== String(req.user.name)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await WorkflowModel.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteWorkflow error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Run a workflow by id with provided input data
export async function runWorkflow(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing workflow id' });
    const workflow = await WorkflowModel.findById(id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    // Only allow POST for running workflows
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed. Use POST to run a workflow.' });
    }

    // Always create a Run, even if input is empty
    let input = req.body.input;
    if (typeof input === 'undefined') input = req.body || {};
    // Lazy import run service to avoid circular
    const { default: runService } = await import('../services/run.service');
    const companyInfo = {
      companyId: req.user?.companyId,
      companyName: req.user?.name,
    };
    // Always create a Run document in the Run collection
    const run = await runService.executeWorkflowRun(workflow, input, companyInfo);
    return res.status(201).json(run);
  } catch (err) {
    console.error('runWorkflow error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  runWorkflow,
};
