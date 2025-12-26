/**
 * Database layer for persistent memory storage using SQLite
 */

import Database from 'better-sqlite3';
import { VendorMemory, CorrectionMemory, ResolutionMemory } from './types';

export class MemoryDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './memory.db') {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Vendor Memory Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vendor_memory (
        id TEXT PRIMARY KEY,
        vendor TEXT NOT NULL,
        pattern TEXT NOT NULL,
        field_mapping TEXT NOT NULL,
        behavior TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.5,
        usage_count INTEGER NOT NULL DEFAULT 0,
        last_used TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Correction Memory Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS correction_memory (
        id TEXT PRIMARY KEY,
        vendor TEXT,
        pattern TEXT NOT NULL,
        correction_type TEXT NOT NULL,
        original_value TEXT,
        corrected_value TEXT NOT NULL,
        context TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.5,
        usage_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        last_used TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Resolution Memory Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resolution_memory (
        id TEXT PRIMARY KEY,
        vendor TEXT,
        discrepancy_type TEXT NOT NULL,
        resolution TEXT NOT NULL,
        context TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.5,
        usage_count INTEGER NOT NULL DEFAULT 0,
        last_used TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create indexes for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_vendor_memory_vendor ON vendor_memory(vendor);
      CREATE INDEX IF NOT EXISTS idx_correction_memory_vendor ON correction_memory(vendor);
      CREATE INDEX IF NOT EXISTS idx_resolution_memory_vendor ON resolution_memory(vendor);
    `);

    // Invoice tracking table for duplicate detection
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processed_invoices (
        invoice_id TEXT PRIMARY KEY,
        invoice_number TEXT NOT NULL,
        vendor TEXT NOT NULL,
        date TEXT NOT NULL,
        processed_at TEXT NOT NULL
      )
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_processed_invoices_lookup 
      ON processed_invoices(vendor, invoice_number, date)
    `);
  }

  // Vendor Memory Operations
  saveVendorMemory(memory: VendorMemory): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vendor_memory 
      (id, vendor, pattern, field_mapping, behavior, confidence, usage_count, last_used, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      memory.id,
      memory.vendor,
      memory.pattern,
      JSON.stringify(memory.fieldMapping),
      JSON.stringify(memory.behavior),
      memory.confidence,
      memory.usageCount,
      memory.lastUsed,
      memory.createdAt,
      memory.updatedAt
    );
  }

  getVendorMemories(vendor: string): VendorMemory[] {
    const stmt = this.db.prepare(`
      SELECT * FROM vendor_memory WHERE vendor = ? ORDER BY confidence DESC, usage_count DESC
    `);
    
    const rows = stmt.all(vendor) as any[];
    return rows.map(row => ({
      id: row.id,
      vendor: row.vendor,
      pattern: row.pattern,
      fieldMapping: JSON.parse(row.field_mapping),
      behavior: JSON.parse(row.behavior),
      confidence: row.confidence,
      usageCount: row.usage_count,
      lastUsed: row.last_used,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  getAllVendorMemories(): VendorMemory[] {
    const stmt = this.db.prepare(`SELECT * FROM vendor_memory ORDER BY confidence DESC`);
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      vendor: row.vendor,
      pattern: row.pattern,
      fieldMapping: JSON.parse(row.field_mapping),
      behavior: JSON.parse(row.behavior),
      confidence: row.confidence,
      usageCount: row.usage_count,
      lastUsed: row.last_used,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Correction Memory Operations
  saveCorrectionMemory(memory: CorrectionMemory): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO correction_memory 
      (id, vendor, pattern, correction_type, original_value, corrected_value, context, 
       confidence, usage_count, success_count, last_used, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Handle undefined/null values properly
    const originalValue = memory.originalValue === undefined || memory.originalValue === null
      ? null
      : JSON.stringify(memory.originalValue);
    
    stmt.run(
      memory.id,
      memory.vendor || null,
      memory.pattern,
      memory.correctionType,
      originalValue,
      JSON.stringify(memory.correctedValue),
      JSON.stringify(memory.context),
      memory.confidence,
      memory.usageCount,
      memory.successCount,
      memory.lastUsed,
      memory.createdAt,
      memory.updatedAt
    );
  }

  getCorrectionMemories(vendor?: string, pattern?: string): CorrectionMemory[] {
    let query = 'SELECT * FROM correction_memory WHERE 1=1';
    const params: any[] = [];

    if (vendor) {
      query += ' AND (vendor = ? OR vendor IS NULL)';
      params.push(vendor);
    }
    if (pattern) {
      query += ' AND pattern LIKE ?';
      params.push(`%${pattern}%`);
    }

    query += ' ORDER BY confidence DESC, success_count DESC';
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      vendor: row.vendor || undefined,
      pattern: row.pattern,
      correctionType: row.correction_type,
      originalValue: row.original_value ? JSON.parse(row.original_value) : undefined,
      correctedValue: JSON.parse(row.corrected_value),
      context: JSON.parse(row.context),
      confidence: row.confidence,
      usageCount: row.usage_count,
      successCount: row.success_count,
      lastUsed: row.last_used,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Resolution Memory Operations
  saveResolutionMemory(memory: ResolutionMemory): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resolution_memory 
      (id, vendor, discrepancy_type, resolution, context, confidence, usage_count, last_used, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      memory.id,
      memory.vendor || null,
      memory.discrepancyType,
      memory.resolution,
      JSON.stringify(memory.context),
      memory.confidence,
      memory.usageCount,
      memory.lastUsed,
      memory.createdAt,
      memory.updatedAt
    );
  }

  getResolutionMemories(vendor?: string, discrepancyType?: string): ResolutionMemory[] {
    let query = 'SELECT * FROM resolution_memory WHERE 1=1';
    const params: any[] = [];

    if (vendor) {
      query += ' AND (vendor = ? OR vendor IS NULL)';
      params.push(vendor);
    }
    if (discrepancyType) {
      query += ' AND discrepancy_type = ?';
      params.push(discrepancyType);
    }

    query += ' ORDER BY confidence DESC, usage_count DESC';
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      vendor: row.vendor || undefined,
      discrepancyType: row.discrepancy_type,
      resolution: row.resolution as any,
      context: JSON.parse(row.context),
      confidence: row.confidence,
      usageCount: row.usage_count,
      lastUsed: row.last_used,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Check for duplicate invoices
  checkDuplicateInvoice(invoiceNumber: string, vendor: string, date: string): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM processed_invoices
      WHERE vendor = ? AND invoice_number = ? 
      AND date(date) BETWEEN date(?, '-7 days') AND date(?, '+7 days')
    `);
    
    const result = stmt.get(vendor, invoiceNumber, date, date) as { count: number };
    return result.count > 0;
  }

  // Record processed invoice
  recordProcessedInvoice(invoiceId: string, invoiceNumber: string, vendor: string, date: string): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO processed_invoices 
      (invoice_id, invoice_number, vendor, date, processed_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(invoiceId, invoiceNumber, vendor, date, new Date().toISOString());
  }

  close(): void {
    this.db.close();
  }
}

