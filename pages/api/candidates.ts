import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';
import { Candidate, CandidateStatus } from '../../types/schema';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { roleId } = req.query;

  if (!roleId || typeof roleId !== 'string') {
    return res.status(400).json({ error: 'roleId query parameter is required' });
  }

  try {
    const candidates = await prisma.candidate.findMany({
      where: {
        role_id: roleId,
      },
      include: {
        role: true,
      }
    });

    const formattedCandidates: Candidate[] = candidates.map((c) => {
      const rawProfile = c.profile_data as any;
      
      return {
        id: c.id,
        roleId: c.role_id,
        name: c.name,
        // Map database stage to CandidateStatus enum
        status: (c.stage || 'Applied') as CandidateStatus,
        resume_score: null, // To be implemented by AI analysis agent
        resume_summary: rawProfile?.summary || null,
        profile_data: {
          experience: rawProfile?.experience || [],
          education: rawProfile?.education || [],
        },
      };
    });

    res.status(200).json(formattedCandidates);
  } catch (error: any) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates', message: error.message });
  }
}
