import { Role, Candidate } from './types';
import mockData from './mock-data.json';

export async function getRoles(): Promise<Role[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockData.roles as Role[];
}

export async function getRoleById(id: string): Promise<Role | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockData.roles.find((r) => r.id === id) as Role | undefined;
}

export async function getCandidatesByRoleId(roleId: string): Promise<Candidate[]> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return mockData.candidates.filter((c) => c.roleId === roleId) as Candidate[];
}

export async function getCandidateById(id: string): Promise<Candidate | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockData.candidates.find((c) => c.id === id) as Candidate | undefined;
}
