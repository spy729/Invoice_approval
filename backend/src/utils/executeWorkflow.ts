import evaluateCondition, { Condition } from './conditionEvaluator';
import logger from './logger';
import { IWorkflow, IWorkflowNode } from '../models/Workflow';
import { IRunStep, RunStatus } from '../models/Run';

/**
 * Execute a workflow against given data.
 * - Works without edges (trueNext/falseNext routing)
 * - Evaluates rule/condition nodes and splits data
 * - Handles approval, export, and generic nodes
 * - Returns full step log and overall status
 */
export async function executeWorkflow(
  workflow: IWorkflow,
  inputData: any
): Promise<{ status: RunStatus; steps: IRunStep[] }> {
  const steps: IRunStep[] = [];

  // Always work with array input
  let currentPayload: any[] = Array.isArray(inputData)
    ? inputData
    : [inputData ?? {}];

  const nodes = (workflow.nodes || []) as IWorkflowNode[];
  const nodeById = new Map<string, IWorkflowNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  // Find starting node: input or first in list
  let current: IWorkflowNode | undefined =
    nodes.find((n) => (n.type || '').toLowerCase() === 'input') || nodes[0];
  if (!current) return { status: 'approved', steps };

  let safety = 0;
  while (current && safety < 2000) {
    safety++;
    const nodeId = current.id;
    const type = (current.type || '').toLowerCase();
    const payloadBefore = currentPayload;

    // --- Apply node output/transform before evaluation ---
    const applyNodeOutput = (node: IWorkflowNode, payload: any[]) => {
      return payload.map((row) => {
        let next = { ...row };
        try {
          const setter = node.data?.set || node.data?.output;
          if (setter && typeof setter === 'object') {
            for (const k of Object.keys(setter)) {
              const v = setter[k];
              if (typeof v === 'string' && v.startsWith('$.')) {
                // Resolve $.path
                const parts = v.slice(2).split('.');
                let cur: any = row;
                for (const p of parts) {
                  if (cur == null) {
                    cur = undefined;
                    break;
                  }
                  cur = cur[p];
                }
                next[k] = cur;
              } else {
                next[k] = v;
              }
            }
          }
        } catch {
          // ignore transform errors
        }
        return next;
      });
    };

    currentPayload = applyNodeOutput(current, currentPayload);

    // --- Rule / Condition Node ---
    if (type === 'rule' || type === 'condition') {
      const config = current.data?.config || {};
      const rules = Array.isArray(config.rules) ? config.rules : [];
      let trueRows: any[] = [];
      let falseRows: any[] = [];

      for (const row of currentPayload) {
        let passed = true;

        for (const rule of rules) {
          const result = evaluateCondition(rule, row);
          logger.info({
            type: 'rule',
            nodeId,
            field: rule.field,
            operator: rule.operator,
            value: rule.value,
            result,
          });
          passed = result;
          if (!passed) break;
        }

        if (config.expression) {
          try {
            const fn = new Function(
              ...Object.keys(row),
              `return (${config.expression});`
            );
            passed = !!fn(...Object.values(row));
          } catch {
            passed = false;
          }
        }

        if (passed) trueRows.push(row);
        else falseRows.push(row);
      }

      // Log this rule step
      steps.push({
        nodeId,
        decision: 'approved',
        actedAt: new Date(),
        meta: {
          input: payloadBefore,
          output: { true: trueRows, false: falseRows },
          branch: { true: trueRows.length, false: falseRows.length },
        },
      });

      logger.info({
        type: 'branch',
        nodeId,
        trueCount: trueRows.length,
        falseCount: falseRows.length,
      });

      // Branch navigation — no edges needed
      const trueNext = config.trueNext && nodeById.get(config.trueNext);
      const falseNext = config.falseNext && nodeById.get(config.falseNext);

      let results: any[] = [];

      // Recursive run for true branch
      if (trueNext && trueRows.length) {
        const res = await executeWorkflow(workflow, trueRows);
        steps.push(...res.steps);
        results = results.concat(
          res.steps.flatMap((s) => s.meta?.output || [])
        );
      }

      // Recursive run for false branch
      if (falseNext && falseRows.length) {
        const res = await executeWorkflow(workflow, falseRows);
        steps.push(...res.steps);
        results = results.concat(
          res.steps.flatMap((s) => s.meta?.output || [])
        );
      }

      // Merge branch results (if any)
      currentPayload = results.length ? results : currentPayload;
      break; // end current branch after recursion
    }

    // --- Approval Node ---
    if (type === 'approval') {
      const cfg: ApprovalConfig = (current.data && current.data.config) || current.data || {};
      let processedRows: any[] = [];

      for (const row of currentPayload) {
        let assignees: string[] = [];

        if (Array.isArray(cfg.rules)) {
          for (const rule of cfg.rules) {
            const passed = evaluateCondition(rule, row);
            if (passed && rule.assignee) assignees.push(rule.assignee);
          }
        } else if (cfg.assignee) {
          assignees.push(cfg.assignee);
        }

        processedRows.push({ ...row, assignees });
      }

      steps.push({
        nodeId,
        decision: 'pending',
        actedAt: null as any,
        meta: { approval: true, input: payloadBefore, output: processedRows },
      });

      currentPayload = processedRows;

      // Continue to next node if linked
      const nextId = cfg.next && nodeById.get(cfg.next);
      if (!nextId) break;
      current = nextId;
      continue;
    }

    // --- Export Node ---
    if (type === 'export') {
      const cfg = (current.data && current.data.config) || current.data || {};
      const exportType = cfg.exportType || cfg.type || cfg.format || 'none';
      const target = cfg.target || cfg.url || cfg.destination || null;

      steps.push({
        nodeId,
        decision: 'approved',
        actedAt: new Date(),
        meta: {
          export: { exportType, target },
          input: payloadBefore,
          output: currentPayload,
        },
      });

      if (exportType === 'webhook' && target) {
        try {
          fetch(target, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload: currentPayload }),
          }).catch(() => {});
        } catch {}
      }

      break; // exports are end nodes
    }

    // --- Generic Node (no special logic) ---
    steps.push({
      nodeId,
      decision: 'approved',
      actedAt: new Date(),
      meta: { executed: true, input: payloadBefore, output: currentPayload },
    });

    // Continue linearly if there's a .next config
    const nextId = current.data?.config?.next || null;
    if (nextId && nodeById.has(nextId)) {
      current = nodeById.get(nextId);
    } else break;
  }

  return { status: 'approved', steps };
}

export default executeWorkflow;

interface ApprovalConfig {
  rules?: Array<Condition & { assignee?: string }>;
  assignee?: string;
  next?: string;
}
