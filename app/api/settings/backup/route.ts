import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { getAuthUser } from "@/lib/auth";

const execAsync = promisify(exec);
export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// GET: List all database backups in `backups/` directory
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    // Role protection: Only admin can access database backups
    if (authUser && authUser.role !== "admin" && authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { status: "error", message: "Forbidden: Only administrators can view database backups." },
        { status: 403 }
      );
    }

    const backupsDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const files = fs.readdirSync(backupsDir);
    const sqlFiles = files.filter((f) => f.endsWith(".sql"));

    const backups = sqlFiles
      .map((filename) => {
        const filePath = path.join(backupsDir, filename);
        const stats = fs.statSync(filePath);

        let checksum = "";
        const shaPath = `${filePath}.sha256`;
        if (fs.existsSync(shaPath)) {
          checksum = fs.readFileSync(shaPath, "utf-8").trim().split(" ")[0];
        }

        return {
          filename,
          size_bytes: stats.size,
          size_formatted: formatBytes(stats.size),
          created_at: stats.mtime.toISOString(),
          checksum: checksum || "N/A",
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      status: "success",
      data: backups,
      summary: {
        total_backups: backups.length,
        total_size_bytes: backups.reduce((acc, b) => acc + b.size_bytes, 0),
        last_backup_date: backups.length > 0 ? backups[0].created_at : null,
      },
    });
  } catch (error: any) {
    console.error("Backup listing error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to list backups" },
      { status: 500 }
    );
  }
}

// POST: Trigger new manual database backup
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (authUser && authUser.role !== "admin" && authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { status: "error", message: "Forbidden: Only administrators can generate database backups." },
        { status: 403 }
      );
    }

    const scriptPath = path.join(process.cwd(), "scripts", "backup-db.mjs");
    const { stdout, stderr } = await execAsync(`node "${scriptPath}"`);

    const backupsDir = path.join(process.cwd(), "backups");
    const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith(".sql"));
    const latestFile = files
      .map((f) => ({ f, time: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time)[0]?.f;

    return NextResponse.json({
      status: "success",
      message: "Database backup completed successfully with SHA-256 verification.",
      filename: latestFile || "backup.sql",
      output: stdout,
    });
  } catch (error: any) {
    console.error("Backup trigger error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to create backup" },
      { status: 500 }
    );
  }
}
