// scripts/smoke-test.mjs
// ตรวจสุขภาพระบบหลัง deploy ทุกครั้ง: login -> เขียน -> อ่านกลับ -> ลบ
// รันด้วย: node scripts/smoke-test.mjs
// ต้องตั้ง env: SUPABASE_URL, SUPABASE_ANON_KEY (และ SMOKE_TEST_USER / SMOKE_TEST_PASS ถ้าต้องการทดสอบ login)
//
// ถ้าขั้นตอนไหนพัง สคริปต์จะ exit(1) ทันที เพื่อให้ CI/CD บล็อก deploy หรือส่งแจ้งเตือนได้
// จุดประสงค์คือจับบั๊กแบบ "หน้าเว็บบอกสำเร็จแต่ไม่มีข้อมูลใน Supabase" ให้ได้ตั้งแต่ตอน deploy
// ไม่ต้องรอผู้ใช้จริงมาเจอแล้วมาแจ้งทีหลัง

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ขาด env: SUPABASE_URL หรือ SUPABASE_ANON_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function fail(step, err) {
  console.error(`❌ SMOKE TEST FAILED at [${step}]`);
  console.error(err);
  process.exit(1);
}

async function main() {
  const testId = '__smoke_test_' + Date.now() + '__';
  console.log('=== NovaSol ERP Smoke Test ===');
  console.log('Target:', SUPABASE_URL);

  // 1) ทดสอบ login (ถ้ามีการตั้ง env ทดสอบไว้)
  const testUser = process.env.SMOKE_TEST_USER;
  const testPass = process.env.SMOKE_TEST_PASS;
  if (testUser && testPass) {
    const { data, error } = await sb.rpc('verify_login', { p_username: testUser, p_password: testPass });
    if (error) fail('login (RPC error)', error);
    if (!data || data.length === 0) fail('login (invalid credentials or RPC missing)', 'no row returned');
    console.log('✅ login RPC ทำงานปกติ ->', data[0].name);
  } else {
    console.log('⏭️  ข้ามทดสอบ login (ไม่ได้ตั้ง SMOKE_TEST_USER / SMOKE_TEST_PASS)');
  }

  // 2) ทดสอบเขียนลง supplies (จุดที่เคยพังจริง)
  const insertPayload = {
    id: testId,
    itemname: 'SMOKE_TEST_ITEM',
    actiontype: 'รับเข้า',
    itemquantity: 1,
    unitprice: 1,
    deliverylocation: 'smoke-test',
    requestdate: new Date().toISOString().split('T')[0],
    requester: 'smoke-test-script',
    imageurl: ''
  };
  const { error: insertErr } = await sb.from('supplies').upsert(insertPayload);
  if (insertErr) fail('insert into supplies', insertErr);
  console.log('✅ เขียนข้อมูลทดสอบสำเร็จ');

  // 3) อ่านกลับมาตรวจว่าค่าที่บันทึกตรงกับที่ส่งไปจริง
  const { data: readBack, error: readErr } = await sb.from('supplies').select('*').eq('id', testId).single();
  if (readErr) fail('read back from supplies', readErr);
  if (!readBack || readBack.itemname !== 'SMOKE_TEST_ITEM') {
    fail('verify read back', `expected itemname=SMOKE_TEST_ITEM, got ${JSON.stringify(readBack)}`);
  }
  console.log('✅ อ่านข้อมูลกลับมาตรวจสอบแล้วตรงกัน');

  // 4) ลบข้อมูลทดสอบทิ้ง ไม่ให้ค้างในฐานข้อมูลจริง
  const { error: delErr } = await sb.from('supplies').delete().eq('id', testId);
  if (delErr) fail('cleanup delete', delErr);
  console.log('✅ ลบข้อมูลทดสอบเรียบร้อย ไม่มีขยะค้างในฐานข้อมูล');

  console.log('=== ✅ SMOKE TEST PASSED ===');
  process.exit(0);
}

main().catch(e => fail('unexpected error', e));

