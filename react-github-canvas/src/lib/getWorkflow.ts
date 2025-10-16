export const getWorkflow = async (id: string) => {
  // Implement your workflow fetching logic here
  const response = await fetch(`/api/workflows/${id}`);
  return response.json();
};
