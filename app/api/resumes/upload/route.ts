import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

import { prisma } from "@/lib/prisma";
import { supabaseServerClient, SUPABASE_BUCKET } from "@/lib/supabase-server";

export const runtime = "nodejs";

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text ?? "";
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value ?? "";
}

function normalizeText(input: string): string {
  return (
    input
      // Normalize Windows line endings
      .replace(/\r\n/g, "\n")
      // Collapse 3+ newlines to 2
      .replace(/\n{3,}/g, "\n\n")
      // Trim trailing spaces on each line
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim()
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseServerClient) {
      return NextResponse.json(
        { error: "Supabase is not configured on the server." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file field in form data." },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const mimeType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extension = fileName.split(".").pop()?.toLowerCase();
    const supported = ["pdf", "docx"];

    if (!extension || !supported.includes(extension)) {
      return NextResponse.json(
        {
          error: "Unsupported file type. Please upload a PDF or DOCX resume."
        },
        { status: 400 }
      );
    }

    // Upload original file to Supabase Storage
    const storagePath = `${Date.now()}-${fileName}`;
    const { data: uploadData, error: uploadError } =
      await supabaseServerClient.storage
        .from(SUPABASE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: mimeType ?? undefined,
          upsert: false
        });

    if (uploadError) {
      console.error("[upload] Supabase upload error", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage." },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl }
    } = supabaseServerClient.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(uploadData.path);

    // Extract text
    let rawText = "";
    if (extension === "pdf") {
      rawText = await extractTextFromPdf(buffer);
    } else {
      rawText = await extractTextFromDocx(buffer);
    }

    const normalizedText = normalizeText(rawText);

    const resume = await prisma.resume.create({
      data: {
        filename: fileName,
        fileUrl: publicUrl,
        rawText: normalizedText
      }
    });

    return NextResponse.json({
      resume_id: resume.id,
      raw_text: resume.rawText,
      file_url: resume.fileUrl
    });
  } catch (error) {
    console.error("[upload] Unexpected error", error);
    return NextResponse.json(
      { error: "Unexpected error while uploading resume." },
      { status: 500 }
    );
  }
}

