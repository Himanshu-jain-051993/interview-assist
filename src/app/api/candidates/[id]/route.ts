import { NextResponse } from "next/server";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const VALID_STAGES = ["Applied", "Screening", "Shortlisted", "Interview Scheduled", "Rejected"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STAGES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'UPDATE "Candidate" SET stage = $1, status_updated_at = NOW() WHERE id = $2 RETURNING id, stage',
      [status, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: result.rows[0].id,
      status: result.rows[0].stage,
    });
  } catch (error: any) {
    console.error("[PATCH /api/candidates/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
