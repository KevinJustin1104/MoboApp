import client from "./api";

export interface Department {
  id: number;
  name: string;
  description?: string; // <-- added description
}

// Fetch all departments
export const getDepartments = async (): Promise<Department[]> => {
  const res = await client.get("/departments");
  return res.data;
};

// Create a new department
export const createDepartment = async (name: string, description?: string): Promise<Department> => {
  const res = await client.post("/departments", { name, description });
  return res.data;
};
