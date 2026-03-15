import { NextResponse } from 'next/server';
import pg from 'pg';
import { Role } from '@/lib/types';

const { Pool } = pg;

// Helper to get a database connection using native pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET() {
  try {
    // 1. Fetch roles
    const rolesRes = await pool.query('SELECT * FROM "Role"');
    
    // 2. Fetch candidate counts grouped by role and stage
    const countsRes = await pool.query(`
      SELECT role_id, stage, COUNT(*) as count 
      FROM "Candidate" 
      GROUP BY role_id, stage
    `);

    const countsMap: Record<string, Record<string, number>> = {};
    countsRes.rows.forEach(row => {
      if (!countsMap[row.role_id]) countsMap[row.role_id] = {};
      countsMap[row.role_id][row.stage] = parseInt(row.count);
    });

    const mappedRoles: Role[] = rolesRes.rows.map((r) => {
      const counts = countsMap[r.id] || {};
      return {
        id: r.id,
        title: r.title,
        status: 'Open',
        full_jd_text: r.full_jd_text,
        appliedCount: Object.values(counts).reduce((a, b) => a + b, 0),
        rejectedCount: counts['Rejected'] || 0,
        reviewCount: counts['Applied'] || 0, // In this schema 'Applied' means under review
        interviewCount: (counts['Screening'] || 0) + (counts['Shortlisted'] || 0),
      };
    });

    return NextResponse.json(mappedRoles);
  } catch (error: any) {
    console.error('Error fetching roles via pg:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
