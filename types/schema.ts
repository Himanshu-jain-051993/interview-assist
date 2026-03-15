export type RoleStatus = 'New' | 'Open' | 'Closed';
export type CandidateStatus = 'Applied' | 'Screening' | 'Shortlisted' | 'Rejected';

export interface Role {
  id: string;
  title: string; // e.g., "Senior Product Manager"
  status: RoleStatus;
  appliedCount: number;
  rejectedCount: number;
  reviewCount: number;
  interviewCount: number;
}

export interface Candidate {
  id: string;
  roleId: string;
  name: string;
  status: CandidateStatus;
  resume_score: number | null;
  resume_summary: string | null;
  profile_data: {
    experience: Array<{
      company: string;
      role: string;
      duration: string;
      achievements: string[];
    }>;
    education: Array<{ school: string; degree: string }>;
  };
}
