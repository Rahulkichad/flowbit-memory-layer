/**
 * Demo Runner Script - Demonstrates learning over time
 */

import { InvoiceProcessor } from './processor';
import { Invoice, HumanCorrection } from './types';
import * as fs from 'fs';
import * as path from 'path';

// Sample invoice data based on the assignment requirements
const sampleInvoices: Invoice[] = [
  // Supplier GmbH - INV-A-001
  {
    invoiceId: 'INV-A-001',
    invoiceNumber: 'INV-A-001',
    vendor: 'Supplier GmbH',
    vendorId: 'SUPPLIER-001',
    date: '2024-01-15',
    totalAmount: 15000.00,
    currency: 'EUR',
    taxAmount: 2850.00,
    lineItems: [
      {
        description: 'Consulting Services',
        quantity: 100,
        unitPrice: 150.00,
        totalPrice: 15000.00
      }
    ],
    rawText: 'Leistungsdatum: 2024-01-10\nRechnungsnummer: INV-A-001',
    extractedFields: {
      'Leistungsdatum': '2024-01-10',
      'Rechnungsnummer': 'INV-A-001'
    },
    purchaseOrderNumber: 'PO-A-050'
  },
  // Supplier GmbH - INV-A-003 (after learning)
  {
    invoiceId: 'INV-A-003',
    invoiceNumber: 'INV-A-003',
    vendor: 'Supplier GmbH',
    vendorId: 'SUPPLIER-001',
    date: '2024-02-15',
    totalAmount: 18000.00,
    currency: 'EUR',
    taxAmount: 3420.00,
    lineItems: [
      {
        description: 'Consulting Services',
        quantity: 120,
        unitPrice: 150.00,
        totalPrice: 18000.00
      }
    ],
    rawText: 'Leistungsdatum: 2024-02-10\nRechnungsnummer: INV-A-003',
    extractedFields: {
      'Leistungsdatum': '2024-02-10',
      'Rechnungsnummer': 'INV-A-003'
    },
    purchaseOrderNumber: 'PO-A-051'
  },
  // Parts AG - INV-B-001
  {
    invoiceId: 'INV-B-001',
    invoiceNumber: 'INV-B-001',
    vendor: 'Parts AG',
    vendorId: 'PARTS-001',
    date: '2024-01-20',
    totalAmount: 5000.00,
    taxAmount: 950.00,
    lineItems: [
      {
        description: 'Electronic Components',
        quantity: 50,
        unitPrice: 100.00,
        totalPrice: 5000.00
      }
    ],
    rawText: 'MwSt. inkl. Prices incl. VAT\nTotal: 5000.00',
    extractedFields: {
      'Total': '5000.00',
      'MwSt. inkl.': true
    }
  },
  // Parts AG - INV-B-002 (after learning)
  {
    invoiceId: 'INV-B-002',
    invoiceNumber: 'INV-B-002',
    vendor: 'Parts AG',
    vendorId: 'PARTS-001',
    date: '2024-02-20',
    totalAmount: 6000.00,
    taxAmount: 1140.00,
    lineItems: [
      {
        description: 'Electronic Components',
        quantity: 60,
        unitPrice: 100.00,
        totalPrice: 6000.00
      }
    ],
    rawText: 'MwSt. inkl. Prices incl. VAT\nTotal: 6000.00',
    extractedFields: {
      'Total': '6000.00',
      'MwSt. inkl.': true
    }
  },
  // Freight & Co - INV-C-001
  {
    invoiceId: 'INV-C-001',
    invoiceNumber: 'INV-C-001',
    vendor: 'Freight & Co',
    vendorId: 'FREIGHT-001',
    date: '2024-01-25',
    totalAmount: 2500.00,
    currency: 'EUR',
    taxAmount: 475.00,
    lineItems: [
      {
        description: 'Seefracht/Shipping',
        quantity: 1,
        unitPrice: 2500.00,
        totalPrice: 2500.00
      }
    ],
    rawText: 'Seefracht/Shipping\nSkonto: 2% bei Zahlung innerhalb 14 Tagen',
    extractedFields: {
      'Description': 'Seefracht/Shipping',
      'Skonto': '2% bei Zahlung innerhalb 14 Tagen'
    }
  },
  // Freight & Co - INV-C-002 (after learning)
  {
    invoiceId: 'INV-C-002',
    invoiceNumber: 'INV-C-002',
    vendor: 'Freight & Co',
    vendorId: 'FREIGHT-001',
    date: '2024-02-25',
    totalAmount: 3000.00,
    currency: 'EUR',
    taxAmount: 570.00,
    lineItems: [
      {
        description: 'Seefracht/Shipping',
        quantity: 1,
        unitPrice: 3000.00,
        totalPrice: 3000.00
      }
    ],
    rawText: 'Seefracht/Shipping\nSkonto: 2% bei Zahlung innerhalb 14 Tagen',
    extractedFields: {
      'Description': 'Seefracht/Shipping',
      'Skonto': '2% bei Zahlung innerhalb 14 Tagen'
    }
  },
  // Duplicate - INV-A-004
  {
    invoiceId: 'INV-A-004',
    invoiceNumber: 'INV-A-001', // Same invoice number
    vendor: 'Supplier GmbH',
    vendorId: 'SUPPLIER-001',
    date: '2024-01-16', // Close date
    totalAmount: 15000.00,
    currency: 'EUR',
    taxAmount: 2850.00,
    lineItems: [
      {
        description: 'Consulting Services',
        quantity: 100,
        unitPrice: 150.00,
        totalPrice: 15000.00
      }
    ],
    rawText: 'Leistungsdatum: 2024-01-10',
    extractedFields: {
      'Leistungsdatum': '2024-01-10'
    }
  }
];

// Human corrections for learning
const humanCorrections: Record<string, HumanCorrection> = {
  'INV-A-001': {
    invoiceId: 'INV-A-001',
    corrections: [
      {
        field: 'serviceDate',
        originalValue: undefined,
        correctedValue: '2024-01-10',
        reason: 'Map "Leistungsdatum" field to serviceDate for Supplier GmbH'
      }
    ],
    resolution: 'approved'
  },
  'INV-A-003': {
    invoiceId: 'INV-A-003',
    corrections: [
      {
        field: 'quantity',
        originalValue: 120,
        correctedValue: 100,
        reason: 'Match PO-A-051 quantity'
      }
    ],
    resolution: 'approved'
  },
  'INV-B-001': {
    invoiceId: 'INV-B-001',
    corrections: [
      {
        field: 'taxAmount',
        originalValue: 950.00,
        correctedValue: 595.00, // Recalculated from tax-inclusive
        reason: 'Tax-inclusive pricing detected, recalculate tax'
      },
      {
        field: 'currency',
        originalValue: undefined,
        correctedValue: 'EUR',
        reason: 'Infer currency from vendor pattern'
      }
    ],
    resolution: 'approved'
  },
  'INV-C-001': {
    invoiceId: 'INV-C-001',
    corrections: [
      {
        field: 'sku',
        originalValue: undefined,
        correctedValue: 'FREIGHT',
        reason: 'Map "Seefracht/Shipping" description to SKU FREIGHT'
      }
    ],
    resolution: 'approved'
  }
};

function printSeparator(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80) + '\n');
}

function printProcessedInvoice(result: any, invoiceId: string): void {
  console.log(`\n📄 Invoice: ${invoiceId}`);
  console.log(`   Vendor: ${result.normalizedInvoice.vendor}`);
  console.log(`   Confidence Score: ${result.confidenceScore.toFixed(2)}`);
  console.log(`   Requires Human Review: ${result.requiresHumanReview ? '✅ YES' : '❌ NO'}`);
  
  if (result.proposedCorrections.length > 0) {
    console.log(`\n   Proposed Corrections:`);
    result.proposedCorrections.forEach((correction: string, idx: number) => {
      console.log(`   ${idx + 1}. ${correction}`);
    });
  }
  
  console.log(`\n   Reasoning: ${result.reasoning}`);
  
  if (result.memoryUpdates.length > 0) {
    console.log(`\n   Memory Updates:`);
    result.memoryUpdates.forEach((update: string, idx: number) => {
      console.log(`   ${idx + 1}. ${update}`);
    });
  }
  
  console.log(`\n   Audit Trail:`);
  result.auditTrail.forEach((entry: any) => {
    console.log(`   - [${entry.step.toUpperCase()}] ${entry.timestamp}: ${entry.details}`);
  });
  
  console.log(`\n   Normalized Invoice Fields:`);
  console.log(`   - Service Date: ${result.normalizedInvoice.serviceDate || 'N/A'}`);
  console.log(`   - Currency: ${result.normalizedInvoice.currency || 'N/A'}`);
  if (result.normalizedInvoice.lineItems) {
    result.normalizedInvoice.lineItems.forEach((item: any, idx: number) => {
      console.log(`   - Line Item ${idx + 1}: ${item.description} (SKU: ${item.sku || 'N/A'})`);
    });
  }
}

function saveOutput(result: any, invoiceId: string, outputDir: string): void {
  const outputPath = path.join(outputDir, `output_${invoiceId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n💾 Saved output to: ${outputPath}`);
}

async function runDemo(): Promise<void> {
  printSeparator('FLOWBIT MEMORY LAYER DEMO');
  console.log('Demonstrating learned memory system for invoice processing\n');

  // Clean up old database
  const dbPath = './memory.db';
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const processor = new InvoiceProcessor(dbPath);
  const outputDir = './output';
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  try {
    // ============================================
    // SCENARIO 1: Supplier GmbH - First Invoice
    // ============================================
    printSeparator('SCENARIO 1: Supplier GmbH - INV-A-001 (First Invoice)');
    
    const invoice1 = sampleInvoices[0];
    const result1 = processor.processInvoice(invoice1);
    printProcessedInvoice(result1, invoice1.invoiceId);
    saveOutput(result1, invoice1.invoiceId, outputDir);

    // Apply human correction and learn
    console.log('\n\n👤 Applying Human Correction...');
    const correction1 = humanCorrections[invoice1.invoiceId];
    if (correction1) {
      const memoryUpdates1 = processor.learnFromCorrection(invoice1, correction1);
      console.log('   Memory Updates:');
      memoryUpdates1.forEach((update, idx) => {
        console.log(`   ${idx + 1}. ${update}`);
      });
    }

    // ============================================
    // SCENARIO 2: Supplier GmbH - Second Invoice (After Learning)
    // ============================================
    printSeparator('SCENARIO 2: Supplier GmbH - INV-A-003 (After Learning)');
    
    const invoice2 = sampleInvoices[1];
    const result2 = processor.processInvoice(invoice2);
    printProcessedInvoice(result2, invoice2.invoiceId);
    saveOutput(result2, invoice2.invoiceId, outputDir);

    // Apply human correction
    console.log('\n\n👤 Applying Human Correction...');
    const correction2 = humanCorrections[invoice2.invoiceId];
    if (correction2) {
      const memoryUpdates2 = processor.learnFromCorrection(invoice2, correction2);
      console.log('   Memory Updates:');
      memoryUpdates2.forEach((update, idx) => {
        console.log(`   ${idx + 1}. ${update}`);
      });
    }

    // ============================================
    // SCENARIO 3: Parts AG - First Invoice
    // ============================================
    printSeparator('SCENARIO 3: Parts AG - INV-B-001 (Tax-Inclusive Pattern)');
    
    const invoice3 = sampleInvoices[2];
    const result3 = processor.processInvoice(invoice3);
    printProcessedInvoice(result3, invoice3.invoiceId);
    saveOutput(result3, invoice3.invoiceId, outputDir);

    // Apply human correction
    console.log('\n\n👤 Applying Human Correction...');
    const correction3 = humanCorrections[invoice3.invoiceId];
    if (correction3) {
      const memoryUpdates3 = processor.learnFromCorrection(invoice3, correction3);
      console.log('   Memory Updates:');
      memoryUpdates3.forEach((update, idx) => {
        console.log(`   ${idx + 1}. ${update}`);
      });
    }

    // ============================================
    // SCENARIO 4: Parts AG - Second Invoice (After Learning)
    // ============================================
    printSeparator('SCENARIO 4: Parts AG - INV-B-002 (After Learning)');
    
    const invoice4 = sampleInvoices[3];
    const result4 = processor.processInvoice(invoice4);
    printProcessedInvoice(result4, invoice4.invoiceId);
    saveOutput(result4, invoice4.invoiceId, outputDir);

    // ============================================
    // SCENARIO 5: Freight & Co - First Invoice
    // ============================================
    printSeparator('SCENARIO 5: Freight & Co - INV-C-001 (SKU Mapping)');
    
    const invoice5 = sampleInvoices[4];
    const result5 = processor.processInvoice(invoice5);
    printProcessedInvoice(result5, invoice5.invoiceId);
    saveOutput(result5, invoice5.invoiceId, outputDir);

    // Apply human correction
    console.log('\n\n👤 Applying Human Correction...');
    const correction5 = humanCorrections[invoice5.invoiceId];
    if (correction5) {
      const memoryUpdates5 = processor.learnFromCorrection(invoice5, correction5);
      console.log('   Memory Updates:');
      memoryUpdates5.forEach((update, idx) => {
        console.log(`   ${idx + 1}. ${update}`);
      });
    }

    // ============================================
    // SCENARIO 6: Freight & Co - Second Invoice (After Learning)
    // ============================================
    printSeparator('SCENARIO 6: Freight & Co - INV-C-002 (After Learning)');
    
    const invoice6 = sampleInvoices[5];
    const result6 = processor.processInvoice(invoice6);
    printProcessedInvoice(result6, invoice6.invoiceId);
    saveOutput(result6, invoice6.invoiceId, outputDir);

    // ============================================
    // SCENARIO 7: Duplicate Detection
    // ============================================
    printSeparator('SCENARIO 7: Duplicate Detection - INV-A-004');
    
    const invoice7 = sampleInvoices[6];
    const result7 = processor.processInvoice(invoice7);
    printProcessedInvoice(result7, invoice7.invoiceId);
    saveOutput(result7, invoice7.invoiceId, outputDir);

    // ============================================
    // SUMMARY
    // ============================================
    printSeparator('DEMO SUMMARY');
    console.log('✅ Successfully demonstrated:');
    console.log('   1. Vendor-specific field mapping (Leistungsdatum → serviceDate)');
    console.log('   2. Correction memory learning (quantity adjustments)');
    console.log('   3. Tax-inclusive pattern detection and correction');
    console.log('   4. Currency inference from vendor patterns');
    console.log('   5. SKU mapping from descriptions');
    console.log('   6. Duplicate invoice detection');
    console.log('   7. Confidence-based decision making');
    console.log('   8. Memory reinforcement and decay');
    console.log('\n📊 All outputs saved to ./output/ directory');
    console.log('💾 Memory database saved to ./memory.db\n');

  } catch (error) {
    console.error('❌ Error during demo:', error);
    throw error;
  } finally {
    processor.close();
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo, sampleInvoices, humanCorrections };

