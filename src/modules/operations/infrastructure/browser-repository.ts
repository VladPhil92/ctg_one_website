import { createClient } from '@/lib/supabase/client';
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

export type OperationsCommandResult = Promise<{ error?: { message: string } | null }>;

type RpcPayload = Record<string, unknown>;

function throwQueryError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export function createOperationsBrowserRepository() {
  const supabase = createClient();

  return {
    async listLots(): Promise<InvestmentProductionLot[]> {
      const { data, error } = await supabase
        .from('investment_production_lots')
        .select('*')
        .order('created_at', { ascending: false });
      throwQueryError(error, 'No se pudieron cargar los lotes');
      return (data ?? []) as InvestmentProductionLot[];
    },

    async listBeerStyles(): Promise<InvestmentBeerStyle[]> {
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
      const { data, error } = await supabase
        .from('investment_sales_channels')
        .select('id,code,name,active')
        .eq('active', true)
        .order('name');
      throwQueryError(error, 'No se pudieron cargar los canales de venta');
      return (data ?? []) as SalesChannel[];
    },

    async listBottleUnits(lotId: string): Promise<BottleUnit[]> {
      const { data, error } = await supabase
        .from('investment_bottle_units')
        .select('id,lot_id,serial_code,unit_number,status,current_location,sold_at,sale_price_cents')
        .eq('lot_id', lotId)
        .order('unit_number', { ascending: false })
        .limit(250);
      throwQueryError(error, 'No se pudieron cargar las unidades serializadas');
      return (data ?? []) as BottleUnit[];
    },

    createLot(payload: RpcPayload): OperationsCommandResult {
      return supabase.rpc('create_production_lot_from_style', payload);
    },

    saveBeerStyleEconomics(payload: RpcPayload): OperationsCommandResult {
      return supabase.rpc('update_investment_beer_style_economics', payload);
    },

    transitionLot(payload: RpcPayload): OperationsCommandResult {
      return supabase.rpc('transition_lot_status', payload);
    },

    generateBottleUnits(payload: RpcPayload): OperationsCommandResult {
      return supabase.rpc('generate_bottle_units', payload);
    },

    updateBottleUnits(payload: RpcPayload): OperationsCommandResult {
      return supabase.rpc('update_bottle_units_status', payload);
    },

    recordBottleSale(payload: RpcPayload): OperationsCommandResult {
      return supabase.rpc('record_bottle_sale_document', payload);
    },

    recordLotFinancialEntry(payload: RpcPayload): OperationsCommandResult {
      return supabase.rpc('record_lot_financial_entry', payload);
    },
  };
}

export type OperationsBrowserRepository = ReturnType<typeof createOperationsBrowserRepository>;
