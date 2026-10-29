import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (authUser && authUser.role !== "admin" && authUser.role !== "SUPER_ADMIN") {
      return new Response("Unauthorized", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("file");

    if (!filename || !filename.endsWith(".sql") || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return new Response("Invalid backup file request", { status: 400 });
    }

    const filePath = path.join(process.cwd(), "backups", filename);
    if (!fs.existsSync(filePath)) {
      return new Response("Backup file not found", { status: 404 });
    }

    const fileStream = fs.readFileSync(filePath);
    return new Response(fileStream, {
      status: 200,
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return new Response("Error downloading backup file", { status: 500 });
  }
}
