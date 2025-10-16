import apiFetch from "./api";

export async function listWorkflows() {
	// Fetch published workflows from backend
	try {
		const data = await apiFetch(`/api/workflows`);
		return data;
	} catch (err) {
		console.error("listWorkflows error:", err);
		return [];
	}
}

export default listWorkflows;
