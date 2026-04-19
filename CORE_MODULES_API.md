# Core modules API (MVP)

All routes require:

- `Authorization: Bearer <accessToken>` (store-scoped JWT)
- Store isolation uses `req.user.storeId` from the token (no trusting `body.storeId`).

Base URL prefix: **`/api`**.

---

## Products (`/api/products`)

### POST `/api/products`

Create a product with quantity-based **unit price** tiers. Each tier: `quantity` = minimum units for that tier; `price` = **unit price** when that tier applies. For a line quantity, the API picks the tier with the **largest** `quantity` such that `tier.quantity <= line quantity`.

**Request**

```json
{
  "title": "Widget",
  "sku": "WDG-1",
  "description": "Optional",
  "stock": 100,
  "lowStockThreshold": 5,
  "prices": [
    { "quantity": 1, "price": 29.99 },
    { "quantity": 10, "price": 24.99 }
  ]
}
```

**Response `201`**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "storeId": "uuid",
    "title": "Widget",
    "sku": "WDG-1",
    "isArchived": false,
    "stock": 100,
    "prices": [{ "quantity": 1, "price": 29.99 }]
  }
}
```

### GET `/api/products`

Query: `page`, `limit` (max 100), `includeArchived` (`true`/`1` to include archived).

### PATCH `/api/products/:id`

Partial update; optional full replacement of `prices` array.

### DELETE `/api/products/:id`

Soft delete: sets `isArchived: true` and `isActive: false` (no hard delete).

---

## Customers (`/api/customers`)

### POST `/api/customers`

Create or resolve by **phone** and/or **email** (store-scoped). At least one of `phone` or `email` is required.

**Request**

```json
{
  "phone": "+15551234567",
  "email": "a@b.com",
  "name": "Sam"
}
```

**Response `201`** if created, **`200`** if existing, with `meta.wasCreated`.

### GET `/api/customers`

Paginated list (`page`, `limit`).

### GET `/api/customers/:id`

Single customer, including `totalOrdersCount`, `returnCount`, `cancelCount` (returns/cancels logic for later; counts updated for orders/cancellations in this MVP).

---

## Orders (`/api/orders`)

Pricing is **never** taken from the client for line items. Server loads `Product` + `ProductPrice` and computes unit price and `totalAmount`.

### POST `/api/orders`

**Request**

```json
{
  "customerId": "uuid",
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ],
  "shippingCost": 5,
  "codAmount": null
}
```

- `items` must be non-empty.
- `shippingCost` optional, default `0`.
- `totalAmount` = sum(line unit price × quantity) + `shippingCost`.

**Response `201`**: order with `items` (each `price` field is **unit price** stored for the line).

### GET `/api/orders`

Paginated; includes customer snippet and items.

### GET `/api/orders/:id`

### PATCH `/api/orders/:id/status`

**Request**

```json
{ "status": "CONFIRMED" }
```

Allowed: `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`.

Moving to **`CANCELLED`** restores product stock for the order and increments the customer’s `cancelCount` (once per cancellation).

---

## Key validation rules

| Area | Rule |
|------|------|
| Products | At least one price tier; duplicate `quantity` per product rejected (DB + validation). |
| Orders | Empty `items` rejected; products must belong to store, not archived, active, have tiers; stock checked. |
| Customers | Dedup by phone/email within the same store. |
| Store | All operations use JWT `storeId` only. |
