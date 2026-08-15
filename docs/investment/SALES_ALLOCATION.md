# Sales & Allocation — CTG Craft Beer Inversión

Status: design reference for the first domain milestone.

## Sales domain

`Customer`, `SalesChannel`, `SalesOrder`, `Sale`, `SaleItem`,
`PaymentRecord`. A `Sale` references a `ProductionLot` + SKU, and records
`quantity`, `unit_price_cents`, `discount_cents`, `gross_amount_cents`,
`recognized_revenue_cents`, `taxes_cents`, `sales_channel_id`, `sale_date`,
`customer_id`, `invoice_reference`.

Sales channels are configurable data, not an enum baked into code:
CTG Bogotá, Restaurantes, Distribuidores, Venta directa, Eventos, Ecommerce,
B2B, Otros.

## Allocation of sales performance to participants

Sales are recorded at the `ProductionLot` level (a sale doesn't "belong" to
one participant's cases specifically — see ADR-005). Recognized revenue for
a lot is distributed to each `FundingAllocation` proportionally
(`allocation_ratio`) as part of the `FINANCIAL_MODEL.md` NDLP calculation at
settlement time — sales themselves don't carry a `participant_id`.
