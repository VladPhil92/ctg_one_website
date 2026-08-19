import { createClient } from '@/lib/supabase/client';
import { MAX_PAGE_SIZE, pageRange } from '@/lib/pagination';

export type Sale = {
  id: string;
  lot_id: string;
  sale_reference: string | null;
  gross_revenue_cents: number;
  tax_recognized_cents: number;
  sold_at: string;
  location: string | null;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  bottle_unit_id: string;
  serial_code: string;
  line_total_cents: number;
};

export type CreditNote = {
  id: string;
  sale_id: string;
  credit_reference: string | null;
  reason_code: string;
  gross_credit_cents: number;
  tax_credit_cents: number;
  confirmed_at: string;
  return_location_id: string;
};

export type CreditItem = {
  sale_item_id: string;
  credit_note_id: string;
  serial_code: string;
  gross_credit_cents: number;
  tax_credit_cents: number;
};

export type ReturnLocation = {
  id: string;
  code: string;
  name: string;
  location_type: string;
};

export type LotSummary = { id: string; code: string; beer_style: string };

export type SalesReturnReconciliation = {
  sale_id: string;
  sold_units: number;
  returned_units: number;
  credit_note_count: number;
  gross_credit_cents: number;
  net_revenue_cents: number;
  tax_credit_cents: number;
  net_tax_cents: number;
  physical_return_mismatches: number;
  financial_reversal_mismatches: number;
  return_state: string;
  is_reconciled: boolean;
};

export type ConfirmedSalesPage = {
  rows: Sale[];
  lots: LotSummary[];
  totalCount: number;
};

export type SaleReturnDetails = {
  items: SaleItem[];
  notes: CreditNote[];
  creditItems: CreditItem[];
  reconciliation: SalesReturnReconciliation | null;
};

const MAX_ITEMS_PER_SALE_FOR_RETURN_UI = 500;
const MAX_CREDIT_NOTES_PER_SALE_FOR_RETURN_UI = 200;

function failOnQuery(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export function createSalesReturnsBrowserRepository() {
  return {
    async listConfirmedSales(page: number, pageSize: number): Promise<ConfirmedSalesPage> {
      const supabase = createClient();
      const { from, to } = pageRange(page, pageSize);
      const { data, count, error } = await supabase
        .from('investment_sales')
        .select('id,lot_id,sale_reference,gross_revenue_cents,tax_recognized_cents,sold_at,location', {
          count: 'exact',
        })
        .eq('status', 'CONFIRMED')
        .order('sold_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      failOnQuery(error, 'No se pudieron cargar las ventas confirmadas');

      const rows = (data ?? []) as Sale[];
      const lotIds = [...new Set(rows.map((sale) => sale.lot_id))];
      if (!lotIds.length) return { rows, lots: [], totalCount: count ?? 0 };

      const { data: lots, error: lotsError } = await supabase
        .from('investment_production_lots')
        .select('id,code,beer_style')
        .in('id', lotIds)
        .limit(pageSize);
      failOnQuery(lotsError, 'No se pudieron resolver los lotes de la página de ventas');

      return { rows, lots: (lots ?? []) as LotSummary[], totalCount: count ?? 0 };
    },

    async loadReturnContext(): Promise<{ locations: ReturnLocation[]; canManage: boolean }> {
      const supabase = createClient();
      const [{ data: locations, count, error: locationsError }, { data: permission, error: permissionError }] =
        await Promise.all([
          supabase
            .from('investment_inventory_locations')
            .select('id,code,name,location_type', { count: 'exact' })
            .eq('active', true)
            .in('location_type', ['WAREHOUSE', 'SALES_POINT', 'PARTNER', 'QUARANTINE', 'OTHER'])
            .order('name', { ascending: true })
            .order('id', { ascending: true })
            .limit(MAX_PAGE_SIZE),
          supabase.rpc('has_investment_permission', { p_permission: 'sales.manage' }),
        ]);
      failOnQuery(locationsError, 'No se pudieron cargar los puntos receptores');
      failOnQuery(permissionError, 'No se pudo verificar sales.manage');
      if ((count ?? 0) > MAX_PAGE_SIZE) {
        throw new Error('El maestro de ubicaciones excede el límite operativo de la interfaz de devoluciones.');
      }
      return { locations: (locations ?? []) as ReturnLocation[], canManage: Boolean(permission) };
    },

    async loadSaleDetails(saleId: string): Promise<SaleReturnDetails> {
      const supabase = createClient();
      const [{ data: items, count: itemCount, error: itemsError }, { data: notes, count: noteCount, error: notesError }, { data: reconciliation, error: reconciliationError }] =
        await Promise.all([
          supabase
            .from('investment_sale_items')
            .select('id,sale_id,bottle_unit_id,serial_code,line_total_cents', { count: 'exact' })
            .eq('sale_id', saleId)
            .order('serial_code', { ascending: true })
            .limit(MAX_ITEMS_PER_SALE_FOR_RETURN_UI),
          supabase
            .from('investment_sales_credit_notes')
            .select('id,sale_id,credit_reference,reason_code,gross_credit_cents,tax_credit_cents,confirmed_at,return_location_id', {
              count: 'exact',
            })
            .eq('sale_id', saleId)
            .order('confirmed_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(MAX_CREDIT_NOTES_PER_SALE_FOR_RETURN_UI),
          supabase.rpc('get_sales_return_reconciliation', { p_sale_id: saleId }),
        ]);
      failOnQuery(itemsError, 'No se pudieron cargar los ítems de la venta');
      failOnQuery(notesError, 'No se pudieron cargar las notas crédito de la venta');
      failOnQuery(reconciliationError, 'No se pudo reconciliar la venta');

      if ((itemCount ?? 0) > MAX_ITEMS_PER_SALE_FOR_RETURN_UI) {
        throw new Error(
          `La venta contiene más de ${MAX_ITEMS_PER_SALE_FOR_RETURN_UI} unidades; la interfaz se niega a truncar silenciosamente el conjunto retornable.`,
        );
      }
      if ((noteCount ?? 0) > MAX_CREDIT_NOTES_PER_SALE_FOR_RETURN_UI) {
        throw new Error(
          `La venta contiene más de ${MAX_CREDIT_NOTES_PER_SALE_FOR_RETURN_UI} notas crédito; la interfaz se niega a truncar el historial.`,
        );
      }

      const noteRows = (notes ?? []) as CreditNote[];
      const noteIds = noteRows.map((note) => note.id);
      let creditItems: CreditItem[] = [];
      if (noteIds.length) {
        const { data, error } = await supabase
          .from('investment_sales_credit_note_items')
          .select('sale_item_id,credit_note_id,serial_code,gross_credit_cents,tax_credit_cents')
          .in('credit_note_id', noteIds)
          .limit(MAX_ITEMS_PER_SALE_FOR_RETURN_UI);
        failOnQuery(error, 'No se pudieron cargar los ítems acreditados de la venta');
        creditItems = (data ?? []) as CreditItem[];
      }

      const reconciliationRow = Array.isArray(reconciliation) ? reconciliation[0] : reconciliation;
      return {
        items: (items ?? []) as SaleItem[],
        notes: noteRows,
        creditItems,
        reconciliation: (reconciliationRow as SalesReturnReconciliation | undefined) ?? null,
      };
    },

    async recordReturn(payload: {
      p_sale_id: string;
      p_serial_codes: string[];
      p_return_location: string;
      p_reason_code: string;
      p_idempotency_key: string;
      p_credit_reference: string | null;
      p_notes: string | null;
    }) {
      const supabase = createClient();
      return await supabase.rpc('record_sale_return_credit_note', payload);
    },
  };
}

export type SalesReturnsBrowserRepository = ReturnType<typeof createSalesReturnsBrowserRepository>;
