export type NodeType = "input" | "rule" | "approval" | "export";

export type NodeStatus = "idle" | "running" | "success" | "failed" | "pending";

export interface WorkflowNode {
  id: string;
  type: NodeType;
  data: {
    label: string;
    config?: any;
    status?: NodeStatus;
    output?: any;
  };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: "default" | "conditional";
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: "draft" | "published";
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "completed" | "failed";
  logs: Array<{
    nodeId: string;
    status: NodeStatus;
    timestamp: Date;
    input?: any;
    output?: any;
    error?: string;
  }>;
  startedAt: Date;
  finishedAt?: Date;
}
