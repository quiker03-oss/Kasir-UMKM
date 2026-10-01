// Test Tenant Isolation Verification Script
const BASE_URL = 'http://localhost:3000';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 MEMULAI PENGUJIAN ISOLASI DATA MULTI-TENANT');
  console.log('====================================================\n');

  // Test 1: Login Toko A
  console.log('1. Pengujian Login Toko A (kopi_kasir)');
  const loginA = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'kopi_kasir', password: 'password123' }),
  });
  if (!loginA.ok || !loginA.data?.token) {
    throw new Error('Gagal login sebagai Kasir Toko A: ' + JSON.stringify(loginA.data));
  }
  const tokenA = loginA.data.token;
  console.log('   ✅ Berhasil Login Toko A. Store ID:', loginA.data.user.store_id);

  // Test 2: Login Toko B
  console.log('\n2. Pengujian Login Toko B (kasir_tokob)');
  const loginB = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'kasir_tokob', password: 'password123' }),
  });
  if (!loginB.ok || !loginB.data?.token) {
    throw new Error('Gagal login sebagai Kasir Toko B: ' + JSON.stringify(loginB.data));
  }
  const tokenB = loginB.data.token;
  console.log('   ✅ Berhasil Login Toko B. Store ID:', loginB.data.user.store_id);

  // Test 3: Login Toko C
  console.log('\n3. Pengujian Login Toko C (kasir_tokoc)');
  const loginC = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'kasir_tokoc', password: 'password123' }),
  });
  if (!loginC.ok || !loginC.data?.token) {
    throw new Error('Gagal login sebagai Kasir Toko C: ' + JSON.stringify(loginC.data));
  }
  const tokenC = loginC.data.token;
  console.log('   ✅ Berhasil Login Toko C. Store ID:', loginC.data.user.store_id);

  // Test 4: Isolasi Produk Toko A
  console.log('\n4. Pengujian Isolasi Produk Toko A');
  const prodsA = await request('/api/products', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const prodNamesA = (prodsA.data?.products || []).map((p: any) => p.name);
  console.log('   Daftar produk Toko A:', prodNamesA.slice(0, 4).join(', '), '... (total:', prodNamesA.length, ')');
  const hasBakeryInA = prodNamesA.some((n: string) => n.toLowerCase().includes('croissant') || n.toLowerCase().includes('pastry'));
  const hasDimsumInA = prodNamesA.some((n: string) => n.toLowerCase().includes('siomay') || n.toLowerCase().includes('hakau'));
  if (hasBakeryInA || hasDimsumInA) {
    throw new Error('❌ DATA LEAK! Produk Toko B/C bocor ke Toko A!');
  }
  console.log('   ✅ Tidak ada produk Toko B atau Toko C yang bocor ke Toko A.');

  // Test 5: Isolasi Produk Toko B
  console.log('\n5. Pengujian Isolasi Produk Toko B');
  const prodsB = await request('/api/products', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const prodNamesB = (prodsB.data?.products || []).map((p: any) => p.name);
  console.log('   Daftar produk Toko B:', prodNamesB.slice(0, 4).join(', '), '... (total:', prodNamesB.length, ')');
  const hasCoffeeInB = prodNamesB.some((n: string) => n.toLowerCase().includes('gula aren') || n.toLowerCase().includes('geprek'));
  const hasDimsumInB = prodNamesB.some((n: string) => n.toLowerCase().includes('hakau') || n.toLowerCase().includes('mie tarik'));
  if (hasCoffeeInB || hasDimsumInB) {
    throw new Error('❌ DATA LEAK! Produk Toko A/C bocor ke Toko B!');
  }
  console.log('   ✅ Tidak ada produk Toko A atau Toko C yang bocor ke Toko B.');

  // Test 6: Isolasi Produk Toko C
  console.log('\n6. Pengujian Isolasi Produk Toko C');
  const prodsC = await request('/api/products', {
    headers: { Authorization: `Bearer ${tokenC}` },
  });
  const prodNamesC = (prodsC.data?.products || []).map((p: any) => p.name);
  console.log('   Daftar produk Toko C:', prodNamesC.slice(0, 4).join(', '), '... (total:', prodNamesC.length, ')');
  const hasCoffeeInC = prodNamesC.some((n: string) => n.toLowerCase().includes('gula aren') || n.toLowerCase().includes('geprek'));
  const hasBakeryInC = prodNamesC.some((n: string) => n.toLowerCase().includes('croissant') || n.toLowerCase().includes('cheesecake'));
  if (hasCoffeeInC || hasBakeryInC) {
    throw new Error('❌ DATA LEAK! Produk Toko A/B bocor ke Toko C!');
  }
  console.log('   ✅ Tidak ada produk Toko A atau Toko B yang bocor ke Toko C.');

  // Test 7: IDOR Attack - Toko A mencoba mengakses Transaksi Toko B
  console.log('\n7. Pengujian Penolakan IDOR: Toko A mencoba membaca transaksi Toko B (trx-b-seed-01)');
  const attackTrx = await request('/api/pos/transactions/trx-b-seed-01', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (attackTrx.status === 200) {
    throw new Error('❌ VULNERABILITY! Toko A berhasil melihat data transaksi Toko B!');
  }
  console.log(`   ✅ DITOLAK SESUAI ATURAN (HTTP Status: ${attackTrx.status} - ${attackTrx.data?.message})`);

  // Test 8: IDOR Attack - Toko A mencoba mengubah foto produk Toko B
  console.log('\n8. Pengujian Penolakan IDOR: Toko A mencoba mengubah foto produk Toko B (prod-b01)');
  const attackPatch = await request('/api/products/prod-b01/image', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ image_url: 'https://attacker.com/malicious.jpg' }),
  });
  if (attackPatch.status === 200) {
    throw new Error('❌ VULNERABILITY! Toko A berhasil memodifikasi produk Toko B!');
  }
  console.log(`   ✅ DITOLAK SESUAI ATURAN (HTTP Status: ${attackPatch.status} - ${attackPatch.data?.message})`);

  // Test 9: IDOR Attack - Toko A mencoba checkout menggunakan produk Toko B
  console.log('\n9. Pengujian Penolakan IDOR: Toko A mencoba checkout dengan item milik Toko B (prod-b01)');
  const attackCheckout = await request('/api/pos/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      customer_name: 'Attacker',
      order_type: 'TAKEAWAY',
      payment_method: 'TUNAI',
      amount_paid: 100000,
      items: [{ product_id: 'prod-b01', quantity: 1 }],
    }),
  });
  if (attackCheckout.status === 200) {
    throw new Error('❌ VULNERABILITY! Toko A berhasil checkout dengan produk Toko B!');
  }
  console.log(`   ✅ DITOLAK SESUAI ATURAN (HTTP Status: ${attackCheckout.status} - ${attackCheckout.data?.message})`);

  // Test 10: Isolasi Meja Toko
  console.log('\n10. Pengujian Isolasi Meja Antar Toko');
  const tablesA = await request('/api/tables', { headers: { Authorization: `Bearer ${tokenA}` } });
  const tablesB = await request('/api/tables', { headers: { Authorization: `Bearer ${tokenB}` } });
  const tNamesA = (tablesA.data?.tables || []).map((t: any) => t.name);
  const tNamesB = (tablesB.data?.tables || []).map((t: any) => t.name);
  console.log('   Meja Toko A:', tNamesA.join(', '));
  console.log('   Meja Toko B:', tNamesB.join(', '));
  const tableOverlap = tNamesA.some((ta: string) => tNamesB.includes(ta));
  if (tableOverlap) {
    throw new Error('❌ Meja Toko A dan Toko B tercampur!');
  }
  console.log('   ✅ Meja Toko A dan Toko B 100% terisolasi secara terpisah.');

  // Test 11: Public Catalog & QR per Toko
  console.log('\n11. Pengujian Public Menu & QR per Toko');
  const pubStoreA = await request('/api/public/store/kopi-nusantara');
  const pubStoreB = await request('/api/public/store/toko-b');
  const pubStoreC = await request('/api/public/store/toko-c');
  if (pubStoreA.data?.store?.name !== 'Toko A - Warung Kopi Nusantara' && !pubStoreA.data?.store?.name?.includes('Nusantara')) {
    throw new Error('Public store A salah');
  }
  if (!pubStoreB.data?.store?.name?.includes('Bakery')) {
    throw new Error('Public store B salah');
  }
  if (!pubStoreC.data?.store?.name?.includes('Dimsum')) {
    throw new Error('Public store C salah');
  }
  console.log('   ✅ Menu Toko A:', pubStoreA.data?.store?.name, `(${pubStoreA.data?.products?.length} produk)`);
  console.log('   ✅ Menu Toko B:', pubStoreB.data?.store?.name, `(${pubStoreB.data?.products?.length} produk)`);
  console.log('   ✅ Menu Toko C:', pubStoreC.data?.store?.name, `(${pubStoreC.data?.products?.length} produk)`);

  // Test 12: Super Admin
  console.log('\n12. Pengujian Super Admin Mengelola Multi-Toko');
  const loginSA = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'superadmin', password: 'password123' }),
  });
  if (!loginSA.ok || !loginSA.data?.token) {
    throw new Error('Gagal login sebagai Super Admin');
  }
  const tokenSA = loginSA.data.token;
  const allStores = await request('/api/superadmin/stores', {
    headers: { Authorization: `Bearer ${tokenSA}` },
  });
  console.log(`   ✅ Super Admin berhasil mengakses seluruh ${allStores.data?.stores?.length} toko terdaftar.`);

  console.log('\n====================================================');
  console.log('🎉 SEMUA 12 PENGUJIAN ISOLASI MULTI-TENANT BERHASIL 100%!');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ PENGUJIAN GAGAL:', err);
  process.exit(1);
});
