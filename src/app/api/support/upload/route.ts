import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";

export const dynamic = "force-dynamic";

// 20MB file size limit
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // Check either respond-chat or manage-tickets permission
    const [chatPerm, ticketPerm] = await Promise.all([
      checkAdminPermission(request, "respond-chat"),
      checkAdminPermission(request, "manage-tickets"),
    ]);

    if (!chatPerm.allowed && !ticketPerm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const threadId = formData.get("threadId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!threadId) {
      return NextResponse.json({ error: "Thread ID is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 20MB limit" },
        { status: 400 }
      );
    }

    const originalName = file.name || "attachment";
    const fileExt = originalName.includes(".")
      ? originalName.split(".").pop() || "bin"
      : "bin";
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${threadId}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabaseAdmin = createAdminClient();

    const { error: uploadError } = await supabaseAdmin.storage
      .from("chat-attachments")
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Support Upload] Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("chat-attachments")
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      name: originalName,
      type: file.type || "application/octet-stream",
      size: file.size,
    });
  } catch (error: any) {
    console.error("[Support Upload] Exception:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
