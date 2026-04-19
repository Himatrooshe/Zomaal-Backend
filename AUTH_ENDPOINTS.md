# Auth API — request / response examples (MVP)

Base path: **`/api/auth`** (Express mounts routes under `/api`).

All successful responses use: `{ "success": true, "data": ... }`.

Errors use: `{ "success": false, "error": { "code": "...", "message": "..." } }`.

---

## `POST /api/auth/signup`

**Request**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password12",
  "storeName": "My Shop",
  "currency": "USD",
  "trialDays": 14
}
```

`currency` and `trialDays` are optional (`trialDays` defaults to `14`).

**Response `201`**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "814cef5622b0529e717c3a279f21c7f2dc45e914327d0356f932534ac9b5f1280aa68a89bd965035a68cede4d76b5616",
    "user": {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "STAFF"
    },
    "store": {
      "id": "uuid",
      "name": "My Shop",
      "currency": "USD",
      "trialEndsAt": "2026-05-02T12:00:00.000Z",
      "role": "OWNER"
    },
    "memberships": [
      {
        "storeId": "uuid",
        "role": "OWNER",
        "store": {
          "id": "uuid",
          "name": "My Shop",
          "currency": "USD"
        }
      }
    ]
  }
}
```

`user.role` is the global **User** role; `store.role` / `memberships[].role` are **store** roles.

**Example error `409`**

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_CONFLICT",
    "message": "Email already registered"
  }
}
```

---

## `POST /api/auth/login`

**Request (recommended — no `storeId`)**

Use this unless the user belongs to **more than one** store and you need a specific one.

```json
{
  "email": "jane@example.com",
  "password": "password12"
}
```

The API picks the **first** store membership (by membership id). That matches a typical signup → login flow.

**Request (with `storeId` — must be a real id)**

`storeId` must be a UUID that appears in **`data.store.id`** or **`data.memberships[].storeId`** from a previous **signup** or **login** response for **this** user. Do **not** send placeholder text like `"optional-store-uuid"` — that is not a real store and will return `STORE_ACCESS_DENIED`.

```json
{
  "email": "jane@example.com",
  "password": "password12",
  "storeId": "a10f6243-7f06-4dc7-ac51-83a491ecacc0"
}
```

**Response `200`**

Same shape as signup `data`: `accessToken`, `refreshToken`, `user`, `store`, `memberships`.

**Example error `401`**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid credentials"
  }
}
```

---

## `POST /api/auth/refresh`

**Request**

```json
{
  "refreshToken": "814cef5622b0529e717c3a279f21c7f2dc45e914327d0356f932534ac9b5f1280aa68a89bd965035a68cede4d76b5616"
}
```

Refresh tokens are **rotated**: a new `refreshToken` is issued and the old session row is replaced.

**Response `200`**

Same shape as login `data` (`accessToken`, `refreshToken`, `user`, `store`, `memberships`).

**Example error `401`**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Invalid or expired refresh token"
  }
}
```

---

## `POST /api/auth/logout`

**Request**

```json
{
  "refreshToken": "814cef5622b0529e717c3a279f21c7f2dc45e914327d0356f932534ac9b5f1280aa68a89bd965035a68cede4d76b5616"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "loggedOut": true
  }
}
```

If the refresh token does not match any session (unknown or already revoked), the API returns **`401`** with `INVALID_REFRESH_TOKEN` so clients cannot infer session state from a success response.

---

## `GET /api/auth/me`

**Request headers**

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Access JWT payload is minimal: `{ "userId", "role", "storeId" }` (`role` = store role for that token).

**Response `200`**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "STAFF"
    },
    "store": {
      "id": "uuid",
      "name": "My Shop",
      "currency": "USD",
      "trialEndsAt": "2026-05-02T12:00:00.000Z",
      "role": "OWNER"
    },
    "memberships": [
      {
        "storeId": "uuid",
        "role": "OWNER",
        "store": {
          "id": "uuid",
          "name": "My Shop",
          "currency": "USD"
        }
      }
    ]
  }
}
```

**Example error `401`**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```
