# OTTO v2 - Invoice-Centric Freight Forwarding System

## 📚 Documentation

### 🚀 User Documentation
**New! Dashboard & Features Guide (October 2025)**
- **[Dashboard Features](./DASHBOARD_FEATURES.md)** - Complete guide to dashboard indicators, filtering, and sorting
- **[Quick Reference](./QUICK_REFERENCE.md)** - Fast lookup guide for common actions and shortcuts

### 📖 User Guides
- **[OTTO V2 User Guide](./OTTO_V2_USER_GUIDE.md)** - Comprehensive user manual
- **[User Quick Guide](./USER_QUICK_GUIDE.md)** - Getting started guide

### 🔧 Technical Documentation
- **[N8N Load Confirmation Setup](./N8N_LOAD_CONFIRMATION_SETUP.md)** - Webhook integration guide
- **[Manifest Process Audit](./MANIFEST_PROCESS_AUDIT.md)** - Manifest workflow documentation
- **[Manifest Session Notes](./MANIFEST_SESSION_NOTES.md)** - Development notes

### 🔄 Session Handoff Documents
For Claude AI session continuity, refer to the latest handoff document:
- **Latest:** [HANDOFF_2025_10_23_Invoice_Upload_Workflow.md](./HANDOFF_2025_10_23_Invoice_Upload_Workflow.md)
  - Invoice upload workflow with n8n integration
  - Duplicate invoice handling
  - PO extraction issues and fixes
  - Status: ⚠️ Awaiting v5 workflow activation and testing

---

## 🎯 Quick Start

### Dashboard Overview
The dashboard displays 8 key workflow indicators:
1. 📋 Total Invoices
2. ✏️ Draft
3. 🔬 Awaiting QC
4. 📦 Ready for Dispatch
5. 🚛 Load Confirmations
6. 📜 Manifests
7. 🚚 In Transit
8. ✅ Delivered

**See [Dashboard Features](./DASHBOARD_FEATURES.md) for complete details.**

### Key Features (October 2025 Update)
- ✅ **Compact Filtering** - Search and filter across all tables
- ✅ **Column Sorting** - Click headers to sort any column
- ✅ **Auto Status Updates** - Invoice status updates when load confirmation uploaded
- ✅ **Real-time Statistics** - Dashboard shows live workflow counts
- ✅ **Department Defaults** - Auto-populate contact info from department settings

---

## 🏗️ Architecture

### Backend
- **Framework**: Laravel 10+ (PHP 8.x)
- **Database**: MySQL 8.0
- **API**: RESTful JSON API

### Frontend
- **Framework**: React 18+ with Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: React Hooks

### Integration
- **N8N Workflows**: PDF processing and data extraction
- **Gemini AI**: Handwritten text extraction from load confirmations

---

## 🚀 Installation

### Prerequisites
- PHP 8.1+
- MySQL 8.0+
- Node.js 18+
- Composer
- N8N instance

### Backend Setup
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📝 Recent Updates

### October 27, 2025
- ✨ Added comprehensive dashboard indicators
- 🔍 Implemented filtering for all tables (Load Confirmations, Invoices, Purchase Orders)
- 📊 Added column sorting with visual indicators
- 🔄 Automatic invoice status updates on load confirmation upload
- 📋 Department-based contact defaults for KAMOA
- 📚 Created comprehensive documentation (DASHBOARD_FEATURES.md, QUICK_REFERENCE.md)

---

## 🤝 Support

For questions or issues:
1. Check [Dashboard Features](./DASHBOARD_FEATURES.md) documentation
2. Review [Quick Reference](./QUICK_REFERENCE.md) guide
3. Verify backend logs and database state
4. Check browser console for frontend errors (F12)

---

**Version**: 2.0
**Last Updated**: October 27, 2025
