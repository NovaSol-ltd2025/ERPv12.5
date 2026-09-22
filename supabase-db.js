// Supabase Integration for NovaSol ERP V12.0
// Supports Supabase PostgreSQL with local persistence fallback for 24/7 uninterrupted operation

let supabaseClient = null;

function getSupabaseConfig() {
  // Auto-detect and save configuration from URL parameters if present (?sb_url=...&sb_key=...)
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlFromParam = urlParams.get('sb_url');
      const keyFromParam = urlParams.get('sb_key');
      if (urlFromParam && keyFromParam) {
        localStorage.setItem('supabase_url', urlFromParam.trim());
        localStorage.setItem('supabase_key', keyFromParam.trim());
      }
    } catch (e) {
      console.warn("Error reading URL parameters for Supabase config:", e);
    }
  }

  const defaultUrl = (typeof window !== 'undefined' && window.DEFAULT_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || '';
  const defaultKey = (typeof window !== 'undefined' && window.DEFAULT_SUPABASE_KEY) || (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || '';

  const storedUrl = localStorage.getItem('supabase_url');
  const storedKey = localStorage.getItem('supabase_key');

  const url = (storedUrl && storedUrl.trim()) ? storedUrl.trim() : defaultUrl;
  const key = (storedKey && storedKey.trim()) ? storedKey.trim() : defaultKey;

  return { url: url.trim(), key: key.trim() };
}

function getSupabase() {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.key) return null;

  if (cfg.key.startsWith('sb_secret_') || cfg.key.startsWith('sbp_')) {
    console.error("❌ Invalid Supabase Key Type: 'sb_secret_' is a secret key/access token. Supabase Client SDK requires 'anon' public key starting with 'eyJ...'");
  }

  if (!supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      supabaseClient = window.supabase.createClient(cfg.url, cfg.key);
    } catch (e) {
      console.warn("Error initializing Supabase client:", e);
    }
  }
  return supabaseClient;
}

// Image compression helper
async function compressImageIfNeeded(dataUrl, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return dataUrl || '';
  }
  if (dataUrl.length < 150000) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          resolve(dataUrl.slice(0, 300000));
        }
      };
      img.onerror = () => resolve(dataUrl.slice(0, 300000));
      img.src = dataUrl;
    } catch (e) {
      resolve(dataUrl.slice(0, 300000));
    }
  });
}

// Normalization helper: maps lowercased column names returned by PostgreSQL to camelCase properties used by ERP frontend
function normalizeRow(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return d;
  const res = { ...d };

  if (res.id !== undefined && res.id !== null) res.id = String(res.id);

  // Branches
  if (res.opendate !== undefined && res.openDate === undefined) res.openDate = res.opendate;
  res.rawOpen = res.openDate || res.rawOpen || '';

  // Contracts
  if (res.totalvalue !== undefined && res.totalValue === undefined) res.totalValue = parseFloat(res.totalvalue || 0);
  if (res.laborbudget !== undefined && res.laborBudget === undefined) res.laborBudget = parseFloat(res.laborbudget || 0);
  if (res.startdate !== undefined && res.startDate === undefined) res.startDate = res.startdate;
  if (res.enddate !== undefined && res.endDate === undefined) res.endDate = res.enddate;
  res.rawStart = res.startDate || res.rawStart || '';
  res.rawEnd = res.endDate || res.rawEnd || '';

  // Workers
  if (res.idcard !== undefined && res.idCard === undefined) res.idCard = res.idcard;
  if (res.basewage !== undefined && res.baseWage === undefined) res.baseWage = parseFloat(res.basewage || 0);
  if (res.bankacc !== undefined && res.bankAcc === undefined) res.bankAcc = res.bankacc;
  if (res.bankname !== undefined && res.bankName === undefined) res.bankName = res.bankname;
  if (res.startdate !== undefined && res.startDate === undefined) res.startDate = res.startdate;
  if (res.enddate !== undefined && res.endDate === undefined) res.endDate = res.enddate;
  if (!res.rawStart && res.startDate) res.rawStart = res.startDate;
  if (!res.rawEnd && res.endDate) res.rawEnd = res.endDate;

  // Supplies
  if (res.itemname !== undefined && res.itemName === undefined) res.itemName = res.itemname;
  if (res.actiontype !== undefined && res.actionType === undefined) res.actionType = res.actiontype;
  if (res.itemquantity !== undefined && res.itemQuantity === undefined) res.itemQuantity = parseFloat(res.itemquantity || 0);
  if (res.unitprice !== undefined && res.unitPrice === undefined) res.unitPrice = parseFloat(res.unitprice || 0);
  if (res.deliverylocation !== undefined && res.deliveryLocation === undefined) res.deliveryLocation = res.deliverylocation;
  if (res.requestdate !== undefined && res.requestDate === undefined) res.requestDate = res.requestdate;
  if (res.imageurl !== undefined && res.imageUrl === undefined) res.imageUrl = res.imageurl;

  // Requests
  if (res.reqdate !== undefined && res.reqDate === undefined) res.reqDate = res.reqdate;

  // Payrolls
  if (res.workername !== undefined && res.workerName === undefined) res.workerName = res.workername;
  if (res.posallowance !== undefined && res.posAllowance === undefined) res.posAllowance = parseFloat(res.posallowance || 0);
  if (res.otherincome !== undefined && res.otherIncome === undefined) res.otherIncome = parseFloat(res.otherincome || 0);
  if (res.grossincome !== undefined && res.grossIncome === undefined) res.grossIncome = parseFloat(res.grossincome || 0);
  if (res.taxdeduct !== undefined && res.taxDeduct === undefined) res.taxDeduct = parseFloat(res.taxdeduct || 0);
  if (res.ssodeduct !== undefined && res.ssoDeduct === undefined) res.ssoDeduct = parseFloat(res.ssodeduct || 0);
  if (res.otherdeduct !== undefined && res.otherDeduct === undefined) res.otherDeduct = parseFloat(res.otherdeduct || 0);
  if (res.netpay !== undefined && res.netPay === undefined) res.netPay = parseFloat(res.netpay || 0);
  if (res.signaturepayerurl !== undefined && res.signaturePayerUrl === undefined) res.signaturePayerUrl = res.signaturepayerurl;
  if (res.signedpayerat !== undefined && res.signedPayerAt === undefined) res.signedPayerAt = res.signedpayerat;
  if (res.signaturepayeeurl !== undefined && res.signaturePayeeUrl === undefined) res.signaturePayeeUrl = res.signaturepayeeurl;
  if (res.signedpayeeat !== undefined && res.signedPayeeAt === undefined) res.signedPayeeAt = res.signedpayeeat;
  res.rawDate = res.date || res.rawDate || '';

  // Stock Audits
  if (res.auditmonth !== undefined && res.auditMonth === undefined) res.auditMonth = res.auditmonth;
  if (res.auditdate !== undefined && res.auditDate === undefined) res.auditDate = res.auditdate;
  if (res.systemqty !== undefined && res.systemQty === undefined) res.systemQty = parseFloat(res.systemqty || 0);
  if (res.actualqty !== undefined && res.actualQty === undefined) res.actualQty = parseFloat(res.actualqty || 0);

  // Purchase Orders
  if (res.pono !== undefined && res.poNo === undefined) res.poNo = res.pono;
  if (res.vendorname !== undefined && res.vendorName === undefined) res.vendorName = res.vendorname;
  if (res.vendorphone !== undefined && res.vendorPhone === undefined) res.vendorPhone = res.vendorphone;
  if (res.deliverybranch !== undefined && res.deliveryBranch === undefined) res.deliveryBranch = res.deliverybranch;
  if (res.orderdate !== undefined && res.orderDate === undefined) res.orderDate = res.orderdate;
  if (res.deliverydate !== undefined && res.deliveryDate === undefined) res.deliveryDate = res.deliverydate;
  if (res.vatrate !== undefined && res.vatRate === undefined) res.vatRate = parseFloat(res.vatrate || 0);
  if (res.totalamount !== undefined && res.totalAmount === undefined) res.totalAmount = parseFloat(res.totalamount || 0);

  // Discontinued Items
  if (res.isdiscontinued !== undefined && res.isDiscontinued === undefined) res.isDiscontinued = res.isdiscontinued;

  // Signature Logs
  if (res.payrollid !== undefined && res.payrollId === undefined) res.payrollId = res.payrollid;
  if (res.paydate !== undefined && res.payDate === undefined) res.payDate = res.paydate;
  if (res.signerrole !== undefined && res.signerRole === undefined) res.signerRole = res.signerrole;
  if (res.signedat !== undefined && res.signedAt === undefined) res.signedAt = res.signedat;
  if (res.recordedby !== undefined && res.recordedBy === undefined) res.recordedBy = res.recordedby;
  if (res.signatureurl !== undefined && res.signatureUrl === undefined) res.signatureUrl = res.signatureurl;

  // Users
  if (res.row === undefined && res.id !== undefined) res.row = String(res.id);

  return res;
}

// Payload preparation helper: converts camelCase JS keys to the lowercase
// column names that actually exist in Supabase (Postgres folds unquoted
// identifiers to lowercase, so every table's real columns are lowercase-only,
// e.g. itemName -> itemname). PostgREST rejects an entire insert/update if ANY
// key in the payload doesn't match a real column, so we must send ONLY the
// lowercase form - never both - or every write fails with a
// "Could not find the '<field>' column ... in the schema cache" error.
function prepareSupabasePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const result = {};
  for (const key of Object.keys(payload)) {
    result[key.toLowerCase()] = payload[key];
  }
  return result;
}

// ===== Pending Sync Queue =====
// เมื่อบันทึกขึ้น Supabase ไม่สำเร็จ (เน็ตหลุด/เซิร์ฟเวอร์ล่มชั่วคราว) รายการจะถูกเก็บไว้ในคิวนี้
// แล้วพยายามส่งซ้ำอัตโนมัติเป็นระยะ หรือทันทีที่เบราว์เซอร์กลับมาออนไลน์
// เพื่อไม่ให้ข้อมูลค้างอยู่แค่ในเครื่องเดียวแบบเงียบๆ เหมือนที่เคยเกิดปัญหา
const PENDING_SYNC_KEY = 'sb_pending_sync_queue';
let isSyncingPendingQueue = false;

function getPendingSyncQueue() {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function savePendingSyncQueue(queue) {
  try {
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
  } catch (e) {}
}

function addToPendingSync(tableName, op, payload) {
  const queue = getPendingSyncQueue();
  queue.push({
    qid: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    tableName,
    op, // 'upsert' | 'delete'
    payload, // for upsert: prepared row object; for delete: { id }
    queuedAt: new Date().toISOString(),
    attempts: 0
  });
  savePendingSyncQueue(queue);
}

async function logRemoteError(tableName, actionLabel, errorMessage) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('error_logs').insert({
      id: 'err_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      table_name: tableName,
      action_label: actionLabel,
      error_message: String(errorMessage || '').slice(0, 1000),
      device: (typeof navigator !== 'undefined' && navigator.userAgent) || ''
    });
  } catch (e) {
    // ถ้า log ไม่สำเร็จก็แค่ปล่อยผ่าน ไม่ให้กระทบ flow หลัก
  }
}

// พยายามส่งรายการที่ค้างอยู่ในคิวขึ้น Supabase อีกครั้ง เรียกได้บ่อยเท่าที่ต้องการ (กันชนกันด้วย isSyncingPendingQueue)
async function attemptPendingSync() {
  if (isSyncingPendingQueue) return;
  const sb = getSupabase();
  if (!sb) return;
  let queue = getPendingSyncQueue();
  if (!queue.length) return;

  isSyncingPendingQueue = true;
  const stillPending = [];

  for (const item of queue) {
    try {
      let res;
      if (item.op === 'delete') {
        res = await sb.from(item.tableName).delete().eq('id', String(item.payload.id));
      } else {
        res = await sb.from(item.tableName).upsert(item.payload);
      }
      if (res && res.error) {
        item.attempts = (item.attempts || 0) + 1;
        stillPending.push(item);
      }
      // สำเร็จ -> ไม่ต้องเก็บต่อ (ไม่ push เข้า stillPending)
    } catch (e) {
      item.attempts = (item.attempts || 0) + 1;
      stillPending.push(item);
    }
  }

  savePendingSyncQueue(stillPending);
  isSyncingPendingQueue = false;

  if (stillPending.length === 0 && queue.length > 0) {
    console.info(`✅ ซิงก์ข้อมูลที่ค้างอยู่ขึ้น Supabase สำเร็จทั้งหมด (${queue.length} รายการ)`);
  }
}

// Storage helpers
function getLocalCollection(tableName, defaultData = []) {
  try {
    const raw = localStorage.getItem('sb_tbl_' + tableName);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizeRow);
    }
  } catch (e) {}
  return (Array.isArray(defaultData) ? defaultData : []).map(normalizeRow);
}

function saveLocalCollection(tableName, data) {
  try {
    localStorage.setItem('sb_tbl_' + tableName, JSON.stringify(data));
  } catch (e) {}
}

function ensureArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.data)) return val.data;
  return [];
}

// Safe Fetch with Supabase -> Local Cache
async function safeFetch(tableName, fetchSupabaseFn, defaultData = []) {
  const sb = getSupabase();
  const localData = getLocalCollection(tableName, defaultData).map(normalizeRow);

  if (sb) {
    try {
      let remoteData = await fetchSupabaseFn(sb);
      if (remoteData && typeof remoteData === 'object' && Array.isArray(remoteData.data)) {
        remoteData = remoteData.data;
      }
      if (remoteData && Array.isArray(remoteData)) {
        if (remoteData.length > 0) {
          const normalized = remoteData.map(normalizeRow);
          saveLocalCollection(tableName, normalized);
          return normalized;
        } else if (localData && localData.length > 0) {
          // Auto-push initial local data to empty Supabase table
          try {
            const payloads = localData.map(prepareSupabasePayload);
            await sb.from(tableName).upsert(payloads);
          } catch (syncErr) {
            console.warn(`Auto-sync notice on [${tableName}]:`, syncErr);
          }
          return localData;
        }
        return [];
      }
      if (remoteData && typeof remoteData === 'object' && !Array.isArray(remoteData)) {
        if (remoteData.data !== undefined) {
          return remoteData.data ? normalizeRow(remoteData.data) : (Array.isArray(defaultData) ? localData : null);
        }
        return normalizeRow(remoteData);
      }
    } catch (e) {
      console.warn(`Supabase fetch notice on [${tableName}], falling back to local store:`, e.message || e);
    }
  }
  return Array.isArray(localData) ? localData : (Array.isArray(defaultData) ? defaultData : []);
}

// Safe Save with Supabase -> Local Store
// syncInfo (optional): { op: 'upsert'|'delete', payload } - ใช้เพื่อเข้าคิว retry อัตโนมัติถ้าบันทึกขึ้น Supabase ไม่สำเร็จ
async function safeSave(tableName, saveSupabaseFn, localMutateFn, actionLabel = 'บันทึกข้อมูล', syncInfo = null) {
  const sb = getSupabase();
  let remoteSuccess = false;
  let remoteErrorMessage = '';
  if (sb) {
    try {
      const res = await saveSupabaseFn(sb);
      if (res && res.error) {
        remoteErrorMessage = res.error.message || String(res.error);
        console.warn(`Supabase save notice [${actionLabel}]:`, remoteErrorMessage);
      } else {
        remoteSuccess = true;
      }
    } catch (e) {
      remoteErrorMessage = e.message || String(e);
      console.warn(`Supabase network notice [${actionLabel}]:`, remoteErrorMessage);
    }
  }

  if (!remoteSuccess && sb) {
    // เข้าคิวไว้ retry อัตโนมัติภายหลัง กันข้อมูลค้างเงียบๆ ในเครื่องเดียว
    if (syncInfo && syncInfo.payload) {
      addToPendingSync(tableName, syncInfo.op || 'upsert', syncInfo.payload);
    }
    logRemoteError(tableName, actionLabel, remoteErrorMessage);
  }

  // Local Store mutation to guarantee 24/7 availability
  try {
    const current = getLocalCollection(tableName, []).map(normalizeRow);
    const updated = localMutateFn(current).map(normalizeRow);
    saveLocalCollection(tableName, updated);
  } catch (e) {
    console.error(`Local save error on [${actionLabel}]:`, e);
  }

  return {
    success: true,
    remoteSuccess,
    remoteError: remoteErrorMessage || null,
    message: remoteSuccess
      ? `บันทึกข้อมูลเข้า Supabase สำเร็จ`
      : `⚠️ บันทึกได้เฉพาะในเครื่องนี้ ยังไม่ขึ้น Supabase (${remoteErrorMessage || 'ไม่ทราบสาเหตุ'}) ข้อมูลจะไม่ถูกเห็นจากเครื่องอื่นจนกว่าจะซิงก์สำเร็จ`
  };
}

// Seed Default Data
function seedLocalInitialData() {
  if (localStorage.getItem('sb_is_seeded') === 'true') return;
  
  const defaultUsers = [
    { row: 'u1', id: 'u1', username: 'admin', password: '123', name: 'ผู้ดูแลระบบ (Admin)', role: 'Admin', branch: 'ทุกสาขา' },
    { row: 'u2', id: 'u2', username: 'manager', password: '123', name: 'ผู้ควบคุมงาน', role: 'ผู้ควบคุมงาน', branch: 'สำนักงานใหญ่' },
    { row: 'u3', id: 'u3', username: 'head', password: '123', name: 'หัวหน้างาน', role: 'หัวหน้างาน', branch: 'สำนักงานใหญ่' }
  ];
  saveLocalCollection('users', defaultUsers);

  const defaultBranches = [
    { id: 'b1', name: 'สำนักงานใหญ่', address: 'กรุงเทพมหานคร', manager: 'ผู้ดูแลระบบ (Admin)', phone: '02-123-4567', openDate: '2025-01-01', status: 'เปิดใช้งาน', rawOpen: '2025-01-01' },
    { id: 'b2', name: 'สาขาชลบุรี', address: 'อ.เมือง จ.ชลบุรี', manager: 'ผู้ควบคุมงาน', phone: '038-987-654', openDate: '2025-02-01', status: 'เปิดใช้งาน', rawOpen: '2025-02-01' }
  ];
  saveLocalCollection('branches', defaultBranches);

  const defaultContracts = [
    { id: 'c1', name: 'โครงการก่อสร้างอาคาร A', totalValue: 5000000, startDate: '2025-01-01', endDate: '2025-12-31', status: 'Active', laborBudget: 1500000, rawStart: '2025-01-01', rawEnd: '2025-12-31' },
    { id: 'c2', name: 'โครงการปรับปรุงภูมิทัศน์ B', totalValue: 2500000, startDate: '2025-02-01', endDate: '2025-08-31', status: 'Active', laborBudget: 800000, rawStart: '2025-02-01', rawEnd: '2025-08-31' }
  ];
  saveLocalCollection('contracts', defaultContracts);

  const defaultWorkers = [
    { id: 'w1', name: 'สมชาย ใจดี', idCard: '1100200300401', dob: '1990-05-15', phone: '081-234-5678', startDate: '2025-01-10', endDate: '', baseWage: 15000, role: 'หัวหน้างาน', bankAcc: '123-4-56789-0', bankName: 'กสิกรไทย', status: 'ทำงานอยู่', branch: 'สำนักงานใหญ่', rawStart: '2025-01-10' },
    { id: 'w2', name: 'วิชัย ขยันยิ่ง', idCard: '1100200300402', dob: '1992-08-20', phone: '089-876-5432', startDate: '2025-01-15', endDate: '', baseWage: 12000, role: 'ช่างไฟฟ้า', bankAcc: '987-6-54321-0', bankName: 'ไทยพาณิชย์', status: 'ทำงานอยู่', branch: 'สำนักงานใหญ่', rawStart: '2025-01-15' }
  ];
  saveLocalCollection('workers', defaultWorkers);

  const today = new Date().toISOString().split('T')[0];
  const defaultSupplies = [
    { id: 's1', requestDate: today, itemName: 'ปูนซีเมนต์ (ถุง)', actionType: 'รับเข้า', itemQuantity: 100, unitPrice: 150, deliveryLocation: 'โครงการก่อสร้างอาคาร A', imageUrl: '' },
    { id: 's2', requestDate: today, itemName: 'ค่างวดที่ 1', actionType: 'รับเข้า', itemQuantity: 1, unitPrice: 1000000, deliveryLocation: 'โครงการก่อสร้างอาคาร A', imageUrl: '' },
    { id: 's3', requestDate: today, itemName: 'ปูนซีเมนต์ (ถุง)', actionType: 'จ่ายออก', itemQuantity: 20, unitPrice: 150, deliveryLocation: 'โครงการก่อสร้างอาคาร A', imageUrl: '' }
  ];
  saveLocalCollection('supplies', defaultSupplies);

  const defaultRequests = [
    { id: 'r1', reqDate: today, requester: 'หัวหน้างาน', itemName: 'เหล็กเส้น 12 มม.', qty: 50, location: 'โครงการก่อสร้างอาคาร A', status: 'รออนุมัติ', approver: '' }
  ];
  saveLocalCollection('requests', defaultRequests);

  localStorage.setItem('sb_is_seeded', 'true');
}

seedLocalInitialData();

// Helper to determine non-material item keywords
function isNonMaterialItem(itemName) {
  if (!itemName) return false;
  const name = String(itemName).trim().toLowerCase();
  const kw = [
    'ค่างวด', 'รายรับ', 'ชำระ', 'รับเงิน', 'สัญญา', 'รายได้', 'งวดงาน', 'ยอดรับ', 'ชำระเงิน', 'เงินรับ', 'ผลงาน',
    'เบิกเงิน', 'เบิกเงินเดือน', 'เงินเดือน', 'ล่วงหน้า', 'สอบบัญชี', 'ค่าสอบบัญชี', 'ทำบัญชี', 'ค่าทำบัญชี', 'เพิ่มทุน',
    'โบนัส', 'สวัสดิการ', 'เงินประกัน', 'ค่าแรง', 'เบิกค่า', 'หลักประกัน', 'ชำระภาษี', 'ภาษีสรรพากร', 'ภาษี',
    'ประกันสังคม', 'กองทุนทดแทน', 'กองทุน', 'ประกัน', 'ค่าใช้จ่ายในการเดินทาง', 'ค่าเดินทาง', 'เดินทาง',
    'ค่าส่งจดหมาย', 'ส่งจดหมาย', 'จดหมาย', 'ไปรษณีย์', 'ค่าบริการ', 'ค่าธรรมเนียม',
    'ค่าน้ำ', 'ค่าไฟ', 'ค่าโทรศัพท์', 'ค่าอินเทอร์เน็ต', 'ค่าเช่า', 'ค่าเบี้ยเลี้ยง', 'เบี้ยเลี้ยง'
  ];
  return kw.some(k => name.includes(k.toLowerCase()));
}

function parseDocYearMonth(docData, dateFields = []) {
  for (const f of dateFields) {
    const val = docData[f];
    if (val && typeof val === 'string' && val.length >= 7) {
      const parts = val.split('-');
      if (parts.length >= 2) {
        return { year: parts[0], monthKey: `${parts[0]}-${parts[1]}` };
      }
    }
  }
  return null;
}

// CORE ERP ENGINE IMPLEMENTATION
async function runSupabase(funcName, ...args) {
  // LOGIN
  if (funcName === 'loginSystem') {
    const username = (args[0] || '').trim();
    const password = (args[1] || '').trim();

    const sbClient = getSupabase();
    if (sbClient) {
      try {
        // ตรวจรหัสผ่านฝั่ง DB ด้วย bcrypt ผ่าน RPC (client ไม่เห็น hash หรือ password ใครเลย)
        const { data, error } = await sbClient.rpc('verify_login', { p_username: username, p_password: password });
        if (!error && data && data.length > 0) {
          const u = data[0];
          return {
            success: true,
            name: u.name,
            role: u.role,
            branch: u.branch || 'ทุกสาขา',
            token: 'sb_' + u.id + '_' + Date.now()
          };
        }
        if (!error) {
          return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
        }
        console.warn('verify_login RPC notice:', error.message);
      } catch (e) {
        console.warn('verify_login RPC network notice:', e.message || e);
      }
    }

    // Local fallback (ใช้เฉพาะตอนต่อ Supabase ไม่ได้จริงๆ)
    return safeFetch('users', async () => null, [
      { row: 'u1', id: 'u1', username: 'admin', password: '123', name: 'ผู้ดูแลระบบ (Admin)', role: 'Admin', branch: 'ทุกสาขา' },
      { row: 'u2', id: 'u2', username: 'manager', password: '123', name: 'ผู้ควบคุมงาน', role: 'ผู้ควบคุมงาน', branch: 'สำนักงานใหญ่' },
      { row: 'u3', id: 'u3', username: 'head', password: '123', name: 'หัวหน้างาน', role: 'หัวหน้างาน', branch: 'สำนักงานใหญ่' }
    ]).then(result => {
      if (result && result.success) return result;

      // Local fallback lookup
      const usersList = getLocalCollection('users', []);
      const found = usersList.find(u => (u.username || u.user) === username && (u.password || u.pass) === password);
      if (found) {
        return {
          success: true,
          name: found.name,
          role: found.role,
          branch: found.branch || 'ทุกสาขา',
          token: 'sb_local_' + Date.now()
        };
      }
      return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (ลองเข้าด้วย admin / 123)' };
    });
  }

  if (funcName === 'logoutSystem') {
    return Promise.resolve({ success: true });
  }

  // BRANCHES
  if (funcName === 'getBranchesData') {
    return safeFetch('branches', async (sb) => {
      const { data, error } = await sb.from('branches').select('*');
      if (error) throw error;
      return (data || []).map(normalizeRow);
    }, [
      { id: 'b1', name: 'สำนักงานใหญ่', address: 'กรุงเทพมหานคร', manager: 'ผู้ดูแลระบบ (Admin)', phone: '02-123-4567', openDate: '2025-01-01', status: 'เปิดใช้งาน', rawOpen: '2025-01-01' },
      { id: 'b2', name: 'สาขาชลบุรี', address: 'อ.เมือง จ.ชลบุรี', manager: 'ผู้ควบคุมงาน', phone: '038-987-654', openDate: '2025-02-01', status: 'เปิดใช้งาน', rawOpen: '2025-02-01' }
    ]);
  }

  if (funcName === 'saveBranch') {
    const data = args[0] || {};
    const id = data.id || 'b_' + Date.now();
    const payload = {
      id: String(id),
      name: data.name || '',
      address: data.address || '',
      manager: data.manager || '',
      phone: data.phone || '',
      openDate: data.openDate || '',
      status: data.status || 'เปิดใช้งาน'
    };

    return safeSave('branches', 
      sb => sb.from('branches').upsert(prepareSupabasePayload(payload)),
      list => {
        const idx = list.findIndex(b => String(b.id) === String(id));
        const item = normalizeRow({ ...payload, rawOpen: payload.openDate });
        if (idx >= 0) list[idx] = item; else list.push(item);
        return list;
      },
      'บันทึกสาขา',
      { op: 'upsert', payload: prepareSupabasePayload(payload) }
    );
  }

  if (funcName === 'deleteBranch') {
    const id = args[0];
    return safeSave('branches',
      sb => sb.from('branches').delete().eq('id', String(id)),
      list => list.filter(b => String(b.id) !== String(id)),
      'ลบสาขา',
      { op: 'delete', payload: { id: String(id) } }
    );
  }

  if (funcName === 'getBranchSummary') {
    const branchName = args[0];
    const workers = ensureArray(await safeFetch('workers', sb => sb.from('workers').select('*').eq('branch', branchName)));
    const totalWorkers = workers.length;
    const activeWorkers = workers.filter(w => w.status === 'ทำงานอยู่').length;

    const payrolls = ensureArray(await safeFetch('payrolls', sb => sb.from('payrolls').select('*').eq('branch', branchName)));
    let totalPayroll = 0;
    payrolls.forEach(p => { totalPayroll += parseFloat(p.netPay || 0); });

    return { totalWorkers, activeWorkers, totalPayroll };
  }

  // CONTRACTS
  if (funcName === 'getContractsData') {
    return safeFetch('contracts', async (sb) => {
      const { data, error } = await sb.from('contracts').select('*');
      if (error) throw error;
      return (data || []).map(normalizeRow);
    }, [
      { id: 'c1', name: 'โครงการก่อสร้างอาคาร A', totalValue: 5000000, startDate: '2025-01-01', endDate: '2025-12-31', status: 'Active', laborBudget: 1500000, rawStart: '2025-01-01', rawEnd: '2025-12-31' },
      { id: 'c2', name: 'โครงการปรับปรุงภูมิทัศน์ B', totalValue: 2500000, startDate: '2025-02-01', endDate: '2025-08-31', status: 'Active', laborBudget: 800000, rawStart: '2025-02-01', rawEnd: '2025-08-31' }
    ]);
  }

  if (funcName === 'saveContract') {
    const data = args[0] || {};
    const id = data.id || 'c_' + Date.now();
    const payload = {
      id: String(id),
      name: data.name || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      totalValue: parseFloat(data.totalBudget || data.totalValue || 0),
      laborBudget: parseFloat(data.laborBudget || 0),
      status: data.status || 'Active'
    };

    return safeSave('contracts',
      sb => sb.from('contracts').upsert(prepareSupabasePayload(payload)),
      list => {
        const idx = list.findIndex(c => String(c.id) === String(id));
        const item = normalizeRow({ ...payload, rawStart: payload.startDate, rawEnd: payload.endDate });
        if (idx >= 0) list[idx] = item; else list.push(item);
        return list;
      },
      'บันทึกสัญญา',
      { op: 'upsert', payload: prepareSupabasePayload(payload) }
    );
  }

  if (funcName === 'deleteContract') {
    const id = args[0];
    return safeSave('contracts',
      sb => sb.from('contracts').delete().eq('id', String(id)),
      list => list.filter(c => String(c.id) !== String(id)),
      'ลบสัญญา',
      { op: 'delete', payload: { id: String(id) } }
    );
  }

  // WORKERS
  if (funcName === 'getWorkersData') {
    const branch = args[0] || '';
    return safeFetch('workers', async (sb) => {
      let query = sb.from('workers').select('*');
      if (branch && branch !== 'ทุกสาขา') {
        query = query.eq('branch', branch);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(normalizeRow);
    }, [
      { id: 'w1', name: 'สมชาย ใจดี', idCard: '1100200300401', dob: '1990-05-15', phone: '081-234-5678', startDate: '2025-01-10', endDate: '', baseWage: 15000, role: 'หัวหน้างาน', bankAcc: '123-4-56789-0', bankName: 'กสิกรไทย', status: 'ทำงานอยู่', branch: 'สำนักงานใหญ่', rawStart: '2025-01-10' },
      { id: 'w2', name: 'วิชัย ขยันยิ่ง', idCard: '1100200300402', dob: '1992-08-20', phone: '089-876-5432', startDate: '2025-01-15', endDate: '', baseWage: 12000, role: 'ช่างไฟฟ้า', bankAcc: '987-6-54321-0', bankName: 'ไทยพาณิชย์', status: 'ทำงานอยู่', branch: 'สำนักงานใหญ่', rawStart: '2025-01-15' }
    ]).then(rows => {
      if (branch && branch !== 'ทุกสาขา') {
        return rows.filter(w => (w.branch || 'สำนักงานใหญ่') === branch);
      }
      return rows;
    });
  }

  if (funcName === 'saveWorker') {
    const data = args[0] || {};
    const id = data.id || 'w_' + Date.now();
    const payload = {
      id: String(id),
      name: data.name || '',
      idCard: data.idCard || '',
      dob: data.dob || '',
      phone: data.phone || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      baseWage: parseFloat(data.baseWage || 0),
      role: data.role || '',
      bankAcc: data.bankAcc || '',
      bankName: data.bankName || '',
      status: data.status || 'ทำงานอยู่',
      branch: data.branch || 'สำนักงานใหญ่'
    };

    return safeSave('workers',
      sb => sb.from('workers').upsert(prepareSupabasePayload(payload)),
      list => {
        const idx = list.findIndex(w => String(w.id) === String(id));
        const item = normalizeRow({ ...payload, rawStart: payload.startDate, rawEnd: payload.endDate });
        if (idx >= 0) list[idx] = item; else list.push(item);
        return list;
      },
      'บันทึกข้อมูลคนงาน',
      { op: 'upsert', payload: prepareSupabasePayload(payload) }
    );
  }

  if (funcName === 'deleteWorker') {
    const id = args[0];
    return safeSave('workers',
      sb => sb.from('workers').delete().eq('id', String(id)),
      list => list.filter(w => String(w.id) !== String(id)),
      'ลบข้อมูลคนงาน',
      { op: 'delete', payload: { id: String(id) } }
    );
  }

  if (funcName === 'transferWorker') {
    const id = args[0], newBranch = args[1];
    return safeSave('workers',
      sb => sb.from('workers').update({ branch: newBranch }).eq('id', String(id)),
      list => list.map(w => String(w.id) === String(id) ? { ...w, branch: newBranch } : w),
      'โอนย้ายคนงาน',
      { op: 'upsert', payload: { id: String(id), branch: newBranch } }
    ).then(() => ({ success: true, message: `โอนย้ายคนงานไปสาขา ${newBranch} เรียบร้อย` }));
  }

  if (funcName === 'getActiveWorkersList') {
    const branch = args[0] || '';
    const workers = await safeFetch('workers', async (sb) => {
      let q = sb.from('workers').select('*').eq('status', 'ทำงานอยู่');
      if (branch && branch !== 'ทุกสาขา') q = q.eq('branch', branch);
      const { data } = await q;
      return (data || []).map(normalizeRow);
    }, []);
    if (branch && branch !== 'ทุกสาขา') {
      return workers.filter(w => w.status === 'ทำงานอยู่' && (w.branch || 'สำนักงานใหญ่') === branch);
    }
    return workers.filter(w => w.status === 'ทำงานอยู่');
  }

  // SUPPLIES
  if (funcName === 'getSuppliesData') {
    return safeFetch('supplies', async (sb) => {
      const { data, error } = await sb.from('supplies').select('*');
      if (error) throw error;
      const items = [];
      for (const raw of data || []) {
        const d = normalizeRow(raw);
        let img = d.imageUrl || '';
        if (img && img.length > 250000) {
          img = await compressImageIfNeeded(img, 800, 800, 0.7);
        }
        items.push({ ...d, imageUrl: img });
      }
      return items;
    }, [
      { id: 's1', requestDate: new Date().toISOString().split('T')[0], itemName: 'ปูนซีเมนต์ (ถุง)', actionType: 'รับเข้า', itemQuantity: 100, unitPrice: 150, deliveryLocation: 'โครงการก่อสร้างอาคาร A', imageUrl: '' },
      { id: 's2', requestDate: new Date().toISOString().split('T')[0], itemName: 'ค่างวดที่ 1', actionType: 'รับเข้า', itemQuantity: 1, unitPrice: 1000000, deliveryLocation: 'โครงการก่อสร้างอาคาร A', imageUrl: '' },
      { id: 's3', requestDate: new Date().toISOString().split('T')[0], itemName: 'ปูนซีเมนต์ (ถุง)', actionType: 'จ่ายออก', itemQuantity: 20, unitPrice: 150, deliveryLocation: 'โครงการก่อสร้างอาคาร A', imageUrl: '' }
    ]);
  }

  if (funcName === 'saveSupply') {
    const data = args[0] || {};
    const id = data.id || 's_' + Date.now();
    let rawImg = data.imageBase64 !== undefined ? data.imageBase64 : (data.imageUrl || '');
    if (!rawImg || typeof rawImg !== 'string' || rawImg.trim().length < 10) {
      rawImg = '';
    } else {
      rawImg = await compressImageIfNeeded(rawImg, 800, 800, 0.7);
    }
    const payload = {
      id: String(id),
      itemName: data.itemName || '',
      actionType: data.actionType || 'รับเข้า',
      itemQuantity: parseFloat(data.itemQuantity || 0),
      unitPrice: parseFloat(data.unitPrice || 0),
      deliveryLocation: data.deliveryLocation || '',
      requestDate: data.requestDate || new Date().toISOString().split('T')[0],
      requester: data.requester || '',
      imageUrl: rawImg
    };

    return safeSave('supplies',
      sb => sb.from('supplies').upsert(prepareSupabasePayload(payload)),
      list => {
        const idx = list.findIndex(s => String(s.id) === String(id));
        const item = normalizeRow(payload);
        if (idx >= 0) list[idx] = item; else list.push(item);
        return list;
      },
      'บันทึกรายการวัสดุ',
      { op: 'upsert', payload: prepareSupabasePayload(payload) }
    );
  }

  if (funcName === 'deleteSupply') {
    const id = args[0];
    return safeSave('supplies',
      sb => sb.from('supplies').delete().eq('id', String(id)),
      list => list.filter(s => String(s.id) !== String(id)),
      'ลบรายการวัสดุ',
      { op: 'delete', payload: { id: String(id) } }
    );
  }

  // REQUESTS
  if (funcName === 'getRequestsData') {
    return safeFetch('requests', async (sb) => {
      const { data, error } = await sb.from('requests').select('*');
      if (error) throw error;
      return (data || []).map(normalizeRow);
    }, [
      { id: 'r1', reqDate: new Date().toISOString().split('T')[0], requester: 'หัวหน้างาน', itemName: 'เหล็กเส้น 12 มม.', qty: 50, location: 'โครงการก่อสร้างอาคาร A', status: 'รออนุมัติ', approver: '' }
    ]);
  }

  if (funcName === 'saveRequest') {
    const data = args[0] || {};
    const id = data.id || 'r_' + Date.now();
    const payload = {
      id: String(id),
      itemName: data.itemName || '',
      qty: parseFloat(data.qty || 0),
      location: data.location || '',
      requester: data.requester || '',
      reqDate: data.reqDate || new Date().toISOString().split('T')[0],
      status: data.status || 'รออนุมัติ',
      approver: data.approver || ''
    };

    return safeSave('requests',
      sb => sb.from('requests').upsert(prepareSupabasePayload(payload)),
      list => {
        const idx = list.findIndex(r => String(r.id) === String(id));
        const item = normalizeRow(payload);
        if (idx >= 0) list[idx] = item; else list.push(item);
        return list;
      },
      'บันทึกคำขอเบิก',
      { op: 'upsert', payload: prepareSupabasePayload(payload) }
    );
  }

  if (funcName === 'deleteRequest') {
    const id = args[0];
    return safeSave('requests',
      sb => sb.from('requests').delete().eq('id', String(id)),
      list => list.filter(r => String(r.id) !== String(id)),
      'ลบคำขอเบิก',
      { op: 'delete', payload: { id: String(id) } }
    );
  }

  if (funcName === 'updateRequestStatus') {
    const id = args[0], status = args[1], approver = args[2];
    return safeSave('requests',
      sb => sb.from('requests').update({ status, approver }).eq('id', String(id)),
      list => list.map(r => String(r.id) === String(id) ? { ...r, status, approver } : r),
      'อัปเดตสถานะคำขอเบิก',
      { op: 'upsert', payload: { id: String(id), status, approver } }
    );
  }

  // PAYROLLS (Support both getPayrollData and getPayrollsData)
  if (funcName === 'getPayrollData' || funcName === 'getPayrollsData') {
    const branch = args[0] || '';
    return safeFetch('payrolls', async (sb) => {
      let q = sb.from('payrolls').select('*');
      if (branch && branch !== 'ทุกสาขา') q = q.eq('branch', branch);
      const { data } = await q;
      return (data || []).map(normalizeRow);
    }, []).then(rows => {
      if (branch && branch !== 'ทุกสาขา') {
        return rows.filter(p => (p.branch || 'สำนักงานใหญ่') === branch);
      }
      return rows;
    });
  }

  if (funcName === 'savePayroll') {
    const data = args[0] || {};
    const id = data.id || 'pr_' + Date.now();
    const payload = {
      id: String(id),
      date: data.date || '',
      workerName: data.workerName || '',
      posAllowance: parseFloat(data.posAllowance || 0),
      otherIncome: parseFloat(data.otherIncome || 0),
      grossIncome: parseFloat(data.grossIncome || 0),
      taxDeduct: parseFloat(data.taxDeduct || 0),
      ssoDeduct: parseFloat(data.ssoDeduct || 0),
      otherDeduct: parseFloat(data.otherDeduct || 0),
      netPay: parseFloat(data.netPay || 0),
      note: data.note || '',
      branch: data.branch || 'สำนักงานใหญ่'
    };

    return safeSave('payrolls',
      sb => sb.from('payrolls').upsert(prepareSupabasePayload(payload)),
      list => {
        const idx = list.findIndex(p => String(p.id) === String(id));
        const item = normalizeRow({ ...payload, rawDate: payload.date });
        if (idx >= 0) list[idx] = item; else list.push(item);
        return list;
      },
      'บันทึกข้อมูลเงินเดือน',
      { op: 'upsert', payload: prepareSupabasePayload(payload) }
    );
  }

  if (funcName === 'deletePayroll') {
    const id = args[0];
    return safeSave('payrolls',
      sb => sb.from('payrolls').delete().eq('id', String(id)),
      list => list.filter(p => String(p.id) !== String(id)),
      'ลบข้อมูลเงินเดือน',
      { op: 'delete', payload: { id: String(id) } }
    );
  }

  if (funcName === 'getPayslipData') {
    const payrollId = args[0];
    const payrolls = ensureArray(await safeFetch('payrolls', sb => sb.from('payrolls').select('*').eq('id', String(payrollId))));
    const pr = payrolls.find(p => String(p.id) === String(payrollId));
    if (!pr) return { success: false, message: 'ไม่พบสลิปเงินเดือน' };

    const workers = ensureArray(await safeFetch('workers', sb => sb.from('workers').select('*').eq('name', pr.workerName)));
    const w = workers.find(item => item.name === pr.workerName) || {};

    return { success: true, payroll: pr, worker: w };
  }

  if (funcName === 'getPayrollSummaryByBranch') {
    const payrolls = ensureArray(await safeFetch('payrolls', sb => sb.from('payrolls').select('*')));
    const summaryMap = {};
    payrolls.forEach(d => {
      const b = d.branch || 'สำนักงานใหญ่';
      if (!summaryMap[b]) summaryMap[b] = { branch: b, count: 0, totalGross: 0, totalNet: 0 };
      summaryMap[b].count += 1;
      summaryMap[b].totalGross += parseFloat(d.grossIncome || 0);
      summaryMap[b].totalNet += parseFloat(d.netPay || 0);
    });
    return Object.values(summaryMap);
  }

  // CAPITAL
  if (funcName === 'getCapitalData') {
    return safeFetch('capitals', async (sb) => {
      const { data, error } = await sb.from('capitals').select('*');
      if (error) throw error;
      return (data || []).map(normalizeRow);
    }, []);
  }

  if (funcName === 'saveCapital') {
    const data = args[0] || {};
    const id = data.id || 'cap_' + Date.now();
    const payload = {
      id: String(id),
      date: data.date || '',
      amount: parseFloat(data.amount || 0),
      source: data.source || '',
      project: data.project || '',
      note: data.note || '',
      recorder: data.recorder || ''
    };

    return safeSave('capitals',
      sb => sb.from('capitals').upsert(prepareSupabasePayload(payload)),
      list => {
        const idx = list.findIndex(c => String(c.id) === String(id));
        const item = normalizeRow({ ...payload, rawDate: payload.date });
        if (idx >= 0) list[idx] = item; else list.push(item);
        return list;
      },
      'บันทึกการเพิ่มทุน',
      { op: 'upsert', payload: prepareSupabasePayload(payload) }
    );
  }

  if (funcName === 'deleteCapital') {
    const id = args[0];
    return safeSave('capitals',
      sb => sb.from('capitals').delete().eq('id', String(id)),
      list => list.filter(c => String(c.id) !== String(id)),
      'ลบการเพิ่มทุน',
      { op: 'delete', payload: { id: String(id) } }
    );
  }

  // USERS MANAGEMENT (Support both getUsersList and getUsersData)
  if (funcName === 'getUsersList' || funcName === 'getUsersData') {
    // ใช้ view users_safe ที่ไม่มีคอลัมน์ password เลย (ตาราง users จริงปิด SELECT ตรงไว้แล้ว)
    return safeFetch('users', async (sb) => {
      const { data, error } = await sb.from('users_safe').select('*');
      if (error) throw error;
      return (data || []).map(normalizeRow);
    }, [
      { row: 'u1', username: 'admin', password: '123', name: 'ผู้ดูแลระบบ (Admin)', role: 'Admin', branch: 'ทุกสาขา' },
      { row: 'u2', username: 'manager', password: '123', name: 'ผู้ควบคุมงาน', role: 'ผู้ควบคุมงาน', branch: 'สำนักงานใหญ่' },
      { row: 'u3', username: 'head', password: '123', name: 'หัวหน้างาน', role: 'หัวหน้างาน', branch: 'สำนักงานใหญ่' }
    ]);
  }

  if (funcName === 'saveUser') {
    const data = args[0] || {};
    const row = data.row || 'u_' + Date.now();
    const username = data.user || data.username || '';
    const passwordPlain = data.pass || data.password || '';
    const name = data.name || '';
    const role = data.role || 'หัวหน้างาน';
    const branch = data.branch || 'ทุกสาขา';

    const sb = getSupabase();
    let remoteSuccess = false;
    let remoteErrorMessage = '';
    if (sb) {
      try {
        // RPC นี้ hash รหัสผ่านให้อัตโนมัติฝั่ง DB ไม่มีการส่ง plain text เข้าตารางตรงๆ
        const { error } = await sb.rpc('set_user_password', {
          p_id: String(row),
          p_username: username,
          p_password: passwordPlain,
          p_name: name,
          p_role: role,
          p_branch: branch
        });
        if (error) {
          remoteErrorMessage = error.message || String(error);
          console.warn('Supabase save notice [บันทึกผู้ใช้]:', remoteErrorMessage);
          logRemoteError('users', 'บันทึกผู้ใช้', remoteErrorMessage);
        } else {
          remoteSuccess = true;
        }
      } catch (e) {
        remoteErrorMessage = e.message || String(e);
        console.warn('Supabase network notice [บันทึกผู้ใช้]:', remoteErrorMessage);
      }
    }

    try {
      const current = getLocalCollection('users', []).map(normalizeRow);
      const idx = current.findIndex(u => String(u.row || u.id) === String(row));
      // ไม่เก็บ password plain text ไว้ใน local cache เช่นกัน
      const item = normalizeRow({ id: String(row), row: String(row), username, name, role, branch });
      if (idx >= 0) current[idx] = item; else current.push(item);
      saveLocalCollection('users', current);
    } catch (e) {}

    return {
      success: true,
      message: remoteSuccess
        ? 'บันทึกข้อมูลเข้า Supabase สำเร็จ'
        : `⚠️ บันทึกผู้ใช้ไม่สำเร็จ (${remoteErrorMessage || 'ไม่ทราบสาเหตุ'}) กรุณาลองใหม่เมื่อเชื่อมต่อ Supabase ได้`
    };
  }

  if (funcName === 'deleteUser') {
    const row = args[0];
    const sb = getSupabase();
    let remoteSuccess = false;
    let remoteErrorMessage = '';
    if (sb) {
      try {
        const { error } = await sb.rpc('delete_user', { p_id: String(row) });
        if (error) {
          remoteErrorMessage = error.message || String(error);
          logRemoteError('users', 'ลบผู้ใช้', remoteErrorMessage);
        } else {
          remoteSuccess = true;
        }
      } catch (e) {
        remoteErrorMessage = e.message || String(e);
      }
    }

    try {
      const current = getLocalCollection('users', []).map(normalizeRow);
      saveLocalCollection('users', current.filter(u => String(u.row || u.id) !== String(row)));
    } catch (e) {}

    return {
      success: true,
      message: remoteSuccess ? 'ลบผู้ใช้เข้า Supabase สำเร็จ' : `⚠️ ลบผู้ใช้ไม่สำเร็จ (${remoteErrorMessage || 'ไม่ทราบสาเหตุ'})`
    };
  }

  // DASHBOARD & STATS
  if (funcName === 'getDashboardStats') {
    const contracts = ensureArray(await safeFetch('contracts', sb => sb.from('contracts').select('*'), []));
    let revenue = 0;
    const projects = (contracts || []).map(d => {
      const val = parseFloat(d.totalValue || d.totalBudget || 0);
      revenue += val;
      return { name: d.name, budget: val };
    });
    return { revenue, projects };
  }

  // STOCK AUDITS
  if (funcName === 'getStockAudits') {
    const branch = args[0] || '';
    const month = args[1] || '';
    const audits = ensureArray(await safeFetch('stock_audits', sb => sb.from('stock_audits').select('*'), []));
    let rows = audits || [];
    if (branch && branch !== 'ทุกสาขา') {
      rows = rows.filter(r => (r.branch || 'สำนักงานใหญ่') === branch);
    }
    if (month) {
      rows = rows.filter(r => (r.auditMonth || r.month || '').startsWith(month));
    }
    return rows;
  }

  if (funcName === 'saveStockAudit') {
    const data = args[0] || {};
    const id = data.id || 'sa_' + Date.now();
    const sysQty = parseFloat(data.systemQty || 0);
    const actQty = parseFloat(data.actualQty || 0);
    const diff = actQty - sysQty;
    const status = diff === 0 ? 'ตรงตามจริง' : (diff < 0 ? `ขาด ${Math.abs(diff)}` : `เกิน ${diff}`);
    const monthVal = data.auditMonth || data.month || new Date().toISOString().slice(0, 7);
    const notesVal = data.notes || data.note || '';

    const payload = {
      id: String(id),
      auditMonth: monthVal,
      auditDate: data.auditDate || new Date().toISOString().split('T')[0],
      branch: data.branch || 'สำนักงานใหญ่',
      itemName: data.itemName || '',
      systemQty: sysQty,
      actualQty: actQty,
      variance: diff,
      status: status,
      auditor: data.auditor || '',
      note: notesVal
    };

    return safeSave('stock_audits',
      sb => sb.from('stock_audits').upsert(prepareSupabasePayload(payload)),
      list => {
        const idx = list.findIndex(a => String(a.id) === String(id));
        const item = normalizeRow(payload);
        if (idx >= 0) list[idx] = item; else list.push(item);
        return list;
      },
      'บันทึกผลการตรวจนับสต๊อก',
      { op: 'upsert', payload: prepareSupabasePayload(payload) }
    );
  }

  if (funcName === 'deleteStockAudit') {
    const id = args[0];
    return safeSave('stock_audits',
      sb => sb.from('stock_audits').delete().eq('id', String(id)),
      list => list.filter(a => String(a.id) !== String(id)),
      'ลบการตรวจนับสต๊อก',
      { op: 'delete', payload: { id: String(id) } }
    );
  }

  // PURCHASE ORDERS (PO)
  if (funcName === 'getPurchaseOrders') {
    const branch = args[0] || '';
    const pos = ensureArray(await safeFetch('purchase_orders', sb => sb.from('purchase_orders').select('*'), []));
    let rows = pos || [];
    if (branch && branch !== 'ทุกสาขา') {
      rows = rows.filter(r => (r.deliveryBranch || 'สำนักงานใหญ่') === branch);
    }
    return rows;
  }

  if (funcName === 'savePurchaseOrder') {
    const data = args[0] || {};
    const id = data.id || 'po_' + Date.now();
    const items = Array.isArray(data.items) ? data.items : [];
    let subtotal = 0;
    items.forEach(it => {
      subtotal += parseFloat(it.qty || 0) * parseFloat(it.unitPrice || 0);
    });
    const vatRate = parseFloat(data.vatRate || 0);
    const vat = subtotal * (vatRate / 100);
    const totalAmount = subtotal + vat;

    const payload = {
      id: String(id),
      poNo: data.poNo || `PO-${Date.now().toString().slice(-6)}`,
      vendorName: data.vendorName || '',
      vendorPhone: data.vendorPhone || '',
      deliveryBranch: data.deliveryBranch || 'สำนักงานใหญ่',
      orderDate: data.orderDate || new Date().toISOString().split('T')[0],
      deliveryDate: data.deliveryDate || '',
      items: items,
      subtotal: subtotal,
      vatRate: vatRate,
      vat: vat,
      totalAmount: totalAmount,
      requester: data.requester || '',
      approver: data.approver || 'อนุมัติแล้ว',
      status: data.status || 'รอส่งของ',
      notes: data.notes || ''
    };

    return safeSave('purchase_orders',
      sb => sb.from('purchase_orders').upsert(prepareSupabasePayload(payload)),
      list => {
        const idx = list.findIndex(p => String(p.id) === String(id));
        const item = normalizeRow(payload);
        if (idx >= 0) list[idx] = item; else list.push(item);
        return list;
      },
      'บันทึกใบสั่งซื้อ',
      { op: 'upsert', payload: prepareSupabasePayload(payload) }
    );
  }

  if (funcName === 'deletePurchaseOrder') {
    const id = args[0];
    return safeSave('purchase_orders',
      sb => sb.from('purchase_orders').delete().eq('id', String(id)),
      list => list.filter(p => String(p.id) !== String(id)),
      'ลบใบสั่งซื้อ',
      { op: 'delete', payload: { id: String(id) } }
    );
  }

  // DISCONTINUED ITEMS
  if (funcName === 'toggleDiscontinuedItem') {
    const itemName = args[0] || '';
    const branch = args[1] || '';
    const isDiscontinued = args[2] !== false;
    const docKey = `${branch || 'ALL'}__${itemName}`.replace(/[\/\s]/g, '_');

    return safeSave('discontinued_items',
      sb => {
        if (isDiscontinued) {
          return sb.from('discontinued_items').upsert(prepareSupabasePayload({ id: docKey, itemName, branch, isDiscontinued: true }));
        } else {
          return sb.from('discontinued_items').delete().eq('id', docKey);
        }
      },
      list => {
        if (isDiscontinued) {
          const idx = list.findIndex(d => d.id === docKey);
          const item = normalizeRow({ id: docKey, itemName, branch, isDiscontinued: true });
          if (idx >= 0) list[idx] = item; else list.push(item);
        } else {
          list = list.filter(d => d.id !== docKey);
        }
        return list;
      },
      'ตั้งค่าซ่อน/เลิกใช้งานวัสดุ'
    );
  }

  if (funcName === 'getBranchInventoryForecast') {
    const targetBranch = args[0] || '';
    const supplies = ensureArray(await safeFetch('supplies', sb => sb.from('supplies').select('*'), []));
    const audits = ensureArray(await safeFetch('stock_audits', sb => sb.from('stock_audits').select('*'), []));
    const discItems = ensureArray(await safeFetch('discontinued_items', sb => sb.from('discontinued_items').select('*'), []));

    const discontinuedSet = new Set();
    discItems.forEach(d => {
      if (d && d.isDiscontinued) {
        discontinuedSet.add(`${d.branch || ''}::${d.itemName}`);
        discontinuedSet.add(`ALL::${d.itemName}`);
        discontinuedSet.add(`::${d.itemName}`);
      }
    });

    const latestAuditMap = {};
    audits.forEach(a => {
      const b = a.branch || 'สำนักงานใหญ่';
      const item = a.itemName || '';
      if (!item) return;
      const key = `${b}::${item}`;
      const auditDate = a.auditDate || a.month || '';
      if (!latestAuditMap[key] || auditDate > latestAuditMap[key].auditDate) {
        latestAuditMap[key] = {
          auditDate: auditDate,
          actualQty: parseFloat(a.actualQty || 0),
          systemQty: parseFloat(a.systemQty || 0)
        };
      }
    });

    const itemMap = {};

    supplies.forEach(d => {
      const branch = d.deliveryLocation || 'สำนักงานใหญ่';
      if (targetBranch && targetBranch !== 'ทุกสาขา' && branch !== targetBranch) return;

      const item = d.itemName || '';
      if (!item || isNonMaterialItem(item)) return;

      const key = `${branch}::${item}`;
      if (!itemMap[key]) {
        itemMap[key] = {
          branch: branch,
          itemName: item,
          inQty: 0,
          outQty: 0,
          outDates: []
        };
      }
      const qty = parseFloat(d.itemQuantity || 0);
      if (d.actionType === 'รับเข้า' || d.actionType === 'ยอดยกมา') {
        itemMap[key].inQty += qty;
      } else if (d.actionType === 'จ่ายออก') {
        itemMap[key].outQty += qty;
        if (d.requestDate) itemMap[key].outDates.push(d.requestDate);
      }
    });

    const result = [];
    Object.values(itemMap).forEach(info => {
      const key = `${info.branch}::${info.itemName}`;
      const latestAudit = latestAuditMap[key];

      let currentStock = info.inQty - info.outQty;
      if (latestAudit) {
        currentStock = latestAudit.actualQty;
      }

      const isDisc = discontinuedSet.has(`${info.branch}::${info.itemName}`) ||
                     discontinuedSet.has(`ALL::${info.itemName}`) ||
                     discontinuedSet.has(`::${info.itemName}`);

      let activeMonths = 1;
      if (info.outDates.length > 1) {
        const uniqueMonths = new Set(info.outDates.map(d => d.slice(0, 7)));
        activeMonths = Math.max(1, uniqueMonths.size);
      }
      const avgMonthlyUsage = (info.outQty / activeMonths) || (info.outQty > 0 ? info.outQty : 5);
      const dailyUsage = avgMonthlyUsage / 30;
      const daysRemaining = dailyUsage > 0 ? Math.round(currentStock / dailyUsage) : 999;

      let status = '🟢 สต๊อกเพียงพอ';
      let statusCode = 'NORMAL';
      if (isDisc) {
        status = '⚪ เลิกใช้งาน (Discontinued)';
        statusCode = 'DISCONTINUED';
      } else if (currentStock <= 0) {
        status = '🚨 สินค้าหมดเกลี้ยง (ขาดแคลน)';
        statusCode = 'OUT_OF_STOCK';
      } else if (daysRemaining <= 7) {
        status = '⚠️ สั่งซื้อด่วน (เหลือน้อยกว่า 7 วัน)';
        statusCode = 'URGENT';
      } else if (daysRemaining <= 15) {
        status = '⚡ ควรเตรียมสั่งซื้อ (เหลือ 8-15 วัน)';
        statusCode = 'WARNING';
      }

      const suggestedOrderQty = isDisc ? 0 : Math.max(0, Math.ceil(avgMonthlyUsage * 1.5 - currentStock));

      result.push({
        branch: info.branch,
        itemName: info.itemName,
        currentStock: currentStock,
        avgMonthlyUsage: Math.round(avgMonthlyUsage * 10) / 10,
        estDaysLeft: isDisc ? null : (daysRemaining > 365 ? 365 : daysRemaining),
        daysRemaining: isDisc ? 'เลิกใช้' : (daysRemaining > 365 ? '365+' : daysRemaining),
        status: status,
        statusCode: statusCode,
        suggestedOrderQty: isDisc ? 0 : (suggestedOrderQty > 0 ? suggestedOrderQty : Math.ceil(avgMonthlyUsage || 10)),
        isDiscontinued: isDisc
      });
    });

    return result;
  }

  if (funcName === 'getAnnualPnLReport') {
    const yearStr = String(args[0] || new Date().getFullYear());

    const contracts = ensureArray(await safeFetch('contracts', sb => sb.from('contracts').select('*'), []));
    const totalContractBudget = contracts.reduce((sum, d) => sum + parseFloat(d.totalValue || d.totalBudget || 0), 0);

    const supplies = ensureArray(await safeFetch('supplies', sb => sb.from('supplies').select('*'), []));
    const payrolls = ensureArray(await safeFetch('payrolls', sb => sb.from('payrolls').select('*'), []));
    const capitals = ensureArray(await safeFetch('capitals', sb => sb.from('capitals').select('*'), []));

    const monthlyData = {};
    const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    for (let m = 1; m <= 12; m++) {
      const mKey = `${yearStr}-${m.toString().padStart(2, '0')}`;
      monthlyData[mKey] = {
        month: mKey,
        monthName: thMonths[m - 1],
        revenue: 0,
        labor: 0,
        material: 0,
        capital: 0
      };
    }

    const incomeKeywords = ['ค่างวด', 'รายรับ', 'ชำระ', 'รับเงิน', 'สัญญา', 'รายได้', 'งวดงาน', 'ยอดรับ', 'ชำระเงิน', 'เงินรับ', 'งาน', 'ผลงาน'];
    supplies.forEach(d => {
      const ym = parseDocYearMonth(d, ['requestDate', 'date', 'auditDate']);
      if (!ym || ym.year !== yearStr || !monthlyData[ym.monthKey]) return;

      const amt = parseFloat(d.totalPrice || d.amount || (parseFloat(d.itemQuantity || 0) * parseFloat(d.unitPrice || 0)));
      const itemName = d.itemName || '';
      const actionType = d.actionType || '';

      const isIncome = incomeKeywords.some(k => itemName.includes(k)) || (isNonMaterialItem(itemName) && !itemName.includes('เพิ่มทุน') && !itemName.includes('ค่าแรง') && !itemName.includes('เงินเดือน') && !itemName.includes('ภาษี') && !itemName.includes('ประกัน'));

      if (actionType === 'รับเข้า') {
        if (isIncome) {
          monthlyData[ym.monthKey].revenue += amt;
        } else if (amt > 0 && !isNonMaterialItem(itemName)) {
          monthlyData[ym.monthKey].material += amt;
        }
      } else if (actionType === 'จ่ายออก') {
        if (!itemName.includes('เพิ่มทุน') && !isIncome) {
          monthlyData[ym.monthKey].material += amt;
        }
      }
    });

    payrolls.forEach(d => {
      const ym = parseDocYearMonth(d, ['date', 'rawDate', 'month']);
      if (!ym || ym.year !== yearStr || !monthlyData[ym.monthKey]) return;

      const laborAmt = parseFloat(d.netPay || d.grossIncome || d.totalPay || d.amount || d.salary || 0);
      monthlyData[ym.monthKey].labor += laborAmt;
    });

    capitals.forEach(d => {
      const ym = parseDocYearMonth(d, ['date', 'rawDate']);
      if (!ym || ym.year !== yearStr || !monthlyData[ym.monthKey]) return;

      monthlyData[ym.monthKey].capital += parseFloat(d.amount || d.capital || 0);
    });

    let cumulativeRevenue = 0;
    let cumulativeExpense = 0;
    let cumulativeProfit = 0;

    const monthsList = Object.values(monthlyData).map(m => {
      const totalExp = m.labor + m.material;
      const profit = m.revenue - totalExp;
      const margin = m.revenue > 0 ? (profit / m.revenue) * 100 : 0;

      cumulativeRevenue += m.revenue;
      cumulativeExpense += totalExp;
      cumulativeProfit += profit;

      return {
        ...m,
        totalExpenses: totalExp,
        totalExpense: totalExp,
        netProfit: profit,
        profitMargin: Math.round(margin * 10) / 10,
        cumulativeRevenue: cumulativeRevenue,
        cumulativeExpense: cumulativeExpense,
        cumulativeExpenses: cumulativeExpense,
        cumulativeProfit: cumulativeProfit
      };
    });

    const totalRev = monthsList.reduce((s, x) => s + x.revenue, 0);
    const totalLabor = monthsList.reduce((s, x) => s + x.labor, 0);
    const totalMaterial = monthsList.reduce((s, x) => s + x.material, 0);
    const totalCapital = monthsList.reduce((s, x) => s + x.capital, 0);
    const totalExp = totalLabor + totalMaterial;
    const totalProfit = totalRev - totalExp;
    const overallMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

    const summaryObj = {
      totalContractBudget,
      totalRevenue: totalRev,
      totalLabor: totalLabor,
      totalMaterial: totalMaterial,
      totalCapital: totalCapital,
      totalExpenses: totalExp,
      netProfit: totalProfit,
      totalProfit: totalProfit,
      profitMargin: Math.round(overallMargin * 10) / 10,
      overallMargin: Math.round(overallMargin * 10) / 10
    };

    return {
      year: yearStr,
      ...summaryObj,
      summary: summaryObj,
      months: monthsList,
      monthlyBreakdown: monthsList
    };
  }

  if (funcName === 'getExpenseReport') {
    const month = args[0] || '';
    const supplies = ensureArray(await safeFetch('supplies', sb => sb.from('supplies').select('*'), []));
    const payrolls = ensureArray(await safeFetch('payrolls', sb => sb.from('payrolls').select('*'), []));

    const reportRows = [];
    supplies.forEach(s => {
      if (s.actionType === 'จ่ายออก' && (s.requestDate || '').startsWith(month)) {
        reportRows.push({
          date: s.requestDate,
          item: s.itemName,
          loc: s.deliveryLocation || 'สำนักงานใหญ่',
          amount: parseFloat(s.unitPrice || 0) * parseFloat(s.itemQuantity || 0)
        });
      }
    });

    payrolls.forEach(p => {
      const pDate = p.date || p.rawDate || '';
      if (pDate.startsWith(month)) {
        reportRows.push({
          date: pDate,
          item: `ค่าแรง: ${p.workerName || 'คนงาน'}`,
          loc: p.branch || 'สำนักงานใหญ่',
          amount: parseFloat(p.netPay || 0)
        });
      }
    });

    return reportRows;
  }

if (funcName === 'getInventoryStatus') {
  const branch = args[0] || '';
  const supplies = ensureArray(await safeFetch('supplies', sb => sb.from('supplies').select('*'), []));
  const discItems = ensureArray(await safeFetch('discontinued_items', sb => sb.from('discontinued_items').select('*'), []));
  const discSet = new Set(discItems.filter(d => d.isDiscontinued).map(d => d.itemName));

  // Central Stock: key = ชื่อสินค้าอย่างเดียว ไม่แยก location
  const map = {};

  supplies.forEach(s => {
    const item = s.itemName || '';
    if (!item || isNonMaterialItem(item)) return;

    const loc = s.deliveryLocation || 'สำนักงานใหญ่';
    const key = item; // ← รวมทุกสาขาเป็นก้อนเดียว

    if (!map[key]) {
      map[key] = { itemName: item, inQty: 0, outQty: 0, lastPrice: 0, outByBranch: {} };
    }

    const qty = parseFloat(s.itemQuantity || 0);
    const price = parseFloat(s.unitPrice || 0);
    if (price > 0) map[key].lastPrice = price;

    if (s.actionType === 'รับเข้า' || s.actionType === 'ยอดยกมา') {
      // รับเข้า → นับรวมทุกสาขา ไม่กรอง
      map[key].inQty += qty;
    } else if (s.actionType === 'จ่ายออก') {
      // ถ้าเลือกดูสาขาเฉพาะ → กรองเฉพาะจ่ายออกของสาขานั้น
      if (branch && branch !== 'ทุกสาขา' && loc !== branch) return;
      map[key].outQty += qty;
      map[key].outByBranch[loc] = (map[key].outByBranch[loc] || 0) + qty;
    }
  });

  return Object.values(map).map(i => {
    const balance = i.inQty - i.outQty;
    const status = balance <= 0 ? 'หมดเกลี้ยง' : (balance < 10 ? 'ใกล้หมด' : 'ปกติ');
    return {
      name: i.itemName,
      itemName: i.itemName,
      in: i.inQty,
      inQty: i.inQty,
      out: i.outQty,
      outQty: i.outQty,
      balance: balance,
      status: status,
      unitPrice: i.lastPrice,
      totalValue: balance * i.lastPrice,
      outByBranch: i.outByBranch,
      isDiscontinued: discSet.has(i.itemName)
    };
  });
}

  if (funcName === 'getMaterialList') {
    const supplies = ensureArray(await safeFetch('supplies', sb => sb.from('supplies').select('*'), []));
    const set = new Set();
    supplies.forEach(s => {
      if (s.itemName && !isNonMaterialItem(s.itemName)) set.add(s.itemName);
    });
    return Array.from(set);
  }

  if (funcName === 'evaluateMaterial') {
    const item = args[0] || '';
    const days = parseInt(args[1] || 1, 10);
    const supplies = ensureArray(await safeFetch('supplies', sb => sb.from('supplies').select('*'), []));
    const itemSupplies = supplies.filter(s => s.itemName === item && s.actionType === 'จ่ายออก');

    if (!itemSupplies.length) {
      return { success: false, message: `ยังไม่มีประวัติการจ่ายออกของ ${item}` };
    }

    itemSupplies.sort((a, b) => (b.requestDate || '').localeCompare(a.requestDate || ''));
    const last = itemSupplies[0];
    const lastDate = last.requestDate || new Date().toISOString().split('T')[0];
    const lastQty = parseFloat(last.itemQuantity || 0);

    const today = new Date();
    const lastD = new Date(lastDate);
    const diffTime = Math.abs(today - lastD);
    const daysSinceLast = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    let totalQty = 0;
    let totalPrice = 0;
    itemSupplies.forEach(s => {
      const q = parseFloat(s.itemQuantity || 0);
      totalQty += q;
      totalPrice += q * parseFloat(s.unitPrice || 0);
    });

    const avgPrice = totalQty > 0 ? totalPrice / totalQty : parseFloat(last.unitPrice || 0);
    const burnRateDaily = Math.round((totalQty / Math.max(30, daysSinceLast)) * 10) / 10 || 1;
    const estimatedQty = Math.ceil(burnRateDaily * days);
    const estimatedCost = estimatedQty * avgPrice;
    const monthlyCost = burnRateDaily * 30 * avgPrice;

    return {
      success: true,
      lastDate,
      lastQty,
      daysSinceLast,
      burnRateDaily,
      estimatedQty,
      estimatedCost,
      monthlyCost
    };
  }

  if (funcName === 'saveSignature') {
    const data = args[0] || {};
    const payrollId = data.payrollId;
    const signatureBase64 = data.signatureBase64;
    const signerRole = data.signerRole || 'payee';
    const recordedBy = data.recordedBy || '';
    const device = data.device || '';
    const signedAt = new Date().toLocaleString('th-TH');

    const compressed = await compressImageIfNeeded(signatureBase64, 400, 200, 0.7);

    const payrolls = await safeFetch('payrolls', sb => sb.from('payrolls').select('*'), []);
    const pr = payrolls.find(p => String(p.id) === String(payrollId));
    const workerName = pr ? pr.workerName : '';
    const payDate = pr ? pr.date || pr.rawDate : '';

    if (pr) {
      const updateField = signerRole === 'payer'
        ? { signaturePayerUrl: compressed, signedPayerAt: signedAt }
        : { signaturePayeeUrl: compressed, signedPayeeAt: signedAt };

      await safeSave('payrolls',
        sb => sb.from('payrolls').update(prepareSupabasePayload(updateField)).eq('id', String(payrollId)),
        list => list.map(p => String(p.id) === String(payrollId) ? { ...p, ...updateField } : p),
        'บันทึกลายเซ็นเงินเดือน'
      );
    }

    const logId = 'sig_' + Date.now();
    const logPayload = {
      id: logId,
      payrollId: String(payrollId),
      workerName: workerName,
      payDate: payDate,
      signerRole: signerRole,
      signedAt: signedAt,
      recordedBy: recordedBy,
      device: device,
      signatureUrl: compressed
    };

    await safeSave('signature_logs',
      sb => sb.from('signature_logs').upsert(prepareSupabasePayload(logPayload)),
      list => { list.push(logPayload); return list; },
      'บันทึกประวัติการเซ็น',
      { op: 'upsert', payload: prepareSupabasePayload(logPayload) }
    );

    return { success: true, signedAt };
  }

  if (funcName === 'getSignatureLogs') {
    const payrollId = args[0] || '';
    const logs = await safeFetch('signature_logs', sb => {
      let q = sb.from('signature_logs').select('*');
      if (payrollId) q = q.eq('payrollid', String(payrollId));
      return q;
    }, []);

    return logs;
  }

  return { success: true };
}

// เรียกซิงก์รายการที่ค้างอยู่ทันทีตอนโหลดหน้า, ทุก 60 วินาที, และทันทีที่เน็ตกลับมาใช้ได้
if (typeof window !== 'undefined') {
  setTimeout(() => attemptPendingSync(), 3000);
  setInterval(() => attemptPendingSync(), 60000);
  window.addEventListener('online', () => attemptPendingSync());
}

window.runSupabase = runSupabase;
window.runGoogle = runSupabase;
window.runFirebase = runSupabase;
window.attemptPendingSync = attemptPendingSync;
window.getPendingSyncQueue = getPendingSyncQueue;
