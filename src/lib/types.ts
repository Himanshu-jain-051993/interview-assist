export type RoleStatus = 'New' | 'Open' | 'Closed';

export interface Role {
  id: string;
  title: string; // e.g., "Senior Product Manager"
  status: RoleStatus;
  full_jd_text?: string | null;
  category?: string;
  appliedCount: number;
  rejectedCount: number;
  reviewCount: number;
  interviewCount: number;
}

export type CandidateStatus = 'Applied' | 'Screening' | 'Shortlisted' | 'Interview' | 'Interview Scheduled' | 'Rejected';

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
  summary?: string;
  experience: Experience[];
  education: Education[];
}

export interface Candidate {
  id: string;
  roleId: string;
  name: string;
  status: CandidateStatus;
  resume_score: number | null;
  interview_score?: number | null;
  interview_summary?: string | null;
  resume_summary?: string | null;
  resume_review_data?: any | null;
  raw_resume_text?: string | null;
  profile_data: CandidateProfile & { raw_text?: string };
}

