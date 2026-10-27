# Bill Pro — Frontend Application

Modern, high-performance retail POS, inventory, and GST management web application built with **React 19**, **Vite**, **React Router**, **TypeScript**, and **Tailwind CSS**.

---

## Features & Highlights

- **High-Speed POS Billing:** Barcode scanning, keyboard shortcuts, keyword product search, cart hold & recall, real-time Indian GST breakdown (CGST + SGST or IGST), split payments, and thermal receipt print simulation (58mm / 80mm ESC/POS and A4).
- **Offline-First Resilience:** Local database powered by **IndexedDB** (`src/offline/local-db.ts`) for catalog caching, offline billing queue (`pending-operations.ts`), and automatic background sync (`sync-manager.ts`) once network connectivity resumes.
- **Dynamic Local Network Access:** Dev server listens on `0.0.0.0` (Port `5173`). Client API client automatically detects your local machine's IP, allowing instant mobile, tablet, or wireless barcode scanner testing across the same Wi-Fi network without hardcoding IPs.
- **Role-Based Workflows:** Distinct interfaces and permissions for **Owner**, **Manager**, and **Cashier** with quick numeric PIN unlock at the counter.
- **Comprehensive Business Modules:**
  - `/dashboard`: Live sales metrics, KPI cards, low-stock warnings, and payment method collection summaries.
  - `/billing`: Fast counter billing terminal with keyboard hotkeys and split-payment drawer.
  - `/invoices`: Searchable invoice records, returns processing, and duplicate print generation.
  - `/items`: Full catalog management with HSN codes, GST tax slabs, barcodes, and MRP.
  - `/inventory`: Real-time stock counts, valuation, batch/expiry tracking, and low-stock reorder points.
  - `/purchases`: Inward vendor purchases and stock additions.
  - `/customers`: Customer directory, credit (Udhaar) ledger, and dues tracking.
  - `/suppliers`: Vendor management and purchase history.
  - `/payments`: Complete payment ledger across Cash, UPI, Card, Bank, and Credit.
  - `/returns`: Sales returns and GST Credit Note management.
  - `/expenses`: Daily store expenses, petty cash, and cashbook logs.
  - `/reports`: Sales analytics, profit margins, and payment breakdown.
  - `/gst-reports`: GSTR-1, GSTR-3B tax summaries for CA filing.
  - `/staff`: Cashier and manager employee management.
  - `/settings`: Business profile, thermal printer layout, and store configuration.

---

## Technology Stack

- **Framework:** React 19 + Vite 6
- **Routing:** React Router v7 (`react-router-dom`)
- **State & Server Cache:** `@tanstack/react-query`
- **Styling:** Tailwind CSS + Vanilla CSS print formatting
- **Icons:** `lucide-react`
- **Forms & Validation:** `react-hook-form` + `zod`
- **Offline Storage:** `idb` (IndexedDB wrapper)

---

## Directory Structure

```text
frontend/
├── public/                 # Static assets and Web App Manifest
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── layout/         # DashboardLayout, Sidebar, Topbar
│   │   └── ui/             # Reusable Button, Card, Modal, Table components
│   ├── lib/
│   │   └── utils.ts        # Currency (INR), date formatting, class merging
│   ├── offline/            # IndexedDB local cache & sync queue engine
│   │   ├── local-db.ts
│   │   ├── pending-operations.ts
│   │   └── sync-manager.ts
│   ├── pages/              # 17 application route pages
│   │   ├── BillingPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── ...
│   ├── services/
│   │   └── api-client.ts   # Dynamic LAN-aware REST API client
│   ├── types/
│   │   └── index.ts        # TypeScript interfaces (Items, Invoices, User, etc.)
│   ├── App.tsx             # Root router configuration
│   ├── index.css           # Global Tailwind & print styles
│   ├── main.tsx            # React root mount point
│   └── vite-env.d.ts       # Vite client typing
├── .env.example            # Environment variables template
├── .env.local              # Local environment configuration
├── index.html              # HTML5 SPA entry point
├── package.json            # Scripts & dependencies
├── tailwind.config.js      # Tailwind design system configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite bundler, path aliases & network server settings
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+
- Backend API running on port `5000`

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Environment Configuration
Create `.env.local` from `.env.example`:
```bash
cp .env.example .env.local
```

Default variables in `.env.local`:
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Bill Pro
VITE_DEFAULT_STATE_CODE=27
```

> **Note:** When accessing from another device on the same Wi-Fi (e.g. `http://192.168.0.x:5173`), the application automatically connects to the backend on the same IP (`http://192.168.0.x:5000/api/v1`).

### 4. Running Development Server
```bash
npm run dev
```

Server output:
- **Local:** `http://localhost:5173`
- **Network:** `http://<YOUR_LOCAL_IP>:5173` (e.g. `http://192.168.0.192:5173`)

### 5. Production Build & Preview
```bash
# Typecheck & build optimized bundle into dist/
npm run build

# Preview production build locally
npm run preview
```

---

## Default Login Credentials

Seed data provides test users for immediate testing:

| Role | Email | Password | Counter Quick PIN |
| :--- | :--- | :--- | :--- |
| **Owner** | `admin@billpro.local` | `Admin@1234` | `1234` |
| **Manager** | `manager@billpro.local` | `Manager@1234` | `2345` |
| **Cashier** | `cashier@billpro.local` | `Cashier@1234` | `3456` |
