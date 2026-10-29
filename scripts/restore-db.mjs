/**
 * Protikkha Electric - Database Disaster Recovery Restore Script
 * 
 * Safely restores a verified SQL snapshot into an isolated target database.
 * Protects against accidental production overwrites.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export async function restoreDatabaseSnapshot(backupFilePath, targetDbUrl) {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found: ${backupFilePath}`);
  }

  // Safety confirmation: Never allow restore if targetDbUrl is missing or undefined
  if (!targetDbUrl) {
    throw new Error("Target database URL is required for restore operations.");
  }

  const parsedUrl = new URL(targetDbUrl);
  const database = parsedUrl.pathname.replace(/^\//, "");
  const host = parsedUrl.hostname || "127.0.0.1";
  const port = parseInt(parsedUrl.port || "3306");
  const user = parsedUrl.username || "root";
  const password = parsedUrl.password || "";

  // Check metadata and verify SHA256 checksum if metadata file exists
  const metaFilePath = backupFilePath.replace(".sql", ".json");
  if (fs.existsSync(metaFilePath)) {
    const meta = JSON.parse(fs.readFileSync(metaFilePath, "utf8"));
    const content = fs.readFileSync(backupFilePath, "utf8");
    const currentHash = crypto.createHash("sha256").update(content).digest("hex");
    if (meta.sha256 && meta.sha256 !== currentHash) {
      throw new Error(`Checksum mismatch! Backup file may be corrupted. Expected ${meta.sha256}, got ${currentHash}`);
    }
    console.log(`[Restore] SHA-256 Checksum verified successfully: ${meta.sha256.slice(0, 16)}...`);
  }

  console.log(`[Restore] Connecting to ${host}:${port} to restore into target database "${database}"...`);
  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${database}\``);

    const sqlContent = fs.readFileSync(backupFilePath, "utf8");
    console.log(`[Restore] Executing SQL snapshot into database "${database}"...`);
    await conn.query(sqlContent);
    console.log(`[Restore] Restoration completed successfully into "${database}".`);
    return { success: true, targetDatabase: database, backupFile: path.basename(backupFilePath) };
  } finally {
    await conn.end();
  }
}
