# Data Model: Multi-Tenant Coupons

All types are in-memory TypeScript types exported from `src/coupon.ts`; nothing is persisted.

## Coupon

| Field | Type | Rules |
|-------|------|-------|
| `tenantId` | `string` | Owner tenant; must equal the checkout tenant (FR-001) |
| `code` | `string` | Unique within tenant; `tenantId + code` must not repeat in one checkout (FR-012) |
| `type` | `'PERCENT' \| 'FIXED'` | Discount kind (FR-002) |
| `value` | `number` | Integer. PERCENT: 1–100 inclusive. FIXED: > 0 (FR-017) |
| `validFrom` | `string` (ISO 8601) | Inclusive start (FR-004) |
| `validTo` | `string` (ISO 8601) | Inclusive end (FR-004) |
| `stackable` | `boolean` | `false` ⇒ must be the only coupon presented (FR-007) |
| `minOrderAmount` | `number` (optional) | Integer; pre-discount `orderAmount` must be ≥ it (FR-005) |

## ApplyInput

| Field | Type | Rules |
|-------|------|-------|
| `tenantId` | `string` | Checkout tenant |
| `orderAmount` | `number` | Positive integer (FR-016) |
| `coupons` | `Coupon[]` | Presentation order is preserved in `applied` (FR-009) |
| `now` | `string` (ISO 8601) | Checkout instant used for validity checks |

## ApplyResult

Discriminated union on `ok`:

- Success: `{ ok: true; finalAmount: number; discount: number; applied: string[] }`
  - `discount = Σ floor(orderAmount × percent / 100) + Σ fixed` (FR-014)
  - `finalAmount = orderAmount − discount`, always ≥ 0 (FR-008)
  - `applied` = codes of all presented coupons in presentation order (all-or-nothing, FR-015)
- Failure: `{ ok: false; reason: Reason }`

## Reason codes (fixed strings, evaluation order = precedence, FR-018)

1. `INVALID_INPUT`
2. `INVALID_COUPON`
3. `TENANT_MISMATCH`
4. `DUPLICATE_COUPON`
5. `COUPON_EXPIRED`
6. `MIN_ORDER_NOT_MET`
7. `NOT_STACKABLE`
8. `DISCOUNT_EXCEEDS_AMOUNT`

## State transitions

None; the function is stateless.
