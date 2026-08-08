-- NovaSol ERP V12.0 - Supabase PostgreSQL Schema Setup
-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'หัวหน้างาน',
  branch TEXT DEFAULT 'ทุกสาขา',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  address TEXT,
  manager TEXT,
  phone TEXT,
  openDate TEXT,
  status TEXT DEFAULT 'เปิดใช้งาน',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Contracts Table
CREATE TABLE IF NOT EXISTS public.contracts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  startDate TEXT,
  endDate TEXT,
  totalValue NUMERIC DEFAULT 0,
  laborBudget NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Workers Table
CREATE TABLE IF NOT EXISTS public.workers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  idCard TEXT,
  dob TEXT,
  phone TEXT,
  startDate TEXT,
  endDate TEXT,
  baseWage NUMERIC DEFAULT 0,
  role TEXT,
  bankAcc TEXT,
  bankName TEXT,
  status TEXT DEFAULT 'ทำงานอยู่',
  branch TEXT DEFAULT 'สำนักงานใหญ่',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Supplies Table
CREATE TABLE IF NOT EXISTS public.supplies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  itemName TEXT NOT NULL,
  actionType TEXT DEFAULT 'รับเข้า',
  itemQuantity NUMERIC DEFAULT 0,
  unitPrice NUMERIC DEFAULT 0,
  deliveryLocation TEXT,
  requestDate TEXT,
  requester TEXT,
  imageUrl TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Requests Table
CREATE TABLE IF NOT EXISTS public.requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  itemName TEXT NOT NULL,
  qty NUMERIC DEFAULT 0,
  location TEXT,
  requester TEXT,
  reqDate TEXT,
  status TEXT DEFAULT 'รออนุมัติ',
  approver TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Payrolls Table
CREATE TABLE IF NOT EXISTS public.payrolls (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT,
  workerName TEXT,
  posAllowance NUMERIC DEFAULT 0,
  otherIncome NUMERIC DEFAULT 0,
  grossIncome NUMERIC DEFAULT 0,
  taxDeduct NUMERIC DEFAULT 0,
  ssoDeduct NUMERIC DEFAULT 0,
  otherDeduct NUMERIC DEFAULT 0,
  netPay NUMERIC DEFAULT 0,
  note TEXT,
  branch TEXT DEFAULT 'สำนักงานใหญ่',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Capitals Table
CREATE TABLE IF NOT EXISTS public.capitals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT,
  amount NUMERIC DEFAULT 0,
  source TEXT,
  project TEXT,
  note TEXT,
  recorder TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Stock Audits Table
CREATE TABLE IF NOT EXISTS public.stock_audits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auditMonth TEXT,
  auditDate TEXT,
  branch TEXT DEFAULT 'สำนักงานใหญ่',
  itemName TEXT,
  systemQty NUMERIC DEFAULT 0,
  actualQty NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  status TEXT,
  auditor TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  poNo TEXT,
  vendorName TEXT,
  vendorPhone TEXT,
  deliveryBranch TEXT DEFAULT 'สำนักงานใหญ่',
  orderDate TEXT,
  deliveryDate TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  vatRate NUMERIC DEFAULT 0,
  vat NUMERIC DEFAULT 0,
  totalAmount NUMERIC DEFAULT 0,
  requester TEXT,
  approver TEXT DEFAULT 'อนุมัติแล้ว',
  status TEXT DEFAULT 'รอส่งของ',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Discontinued Items Table
CREATE TABLE IF NOT EXISTS public.discontinued_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  itemName TEXT,
  branch TEXT,
  isDiscontinued BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Admin User
INSERT INTO public.users (id, username, password, name, role, branch)
VALUES ('u1', 'admin', '123', 'ผู้ดูแลระบบ (Admin)', 'Admin', 'ทุกสาขา')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, username, password, name, role, branch)
VALUES ('u2', 'manager', '123', 'ผู้ควบคุมงาน', 'ผู้ควบคุมงาน', 'สำนักงานใหญ่')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, username, password, name, role, branch)
VALUES ('u3', 'head', '123', 'หัวหน้างาน', 'หัวหน้างาน', 'สำนักงานใหญ่')
ON CONFLICT (id) DO NOTHING;

-- Insert Default Branches
INSERT INTO public.branches (id, name, address, manager, phone, openDate, status)
VALUES ('b1', 'สำนักงานใหญ่', 'กรุงเทพมหานคร', 'ผู้ดูแลระบบ (Admin)', '02-123-4567', '2025-01-01', 'เปิดใช้งาน')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.branches (id, name, address, manager, phone, openDate, status)
VALUES ('b2', 'สาขาชลบุรี', 'อ.เมือง จ.ชลบุรี', 'ผู้ควบคุมงาน', '038-987-654', '2025-02-01', 'เปิดใช้งาน')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) or Allow Public Access for Client API
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discontinued_items ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write policy for simple integration
CREATE POLICY "Public Read/Write users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write workers" ON public.workers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write supplies" ON public.supplies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write requests" ON public.requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write payrolls" ON public.payrolls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write capitals" ON public.capitals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write stock_audits" ON public.stock_audits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write discontinued_items" ON public.discontinued_items FOR ALL USING (true) WITH CHECK (true);
