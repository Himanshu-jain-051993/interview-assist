import { NextRequest, NextResponse } from "next/server";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await pool.query('DELETE FROM "Role" WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title } = await req.json();
    
    if (!title) {
       return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE "Role" SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [title, id]
    );

    return NextResponse.json({ role: result.rows[0] });
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
