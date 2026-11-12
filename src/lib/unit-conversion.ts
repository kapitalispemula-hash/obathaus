import { Unit, UnitConversion } from '@/types/database';

export function roundStockQty(value: number, decimals = 4): number {
  if (!Number.isFinite(value)) return 0;
  const scale = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

const WEIGHT_KG_TOKENS = new Set(['kg', 'kilogram', 'kilo']);
const WEIGHT_G_TOKENS = new Set(['g', 'gr', 'grm', 'gram', 'grams']);
const VOL_L_TOKENS = new Set(['l', 'ltr', 'liter', 'litre']);
const VOL_ML_TOKENS = new Set(['ml', 'mililiter', 'milliliter']);

function matchesToken(u: Unit, tokens: Set<string>): boolean {
  const sym = (u.symbol || '').trim().toLowerCase();
  const code = (u.code || '').trim().toLowerCase();
  const name = (u.name || '').trim().toLowerCase();
  return tokens.has(sym) || tokens.has(code) || tokens.has(name);
}

/**
 * Combines explicit `unit_conversions` rows with standard SI metric defaults
 * (1 kg = 1.000 g, 1 L = 1.000 ml) whenever matching units exist and no explicit
 * rule between those two units is already configured.
 */
export function enrichUnitConversions(
  units: Unit[],
  conversions: UnitConversion[]
): UnitConversion[] {
  const result = [...conversions];
  if (!units || units.length === 0) return result;

  const hasDirectOrInverse = (u1: string, u2: string) =>
    result.some(
      (c) =>
        (c.from_unit_id === u1 && c.to_unit_id === u2) ||
        (c.from_unit_id === u2 && c.to_unit_id === u1)
    );

  const kgUnit = units.find((u) => matchesToken(u, WEIGHT_KG_TOKENS));
  const gUnit = units.find((u) => matchesToken(u, WEIGHT_G_TOKENS));
  if (kgUnit && gUnit && kgUnit.id !== gUnit.id && !hasDirectOrInverse(kgUnit.id, gUnit.id)) {
    result.push({
      id: `auto-si-${kgUnit.id}-${gUnit.id}`,
      from_unit_id: kgUnit.id,
      to_unit_id: gUnit.id,
      conversion_factor: 1000,
      created_at: '2026-10-01T00:00:00Z',
    });
  }

  const lUnit = units.find((u) => matchesToken(u, VOL_L_TOKENS));
  const mlUnit = units.find((u) => matchesToken(u, VOL_ML_TOKENS));
  if (lUnit && mlUnit && lUnit.id !== mlUnit.id && !hasDirectOrInverse(lUnit.id, mlUnit.id)) {
    result.push({
      id: `auto-si-${lUnit.id}-${mlUnit.id}`,
      from_unit_id: lUnit.id,
      to_unit_id: mlUnit.id,
      conversion_factor: 1000,
      created_at: '2026-10-01T00:00:00Z',
    });
  }

  return result;
}

interface ConversionEdge {
  toUnitId: string;
  factor: number;
}

function buildConversionGraph(conversions: UnitConversion[]): Map<string, ConversionEdge[]> {
  const graph = new Map<string, ConversionEdge[]>();

  const addEdge = (from: string, to: string, factor: number) => {
    if (!from || !to || from === to || !Number.isFinite(factor) || factor <= 0) return;
    const list = graph.get(from) || [];
    // Avoid duplicate edges to same node
    if (!list.some((e) => e.toUnitId === to)) {
      list.push({ toUnitId: to, factor });
      graph.set(from, list);
    }
  };

  for (const conv of conversions) {
    const f = Number(conv.conversion_factor);
    if (!conv.from_unit_id || !conv.to_unit_id || !Number.isFinite(f) || f <= 0) continue;
    // 1 from_unit = conversion_factor * to_unit
    addEdge(conv.from_unit_id, conv.to_unit_id, f);
    // Reverse: 1 to_unit = (1 / conversion_factor) * from_unit
    addEdge(conv.to_unit_id, conv.from_unit_id, 1 / f);
  }

  return graph;
}

/**
 * Finds multiplier such that:
 *   (quantity in fromUnitId) * factor = (quantity in toUnitId)
 * Returns null if no conversion path exists.
 */
export function findConversionFactor(
  fromUnitId: string,
  toUnitId: string,
  conversions: UnitConversion[]
): number | null {
  if (!fromUnitId || !toUnitId) return null;
  if (fromUnitId === toUnitId) return 1;

  const graph = buildConversionGraph(conversions);
  const visited = new Set<string>([fromUnitId]);
  const queue: { unitId: string; factor: number }[] = [{ unitId: fromUnitId, factor: 1 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const edges = graph.get(current.unitId) || [];
    for (const edge of edges) {
      const nextFactor = current.factor * edge.factor;
      if (edge.toUnitId === toUnitId) {
        return nextFactor;
      }
      if (!visited.has(edge.toUnitId)) {
        visited.add(edge.toUnitId);
        queue.push({ unitId: edge.toUnitId, factor: nextFactor });
      }
    }
  }

  return null;
}

export function convertUnitQuantity(
  quantity: number,
  fromUnitId: string,
  toUnitId: string,
  conversions: UnitConversion[]
): { convertedQuantity: number; factor: number; matched: boolean } {
  const numericQty = Number(quantity) || 0;
  if (!fromUnitId || !toUnitId || fromUnitId === toUnitId) {
    return { convertedQuantity: numericQty, factor: 1, matched: true };
  }

  const factor = findConversionFactor(fromUnitId, toUnitId, conversions);
  if (factor === null) {
    return { convertedQuantity: numericQty, factor: 1, matched: false };
  }

  return {
    convertedQuantity: roundStockQty(numericQty * factor, 6),
    factor,
    matched: true,
  };
}

/**
 * Returns all units reachable from `baseUnitId` via `unit_conversions`
 * (with `baseUnitId` always placed first).
 */
export function getCompatibleUnits(
  baseUnitId: string,
  units: Unit[],
  conversions: UnitConversion[]
): Unit[] {
  if (!baseUnitId) return [];

  const graph = buildConversionGraph(conversions);
  const reachableIds = new Set<string>([baseUnitId]);
  const queue: string[] = [baseUnitId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of graph.get(current) || []) {
      if (!reachableIds.has(edge.toUnitId)) {
        reachableIds.add(edge.toUnitId);
        queue.push(edge.toUnitId);
      }
    }
  }

  const baseUnit = units.find((u) => u.id === baseUnitId);
  const others = units.filter(
    (u) => u.id !== baseUnitId && u.is_active !== false && reachableIds.has(u.id)
  );

  return baseUnit ? [baseUnit, ...others] : others;
}
