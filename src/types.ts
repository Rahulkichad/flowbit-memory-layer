/**
 * Core type definitions for the Learned Memory System
 */

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  vendor: string;
  vendorId?: string;
  date: string;
  dueDate?: string;
  totalAmount: number;
  currency?: string;
  taxAmount?: number;
  lineItems: InvoiceLineItem[];
  rawText?: string;
  extractedFields: Record<string, any>;
  purchaseOrderNumber?: string;
  serviceDate?: string;
  [key: string]: any;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  [key: string]: any;
}

export interface MemoryRecall {
  vendorMemories: VendorMemory[];
  correctionMemories: CorrectionMemory[];
  resolutionMemories: ResolutionMemory[];
}

export interface VendorMemory {
  id: string;
  vendor: string;
  pattern: string;
  fieldMapping: Record<string, string>;
  behavior: Record<string, any>;
  confidence: number;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorrectionMemory {
  id: string;
  vendor?: string;
  pattern: string;
  correctionType: string;
  originalValue: string;
  correctedValue: string;
  context: Record<string, any>;
  confidence: number;
  usageCount: number;
  successCount: number;
  lastUsed: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolutionMemory {
  id: string;
  vendor?: string;
  discrepancyType: string;
  resolution: 'human_approved' | 'human_rejected' | 'auto_accepted' | 'auto_corrected';
  context: Record<string, any>;
  confidence: number;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessedInvoice {
  normalizedInvoice: Invoice;
  proposedCorrections: string[];
  requiresHumanReview: boolean;
  reasoning: string;
  confidenceScore: number;
  memoryUpdates: string[];
  auditTrail: AuditTrailEntry[];
}

export interface AuditTrailEntry {
  step: 'recall' | 'apply' | 'decide' | 'learn';
  timestamp: string;
  details: string;
}

export interface HumanCorrection {
  invoiceId: string;
  corrections: {
    field: string;
    originalValue: any;
    correctedValue: any;
    reason: string;
  }[];
  resolution: 'approved' | 'rejected';
}


