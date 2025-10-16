import { useState, useCallback, useEffect } from "react";
import { WorkflowNode, NodeType } from "@/types/workflow";
import { NodeToolbar } from "./NodeToolbar";
import { ConfigPanel } from "./ConfigPanel";
import { Button } from "@/components/ui/button";
import { Play, Save, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { saveWorkflow, publishWorkflow } from "@/lib/workflowApi";

/* -------------------------------------------------------------------------- */
/*                             Rule Evaluation Utils                          */
/* -------------------------------------------------------------------------- */
function evaluateRule(rule: any, row: Record<string, any>): boolean {
  try {
    if (!rule?.field || !rule?.operator) return true;
    const actual = row[rule.field];
    const op = rule.operator;
    const val = rule.value;

    switch (op) {
      case "===":
      case "==":
        return actual == val;
      case "!==":
      case "!=":
        return actual != val;
      case ">":
        return Number(actual) > Number(val);
      case ">=":
        return Number(actual) >= Number(val);
      case "<":
        return Number(actual) < Number(val);
      case "<=":
        return Number(actual) <= Number(val);
      case "in":
        return Array.isArray(val) ? val.includes(actual) : String(val).split(",").map(s => s.trim()).includes(String(actual));
      case "notIn":
        return Array.isArray(val) ? !val.includes(actual) : !String(val).split(",").map(s => s.trim()).includes(String(actual));
      case "contains":
        return String(actual).includes(String(val));
      case "notContains":
        return !String(actual).includes(String(val));
      case "startsWith":
        return String(actual).startsWith(String(val));
      case "endsWith":
        return String(actual).endsWith(String(val));
      case "isEmpty":
        return !actual;
      case "isNotEmpty":
        return !!actual;
      case "isNull":
        return actual == null;
      case "isNotNull":
        return actual != null;
      case "between":
        if (!Array.isArray(val)) return false;
        return Number(actual) >= Number(val[0]) && Number(actual) <= Number(val[1]);
      case "notBetween":
        if (!Array.isArray(val)) return false;
        return !(Number(actual) >= Number(val[0]) && Number(actual) <= Number(val[1]));
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                          Local Workflow Runner (Bulk)                      */
/* -------------------------------------------------------------------------- */
function runLocalWorkflowBulk(workflowJson, docs, startId) {
  const nodeById = new Map();
  workflowJson.cards.forEach(card => nodeById.set(card.id, card));

  /**
   * processNode:
   * - returns an array of result rows (not steps). The top-level function will
   *   run the export node over the combined results if an export node exists.
   */
  const processNode = (nodeId, payloads) => {
    if (!nodeId || !payloads || !payloads.length) return [];
    const node = nodeById.get(nodeId);
    if (!node) return payloads;

    const type = (node.type || "").toLowerCase();
    const config = node.config || {};

    console.log(`[DEBUG] Processing ${nodeId} (${type}) with ${payloads.length} rows.`);

    // ------------------ INPUT NODE ------------------
    if (type === "input") {
      // move to next sequential card
      const idx = workflowJson.cards.findIndex(c => c.id === node.id);
      const nextId = workflowJson.cards[idx + 1]?.id;
      return processNode(nextId, payloads);
    }

    // ------------------ RULE NODE ------------------
    if (type === "rule") {
      let trueRows = [], falseRows = [];

      // Determine trueNext/falseNext:
      // They can be either at node.config.trueNext / falseNext OR inside the first rule object.
      const firstRule = Array.isArray(config.rules) && config.rules.length ? config.rules[0] : {};
      const trueNext = config.trueNext || firstRule.trueNext;
      const falseNext = config.falseNext || firstRule.falseNext;

      for (const row of payloads) {
        let passed = true;
        if (Array.isArray(config.rules)) {
          for (const rule of config.rules) {
            if (!evaluateRule(rule, row)) {
              passed = false;
              break;
            }
          }
        }
        if (passed) trueRows.push(row);
        else falseRows.push(row);
      }

      console.log(`[DEBUG] Rule node ${nodeId}: true=${trueRows.length}, false=${falseRows.length}`);

      let results = [];
      if (trueNext && trueRows.length) {
        const r = processNode(trueNext, trueRows);
        if (Array.isArray(r)) results = results.concat(r);
      }
      if (falseNext && falseRows.length) {
        const r = processNode(falseNext, falseRows);
        if (Array.isArray(r)) results = results.concat(r);
      }

      // If no next nodes configured for branches, return rows as-is so they can be exported later
      if (!results.length) return [...trueRows, ...falseRows];
      return results;
    }

    // ------------------ APPROVAL NODE ------------------
    if (type === "approval") {
      const processedRows = payloads.map(row => {
        let assignees: string[] = [];
        if (Array.isArray(config.rules)) {
          for (const rule of config.rules) {
            if (evaluateRule(rule, row) && rule.assignee) assignees.push(rule.assignee);
          }
        } else if (config.assignee) {
          assignees.push(config.assignee);
        }
        // Always return assignees as array, never undefined
        if (!assignees) assignees = [];
        return { ...row, assignees, approvalLabel: config.label || node.label || "Approval" };
      });

      // Prefer explicit next if configured
      const nextId = config.next;
      if (nextId) return processNode(nextId, processedRows);

      // Otherwise let top-level handling decide: return processedRows so export can pick them up
      return processedRows;
    }

    // ------------------ EXPORT NODE ------------------
    if (type === "export") {
      console.log(`[DEBUG] Export node reached: ${payloads.length} rows exporting`);
      return payloads.map(row => ({
        ...row,
        exportFormat: config.format || "csv",
        exportDestination: config.destination || "download"
      }));
    }

    // ------------------ DEFAULT NODE ------------------
    {
      const idx = workflowJson.cards.findIndex(c => c.id === node.id);
      const nextId = workflowJson.cards[idx + 1]?.id;
      return processNode(nextId, payloads);
    }
  };

  const startNodeId = startId || workflowJson.cards[0]?.id;
  let results = processNode(startNodeId, docs);

  // If any branch returned nested arrays, flatten them
  if (Array.isArray(results) && results.some(Array.isArray)) {
    results = results.flat();
  }

  // If there's an export node, ensure we run export over the combined results.
  const exportNode = workflowJson.cards.find(c => (c.type || "").toLowerCase() === "export");
  if (exportNode && results && results.length) {
    // run export node explicitly
    results = processNode(exportNode.id, results);
  }

  console.log(`[DEBUG] Final results count: ${Array.isArray(results) ? results.length : 0}`);
  return { steps: results };
}

/* -------------------------------------------------------------------------- */
/*                            Workflow Builder UI                             */
/* -------------------------------------------------------------------------- */
let cardCounter = 0;
const getCardId = () => `card_${cardCounter++}`;

export const WorkflowBuilder = ({
  onRunHistoryChange,
  workflow,
}: {
  onRunHistoryChange?: (runs: any[]) => void;
  workflow?: any;
}) => {
  // Helper to ensure unique card ids
  function ensureUniqueCardIds(cards: WorkflowNode[]): WorkflowNode[] {
    const seen = new Set<string>();
    return cards.map((card, idx) => {
      let id = card.id;
      if (seen.has(id)) {
        id = `card_${Date.now()}_${idx}`;
      }
      seen.add(id);
      return { ...card, id };
    });
  }

  const [cards, setCards] = useState<WorkflowNode[]>(() => {
    const loaded = workflow?.nodes || JSON.parse(localStorage.getItem("workflow_cards") || "[]");
    return ensureUniqueCardIds(loaded);
  });
  const [selectedCard, setSelectedCard] = useState<WorkflowNode | null>(null);
  const [workflowName, setWorkflowName] = useState(() => workflow?.name || localStorage.getItem("workflow_name") || "");
  const [workflowId, setWorkflowId] = useState(workflow?.id || "");

  // Reload canvas when workflow prop changes
  useEffect(() => {
    if (workflow) {
      setCards(ensureUniqueCardIds(workflow.nodes || []));
      setWorkflowName(workflow.name || "");
      setWorkflowId(workflow.id || "");
    }
  }, [workflow]);
  const [isSaving, setIsSaving] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [runHistory, setRunHistory] = useState<any[]>(() => JSON.parse(localStorage.getItem("workflow_runHistory") || "[]"));
  const [savedWorkflows, setSavedWorkflows] = useState<any[]>(() => JSON.parse(localStorage.getItem("workflow_savedWorkflows") || "[]"));

  const persist = useCallback((key: string, value: any) => localStorage.setItem(key, JSON.stringify(value)), []);

  const onAddCard = (type: NodeType) => {
    const id = getCardId();
    const defaultConfig =
      type === "approval"
        ? { rules: [{ field: "", operator: "", value: "", assignee: "" }] }
        : type === "rule"
        ? { rules: [{ field: "", operator: "", value: "", trueNext: "", falseNext: "" }], trueNext: "", falseNext: "" }
        : type === "export"
        ? { format: "csv", destination: "download" }
        : {};
    const newCard: WorkflowNode = {
      id,
      type,
      data: { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`, config: defaultConfig },
      position: { x: 0, y: cards.length * 120 },
    };
    const updated = [...cards, newCard];
    setCards(updated);
    persist("workflow_cards", updated);
    toast.success(`${type} node added`);
  };

  const onUpdateCard = (cardId: string, data: any) => {
    const updated = cards.map((c) => (c.id === cardId ? { ...c, data: structuredClone(data) } : c));
    setCards(updated);
    persist("workflow_cards", updated);
    if (selectedCard?.id === cardId) setSelectedCard({ ...selectedCard, data });
  };

  const onDeleteCard = (cardId: string) => {
    const updated = cards.filter((c) => c.id !== cardId);
    setCards(updated);
    persist("workflow_cards", updated);
    if (selectedCard?.id === cardId) setSelectedCard(null);
    toast.info("Card deleted");
  };

  const onRunWorkflow = () => {
    try {
      const inputNode = cards.find((c) => c.type === "input");
      const inputData = inputNode?.data?.config?.result || [];
      if (!Array.isArray(inputData) || inputData.length === 0)
        return toast.error("Upload data in Input Node first");

      const workflowJson = { name: workflowName, cards: cards.map((c) => ({ id: c.id, type: c.type, config: c.data.config })) };
      const result = runLocalWorkflowBulk(workflowJson, inputData, workflowJson.cards[0]?.id);
      setRunResult(result);

      const newHistory = [{ result, workflow: workflowJson }, ...runHistory].slice(0, 5);
      setRunHistory(newHistory);
      persist("workflow_runHistory", newHistory);
      onRunHistoryChange?.(newHistory);
      toast.success("Workflow executed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Workflow run failed");
    }
  };

  const downloadCSV = () => {
    if (!runResult?.steps?.length) return;
    const steps = runResult.steps;
    const headers = Object.keys(steps[0]);
    const csv = [headers.join(",")].concat(steps.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName || "workflow"}_result.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSaveWorkflow = async () => {
    if (!workflowName.trim()) return toast.error("Workflow name required");
    setIsSaving(true);
    try {
      const res: any = await saveWorkflow({ name: workflowName, cards });
      setWorkflowId(res?._id || res?.id || "");
      const updated = [{ name: workflowName, cards }, ...savedWorkflows].slice(0, 5);
      setSavedWorkflows(updated);
      persist("workflow_savedWorkflows", updated);
      persist("workflow_name", workflowName);
      toast.success("Workflow saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const onPublishWorkflow = async () => {
    if (!workflowId) return toast.error("Save workflow first");
    setIsSaving(true);
    try {
      await publishWorkflow({ id: workflowId });
      toast.success("Workflow published");
    } catch {
      toast.error("Publish failed");
    } finally {
      setIsSaving(false);
    }
  };

  const onClearWorkflow = () => {
    setCards([]);
    setSelectedCard(null);
    setWorkflowName("");
    localStorage.clear();
    toast.info("Workflow cleared");
  };

  /* ----------------------------- UI Rendering ---------------------------- */
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card p-4 overflow-y-auto">
        <NodeToolbar onAddNode={onAddCard} />
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Workflow Name</label>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-full border rounded px-2 py-1 mb-2"
          />
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={onRunWorkflow} disabled={isSaving}><Play className="w-4 h-4 mr-2" />Run</Button>
          <Button onClick={onSaveWorkflow} variant="secondary" disabled={isSaving}><Save className="w-4 h-4 mr-2" />Save</Button>
          <Button onClick={onPublishWorkflow} disabled={!workflowId || isSaving}><UploadCloud className="w-4 h-4 mr-2" />Publish</Button>
          <Button onClick={onClearWorkflow} variant="outline" disabled={isSaving}><Trash2 className="w-4 h-4 mr-2" />Clear</Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`border rounded-lg p-4 shadow bg-card cursor-pointer ${
                selectedCard?.id === card.id ? "border-primary" : "border-border"
              }`}
              onClick={() => setSelectedCard(card)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">{card.data.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">[{card.type}]</span>
                </div>
                <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onDeleteCard(card.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* JSON Viewer */}
        <div className="mt-8 p-4 border rounded-lg bg-muted">
          <h3 className="font-semibold mb-2">Live Workflow JSON</h3>
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify({ name: workflowName, cards: cards.map((c) => ({ id: c.id, type: c.type, config: c.data.config })) }, null, 2)}
          </pre>
        </div>

        {/* Run Result */}
        {runResult && (
          <div className="mt-8 p-4 border rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">Workflow Results</h3>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full text-xs border">
                <thead>
                  <tr>
                    {Object.keys(runResult.steps[0] || {}).map((key) => (
                      <th key={key} className="border px-2 py-1 bg-card">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runResult.steps.map((step: any, i: number) => (
                    <tr key={i}>
                      {Object.keys(runResult.steps[0] || {}).map((key) => (
                        <td key={key} className="border px-2 py-1">
                          {typeof step[key] === "object" ? JSON.stringify(step[key]) : String(step[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={downloadCSV}>Download CSV</Button>
          </div>
        )}
      </div>

      {/* Right Config Panel */}
      {selectedCard && (
        <div className="w-96 border-l border-border bg-card overflow-y-auto">
          <ConfigPanel
            node={selectedCard}
            onUpdate={onUpdateCard}
            onClose={() => setSelectedCard(null)}
            allCards={cards}
          />
        </div>
      )}
    </div>
  );
};
