export type RoleStatus = 'New' | 'Open' | 'Closed';

export interface Role {
  id: string;
  title: string; // e.g., "Senior Product Manager"
  status: RoleStatus;
  appliedCount: number;
  rejectedCount: number;
  reviewCount: number;
  interviewCount: number;
}

export type CandidateStatus = 'Applied' | 'Screening' | 'Shortlisted' | 'Interview Scheduled' | 'Rejected';

export interface Experience {
  company: string;
  role: string;
  duration: string;
  achievements: string[];
}

export interface Education {
  school: string;
  degree: string;
}

export interface CandidateProfile {
  experience: Experience[];
  education: Education[];
}

export interface Candidate {
  id: string;
  roleId: string;
  name: string;
  status: CandidateStatus;
  resume_score: number | null;
  resume_summary: string | null;
  profile_data: CandidateProfile;
}
