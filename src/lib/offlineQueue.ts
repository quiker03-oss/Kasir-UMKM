/**
 * Offline Persistence Queue for POS Transactions using IndexedDB
 * Ensures 100% data safety and zero transaction loss during internet outages.
 * Automatically synchronizes stored transactions to the server when connection is restored.
 */

export interface OfflineQueueItem {
  id: string;
  store_id: string;
  transaction_number: string;
  created_at: string;
  payload: any;
  receipt: any;
  status: 'PENDING_SYNC' | 'SYNCING' | 'FAILED';
  retry_count: number;
  last_error?: string;
  synced_at?: string;
}

const DB_NAME = 'kasir_umkm_offline_pos_v2';
const DB_VERSION = 1;
const STORE_QUEUE = 'offline_pos_queue';
const STORE_PRODUCTS = 'cached_products';
const STORE_META = 'cached_meta';

let dbInstance: IDBDatabase | null = null;
let isSyncing = false;

/**
 * Open or initialize IndexedDB connection
 */
export function openIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Offline Transactions Queue Store
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('by_store', 'store_id', { unique: false });
        queueStore.createIndex('by_status', 'status', { unique: false });
        queueStore.createIndex('by_created_at', 'created_at', { unique: false });
      }

      // 2. Cached Products Store (for offline catalog searching & barcode scanning)
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        const prodStore = db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
        prodStore.createIndex('by_store', 'store_id', { unique: false });
        prodStore.createIndex('by_barcode', 'barcode', { unique: false });
      }

      // 3. Cached Metadata Store (Store info, settings)
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Helper to dispatch events to React components
 */
function broadcastQueueChange(type: 'enqueued' | 'synced' | 'failed' | 'updated', detail?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pos:offline_queue_changed', {
        detail: { type, timestamp: Date.now(), ...detail },
      })
    );
  }
}

/**
 * Save a transaction to the offline queue in IndexedDB
 */
export async function enqueueOfflineTransaction(params: {
  storeId: string;
  payload: any;
  receiptData?: any;
}): Promise<OfflineQueueItem> {
  const db = await openIndexedDB();
  const now = new Date();
  const dateCode = now.toISOString().split('T')[0].replace(/-/g, '');
  const randCode = Math.floor(1000 + Math.random() * 9000);
  
  // Format consistent transaction number with OFFLINE marker
  const trxNumber = params.receiptData?.transaction_number || `TRX-${dateCode}-OFF-${randCode}`;
  const queueId = `off-trx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = now.toISOString();

  // Construct complete receipt object so cashier can print receipt immediately
  const receipt = params.receiptData || {
    id: queueId,
    transaction_number: trxNumber,
    created_at: nowIso,
    cashier_name: params.payload.cashier_name || 'Kasir',
    customer_name: params.payload.customer_name || 'Pelanggan Umum',
    table_name: params.payload.table_name || null,
    order_type: params.payload.order_type || 'DINE_IN',
    subtotal: params.payload.subtotal || 0,
    discount: params.payload.discount || 0,
    total_amount: params.payload.total_amount || 0,
    payment_method: params.payload.payment_method || 'TUNAI',
    amount_paid: params.payload.amount_paid || 0,
    change_amount: params.payload.change_amount || 0,
    notes: params.payload.notes || '',
    items: params.payload.items || [],
    is_offline: true,
  };

  const item: OfflineQueueItem = {
    id: queueId,
    store_id: params.storeId,
    transaction_number: trxNumber,
    created_at: nowIso,
    payload: {
      ...params.payload,
      transaction_number: trxNumber,
      created_at: nowIso,
      is_offline_sync: true,
      offline_id: queueId,
    },
    receipt: {
      ...receipt,
      is_offline: true,
    },
    status: 'PENDING_SYNC',
    retry_count: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_QUEUE], 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    const req = store.add(item);

    req.onsuccess = () => {
      broadcastQueueChange('enqueued', { item });
      resolve(item);
    };

    req.onerror = () => {
      console.error('Failed to enqueue offline transaction:', req.error);
      reject(req.error);
    };
  });
}

/**
 * Get all pending offline transactions for a store
 */
export async function getPendingOfflineTransactions(storeId?: string): Promise<OfflineQueueItem[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_QUEUE], 'readonly');
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.getAll();

      req.onsuccess = () => {
        let items: OfflineQueueItem[] = req.result || [];
        if (storeId) {
          items = items.filter((it) => it.store_id === storeId);
        }
        // Sort oldest first (FIFO queue)
        items.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
        resolve(items);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error getting pending offline transactions:', err);
    return [];
  }
}

/**
 * Get count of pending offline transactions
 */
export async function getOfflineQueueCount(storeId?: string): Promise<number> {
  const items = await getPendingOfflineTransactions(storeId);
  return items.length;
}

/**
 * Remove a successfully synced transaction from IndexedDB
 */
export async function removeOfflineTransaction(id: string): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_QUEUE], 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    const req = store.delete(id);

    req.onsuccess = () => {
      broadcastQueueChange('updated', { deletedId: id });
      resolve();
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Update transaction status in IndexedDB
 */
export async function updateOfflineTransactionStatus(
  id: string,
  status: 'PENDING_SYNC' | 'SYNCING' | 'FAILED',
  errorMsg?: string
): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_QUEUE], 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item: OfflineQueueItem = getReq.result;
      if (!item) {
        resolve();
        return;
      }
      item.status = status;
      if (status === 'FAILED') {
        item.retry_count = (item.retry_count || 0) + 1;
        item.last_error = errorMsg || 'Gagal tersinkron ke server.';
      }
      const putReq = store.put(item);
      putReq.onsuccess = () => {
        broadcastQueueChange('updated', { updatedId: id, status });
        resolve();
      };
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Cache products locally in IndexedDB so catalog search & barcode scanning work offline
 */
export async function cacheProductsLocally(storeId: string, products: any[]): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction([STORE_PRODUCTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);

    for (const prod of products) {
      if (prod && prod.id) {
        store.put({ ...prod, store_id: storeId });
      }
    }
  } catch (err) {
    console.warn('Failed to cache products locally:', err);
  }
}

/**
 * Get locally cached products from IndexedDB
 */
export async function getCachedProductsLocally(storeId: string): Promise<any[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PRODUCTS], 'readonly');
      const store = tx.objectStore(STORE_PRODUCTS);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = req.result || [];
        const filtered = all.filter((p: any) => p.store_id === storeId && p.is_active);
        resolve(filtered);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get cached products:', err);
    return [];
  }
}

/**
 * Synchronize all pending offline transactions to the server
 */
export async function syncOfflineQueue(
  storeId?: string
): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
  // Prevent concurrent sync executions
  if (isSyncing) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  // Check if browser is online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0, errors: ['Device is offline'] };
  }

  const items = await getPendingOfflineTransactions(storeId);
  if (items.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  isSyncing = true;
  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  // Import api dynamically or use stored token
  const token = localStorage.getItem('kasir_umkm_token');
  if (!token) {
    isSyncing = false;
    return { syncedCount: 0, failedCount: items.length, errors: ['Belum login'] };
  }

  try {
    // Try batch sync first for fast network utilization
    const batchPayload = items.map((it) => ({
      id: it.id,
      payload: it.payload,
    }));

    try {
      const batchRes = await fetch('/api/pos/sync-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ queue: batchPayload }),
      });

      if (batchRes.ok) {
        const data = await batchRes.json();
        if (data.success && Array.isArray(data.synced_ids)) {
          for (const syncedId of data.synced_ids) {
            await removeOfflineTransaction(syncedId);
            syncedCount++;
          }

          if (Array.isArray(data.failed_items)) {
            for (const fail of data.failed_items) {
              await updateOfflineTransactionStatus(fail.id, 'FAILED', fail.error);
              failedCount++;
              errors.push(fail.error || 'Gagal sinkron');
            }
          }

          broadcastQueueChange('synced', { syncedCount, failedCount });
          // Dispatch pos transaction completed to update dashboard
          window.dispatchEvent(new CustomEvent('pos:transaction_completed'));
          isSyncing = false;
          return { syncedCount, failedCount, errors };
        }
      }
    } catch (batchErr) {
      // Fallback to sequential individual sync if batch endpoint failed
      console.warn('Batch sync fallback to sequential sync:', batchErr);
    }

    // Sequential individual sync fallback
    for (const item of items) {
      await updateOfflineTransactionStatus(item.id, 'SYNCING');

      try {
        const res = await fetch('/api/pos/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item.payload),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          await removeOfflineTransaction(item.id);
          syncedCount++;
        } else {
          failedCount++;
          const err = data.message || 'Server menolak transaksi';
          errors.push(err);
          await updateOfflineTransactionStatus(item.id, 'FAILED', err);
        }
      } catch (reqErr: any) {
        failedCount++;
        const netErr = reqErr.message || 'Koneksi terputus saat sinkronisasi';
        errors.push(netErr);
        await updateOfflineTransactionStatus(item.id, 'FAILED', netErr);
        // If network error, pause sync loop
        break;
      }
    }

    if (syncedCount > 0) {
      broadcastQueueChange('synced', { syncedCount, failedCount });
      window.dispatchEvent(new CustomEvent('pos:transaction_completed'));
    }
  } catch (err: any) {
    console.error('Fatal error during offline queue sync:', err);
    errors.push(err.message || 'Error sinkronisasi');
  } finally {
    isSyncing = false;
  }

  return { syncedCount, failedCount, errors };
}

/**
 * Setup automatic synchronization listeners (when online returns and polling)
 */
export function setupAutoSync(storeId?: string): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. Immediately attempt sync when internet connection returns
  const handleOnline = () => {
    console.log('[OfflineQueue] Connection restored! Triggering automatic sync...');
    syncOfflineQueue(storeId);
  };

  // 2. Periodic background check every 10 seconds if online
  const syncInterval = setInterval(() => {
    if (navigator.onLine) {
      getOfflineQueueCount(storeId).then((cnt) => {
        if (cnt > 0) {
          syncOfflineQueue(storeId);
        }
      });
    }
  }, 10000);

  window.addEventListener('online', handleOnline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(syncInterval);
  };
}
