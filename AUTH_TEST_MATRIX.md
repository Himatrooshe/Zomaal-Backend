# Auth test matrix ↔ automation

Run: `npm test` (needs PostgreSQL and `DATABASE_URL` in `.env`).

| TC | Description | Automated in `tests/integration/auth.test.js` |
|----|-------------|-----------------------------------------------|
| TC-01 | Successful signup | ✅ |
| TC-02 | Duplicate email | ✅ (409 `EMAIL_CONFLICT`) |
| TC-03 | Weak password | ✅ (min 8 chars; `"123456"` in your doc would fail validation) |
| TC-04 | Missing fields | ✅ |
| TC-05 | Successful login | ✅ |
| TC-06 | Wrong password | ✅ |
| TC-07 | User not found | ✅ (401, no enumeration) |
| TC-08 | Empty credentials | ✅ |
| TC-09 | Valid JWT | ✅ |
| TC-10 | Missing token | ✅ |
| TC-11 | Invalid token | ✅ |
| TC-12 | Expired access token | ✅ |
| TC-13 | Valid refresh | ✅ |
| TC-14 | Invalid refresh | ✅ |
| TC-15 | Expired refresh (DB) | ✅ |
| TC-16 | Refresh not in DB | ✅ |
| TC-17 | Logout removes session | ✅ |
| TC-18 | Logout invalid refresh | ✅ (401) |
| TC-19 | Wrong store in URL | ✅ |
| TC-20 | Own store | ✅ |
| TC-21 | STAFF blocked | ✅ |
| TC-22 | ADMIN allowed | ✅ |
| TC-23 | Password hashed | ✅ |
| TC-24 | JWT minimal payload | ✅ |
| TC-25 | Brute-force / rate limit | ⏭️ skipped (not in MVP) |
| TC-26 | Multi-device sessions | ✅ |
| TC-27 | Logout one device | ✅ |
| TC-28 | Deleted user + token | ✅ |
| TC-29 | Deleted store + token | ✅ |
| TC-30 | Expired trial enforcement | ⏭️ skipped (not enforced) |
| TC-31 | Active trial | ✅ (`trialEndsAt` future) |

**Note:** TC-01 in your example used password `"123456"` (6 characters). This API requires **at least 8 characters** — use e.g. `"password12"` or adjust policy if product requires otherwise.
