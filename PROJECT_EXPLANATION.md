# Flowbit Learned Memory System - Complete Project Explanation

## 🎯 Project Purpose

This is a **Learned Memory System** for AI agent document automation. The system processes invoices and learns from human corrections to improve accuracy over time, rather than treating every invoice as a new entry.

## 🔄 Complete Project Flow

### **Phase 1: Invoice Processing Pipeline**

When a new invoice arrives, the system follows this flow:

```
Invoice Arrives
    ↓
┌─────────────────────────────────────┐
│  1. RECALL (Memory Retrieval)       │
│     - Get vendor-specific memories  │
│     - Get correction patterns       │
│     - Get resolution history        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  2. APPLY (Memory Application)      │
│     - Map fields (e.g., Leistungs-  │
│       datum → serviceDate)          │
│     - Suggest corrections            │
│     - Calculate confidence score    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  3. DECIDE (Decision Making)        │
│     - Check confidence level        │
│     - Detect duplicates             │
│     - Determine:                     │
│       • Auto-accept                 │
│       • Auto-correct                │
│       • Escalate for review         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  4. OUTPUT                          │
│     - Normalized invoice            │
│     - Proposed corrections         │
│     - Reasoning                     │
│     - Audit trail                   │
└─────────────────────────────────────┘
```

### **Phase 2: Learning from Human Corrections**

When a human corrects the invoice:

```
Human Provides Correction
    ↓
┌─────────────────────────────────────┐
│  5. LEARN (Memory Storage)          │
│     - Store vendor patterns         │
│     - Record correction patterns    │
│     - Track resolution outcomes     │
│     - Update confidence scores      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Memory Reinforced                  │
│  (Next similar invoice will use     │
│   this learned pattern)             │
└─────────────────────────────────────┘
```

## 📊 Detailed Component Flow

### **1. Database Layer (`src/database.ts`)**

**Purpose**: Persistent storage using SQLite

**Tables**:
- `vendor_memory`: Vendor-specific patterns (field mappings, behaviors)
- `correction_memory`: Learned correction patterns
- `resolution_memory`: How discrepancies were resolved
- `processed_invoices`: Track processed invoices for duplicate detection

**Flow**:
```
Memory Operations
    ↓
SQLite Database
    ↓
Persistent Storage (memory.db)
```

### **2. Memory Layer (`src/memory.ts`)**

**Core Functions**:

#### **RECALL**
```typescript
recall(invoice) → {
  vendorMemories: [...],      // Vendor-specific patterns
  correctionMemories: [...],  // Correction patterns
  resolutionMemories: [...]   // Resolution history
}
```

**What it does**:
- Queries database for vendor-specific memories
- Retrieves relevant correction patterns
- Gets resolution history
- Applies confidence decay for unused memories

#### **APPLY**
```typescript
apply(invoice, recall) → {
  normalizedInvoice: {...},    // Invoice with corrections
  proposedCorrections: [...],   // List of suggested changes
  reasoning: "...",             // Why corrections were made
  confidenceScore: 0.85         // How confident we are
}
```

**What it does**:
- Maps vendor-specific fields (e.g., "Leistungsdatum" → serviceDate)
- Applies learned corrections
- Detects patterns (tax-inclusive, SKU mappings)
- Calculates confidence score

#### **DECIDE**
```typescript
decide(invoice, recall, applied) → {
  requiresHumanReview: true/false,
  decisionReasoning: "..."
}
```

**Decision Logic**:
- **High Confidence (≥0.8) + Success History**: Could auto-apply
- **Medium Confidence (0.6-0.8)**: Suggest but require review
- **Low Confidence (<0.6)**: Flag for review
- **Duplicates**: Always flag
- **Previously Rejected**: Flag for review

#### **LEARN**
```typescript
learn(invoice, correction, recall) → [
  "Created new vendor memory: ...",
  "Reinforced correction memory: ...",
  ...
]
```

**What it does**:
- Creates/updates vendor memories
- Stores correction patterns
- Records resolution outcomes
- Reinforces successful memories (+10% confidence)
- Weakens unused memories (decay over time)

### **3. Invoice Processor (`src/processor.ts`)**

**Orchestrates the complete pipeline**:

```typescript
processInvoice(invoice) → {
  // Step 1: Recall
  const recall = memoryLayer.recall(invoice);
  
  // Step 2: Apply
  const applied = memoryLayer.apply(invoice, recall);
  
  // Step 3: Decide
  const decision = memoryLayer.decide(invoice, recall, applied);
  
  // Step 4: Record for duplicate detection
  memoryLayer.recordProcessedInvoice(...);
  
  // Return complete result
  return {
    normalizedInvoice,
    proposedCorrections,
    requiresHumanReview,
    reasoning,
    confidenceScore,
    auditTrail
  };
}
```

### **4. Demo Runner (`src/demo.ts`)**

**Demonstrates learning over time**:

**Scenario Flow**:
1. **INV-A-001** (Supplier GmbH)
   - No memory yet → Flags issues
   - Human corrects: "Map Leistungsdatum to serviceDate"
   - System learns and stores memory

2. **INV-A-003** (Same vendor)
   - System recalls learned memory
   - Automatically maps "Leistungsdatum" → serviceDate
   - Shows improved accuracy

3. **INV-B-001** (Parts AG)
   - Detects tax-inclusive pattern
   - Learns currency inference
   - Stores correction patterns

4. **INV-B-002** (Same vendor, after learning)
   - Applies learned patterns automatically
   - Fewer flags, smarter decisions

5. **INV-C-001** (Freight & Co)
   - Learns SKU mapping: "Seefracht/Shipping" → FREIGHT

6. **INV-A-004** (Duplicate)
   - Detected as duplicate (same vendor + invoice number + close date)

## 🧠 Memory Types Explained

### **1. Vendor Memory**
Stores vendor-specific quirks:
```json
{
  "vendor": "Supplier GmbH",
  "pattern": "Leistungsdatum_to_serviceDate_mapping",
  "fieldMapping": {
    "Leistungsdatum": "serviceDate"
  },
  "behavior": {
    "currency": "EUR",  // Default currency
    "skuMappings": {     // Description → SKU mappings
      "Seefracht/Shipping": "FREIGHT"
    }
  },
  "confidence": 0.7,
  "usageCount": 1
}
```

### **2. Correction Memory**
Learns from repeated corrections:
```json
{
  "vendor": "Supplier GmbH",
  "pattern": "quantity_Supplier GmbH",
  "correctionType": "quantity",
  "originalValue": 120,
  "correctedValue": 100,
  "confidence": 0.7,
  "successCount": 1
}
```

### **3. Resolution Memory**
Tracks human decisions:
```json
{
  "vendor": "Supplier GmbH",
  "discrepancyType": "serviceDate",
  "resolution": "human_approved",
  "confidence": 0.8
}
```

## 📈 Learning Progression Example

### **First Invoice (No Memory)**
```
Input: Invoice with "Leistungsdatum: 2024-01-10"
       No serviceDate field

System: No memory found
        Flags for human review
        Confidence: 0.0

Human: Corrects by mapping Leistungsdatum → serviceDate
       Resolution: approved

System: Learns and stores:
        - Vendor memory: Leistungsdatum → serviceDate
        - Correction memory: serviceDate correction
        - Resolution memory: human_approved
```

### **Second Invoice (With Memory)**
```
Input: Invoice with "Leistungsdatum: 2024-02-10"
       No serviceDate field

System: Recalls learned memory
        Applies: Leistungsdatum → serviceDate
        Confidence: 0.7
        Suggests correction

Human: Reviews and approves

System: Reinforces memory
        Confidence: 0.8 (increased)
```

### **Third Invoice (High Confidence)**
```
Input: Invoice with "Leistungsdatum: 2024-03-10"

System: High confidence memory (0.8)
        Applies correction automatically
        Still flags for review (safety)
        But with clear reasoning
```

## 🔍 Key Features

### **1. Confidence-Based Decisions**
- Prevents bad learnings from dominating
- Gradually builds trust
- Provides explainable reasoning

### **2. Memory Decay**
- Unused memories lose confidence over time
- Prevents stale patterns from affecting decisions
- Keeps system adaptive

### **3. Duplicate Detection**
- Tracks processed invoices
- Flags duplicates (same vendor + invoice number + close dates)
- Prevents contradictory learning

### **4. Audit Trail**
Every decision is logged:
```json
{
  "step": "recall|apply|decide|learn",
  "timestamp": "2024-01-15T10:00:00Z",
  "details": "Retrieved 3 vendor memories, 2 correction memories"
}
```

## 🎯 Assignment Requirements Met

✅ **Vendor Memory**: Supplier GmbH learns "Leistungsdatum" → serviceDate  
✅ **Correction Memory**: Quantity mismatches learned and applied  
✅ **Resolution Memory**: Human approval/rejection tracked  
✅ **Tax-Inclusive Detection**: Parts AG pattern detected  
✅ **Currency Inference**: Missing currency recovered  
✅ **SKU Mapping**: Freight & Co learns description → SKU  
✅ **Duplicate Detection**: INV-A-004 flagged as duplicate  
✅ **Confidence Scoring**: All decisions have confidence scores  
✅ **Reasoning**: Every action has explainable reasoning  
✅ **Audit Trail**: Complete transparency  

## 🚀 How to Use

### **1. Process an Invoice**
```typescript
const processor = new InvoiceProcessor();
const result = processor.processInvoice(invoice);
// Returns: normalizedInvoice, proposedCorrections, reasoning, etc.
```

### **2. Learn from Corrections**
```typescript
const correction: HumanCorrection = {
  invoiceId: 'INV-001',
  corrections: [{
    field: 'serviceDate',
    originalValue: undefined,
    correctedValue: '2024-01-10',
    reason: 'Map Leistungsdatum to serviceDate'
  }],
  resolution: 'approved'
};

processor.learnFromCorrection(invoice, correction);
```

### **3. Run Demo**
```bash
npm run demo
```

This demonstrates the complete learning cycle with sample invoices.

## 📊 Output Format

Every processed invoice returns:
```json
{
  "normalizedInvoice": { /* Invoice with corrections applied */ },
  "proposedCorrections": [
    "Mapped \"Leistungsdatum\" to \"serviceDate\" (confidence: 0.85)"
  ],
  "requiresHumanReview": true,
  "reasoning": "Vendor pattern learned from past corrections",
  "confidenceScore": 0.85,
  "memoryUpdates": [
    "Created new vendor memory: Leistungsdatum_to_serviceDate_mapping"
  ],
  "auditTrail": [
    {
      "step": "recall",
      "timestamp": "2024-01-15T10:00:00Z",
      "details": "Retrieved 3 vendor memories"
    }
  ]
}
```

## 🎓 Learning Outcomes

The system demonstrates:
1. **Progressive Learning**: Accuracy improves over time
2. **Vendor Adaptation**: Learns vendor-specific quirks
3. **Pattern Recognition**: Identifies recurring issues
4. **Confidence Building**: Trust increases with successful use
5. **Explainability**: Every decision is transparent

---

This system transforms invoice processing from a repetitive task into an intelligent, learning system that gets smarter with each correction.

