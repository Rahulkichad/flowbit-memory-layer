/**
 * Script to inspect and display memory database contents in a readable format
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';

const dbPath = './memory.db';

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database file not found. Run the demo first to create it.');
  process.exit(1);
}

const db = new Database(dbPath);

console.log('\n' + '='.repeat(80));
console.log('  MEMORY DATABASE CONTENTS');
console.log('='.repeat(80) + '\n');

// Vendor Memory
console.log('📦 VENDOR MEMORY');
console.log('-'.repeat(80));
const vendorMemories = db.prepare('SELECT * FROM vendor_memory').all() as any[];
if (vendorMemories.length === 0) {
  console.log('  No vendor memories stored.\n');
} else {
  vendorMemories.forEach((vm, idx) => {
    console.log(`\n  ${idx + 1}. ${vm.vendor}`);
    console.log(`     Pattern: ${vm.pattern}`);
    console.log(`     Field Mapping: ${vm.field_mapping}`);
    console.log(`     Behavior: ${vm.behavior}`);
    console.log(`     Confidence: ${vm.confidence}`);
    console.log(`     Usage Count: ${vm.usage_count}`);
    console.log(`     Last Used: ${vm.last_used}`);
  });
}

// Correction Memory
console.log('\n\n🔧 CORRECTION MEMORY');
console.log('-'.repeat(80));
const correctionMemories = db.prepare('SELECT * FROM correction_memory').all() as any[];
if (correctionMemories.length === 0) {
  console.log('  No correction memories stored.\n');
} else {
  correctionMemories.forEach((cm, idx) => {
    console.log(`\n  ${idx + 1}. ${cm.vendor || 'General'}`);
    console.log(`     Pattern: ${cm.pattern}`);
    console.log(`     Correction Type: ${cm.correction_type}`);
    console.log(`     Original Value: ${cm.original_value || 'undefined'}`);
    console.log(`     Corrected Value: ${cm.corrected_value}`);
    console.log(`     Confidence: ${cm.confidence}`);
    console.log(`     Usage Count: ${cm.usage_count}`);
    console.log(`     Success Count: ${cm.success_count}`);
    console.log(`     Last Used: ${cm.last_used}`);
  });
}

// Resolution Memory
console.log('\n\n✅ RESOLUTION MEMORY');
console.log('-'.repeat(80));
const resolutionMemories = db.prepare('SELECT * FROM resolution_memory').all() as any[];
if (resolutionMemories.length === 0) {
  console.log('  No resolution memories stored.\n');
} else {
  resolutionMemories.forEach((rm, idx) => {
    console.log(`\n  ${idx + 1}. ${rm.vendor || 'General'}`);
    console.log(`     Discrepancy Type: ${rm.discrepancy_type}`);
    console.log(`     Resolution: ${rm.resolution}`);
    console.log(`     Confidence: ${rm.confidence}`);
    console.log(`     Usage Count: ${rm.usage_count}`);
    console.log(`     Last Used: ${rm.last_used}`);
  });
}

// Processed Invoices
console.log('\n\n📄 PROCESSED INVOICES (for duplicate detection)');
console.log('-'.repeat(80));
const processedInvoices = db.prepare('SELECT * FROM processed_invoices').all() as any[];
if (processedInvoices.length === 0) {
  console.log('  No processed invoices recorded.\n');
} else {
  processedInvoices.forEach((pi, idx) => {
    console.log(`\n  ${idx + 1}. ${pi.invoice_id}`);
    console.log(`     Invoice Number: ${pi.invoice_number}`);
    console.log(`     Vendor: ${pi.vendor}`);
    console.log(`     Date: ${pi.date}`);
    console.log(`     Processed At: ${pi.processed_at}`);
  });
}

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('  SUMMARY');
console.log('='.repeat(80));
console.log(`  Vendor Memories: ${vendorMemories.length}`);
console.log(`  Correction Memories: ${correctionMemories.length}`);
console.log(`  Resolution Memories: ${resolutionMemories.length}`);
console.log(`  Processed Invoices: ${processedInvoices.length}`);
console.log('='.repeat(80) + '\n');

db.close();

