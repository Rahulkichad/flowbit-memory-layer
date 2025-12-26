/**
 * Main Invoice Processor - Orchestrates the memory-driven learning pipeline
 */

import { Invoice, ProcessedInvoice, HumanCorrection, AuditTrailEntry } from './types';
import { MemoryLayer } from './memory';

export class InvoiceProcessor {
  private memoryLayer: MemoryLayer;

  constructor(dbPath?: string) {
    this.memoryLayer = new MemoryLayer(dbPath);
  }

  /**
   * Process an invoice through the complete pipeline: Recall → Apply → Decide → Learn
   */
  processInvoice(invoice: Invoice): ProcessedInvoice {
    const auditTrail: AuditTrailEntry[] = [];
    const memoryUpdates: string[] = [];

    // Step 1: RECALL
    const recall = this.memoryLayer.recall(invoice);
    auditTrail.push({
      step: 'recall',
      timestamp: new Date().toISOString(),
      details: `Retrieved ${recall.vendorMemories.length} vendor memories, ` +
               `${recall.correctionMemories.length} correction memories, ` +
               `${recall.resolutionMemories.length} resolution memories`
    });

    // Step 2: APPLY
    const applied = this.memoryLayer.apply(invoice, recall);
    auditTrail.push({
      step: 'apply',
      timestamp: new Date().toISOString(),
      details: `Applied ${applied.proposedCorrections.length} corrections. ` +
               `Confidence: ${applied.confidenceScore.toFixed(2)}`
    });

    // Step 3: DECIDE
    const decision = this.memoryLayer.decide(invoice, recall, applied);
    auditTrail.push({
      step: 'decide',
      timestamp: new Date().toISOString(),
      details: decision.decisionReasoning
    });

    // Record processed invoice for duplicate detection
    this.memoryLayer.recordProcessedInvoice(
      invoice.invoiceId,
      invoice.invoiceNumber,
      invoice.vendor,
      invoice.date
    );

    // Combine reasoning
    const reasoning = `${applied.reasoning} ${decision.decisionReasoning}`.trim();

    return {
      normalizedInvoice: applied.normalizedInvoice,
      proposedCorrections: applied.proposedCorrections,
      requiresHumanReview: decision.requiresHumanReview,
      reasoning,
      confidenceScore: applied.confidenceScore,
      memoryUpdates,
      auditTrail
    };
  }

  /**
   * Learn from human corrections
   */
  learnFromCorrection(invoice: Invoice, correction: HumanCorrection): string[] {
    const recall = this.memoryLayer.recall(invoice);
    const memoryUpdates = this.memoryLayer.learn(invoice, correction, recall);
    
    return memoryUpdates;
  }

  /**
   * Process invoice and learn from correction in one step (for demo)
   */
  processAndLearn(invoice: Invoice, correction?: HumanCorrection): ProcessedInvoice {
    const result = this.processInvoice(invoice);
    
    if (correction) {
      const memoryUpdates = this.learnFromCorrection(invoice, correction);
      result.memoryUpdates.push(...memoryUpdates);
      result.auditTrail.push({
        step: 'learn',
        timestamp: new Date().toISOString(),
        details: `Learned from ${correction.corrections.length} corrections. ` +
                 `Resolution: ${correction.resolution}`
      });
    }
    
    return result;
  }

  close(): void {
    this.memoryLayer.close();
  }
}

