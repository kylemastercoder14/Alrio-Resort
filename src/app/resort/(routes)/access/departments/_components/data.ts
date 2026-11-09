export type DepartmentStatus = "Active" | "Paused" | "Archived";

export type DepartmentRecord = {
  code: string;
  createdAt: Date;
  description: string;
  email: string;
  head: string;
  headStaffProfileId: string;
  id: string;
  members: number;
  name: string;
  notes: string;
  openTasks: number;
  routing: string;
  staffProfileIds: string[];
  status: DepartmentStatus;
  updatedAt: Date;
};
