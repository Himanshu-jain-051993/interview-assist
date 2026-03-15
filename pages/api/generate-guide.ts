import { NextApiRequest, NextApiResponse } from 'next';
import pg from 'pg';
import { generateInterviewGuide } from '@/lib/agents/interview-architect';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { candidateId, roleId } = req.body;

  if (!candidateId || !roleId) {
    return res.status(400).json({ error: 'candidateId and roleId are required' });
  }

  try {
    // 1. Fetch Candidate
    const candidateRes = await pool.query('SELECT * FROM "Candidate" WHERE id = $1', [candidateId]);
    if (candidateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const candidate = candidateRes.rows[0];

    // 2. Fetch Role
    const roleRes = await pool.query('SELECT * FROM "Role" WHERE id = $1', [roleId]);
    if (roleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    const role = roleRes.rows[0];

    // 3. Fetch Rubrics for the role's category
    const rubricsRes = await pool.query('SELECT * FROM "Rubric" WHERE category = $1', [role.category]);
    const rubrics = rubricsRes.rows;

    // 4. Generate Guide via Agent
    const guideData = await generateInterviewGuide(candidate, role, rubrics);

    return res.status(200).json(guideData);
  } catch (error: any) {
    console.error('Error generating guide:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
