// OFFLINE SYNC QUEUE MANAGER — OBAT HAUS POS
// Ensures zero transaction, stock, ledger, or shift loss during outlet internet disconnects

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Transaction } from '@/types/database';

const OFFLINE_QUEUE_KEY = 'obathaus_offline_transactions_queue';
const OFFLINE_SHIFT_QUEUE_KEY = 'obathaus_offline_shifts_queue';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface OfflineStockDeduction {
  raw_material_id: string;
  neededQty: number;
  balBefore: number;
  balAfter: number;
  unitSymbol: string;
  unitCost: number;
  productName: string;
  qtySold: number;
}

export interface QueuedOfflineTransaction {
  transaction: Transaction;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  outletName?: string;
  stockDeductions?: OfflineStockDeduction[];
  sideEffectsSynced?: boolean;
}

export type OfflineShiftOp =
  | {
      kind: 'open_shift';
      id: string;
      shiftPayload: {
        id: string;
        shift_number: string;
        outlet_id: string;
        cashier_id: string;
        status: 'active';
        opening_cash: number;
        opened_at: string;
        notes: string | null;
        created_at: string;
        updated_at: string;
      };
      queuedAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      kind: 'cash_movement';
      id: string;
      movementPayload: {
        id: string;
        shift_id: string;
        type: 'cash_in' | 'cash_out';
        amount: number;
        reason: string;
        created_by: string;
        created_at: string;
      };
      queuedAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      kind: 'close_shift';
      id: string;
      shift_id: string;
      closing_cash_actual: number;
      closed_at: string;
      notes: string | null;
      queuedAt: string;
      attempts: number;
      lastError?: string;
    };

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
    window.dispatchEvent(new CustomEvent('obathaus_offline_queue_changed'));
  } catch (err) {
    console.error('Failed to save offline transaction queue:', err);
  }
}

export function getOfflineShiftQueue(): OfflineShiftOp[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_SHIFT_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse offline shift queue:', err);
    return [];
  }
}

export function saveOfflineShiftQueue(queue: OfflineShiftOp[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OFFLINE_SHIFT_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('obathaus_offline_queue_changed'));
  } catch (err) {
    console.error('Failed to save offline shift queue:', err);
  }
}

export function getPendingOfflineSyncCount(): number {
  return getOfflineQueue().length + getOfflineShiftQueue().length;
}

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export function enqueueOfflineShiftOp(op: DistributiveOmit<OfflineShiftOp, 'queuedAt' | 'attempts'>): void {
  const current = getOfflineShiftQueue();
  if (current.some((q) => q.id === op.id)) return;
  current.push({
    ...op,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  } as OfflineShiftOp);
  saveOfflineShiftQueue(current);
  console.log(`[Offline Shift Queue] Operation ${op.kind} (${op.id}) enqueued for cloud sync.`);
}

export function enqueueOfflineTransaction(
  transaction: Transaction,
  lastError?: string,
  meta?: {
    outletName?: string;
    stockDeductions?: OfflineStockDeduction[];
  }
): void {
  const current = getOfflineQueue();
  const idx = current.findIndex((q) => q.transaction.id === transaction.id);
  if (idx >= 0) {
    if (lastError) current[idx].lastError = lastError;
    if (meta?.outletName && !current[idx].outletName) current[idx].outletName = meta.outletName;
    if (meta?.stockDeductions && !current[idx].stockDeductions) {
      current[idx].stockDeductions = meta.stockDeductions;
    }
    saveOfflineQueue(current);
    return;
  }

  current.push({
    transaction,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError,
    outletName: meta?.outletName || transaction.outlet?.name,
    stockDeductions: meta?.stockDeductions,
    sideEffectsSynced: false,
  });
  saveOfflineQueue(current);
  console.log(`[Offline Queue] Transaction #${transaction.invoice_number} enqueued for cloud sync.`);
}

function isRpcMissingError(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return code === 'PGRST202' || code === '42883' || msg.includes('could not find the function');
}

async function applyAtomicOutletStockFallback(
  supabase: ReturnType<typeof createClient>,
  outletId: string,
  rawMaterialId: string,
  deltaQty: number
): Promise<void> {
  const { error: rpcErr } = await supabase.rpc('adjust_outlet_stock_atomic', {
    p_outlet_id: outletId,
    p_raw_material_id: rawMaterialId,
    p_delta: deltaQty,
  });
  if (!rpcErr) return;

  if (!isRpcMissingError(rpcErr)) {
    throw rpcErr;
  }

  // Fallback if SQL migration 20261112_02 has not been applied yet
  const nowIso = new Date().toISOString();
  const { data: existing, error: selErr } = await supabase
    .from('outlet_stocks')
    .select('id, quantity')
    .eq('outlet_id', outletId)
    .eq('raw_material_id', rawMaterialId)
    .maybeSingle();
  if (selErr) throw selErr;

  const newQty = Math.max(0, Number(existing?.quantity || 0) + deltaQty);
  if (existing) {
    const { error: updErr } = await supabase
      .from('outlet_stocks')
      .update({ quantity: newQty, updated_at: nowIso })
      .eq('id', existing.id);
    if (updErr) throw updErr;
  } else {
    const { error: insErr } = await supabase.from('outlet_stocks').insert({
      outlet_id: outletId,
      raw_material_id: rawMaterialId,
      quantity: newQty,
      updated_at: nowIso,
    });
    if (insErr) throw insErr;
  }
}

async function applyAtomicShiftSalesFallback(
  supabase: ReturnType<typeof createClient>,
  shiftId: string,
  paymentMethod: string,
  amount: number
): Promise<void> {
  const { error: rpcErr } = await supabase.rpc('increment_shift_sales_atomic', {
    p_shift_id: shiftId,
    p_payment_method: paymentMethod,
    p_amount: amount,
  });
  if (!rpcErr) return;

  if (!isRpcMissingError(rpcErr)) {
    throw rpcErr;
  }

  const { data: curShift } = await supabase
    .from('cashier_shifts')
    .select('opening_cash, total_cash_sales, total_non_cash_sales, total_cash_in, total_cash_out')
    .eq('id', shiftId)
    .maybeSingle();
  if (!curShift) return;

  const isCash = String(paymentMethod).toLowerCase() === 'cash';
  const nextCashSales = isCash
    ? Number(curShift.total_cash_sales || 0) + Number(amount || 0)
    : Number(curShift.total_cash_sales || 0);
  const nextNonCashSales = !isCash
    ? Number(curShift.total_non_cash_sales || 0) + Number(amount || 0)
    : Number(curShift.total_non_cash_sales || 0);
  const nextExpected =
    Number(curShift.opening_cash || 0) +
    nextCashSales +
    Number(curShift.total_cash_in || 0) -
    Number(curShift.total_cash_out || 0);

  await supabase
    .from('cashier_shifts')
    .update({
      total_cash_sales: nextCashSales,
      total_non_cash_sales: nextNonCashSales,
      closing_cash_expected: nextExpected,
      updated_at: new Date().toISOString(),
    })
    .eq('id', shiftId);
}

let isSyncing = false;

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof window === 'undefined' || !navigator.onLine || !isSupabaseConfigured()) {
    return { synced: 0, failed: 0 };
  }

  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  const supabase = createClient();
  let synced = 0;
  let failed = 0;

  try {
    // =========================================================================
    // STEP 1: REPLAY OFFLINE SHIFT OPERATIONS IN FIFO ORDER (OPEN -> CASH MV -> WAIT FOR TRX)
    // Hold 'close_shift' until AFTER transactions of that shift are synced so expected cash matches!
    // =========================================================================
    const shiftQueue = getOfflineShiftQueue();
    const deferredCloseOps: OfflineShiftOp[] = [];
    const remainingShiftQueue: OfflineShiftOp[] = [];

    for (const op of shiftQueue) {
      if (op.kind === 'close_shift') {
        deferredCloseOps.push(op);
        continue;
      }
      try {
        if (op.kind === 'open_shift') {
          const { error } = await supabase.from('cashier_shifts').upsert(
            {
              ...op.shiftPayload,
              total_cash_sales: 0,
              total_non_cash_sales: 0,
              total_cash_in: 0,
              total_cash_out: 0,
              closing_cash_expected: op.shiftPayload.opening_cash,
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );
          if (error) throw error;
        } else if (op.kind === 'cash_movement') {
          const { error: mvErr } = await supabase.from('shift_cash_movements').insert(op.movementPayload);
          if (mvErr && mvErr.code !== '23505') throw mvErr;

          if (!mvErr) {
            const { error: rpcErr } = await supabase.rpc('increment_shift_cash_movement_atomic', {
              p_shift_id: op.movementPayload.shift_id,
              p_type: op.movementPayload.type,
              p_amount: op.movementPayload.amount,
            });
            if (rpcErr && isRpcMissingError(rpcErr)) {
              const { data: cur } = await supabase
                .from('cashier_shifts')
                .select('opening_cash, total_cash_sales, total_cash_in, total_cash_out')
                .eq('id', op.movementPayload.shift_id)
                .maybeSingle();
              if (cur) {
                const isIn = op.movementPayload.type === 'cash_in';
                const nextIn = Number(cur.total_cash_in || 0) + (isIn ? op.movementPayload.amount : 0);
                const nextOut = Number(cur.total_cash_out || 0) + (!isIn ? op.movementPayload.amount : 0);
                const nextExp = Number(cur.opening_cash || 0) + Number(cur.total_cash_sales || 0) + nextIn - nextOut;
                await supabase
                  .from('cashier_shifts')
                  .update({
                    total_cash_in: nextIn,
                    total_cash_out: nextOut,
                    closing_cash_expected: nextExp,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', op.movementPayload.shift_id);
              }
            } else if (rpcErr) {
              throw rpcErr;
            }
          }
        }
        synced++;
      } catch (err: any) {
        console.error(`[Offline Shift Queue] Failed to sync ${op.kind}:`, err);
        remainingShiftQueue.push({
          ...op,
          attempts: op.attempts + 1,
          lastError: err?.message || String(err),
        });
        failed++;
      }
    }

    // =========================================================================
    // STEP 2: REPLAY OFFLINE TRANSACTIONS + ITEMS + STOCKS + LEDGER + SHIFT SALES
    // =========================================================================
    const queue = getOfflineQueue();
    const remainingQueue: QueuedOfflineTransaction[] = [];

    for (const item of queue) {
      const { transaction } = item;
      try {
        const validShiftId =
          transaction.shift_id && UUID_REGEX.test(transaction.shift_id) ? transaction.shift_id : null;

        let payloadToInsert: any = {
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

        // Check if transaction already exists in cloud (idempotency via idempotency_key / id)
        let alreadyInCloud = false;
        const { data: existingTrx } = await supabase
          .from('transactions')
          .select('id, invoice_number')
          .eq('id', transaction.id)
          .maybeSingle();

        if (existingTrx) {
          alreadyInCloud = true;
        } else {
          let { error: trxError } = await supabase.from('transactions').insert(payloadToInsert);

          // Retry invoice number via server sequence or suffix if collision across browsers
          if (trxError && trxError.code === '23505' && trxError.message?.includes('invoice_number')) {
            const prefix = transaction.outlet?.invoice_prefix || transaction.invoice_number.split('-').slice(0, -2).join('-') || 'INV';
            const { data: nextInv } = await supabase.rpc('next_invoice_number', { p_prefix: prefix });
            const fallbackInv = `${transaction.invoice_number}-${Math.floor(100 + Math.random() * 900)}`;
            const resolvedInv = typeof nextInv === 'string' && nextInv ? nextInv : fallbackInv;
            transaction.invoice_number = resolvedInv;
            payloadToInsert = { ...payloadToInsert, invoice_number: resolvedInv };
            const retryInv = await supabase.from('transactions').insert(payloadToInsert);
            trxError = retryInv.error;
          }

          // Retry with shift_id: null ONLY if shift FK truly doesn't exist in cloud
          if (
            trxError &&
            payloadToInsert.shift_id &&
            (trxError.code === '23503' || trxError.message?.toLowerCase().includes('shift_id'))
          ) {
            payloadToInsert = { ...payloadToInsert, shift_id: null };
            const retryShift = await supabase.from('transactions').insert(payloadToInsert);
            trxError = retryShift.error;
          }

          if (trxError && trxError.code !== '23505') throw trxError;
        }

        // Upsert transaction items
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

          const { error: itemsError } = await supabase
            .from('transaction_items')
            .upsert(itemsToInsert, { onConflict: 'id' });
          if (itemsError) throw itemsError;
        }

        // Side-effects sync (outlet_stocks + stock_ledger + shift sales + audit_logs) with idempotency guard
        if (!item.sideEffectsSynced && !alreadyInCloud) {
          let alreadyHasLedger = false;
          const { data: existingLedger } = await supabase
            .from('stock_ledger')
            .select('id')
            .eq('reference_document_id', transaction.id)
            .eq('movement_type', 'pos_consumption')
            .limit(1);
          if (existingLedger && existingLedger.length > 0) {
            alreadyHasLedger = true;
          }

          if (!alreadyHasLedger && item.stockDeductions && item.stockDeductions.length > 0 && transaction.outlet_id) {
            for (const ded of item.stockDeductions) {
              await applyAtomicOutletStockFallback(supabase, transaction.outlet_id, ded.raw_material_id, -ded.neededQty);
              const { error: ledgerErr } = await supabase.from('stock_ledger').insert({
                id: crypto.randomUUID(),
                transaction_time: transaction.created_at,
                location_type: 'outlet',
                location_id: transaction.outlet_id,
                location_name: item.outletName || transaction.outlet?.name || 'Outlet Cabang',
                raw_material_id: ded.raw_material_id,
                movement_type: 'pos_consumption',
                quantity_change: -ded.neededQty,
                balance_before: ded.balBefore,
                balance_after: ded.balAfter,
                unit_symbol: ded.unitSymbol,
                unit_cost: ded.unitCost,
                total_cost: ded.neededQty * ded.unitCost,
                reference_document_type: 'pos_transaction',
                reference_document_id: transaction.id,
                reference_document_number: transaction.invoice_number,
                notes: `Pemakaian resep (Sync Offline): ${ded.productName} (${ded.qtySold}x)`,
                created_by: UUID_REGEX.test(transaction.cashier_id) ? transaction.cashier_id : null,
              });
              if (ledgerErr) {
                console.warn('[Offline Queue] Ledger insert warning:', ledgerErr);
              }
            }
          }

          if (payloadToInsert.shift_id) {
            await applyAtomicShiftSalesFallback(
              supabase,
              payloadToInsert.shift_id,
              transaction.payment_method,
              transaction.grand_total
            );
          }

          void fetch('/api/audit-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              action: 'pos_checkout',
              entity_type: 'transaction',
              entity_id: transaction.id,
              details: `Transaksi POS (Sync Offline) #${transaction.invoice_number} sebesar Rp ${Number(transaction.grand_total || 0).toLocaleString('id-ID')}`,
              new_values: {
                invoice_number: transaction.invoice_number,
                grand_total: transaction.grand_total,
                payment_method: transaction.payment_method,
                outlet_id: transaction.outlet_id,
                synced_from_offline: true,
              },
              created_at: transaction.created_at,
            }),
          }).catch(() => {});
        }

        synced++;
        console.log(`[Offline Queue] Transaction #${transaction.invoice_number} + side effects synced to Supabase.`);
      } catch (err: any) {
        console.error(`[Offline Queue] Failed to sync transaction #${transaction.invoice_number}:`, err);
        item.attempts += 1;
        item.lastError = err?.message || String(err);
        failed++;
        remainingQueue.push(item);
      }
    }

    // =========================================================================
    // STEP 3: REPLAY DEFERRED CLOSE_SHIFT OPERATIONS AFTER TRANSACTIONS SYNCED
    // =========================================================================
    for (const op of deferredCloseOps) {
      if (op.kind !== 'close_shift') continue;
      try {
        const { data: curShift } = await supabase
          .from('cashier_shifts')
          .select('opening_cash, total_cash_sales, total_cash_in, total_cash_out, notes')
          .eq('id', op.shift_id)
          .maybeSingle();

        const expected = curShift
          ? Number(curShift.opening_cash || 0) +
            Number(curShift.total_cash_sales || 0) +
            Number(curShift.total_cash_in || 0) -
            Number(curShift.total_cash_out || 0)
          : op.closing_cash_actual;
        const diff = Number(op.closing_cash_actual) - expected;

        const { error: closeErr } = await supabase
          .from('cashier_shifts')
          .update({
            status: 'closed',
            closed_at: op.closed_at,
            closing_cash_actual: op.closing_cash_actual,
            closing_cash_expected: expected,
            cash_difference: diff,
            notes: op.notes ?? curShift?.notes ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', op.shift_id);
        if (closeErr) throw closeErr;
        synced++;
      } catch (err: any) {
        console.error('[Offline Shift Queue] Failed to sync close_shift:', err);
        remainingShiftQueue.push({
          ...op,
          attempts: op.attempts + 1,
          lastError: err?.message || String(err),
        });
        failed++;
      }
    }

    saveOfflineQueue(remainingQueue);
    saveOfflineShiftQueue(remainingShiftQueue);
  } finally {
    isSyncing = false;
  }

  if (synced > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('obathaus_offline_queue_synced', { detail: { synced, failed } }));
  }

  return { synced, failed };
}

// Auto-register listener when loaded in browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Network] Internet connection restored. Triggering offline sync...');
    void syncOfflineQueue();
  });
}
