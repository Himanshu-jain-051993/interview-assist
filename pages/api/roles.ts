import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';
import { Role } from '../../types/schema';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const roles = await prisma.role.findMany({
      include: {
        candidates: {
          select: {
            stage: true,
          }
        }
      }
    });

    const formattedRoles: Role[] = roles.map((role) => {
      const candidates = role.candidates || [];
      return {
        id: role.id,
        title: role.title,
        status: 'Open', // Default to Open as per typical recruitment flows
        appliedCount: candidates.length,
        rejectedCount: candidates.filter(c => c.stage === 'Rejected').length,
        reviewCount: candidates.filter(c => c.stage === 'Applied').length,
        interviewCount: candidates.filter(c => ['Screening', 'Shortlisted'].includes(c.stage)).length,
      };
    });

    res.status(200).json(formattedRoles);
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles', message: error.message });
  }
}
