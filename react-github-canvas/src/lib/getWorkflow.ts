import axios from "axios";
import { API_BASE_URL } from "@/config";

export async function getWorkflow(id: string) {
  const token = localStorage.getItem("workflow_token");
  const res = await axios.get(`${API_BASE_URL}/workflows/${id}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    withCredentials: false,
  });
  return res.data;
}
