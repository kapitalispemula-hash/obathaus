// OFFLINE SYNC QUEUE MANAGER — OBAT HAUS POS
// Ensures zero transaction loss during outlet internet disconnects

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Transaction } from '@/types/database';

const OFFLINE_QUEUE_KEY = 'obathaus_offline_transactions_queue';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface QueuedOfflineTransaction {
  transaction: Transaction;
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

export function getOfflineQueue(): QueuedOfflineTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse offline transaction queue:', err);
    return [];
  }
}

export function saveOfflineQueue(queue: QueuedOfflineTransaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline transaction queue:', err);
  }
}

export function enqueueOfflineTransaction(transaction: Transaction, lastError?: string): void {
  const current = getOfflineQueue();
  const idx = current.findIndex((q) => q.transaction.id === transaction.id);
  if (idx >= 0) {
    if (lastError) {
      current[idx].lastError = lastError;
      saveOfflineQueue(current);
    }
    return;
  }

  current.push({
    transaction,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError,
  });
  saveOfflineQueue(current);
  console.log(`[Offline Queue] Transaction #${transaction.invoice_number} enqueued for cloud sync.`);
}

let isSyncing = false;

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof window === 'undefined' || !navigator.onLine || !isSupabaseConfigured()) {
    return { synced: 0, failed: 0 };
  }

  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    isSyncing = false;
    return { synced: 0, failed: 0 };
  }

  console.log(`[Offline Queue] Attempting to sync ${queue.length} offline transactions to Supabase...`);
  const supabase = createClient();
  let synced = 0;
  let failed = 0;
  const remainingQueue: QueuedOfflineTransaction[] = [];

  for (const item of queue) {
    const { transaction } = item;
    try {
      const validShiftId =
        transaction.shift_id && UUID_REGEX.test(transaction.shift_id) ? transaction.shift_id : null;

      const basePayload = {
        id: transaction.id,
        invoice_number: transaction.invoice_number,
        cashier_id: transaction.cashier_id,
        outlet_id: transaction.outlet_id,
        shift_id: validShiftId,
        subtotal: transaction.subtotal,
        discount_total: transaction.discount_total,
        tax_total: transaction.tax_total,
        grand_total: transaction.grand_total,
        total_cogs: transaction.total_cogs,
        total_profit: transaction.total_profit,
        payment_method: transaction.payment_method,
        amount_received: transaction.amount_received,
        change_amount: transaction.change_amount,
        status: transaction.status,
        idempotency_key: transaction.idempotency_key,
        notes: transaction.notes,
        created_at: transaction.created_at,
      };

      // 1. Upsert transaction header (retry with shift_id: null if shift FK doesn't exist in cloud)
      let { error: trxError } = await supabase.from('transactions').upsert(basePayload);

      if (
        trxError &&
        basePayload.shift_id &&
        (trxError.code === '23503' || trxError.message?.toLowerCase().includes('shift_id'))
      ) {
        const retryRes = await supabase
          .from('transactions')
          .upsert({ ...basePayload, shift_id: null });
        trxError = retryRes.error;
      }

      if (trxError) throw trxError;

      // 2. Upsert transaction items
      if (transaction.items && transaction.items.length > 0) {
        const itemsToInsert = transaction.items.map((it) => ({
          id: it.id,
          transaction_id: transaction.id,
          product_id: it.product_id,
          product_name: it.product_name,
          product_sku: it.product_sku,
          unit_price: it.unit_price,
          unit_hpp: it.unit_hpp,
          quantity: it.quantity,
          subtotal: it.subtotal,
          discount_allocated: it.discount_allocated,
          created_at: it.created_at || transaction.created_at,
        }));

        const { error: itemsError } = await supabase.from('transaction_items').upsert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      synced++;
      console.log(`[Offline Queue] Transaction #${transaction.invoice_number} synced to Supabase successfully.`);
    } catch (err: any) {
      console.error(`[Offline Queue] Failed to sync transaction #${transaction.invoice_number}:`, err);
      item.attempts += 1;
      item.lastError = err?.message || String(err);
      failed++;
      remainingQueue.push(item);
    }
  }

  saveOfflineQueue(remainingQueue);
  isSyncing = false;

  if (synced > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('obathaus_offline_queue_synced', { detail: { synced } }));
  }

  return { synced, failed };
}

// Auto-register listener when loaded in browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Network] Internet connection restored. Triggering offline sync...');
    syncOfflineQueue();
  });
}
