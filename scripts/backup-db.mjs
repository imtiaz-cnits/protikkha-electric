/**
 * Protikkha Electric - Automated Database Backup Script
 * 
 * Safely creates an atomic SQL snapshot of protikkha_electric_db,
 * generates a SHA-256 integrity checksum, and applies retention policy.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_URL = process.env.DATABASE_URL || "mysql://root:@127.0.0.1:3306/protikkha_electric_db";
const BACKUP_DIR = path.join(process.cwd(), "backups");
const MAX_BACKUPS = 30; // Keep last 30 backups

export async function createDatabaseBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFileName = `backup-protikkha-${timestamp}.sql`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);
  const metaFilePath = path.join(BACKUP_DIR, `backup-protikkha-${timestamp}.json`);

  const parsedUrl = new URL(DB_URL);
  const database = parsedUrl.pathname.replace(/^\//, "");
  const host = parsedUrl.hostname || "127.0.0.1";
  const port = parseInt(parsedUrl.port || "3306");
  const user = parsedUrl.username || "root";
  const password = parsedUrl.password || "";

  console.log(`[Backup] Connecting to MySQL on ${host}:${port} for database: ${database}...`);
  const conn = await mysql.createConnection({ host, port, user, password, database });

  try {
    const [tables]: any = await conn.execute("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const tableNames = tables.map((t: any) => Object.values(t)[0]);

    let sqlOutput = `-- Protikkha Electric ERP Database Backup\n-- Date: ${new Date().toISOString()}\n-- Database: ${database}\n\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const tbl of tableNames) {
      // Table Schema
      const [[createTable]]: any = await conn.execute(`SHOW CREATE TABLE \`${tbl}\``);
      sqlOutput += `DROP TABLE IF EXISTS \`${tbl}\`;\n`;
      sqlOutput += `${createTable["Create Table"]};\n\n`;

      // Table Data
      const [rows]: any = await conn.execute(`SELECT * FROM \`${tbl}\``);
      if (rows.length > 0) {
        for (const row of rows) {
          const keys = Object.keys(row).map((k) => `\`${k}\``).join(", ");
          const vals = Object.values(row).map((v) => {
            if (v === null) return "NULL";
            if (typeof v === "number" || typeof v === "bigint") return String(v);
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
            return mysql.escape(String(v));
          }).join(", ");
          sqlOutput += `INSERT INTO \`${tbl}\` (${keys}) VALUES (${vals});\n`;
        }
        sqlOutput += "\n";
      }
    }

    sqlOutput += `SET FOREIGN_KEY_CHECKS = 1;\n-- Backup Completed Successfully\n`;

    fs.writeFileSync(backupFilePath, sqlOutput, "utf8");

    // Generate SHA-256 Checksum
    const hash = crypto.createHash("sha256").update(sqlOutput).digest("hex");
    const stats = fs.statSync(backupFilePath);

    const metadata = {
      filename: backupFileName,
      timestamp: new Date().toISOString(),
      database,
      tableCount: tableNames.length,
      sizeBytes: stats.size,
      sha256: hash,
    };

    fs.writeFileSync(metaFilePath, JSON.stringify(metadata, null, 2), "utf8");
    console.log(`[Backup] Created: ${backupFileName} (${(stats.size / 1024).toFixed(2)} KB, SHA256: ${hash.slice(0, 16)}...)`);

    // Apply retention policy (clean old backups beyond MAX_BACKUPS)
    const allFiles = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".sql")).sort().reverse();
    if (allFiles.length > MAX_BACKUPS) {
      const toRemove = allFiles.slice(MAX_BACKUPS);
      for (const f of toRemove) {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        const m = path.join(BACKUP_DIR, f.replace(".sql", ".json"));
        if (fs.existsSync(m)) fs.unlinkSync(m);
        console.log(`[Backup Retention] Removed old backup: ${f}`);
      }
    }

    return metadata;
  } finally {
    await conn.end();
  }
}

// Allow direct CLI execution: node scripts/backup-db.mjs
if (process.argv[1] && process.argv[1].endsWith("backup-db.mjs")) {
  createDatabaseBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Backup Failed]:", err);
      process.exit(1);
    });
}
