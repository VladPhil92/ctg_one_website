import { createClient } from '@/lib/supabase/client';
import { pageRange } from '@/lib/pagination';
import type { InvestmentBeerStyle } from '@/types/beer-style';
import type { InvestmentProductionLot } from '@/types/investment';

export type BottleUnit = {
  id: string;
  lot_id: string;
  serial_code: string;
  unit_number: number;
  status: string;
  current_location: string | null;
  sold_at: string | null;
  sale_price_cents: number | null;
};

export type SalesChannel = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

export type ProductionLotsPage = {
  rows: InvestmentProductionLot[];
  totalCount: number;
};

export type ProductionLotInventorySnapshot = {
  lotId: string;
  totalUnits: number;
  statusCounts: Record<string, number>;
  units: BottleUnit[];
};

export type OperationsCommandResult = Promise<{ error?: { message: string } | null }>;

type RpcPayload = Record<string, unknown>;

type RawInventorySnapshot = {
  lot_id?: string;
  total_units?: number;
  status_counts?: Record<string, number>;
  units?: BottleUnit[];
};

function throwQueryError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export function createOperationsBrowserRepository() {
  return {
    async listLots(page: number, pageSize: number): Promise<ProductionLotsPage> {
      const supabase = createClient();
      const { from, to } = pageRange(page, pageSize);
      const { data, count, error } = await supabase
        .from('investment_production_lots')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      throwQueryError(error, 'No se pudieron cargar los lotes');
      return {
        rows: (data ?? []) as InvestmentProductionLot[],
        totalCount: count ?? 0,
      };
    },

    async listBeerStyles(): Promise<InvestmentBeerStyle[]> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('investment_beer_styles')
        .select(
          'id,code,slug,name,description,abv_target,units_per_case,standard_production_cost_unit_cents,standard_label_cost_unit_cents,standard_transport_cost_unit_cents,standard_own_point_price_unit_cents,standard_b2b_price_unit_cents,standard_inc_rate,standard_advertising_rate_on_pre_inc,active',
        )
        .eq('active', true)
        .order('name');
      throwQueryError(error, 'No se pudo cargar Beer Style Master Data');
      return (data ?? []) as InvestmentBeerStyle[];
    },

    async listSalesChannels(): Promise<SalesChannel[]> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('investment_sales_channels')
        .select('id,code,name,active')
        .eq('active', true)
        .order('name');
      throwQueryError(error, 'No se pudieron cargar los canales de venta');
      return (data ?? []) as SalesChannel[];
    },

    async getLotInventorySnapshot(
      lotId: string,
      page: number,
      pageSize: number,
    ): Promise<ProductionLotInventorySnapshot> {
      const supabase = createClient();
      const { from } = pageRange(page, pageSize);
      const { data, error } = await supabase.rpc('get_production_lot_inventory_snapshot', {
        p_lot_id: lotId,
        p_unit_limit: pageSize,
        p_unit_offset: from,
      });
      throwQueryError(error, 'No se pudo cargar el inventario exacto del lote');

      const snapshot = (data ?? {}) as RawInventorySnapshot;
      const statusCounts = Object.fromEntries(
        Object.entries(snapshot.status_counts ?? {}).map(([status, value]) => [status, Number(value) || 0]),
      );

      return {
        lotId: snapshot.lot_id ?? lotId,
        totalUnits: Number(snapshot.total_units) || 0,
        statusCounts,
        units: Array.isArray(snapshot.units) ? snapshot.units : [],
      };
    },

    async createLot(payload: RpcPayload): OperationsCommandResult {
      const supabase = createClient();
      return await supabase.rpc('create_production_lot_from_style', payload);
    },

    async saveBeerStyleEconomics(payload: RpcPayload): OperationsCommandResult {
      const supabase = createClient();
      return await supabase.rpc('update_investment_beer_style_economics', payload);
    },

    async transitionLot(payload: RpcPayload): OperationsCommandResult {
      const supabase = createClient();
      return await supabase.rpc('transition_lot_status', payload);
    },

    async generateBottleUnits(payload: RpcPayload): OperationsCommandResult {
      const supabase = createClient();
      return await supabase.rpc('generate_bottle_units', payload);
    },

    async updateBottleUnits(payload: RpcPayload): OperationsCommandResult {
      const supabase = createClient();
      return await supabase.rpc('update_bottle_units_status', payload);
    },

    async recordBottleSale(payload: RpcPayload): OperationsCommandResult {
      const supabase = createClient();
      return await supabase.rpc('record_bottle_sale_document', payload);
    },

    async recordLotFinancialEntry(payload: RpcPayload): OperationsCommandResult {
      const supabase = createClient();
      return await supabase.rpc('record_lot_financial_entry', payload);
    },
  };
}

export type OperationsBrowserRepository = ReturnType<typeof createOperationsBrowserRepository>;
