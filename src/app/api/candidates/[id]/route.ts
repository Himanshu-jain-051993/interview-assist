
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { stage } = await request.json();

    const updated = await prisma.candidate.update({
      where: { id },
      data: { 
        stage: stage,
        status_updated_at: new Date()
      },
    });

    return NextResponse.json({
      id: updated.id,
      stage: updated.stage,
    });
  } catch (error: any) {
    console.error("[PATCH /api/candidates/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.candidate.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/candidates/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
