import type { Product } from '@/types/domain';

type Seed = [
  name: string,
  category: string,
  unitsPerCarton: number,
  buyCarton: number,
  sellCarton: number,
  sellUnit: number,
  stockCartons: number,
  stockUnits: number,
];

/** A realistic Tanzanian duka catalogue. Prices in TSH. */
const seeds: Seed[] = [
  ['Sukari 1kg', 'Vyakula', 25, 85000, 92500, 3800, 6, 12],
  ['Mchele 5kg', 'Vyakula', 4, 64000, 70000, 18500, 9, 2],
  ['Unga wa Sembe 2kg', 'Vyakula', 10, 32000, 36000, 3800, 4, 6],
  ['Mafuta ya Kupikia 1L', 'Vyakula', 12, 54000, 60000, 5200, 3, 5],
  ['Maharage 1kg', 'Vyakula', 20, 52000, 58000, 3200, 0, 3],
  ['Chumvi 500g', 'Vyakula', 24, 9600, 12000, 600, 5, 10],
  ['Chai Majani 100g', 'Vinywaji', 48, 57600, 67200, 1500, 2, 20],
  ['Coca-Cola 500ml', 'Vinywaji', 12, 9600, 11400, 1000, 15, 4],
  ['Pepsi 600ml', 'Vinywaji', 12, 9000, 10800, 1000, 0, 0],
  ['Maji Kilimanjaro 1.5L', 'Vinywaji', 6, 5400, 7200, 1300, 20, 3],
  ['Juisi Azam Embe 1L', 'Vinywaji', 12, 30000, 36000, 3200, 1, 4],
  ['Sabuni ya Kipande', 'Usafi', 36, 39600, 46800, 1400, 3, 15],
  ['Omo 500g', 'Usafi', 24, 55200, 64800, 2900, 2, 8],
  ['Dawa ya Meno Whitedent', 'Usafi', 36, 43200, 54000, 1600, 1, 9],
  ['Karatasi za Chooni', 'Usafi', 10, 7500, 9000, 1000, 6, 0],
  ['Mkate wa Boflo', 'Mikate', 1, 1600, 2000, 2000, 0, 14],
  ['Mayai (tray)', 'Mikate', 1, 10500, 12000, 12000, 0, 6],
  ['Biskuti Marie', 'Vitafunwa', 24, 9600, 12000, 600, 4, 11],
  ['Pipi Big G', 'Vitafunwa', 100, 4000, 5000, 100, 2, 40],
  ['Betri AA (jozi)', 'Vifaa', 24, 14400, 19200, 1000, 1, 2],
  ['Kiberiti (box 10)', 'Vifaa', 10, 1800, 2500, 300, 8, 0],
  ['Muda wa Hewani 1,000', 'Huduma', 1, 950, 1000, 1000, 0, 50],
];

const START = new Date('2026-09-01T08:00:00+03:00').getTime();

export const demoProducts: Product[] = seeds.map(
  ([name, category, units, buyCarton, sellCarton, sellUnit, stockC, stockU], i) => ({
    id: i + 1,
    name,
    category,
    barcode: i % 3 === 0 ? `6161100${String(1000 + i * 37).padStart(6, '0')}` : null,
    unitsPerCarton: units,
    purchasePriceCarton: buyCarton,
    purchasePriceUnit: Math.round(buyCarton / units),
    sellPriceCarton: sellCarton,
    sellPriceUnit: sellUnit,
    stockCartons: stockC,
    stockUnits: stockU,
    lowStockCartonThreshold: null,
    lowStockUnitThreshold: null,
    ignoreLowStock: false,
    expiresAt: category === 'Mikate' ? new Date(Date.now() + 3 * 864e5).toISOString() : null,
    createdAt: new Date(START + i * 2 * 864e5).toISOString(),
    aliases: [],
    taxPercent: 0,
    reorderQty: units > 1 ? 5 : null,
    discountPrice: null,
  }),
);

/** Low-stock rule from the web app: cartons ≤ carton threshold, or loose units ≤ unit threshold (default 4 pieces total). */
export function isLowStock(p: Product): boolean {
  if (p.ignoreLowStock) return false;
  if (p.lowStockCartonThreshold !== null && p.stockCartons <= p.lowStockCartonThreshold) return true;
  if (p.lowStockUnitThreshold !== null) return p.stockUnits <= p.lowStockUnitThreshold;
  return p.stockCartons * p.unitsPerCarton + p.stockUnits <= 4;
}

export function isOutOfStock(p: Product): boolean {
  return p.stockCartons * p.unitsPerCarton + p.stockUnits <= 0;
}
