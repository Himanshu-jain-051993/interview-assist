import { NextResponse } from 'next/server';
import pg from 'pg';
import { Candidate, CandidateStatus } from '@/lib/types';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('roleId');

  if (!roleId) {
    return NextResponse.json({ error: 'roleId is required' }, { status: 400 });
  }

  try {
    const res = await pool.query('SELECT * FROM "Candidate" WHERE role_id = $1', [roleId]);

    const mappedCandidates: Candidate[] = res.rows.map((r) => {
      const profileData = r.profile_data || {};
      return {
        id: r.id,
        roleId: r.role_id,
        name: r.name,
        status: (r.stage || 'Applied') as CandidateStatus,
        resume_score: profileData.resume_score || null,
        resume_summary: profileData.summary || null,
        profile_data: {
          experience: profileData.experience || [],
          education: profileData.education || [],
        },
      };
    });

    return NextResponse.json(mappedCandidates);
  } catch (error: any) {
    console.error('Error fetching candidates via pg:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
