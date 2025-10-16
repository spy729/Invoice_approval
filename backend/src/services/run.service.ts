import RunModel, { IRun } from '../models/Run';
import { IWorkflow } from '../models/Workflow';
import executeWorkflow from '../utils/executeWorkflow';

// CSV serializer for array of objects
function toCSVArray(arr: Array<Record<string, any>>): string {
  if (!arr || arr.length === 0) return '';
  const keys = Object.keys(arr[0]);
  const escape = (v: any) => String(v ?? '').replace(/"/g, '""');
  const header = keys.map((k) => `"${k}"`).join(',');
  const rows = arr.map(obj => keys.map(k => `"${escape(obj[k])}"`).join(',')).join('\n');
  return header + '\n' + rows;
}

async function executeWorkflowRun(
  workflow: IWorkflow,
  invoiceData: Record<string, any> | Record<string, any>[],
  companyInfo?: { companyId?: string; companyName?: string }
): Promise<IRun> {
  const startedAt = new Date();
  let allResults: any[] = [];
  let status: any = 'approved';
  let steps: any[] = [];

  // If invoiceData is array, process each row
  if (Array.isArray(invoiceData)) {
    for (const row of invoiceData) {
      const result = await executeWorkflow(workflow, row);
      // Build output row from workflow result
      const outputRow = { ...row };
      // Find approval step and set assignee/status
      const approvalStep = result.steps.find(s => s.decision === 'pending' || s.decision === 'approved' || s.decision === 'rejected');
      if (approvalStep) {
        outputRow.approval = approvalStep.decision;
        outputRow.status = approvalStep.decision === 'approved' ? 'approved' : 'not approved';
        // Extract assignees from approvalStep.meta.output for this row
        let assignees: string[] = [];
        if (approvalStep.meta && Array.isArray(approvalStep.meta.output)) {
          // Find the matching row by invoice_id (or other unique key)
          const match = approvalStep.meta.output.find(r => r.invoice_id === row.invoice_id);
          if (match && Array.isArray(match.assignees)) assignees = match.assignees;
        }
        outputRow.assignees = assignees;
      }
      // Find export step and set export info
      const exportStep = result.steps.find(s => s.meta && s.meta.export);
      if (exportStep?.meta?.export) {
        outputRow.exportFormat = exportStep.meta.export.exportType || exportStep.meta.export.format;
        outputRow.exportDestination = exportStep.meta.export.target || exportStep.meta.export.destination;
      }
      allResults.push(outputRow);
      steps.push(...result.steps);
    }
    status = allResults.every(r => r.status === 'approved') ? 'approved' : 'pending';
  } else {
    // Single invoice
    const result = await executeWorkflow(workflow, invoiceData);
    steps = result.steps;
    status = result.status;
    const outputRow = { ...invoiceData };
    const approvalStep = result.steps.find(s => s.decision === 'pending' || s.decision === 'approved' || s.decision === 'rejected');
    if (approvalStep) {
      outputRow.approval = approvalStep.decision;
      outputRow.status = approvalStep.decision === 'approved' ? 'approved' : 'not approved';
      outputRow.assignees = approvalStep.assigneeId ? [approvalStep.assigneeId] : [];
    }
    const exportStep = result.steps.find(s => s.meta && s.meta.export);
    if (exportStep?.meta?.export) {
      outputRow.exportFormat = exportStep.meta.export.exportType || exportStep.meta.export.format;
      outputRow.exportDestination = exportStep.meta.export.target || exportStep.meta.export.destination;
    }
    allResults = [outputRow];
  }

  const finishedAt = new Date();
  // Generate output CSV from allResults
  const outputCsv = toCSVArray(allResults);

  // Build meta object with company info, output CSV, and workflow snapshot
  const meta: Record<string, any> = {};
  if (outputCsv) meta.outputCsv = outputCsv;
  if (companyInfo?.companyId) meta.companyId = companyInfo.companyId;
  if (companyInfo?.companyName) meta.companyName = companyInfo.companyName;
  // Store full workflow JSON (nodes and edges) for run history
  meta.workflow = {
    nodes: workflow.nodes,
    edges: workflow.edges,
    name: workflow.name,
    status: workflow.status,
    isActive: workflow.isActive,
    createdBy: workflow.createdBy,
    companyId: workflow.companyId,
    _id: workflow._id,
  };

  const run = new RunModel({
    workflowId: workflow._id,
    invoiceId: Array.isArray(invoiceData) ? undefined : invoiceData._id || null,
    steps,
    status,
    startedAt,
    finishedAt,
    meta: Object.keys(meta).length ? meta : undefined,
  });

  await run.save();
  return run;
}

export default { executeWorkflowRun };
