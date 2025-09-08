// mobo-app/services/departmentStaff.ts
import client from "./api";

export type CreateStaffPayload = {
  name: string;
  email: string;
  phone?: string | null;
  password: string; // plain; backend will hash
};

export type UserOut = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  department_id?: number | null;
  role?: string | null;
  department_name?: string | null;
};


export async function createDepartmentStaff(
  departmentId: number | string,
  payload: CreateStaffPayload
): Promise<UserOut> {
  const { data } = await client.post(
    `/admin/departments/${departmentId}/staff`,
    payload
  );
  return data as UserOut;
}

export async function fetchStaffList(): Promise<UserOut[]> {
  const { data } = await client.get("/admin/staff");
  return Array.isArray(data) ? data : data.items ?? [];
}