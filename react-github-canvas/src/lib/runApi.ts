import axios from "axios";
import { API_BASE_URL } from "@/config";

export async function runWorkflow({ workflowId, input }: { workflowId: string; input: any }) {
  const token = localStorage.getItem("workflow_token");
  const res = await axios.post(
    `${API_BASE_URL}/workflows/${workflowId}/run`,
    { input },
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: false,
    }
  );
  return res.data;
}

// Fetch all runs for the current user/company
export async function fetchRuns() {
  const token = localStorage.getItem("workflow_token");
  const res = await axios.get(`${API_BASE_URL}/runs`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return res.data;
}

// Download processed CSV for a specific run
export async function downloadRunCSV(runId: string): Promise<Blob> {
  const token = localStorage.getItem("workflow_token");
  const res = await axios.get(`${API_BASE_URL}/runs/${runId}/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    responseType: "blob",
  });
  return res.data as Blob;
}
