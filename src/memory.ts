/**
 * Core Memory Layer: Recall, Apply, Decide, Learn
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Invoice,
  MemoryRecall,
  VendorMemory,
  CorrectionMemory,
  ResolutionMemory,
  HumanCorrection
} from './types';
import { MemoryDatabase } from './database';

export class MemoryLayer {
  private db: MemoryDatabase;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.6;
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private readonly CONFIDENCE_DECAY_RATE = 0.05; // 5% decay per unused period
  private readonly CONFIDENCE_REINFORCEMENT = 0.1; // 10% boost on successful use

  constructor(dbPath?: string) {
    this.db = new MemoryDatabase(dbPath);
  }

  /**
   * RECALL: Retrieve relevant memories for a given invoice
   */
  recall(invoice: Invoice): MemoryRecall {
    const vendor = invoice.vendor;
    
    // Get vendor-specific memories
    const vendorMemories = this.db.getVendorMemories(vendor);
    
    // Get correction memories (vendor-specific and general)
    const correctionMemories = this.db.getCorrectionMemories(vendor);
    
    // Get resolution memories
    const resolutionMemories = this.db.getResolutionMemories(vendor);
    
    // Apply confidence decay for unused memories
    this.applyDecay(vendorMemories, correctionMemories, resolutionMemories);
    
    return {
      vendorMemories,
      correctionMemories,
      resolutionMemories
    };
  }

  /**
   * APPLY: Use recalled memories to normalize and suggest corrections
   */
  apply(invoice: Invoice, recall: MemoryRecall): {
    normalizedInvoice: Invoice;
    proposedCorrections: string[];
    reasoning: string;
    confidenceScore: number;
  } {
    const normalizedInvoice = { ...invoice };
    const proposedCorrections: string[] = [];
    const reasoningParts: string[] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;

    // Apply vendor memory for field mappings
    for (const vendorMemory of recall.vendorMemories) {
      if (vendorMemory.confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
        // Apply field mappings
        for (const [sourceField, targetField] of Object.entries(vendorMemory.fieldMapping)) {
          // First check extractedFields, then try to extract from rawText
          let sourceValue = invoice.extractedFields?.[sourceField];
          
          // If not found, try to extract from rawText using the field name as a label
          if (!sourceValue && invoice.rawText) {
            // Look for pattern like "Leistungsdatum: 2024-01-10" or "Leistungsdatum 2024-01-10"
            const regex = new RegExp(`${sourceField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:\\s]+([^\\n]+)`, 'i');
            const match = invoice.rawText.match(regex);
            if (match && match[1]) {
              sourceValue = match[1].trim();
            }
          }
          
          if (sourceValue && !normalizedInvoice[targetField]) {
            normalizedInvoice[targetField] = sourceValue;
            proposedCorrections.push(
              `Mapped "${sourceField}" to "${targetField}" (confidence: ${vendorMemory.confidence.toFixed(2)})`
            );
            reasoningParts.push(
              `Vendor pattern "${vendorMemory.pattern}": ${sourceField} → ${targetField}`
            );
            totalConfidence += vendorMemory.confidence;
            confidenceCount++;
          }
        }

        // Apply vendor behaviors
        if (vendorMemory.behavior.currency && !normalizedInvoice.currency) {
          normalizedInvoice.currency = vendorMemory.behavior.currency;
          proposedCorrections.push(`Inferred currency: ${vendorMemory.behavior.currency}`);
          reasoningParts.push(`Vendor default currency: ${vendorMemory.behavior.currency}`);
        }
      }
    }

    // Apply correction memories
    for (const correctionMemory of recall.correctionMemories) {
      if (correctionMemory.confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
        const contextMatch = this.matchesContext(invoice, correctionMemory.context);
        
        if (contextMatch) {
          const originalValue = this.getFieldValue(invoice, correctionMemory.originalValue);
          if (originalValue !== undefined) {
            const correctedValue = correctionMemory.correctedValue;
            normalizedInvoice[correctionMemory.correctionType] = correctedValue;
            
            proposedCorrections.push(
              `Correction: ${correctionMemory.correctionType} from "${originalValue}" to "${correctedValue}" ` +
              `(confidence: ${correctionMemory.confidence.toFixed(2)}, pattern: ${correctionMemory.pattern})`
            );
            reasoningParts.push(
              `Learned correction pattern "${correctionMemory.pattern}": ${correctionMemory.correctionType}`
            );
            totalConfidence += correctionMemory.confidence;
            confidenceCount++;
          }
        }
      }
    }

    // Check for tax-related corrections (e.g., "MwSt. inkl." / "Prices incl. VAT")
    const taxInclusivePattern = /(MwSt\.?\s*inkl\.?|Prices?\s*incl\.?\s*VAT|VAT\s*included)/i;
    if (invoice.rawText && taxInclusivePattern.test(invoice.rawText)) {
      const taxMemory = recall.correctionMemories.find(
        m => m.pattern.includes('tax') || m.pattern.includes('VAT')
      );
      
      if (taxMemory && taxMemory.confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
        // Suggest tax recalculation
        proposedCorrections.push(
          `Tax-inclusive pricing detected. Recompute tax and gross amounts.`
        );
        reasoningParts.push(`Tax-inclusive pattern detected (learned from past corrections)`);
      }
    }

    // Check for SKU mappings (e.g., "Seefracht/Shipping" → SKU FREIGHT)
    for (const item of normalizedInvoice.lineItems || []) {
      const skuMemory = recall.vendorMemories.find(
        m => m.pattern.includes('sku') || m.behavior.skuMappings
      );
      
      if (skuMemory && skuMemory.behavior.skuMappings) {
        for (const [description, sku] of Object.entries(skuMemory.behavior.skuMappings)) {
          if (item.description.toLowerCase().includes(description.toLowerCase()) && !item.sku) {
            item.sku = sku as string;
            proposedCorrections.push(`Mapped description "${item.description}" to SKU "${sku}"`);
            reasoningParts.push(`Vendor SKU mapping: ${description} → ${sku}`);
          }
        }
      }
    }

    const confidenceScore = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    const reasoning = reasoningParts.length > 0 
      ? reasoningParts.join('; ') 
      : 'No applicable memories found for this invoice.';

    return {
      normalizedInvoice,
      proposedCorrections,
      reasoning,
      confidenceScore
    };
  }

  /**
   * DECIDE: Determine whether to auto-accept, auto-correct, or escalate
   */
  decide(
    invoice: Invoice,
    recall: MemoryRecall,
    applied: ReturnType<typeof this.apply>
  ): {
    requiresHumanReview: boolean;
    decisionReasoning: string;
  } {
    const decisionParts: string[] = [];
    let requiresHumanReview = false;

    // Check for duplicates
    const isDuplicate = this.db.checkDuplicateInvoice(
      invoice.invoiceNumber,
      invoice.vendor,
      invoice.date
    );

    if (isDuplicate) {
      requiresHumanReview = true;
      decisionParts.push('Potential duplicate invoice detected');
    }

    // Low confidence → require review
    if (applied.confidenceScore < this.MIN_CONFIDENCE_THRESHOLD && applied.proposedCorrections.length > 0) {
      requiresHumanReview = true;
      decisionParts.push(
        `Low confidence score (${applied.confidenceScore.toFixed(2)}) for proposed corrections`
      );
    }

    // High confidence with successful history → auto-apply
    if (applied.confidenceScore >= this.HIGH_CONFIDENCE_THRESHOLD) {
      const highConfidenceMemories = recall.correctionMemories.filter(
        m => m.confidence >= this.HIGH_CONFIDENCE_THRESHOLD && m.successCount > 3
      );
      
      if (highConfidenceMemories.length > 0) {
        decisionParts.push(
          `High confidence memories (${highConfidenceMemories.length}) with proven success history`
        );
        // Could auto-apply here, but for safety, we'll still flag for review
        // requiresHumanReview = false; // Uncomment for auto-apply
      }
    }

    // Check resolution memory for similar discrepancies
    for (const resolutionMemory of recall.resolutionMemories) {
      if (resolutionMemory.resolution === 'human_rejected') {
        requiresHumanReview = true;
        decisionParts.push(
          `Similar discrepancy previously rejected by human (${resolutionMemory.discrepancyType})`
        );
      }
    }

    // If no memories apply and there are issues, require review
    if (applied.proposedCorrections.length === 0 && this.hasDiscrepancies(invoice)) {
      requiresHumanReview = true;
      decisionParts.push('No applicable memories found for detected discrepancies');
    }

    // If we have corrections but they're not high confidence, require review
    if (applied.proposedCorrections.length > 0 && applied.confidenceScore < this.HIGH_CONFIDENCE_THRESHOLD) {
      requiresHumanReview = true;
      decisionParts.push('Corrections require human verification due to confidence level');
    }

    const decisionReasoning = decisionParts.length > 0
      ? decisionParts.join('; ')
      : 'Invoice appears normal based on learned patterns.';

    return {
      requiresHumanReview,
      decisionReasoning
    };
  }

  /**
   * LEARN: Store new insights from human corrections and outcomes
   */
  learn(invoice: Invoice, correction: HumanCorrection, recall: MemoryRecall): string[] {
    const memoryUpdates: string[] = [];
    const now = new Date().toISOString();

    // Learn from vendor-specific patterns
    for (const correctionItem of correction.corrections) {
      // Extract source field from reason or invoice extractedFields
      let sourceField: string | undefined;
      
      // Try to extract from reason (e.g., "Map 'Leistungsdatum' field to serviceDate")
      const reasonMatch = correctionItem.reason.match(/["']([^"']+)["']/);
      if (reasonMatch) {
        sourceField = reasonMatch[1];
      } else {
        // Try to find in extractedFields by matching the corrected value
        if (invoice.extractedFields) {
          for (const [key, value] of Object.entries(invoice.extractedFields)) {
            if (String(value) === String(correctionItem.correctedValue)) {
              sourceField = key;
              break;
            }
          }
        }
      }

      // Handle currency inference
      if (correctionItem.field === 'currency') {
        const currencyMemory = recall.vendorMemories.find(
          m => m.vendor === invoice.vendor && m.behavior.currency
        );

        if (currencyMemory) {
          // Reinforce existing currency memory
          currencyMemory.confidence = Math.min(1.0, currencyMemory.confidence + this.CONFIDENCE_REINFORCEMENT);
          currencyMemory.usageCount++;
          currencyMemory.lastUsed = now;
          currencyMemory.updatedAt = now;
          this.db.saveVendorMemory(currencyMemory);
          memoryUpdates.push(`Reinforced currency memory: ${correctionItem.correctedValue}`);
        } else {
          // Create new vendor memory with currency behavior
          const newMemory: VendorMemory = {
            id: uuidv4(),
            vendor: invoice.vendor,
            pattern: 'currency_default',
            fieldMapping: {},
            behavior: {
              currency: correctionItem.correctedValue
            },
            confidence: 0.7,
            usageCount: 1,
            lastUsed: now,
            createdAt: now,
            updatedAt: now
          };
          this.db.saveVendorMemory(newMemory);
          memoryUpdates.push(`Created currency memory: ${correctionItem.correctedValue}`);
        }
      } else if (correctionItem.field === 'sku') {
        // Extract description from reason or invoice line items
        let description: string | undefined;
        const reasonMatch = correctionItem.reason.match(/["']([^"']+)["']/);
        if (reasonMatch) {
          description = reasonMatch[1];
        } else if (invoice.lineItems && invoice.lineItems.length > 0) {
          // Use first line item description if no match found
          description = invoice.lineItems[0].description;
        }

        if (description) {
          const skuMemory = recall.vendorMemories.find(
            m => m.vendor === invoice.vendor && m.behavior.skuMappings
          );

          if (skuMemory) {
            // Add or update SKU mapping
            if (!skuMemory.behavior.skuMappings) {
              skuMemory.behavior.skuMappings = {};
            }
            skuMemory.behavior.skuMappings[description] = correctionItem.correctedValue;
            skuMemory.confidence = Math.min(1.0, skuMemory.confidence + this.CONFIDENCE_REINFORCEMENT);
            skuMemory.usageCount++;
            skuMemory.lastUsed = now;
            skuMemory.updatedAt = now;
            this.db.saveVendorMemory(skuMemory);
            memoryUpdates.push(`Updated SKU mapping: ${description} → ${correctionItem.correctedValue}`);
          } else {
            // Create new vendor memory with SKU mapping
            const newMemory: VendorMemory = {
              id: uuidv4(),
              vendor: invoice.vendor,
              pattern: 'sku_mapping',
              fieldMapping: {},
              behavior: {
                skuMappings: {
                  [description]: correctionItem.correctedValue
                }
              },
              confidence: 0.7,
              usageCount: 1,
              lastUsed: now,
              createdAt: now,
              updatedAt: now
            };
            this.db.saveVendorMemory(newMemory);
            memoryUpdates.push(`Created SKU mapping: ${description} → ${correctionItem.correctedValue}`);
          }
        }
      } else if (sourceField && sourceField !== correctionItem.field) {
        // Handle regular field mappings
        const vendorMemory = recall.vendorMemories.find(
          m => m.vendor === invoice.vendor && 
               Object.keys(m.fieldMapping).includes(sourceField!) &&
               m.fieldMapping[sourceField!] === correctionItem.field
        );

        if (vendorMemory) {
          // Reinforce existing memory
          vendorMemory.confidence = Math.min(1.0, vendorMemory.confidence + this.CONFIDENCE_REINFORCEMENT);
          vendorMemory.usageCount++;
          vendorMemory.lastUsed = now;
          vendorMemory.updatedAt = now;
          this.db.saveVendorMemory(vendorMemory);
          memoryUpdates.push(`Reinforced vendor memory: ${vendorMemory.pattern} (confidence: ${vendorMemory.confidence.toFixed(2)})`);
        } else {
          // Create new vendor memory with proper field mapping
          const newMemory: VendorMemory = {
            id: uuidv4(),
            vendor: invoice.vendor,
            pattern: `${sourceField}_to_${correctionItem.field}_mapping`,
            fieldMapping: { [sourceField]: correctionItem.field },
            behavior: {},
            confidence: 0.7,
            usageCount: 1,
            lastUsed: now,
            createdAt: now,
            updatedAt: now
          };
          this.db.saveVendorMemory(newMemory);
          memoryUpdates.push(`Created new vendor memory: ${newMemory.pattern} (${sourceField} → ${correctionItem.field})`);
        }
      }

      // Create or update correction memory
      const correctionPattern = `${correctionItem.field}_${invoice.vendor || 'general'}`;
      const existingCorrection = recall.correctionMemories.find(
        m => m.pattern === correctionPattern && 
             m.correctionType === correctionItem.field &&
             ((m.originalValue === undefined && correctionItem.originalValue === undefined) ||
              (m.originalValue !== undefined && correctionItem.originalValue !== undefined &&
               JSON.stringify(m.originalValue) === JSON.stringify(correctionItem.originalValue)))
      );

      if (existingCorrection) {
        // Reinforce existing correction
        existingCorrection.confidence = Math.min(1.0, existingCorrection.confidence + this.CONFIDENCE_REINFORCEMENT);
        existingCorrection.usageCount++;
        existingCorrection.successCount += correction.resolution === 'approved' ? 1 : 0;
        existingCorrection.lastUsed = now;
        existingCorrection.updatedAt = now;
        this.db.saveCorrectionMemory(existingCorrection);
        memoryUpdates.push(`Reinforced correction memory: ${correctionPattern}`);
      } else {
        // Create new correction memory
        const newCorrection: CorrectionMemory = {
          id: uuidv4(),
          vendor: invoice.vendor,
          pattern: correctionPattern,
          correctionType: correctionItem.field,
          originalValue: correctionItem.originalValue,
          correctedValue: correctionItem.correctedValue,
          context: { vendor: invoice.vendor, invoiceType: 'standard' },
          confidence: 0.7,
          usageCount: 1,
          successCount: correction.resolution === 'approved' ? 1 : 0,
          lastUsed: now,
          createdAt: now,
          updatedAt: now
        };
        this.db.saveCorrectionMemory(newCorrection);
        memoryUpdates.push(`Created new correction memory: ${correctionPattern}`);
      }
    }

    // Learn resolution patterns
    const discrepancyType = this.identifyDiscrepancyType(invoice, correction);
    const resolutionMemory: ResolutionMemory = {
      id: uuidv4(),
      vendor: invoice.vendor,
      discrepancyType,
      resolution: correction.resolution === 'approved' ? 'human_approved' : 'human_rejected',
      context: { vendor: invoice.vendor, corrections: correction.corrections.length },
      confidence: 0.8,
      usageCount: 1,
      lastUsed: now,
      createdAt: now,
      updatedAt: now
    };
    this.db.saveResolutionMemory(resolutionMemory);
    memoryUpdates.push(`Stored resolution memory: ${discrepancyType} → ${resolutionMemory.resolution}`);

    return memoryUpdates;
  }

  // Helper methods
  private applyDecay(
    vendorMemories: VendorMemory[],
    correctionMemories: CorrectionMemory[],
    resolutionMemories: ResolutionMemory[]
  ): void {
    const now = Date.now();

    for (const memory of [...vendorMemories, ...correctionMemories, ...resolutionMemories]) {
      const lastUsed = new Date(memory.lastUsed).getTime();
      const daysSinceUse = (now - lastUsed) / (24 * 60 * 60 * 1000);
      
      if (daysSinceUse > 30) {
        const decayFactor = Math.floor(daysSinceUse / 30);
        memory.confidence = Math.max(0.1, memory.confidence - (decayFactor * this.CONFIDENCE_DECAY_RATE));
        
        // Update in database
        if ('fieldMapping' in memory) {
          this.db.saveVendorMemory(memory as VendorMemory);
        } else if ('correctionType' in memory) {
          this.db.saveCorrectionMemory(memory as CorrectionMemory);
        } else {
          this.db.saveResolutionMemory(memory as ResolutionMemory);
        }
      }
    }
  }

  private matchesContext(invoice: Invoice, context: Record<string, any>): boolean {
    if (context.vendor && context.vendor !== invoice.vendor) {
      return false;
    }
    // Add more context matching logic as needed
    return true;
  }

  private getFieldValue(invoice: Invoice, fieldPath: any): any {
    if (typeof fieldPath === 'string') {
      return invoice[fieldPath] || invoice.extractedFields?.[fieldPath];
    }
    return fieldPath;
  }

  private hasDiscrepancies(invoice: Invoice): boolean {
    // Check for common discrepancies
    if (!invoice.currency && invoice.totalAmount > 0) return true;
    if (!invoice.serviceDate && invoice.date) return true;
    if (invoice.lineItems && invoice.lineItems.some(item => !item.sku && item.description)) return true;
    return false;
  }

  private identifyDiscrepancyType(_invoice: Invoice, correction: HumanCorrection): string {
    const types = correction.corrections.map(c => c.field);
    return types.join('_') || 'general_discrepancy';
  }

  recordProcessedInvoice(invoiceId: string, invoiceNumber: string, vendor: string, date: string): void {
    this.db.recordProcessedInvoice(invoiceId, invoiceNumber, vendor, date);
  }

  close(): void {
    this.db.close();
  }
}

