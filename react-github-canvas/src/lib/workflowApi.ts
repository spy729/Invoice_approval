import axios from "axios";
import { API_BASE_URL } from "@/config";
import { WorkflowNode } from "@/types/workflow";

export async function saveWorkflow({ name, cards, edges = [], status = "draft" }: {
  name: string;
  cards: WorkflowNode[];
  edges?: any[];
  status?: "draft" | "published";
}) {
  const token = localStorage.getItem("workflow_token");
  const res = await axios.post(
    `${API_BASE_URL}/workflows`,
    {
      name,
      nodes: cards,
      edges,
      status,
    },
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    }
  );
  return res.data;
}

export async function publishWorkflow({ id }: { id: string }) {
  const token = localStorage.getItem("workflow_token");
  const res = await axios.put(
    `${API_BASE_URL}/workflows/${id}`,
    { status: "published", isActive: true },
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    }
  );
  return res.data;
}
