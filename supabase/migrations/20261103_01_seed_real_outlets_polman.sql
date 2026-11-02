-- ============================================================================
-- OBAT HAUS — OPERATIONAL SYSTEM MANAGEMENT
-- SEED DATA: 7 REAL OUTLETS (POLEWALI MANDAR & MAJENE) + CENTRAL WAREHOUSE
-- Version: 1.0
-- ============================================================================

-- 1. CENTRAL WAREHOUSE
INSERT INTO warehouses (id, code, name, address, phone, is_active)
VALUES (
  'wh-00000000-0000-0000-0000-000000000001',
  'WH-01',
  'Gudang Logistik Pusat Obat Haus (Central Warehouse Polman)',
  'Polewali Mandar, Sulawesi Barat',
  '0811-4409-900',
  true
)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  updated_at = now();

-- 2. 7 REAL OUTLETS
INSERT INTO outlets (id, code, name, address, phone, is_active)
VALUES
  (
    'out-00000000-0000-0000-0000-000000000001',
    'OUT-01',
    'OBATHAUS Cityfood (pusat)',
    'Jl. Todilaling, Kel. Pekkabata, Polewali, Polewali Mandar',
    '0811-4401-001',
    true
  ),
  (
    'out-00000000-0000-0000-0000-000000000002',
    'OUT-02',
    'OBATHAUS Sentral',
    'Jl. Mr. Muh. Yamin, Kel. Pekkabata, Polewali, Polewali Mandar',
    '0811-4401-002',
    true
  ),
  (
    'out-00000000-0000-0000-0000-000000000003',
    'OUT-03',
    'OBATHAUS Pantai Bahari',
    'Jl. Bahari, Kel. Polewali, Polewali, Polewali Mandar',
    '0811-4401-003',
    true
  ),
  (
    'out-00000000-0000-0000-0000-000000000004',
    'OUT-04',
    'OBATHAUS Wonomulyo',
    'Jl. Jenderal Soedirman (Jensu), Wonomulyo, Polewali Mandar',
    '0811-4401-004',
    true
  ),
  (
    'out-00000000-0000-0000-0000-000000000005',
    'OUT-05',
    'OBATHAUS Campalagian',
    'Jl. Poros Polman-Majene (samping PKM Campa), Campalagian, Polewali Mandar',
    '0811-4401-005',
    true
  ),
  (
    'out-00000000-0000-0000-0000-000000000006',
    'OUT-06',
    'OBATHAUS Tinambung',
    'Jl. Poros Polman-Majene (samping Indomaret Tinambung), Tinambung, Polewali Mandar',
    '0811-4401-006',
    true
  ),
  (
    'out-00000000-0000-0000-0000-000000000007',
    'OUT-07',
    'OBATHAUS Majene',
    'Jl. KH. Daeng (depan Masjid Tanjung Batu Majene) Banggae, Majene',
    '0811-4401-007',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  updated_at = now();
