# Otto V2 Workflow Diagram

## Visual Workflow Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OTTO V2 LOGISTICS WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

                                 START
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  📋 TOTAL INVOICES: 43                                                       │
│  All invoices in the system (any status)                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
                 ▼                                   ▼
┌────────────────────────────────┐   ┌────────────────────────────────┐
│  ✏️ DRAFT: 1                   │   │  🔬 AWAITING QC: 0             │
│  New/Incomplete invoices       │   │  Requires QC certificate       │
│  Status: draft                 │   │  Must complete before dispatch │
└────────────────────────────────┘   └────────────────────────────────┘
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   APPROVAL PROCESS       │
                    │   Documents verified     │
                    │   QC completed (if req)  │
                    └──────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  📦 READY FOR DISPATCH: 40                                                   │
│  Approved invoices awaiting transport arrangement                           │
│  Status: approved, Stage: ready_dispatch                                    │
│  ⚡ ACTION: Upload Load Confirmation to progress                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  UPLOAD LOAD             │
                    │  CONFIRMATION (PDF)      │
                    │  • AI extracts data      │
                    │  • Auto-populates form   │
                    │  • Updates invoice       │
                    └──────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  🚛 LOAD CONFIRMATIONS: 2                                                    │
│  Transport arranged and confirmed                                           │
│  Status: transport_confirmed                                                │
│  Contains: Vehicle details, driver info, collection/delivery addresses      │
│  ⚡ ACTION: Create Manifest to group shipments                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  CREATE MANIFEST         │
                    │  • Groups load confs     │
                    │  • Assigns transport     │
                    │  • Generates manifest #  │
                    └──────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  📜 MANIFESTS: 0                                                             │
│  Grouped shipments ready for dispatch                                       │
│  Contains: Multiple load confirmations, route info                          │
│  ⚡ ACTION: Mark as dispatched                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  DISPATCH                │
                    │  Vehicle leaves depot    │
                    │  Status auto-updates     │
                    └──────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  🚚 IN TRANSIT: 2                                                            │
│  Currently being transported to customer                                    │
│  Status: in_transit, Stage: in_transit                                      │
│  ⚡ AUTO-UPDATED: When load confirmation uploaded                           │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  DELIVERY                │
                    │  Customer receives goods │
                    │  POD collected           │
                    └──────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✅ DELIVERED: 0                                                             │
│  Successfully delivered to customer                                         │
│  Status: delivered, Stage: delivered                                        │
│  Final stage - Invoice complete                                             │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                                  END
```

---

## Stage Transitions

### Automatic Transitions (System-Triggered)

| From Stage | To Stage | Trigger | Code Location |
|-----------|----------|---------|---------------|
| ready_dispatch | in_transit | Load Confirmation Upload | WebhookController.php:697-707 |

### Manual Transitions (User-Triggered)

| From Stage | To Stage | Action Required |
|-----------|----------|-----------------|
| draft | ready_dispatch | Approve invoice |
| ready_dispatch | load_confirmed | Upload load confirmation |
| load_confirmed | in_manifest | Create manifest |
| in_manifest | in_transit | Mark manifest as dispatched |
| in_transit | delivered | Mark as delivered |

---

## Status vs Stage

Understanding the difference:

### Status (High-Level)
- **draft**: Not yet approved
- **approved**: Ready for processing
- **in_transit**: Currently being transported
- **delivered**: Received by customer

### Stage (Detailed Workflow)
- **receiving**: Initial receipt
- **ready_dispatch**: Approved, awaiting transport
- **in_transit**: Currently being transported
- **delivered**: Final delivery

**Note**: Status and Stage can differ. An invoice can have Status: `approved` but Stage: `ready_dispatch`.

---

## Dashboard Indicator Order Logic

The indicators follow the **chronological workflow order**:

1. **Total** → Overview of all invoices
2. **Draft** → Starting point for new invoices
3. **Awaiting QC** → Pre-dispatch requirements
4. **Ready for Dispatch** → Waiting for transport arrangement
5. **Load Confirmations** → Transport arranged
6. **Manifests** → Shipments grouped
7. **In Transit** → Active transportation
8. **Delivered** → End state

This order matches the **natural flow of operations** from left to right.

---

## Key Decision Points

### Should I create a Load Confirmation?
✅ **YES** if:
- Invoice is in "Ready for Dispatch" (40 invoices)
- Documents are complete
- Customer approved shipment

❌ **NO** if:
- Invoice is still draft
- Missing QC certificate (if required)
- Awaiting customer approval

### Should I create a Manifest?
✅ **YES** if:
- Multiple load confirmations going to same region
- Want to group shipments for efficiency
- Transport planner approved grouping

❌ **NO** if:
- Single urgent shipment
- Different destinations
- Specific customer requirements

---

## Color Coding Guide

### Purchase Order Status Colors

| Color | Usage % | Label | Meaning |
|-------|---------|-------|---------|
| 🟢 Green | 0-70% | Healthy | Good budget usage |
| 🟡 Yellow | 70-90% | Monitor | Approaching budget limit |
| 🔴 Red | 90-100% | Critical | Near or at budget limit |
| ⚫ Over | >100% | Over Budget | Exceeded budget |

### Load Confirmation Status Colors

| Status | Color | Material-UI |
|--------|-------|-------------|
| draft | Gray | default |
| pending | Orange | warning |
| confirmed | Green | success |
| in_transit | Blue | info |
| delivered | Primary | primary |
| cancelled | Red | error |

---

## Process Flow Times (Approximate)

```
Draft → Ready for Dispatch: 1-2 days (document verification)
Ready for Dispatch → Load Confirmed: 0-3 days (transport arrangement)
Load Confirmed → In Manifest: 0-2 days (manifest creation)
In Manifest → In Transit: 0-1 day (dispatch)
In Transit → Delivered: 1-7 days (transportation time)
```

**Total Average**: 3-15 days from draft to delivery

---

**Visual Guide Version**: 1.0
**Created**: October 27, 2025
