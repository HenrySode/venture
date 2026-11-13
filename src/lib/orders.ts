import type { OrderLine, PurchaseOrder } from '@/types/domain';

export const lineCost = (l: OrderLine) => l.cartons * l.costCarton + l.units * l.costUnit;
export const orderTotal = (o: Pick<PurchaseOrder, 'lines'>) => o.lines.reduce((sum, l) => sum + lineCost(l), 0);
