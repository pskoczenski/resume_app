import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// Temporary extended type until `npx prisma generate` is run locally.
const db = prisma as typeof prisma & {
  suggestion: {
    update: (args: {
      where: { id: string };
      data: { accepted?: boolean; suggestedText?: string };
    }) => Promise<{
      id: string;
      sessionId: string;
      type: string;
      originalText: string;
      suggestedText: string;
      rationale: string;
      jdMapping: unknown;
      accepted: boolean;
    }>;
  };
};

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    const body = await req.json().catch(() => ({}));

    const accepted =
      typeof (body as any).accepted === "boolean" ? (body as any).accepted : null;
    const suggested_text =
      typeof (body as any).suggested_text === "string"
        ? (body as any).suggested_text
        : null;

    if (accepted === null && suggested_text === null) {
      return NextResponse.json(
        { error: "Provide accepted (boolean) and/or suggested_text (string)." },
        { status: 400 }
      );
    }

    const updated = await db.suggestion.update({
      where: { id },
      data: {
        ...(accepted === null ? {} : { accepted }),
        ...(suggested_text === null ? {} : { suggestedText: suggested_text })
      }
    });

    return NextResponse.json({
      id: updated.id,
      session_id: updated.sessionId,
      type: updated.type,
      original_text: updated.originalText,
      suggested_text: updated.suggestedText,
      rationale: updated.rationale,
      jd_mapping: updated.jdMapping,
      accepted: updated.accepted
    });
  } catch (error) {
    console.error("[suggestions/update]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? message
            : "Failed to update suggestion."
      },
      { status: 500 }
    );
  }
}

