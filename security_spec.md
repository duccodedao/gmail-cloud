# Security Specification - Gmail & Vault Manager

## Data Invariants
1. `gmail_accounts`:
   - Every account must have a unique ID.
   - `email` must be a valid string.
   - `status` must be one of the predefined enum values.
   - Access restricted to authorized administrators.

2. `web_vault`:
   - Every item must have a unique ID.
   - `account` and `webName` are required strings.
   - `updatedAt` and `createdAt` must be valid timestamps.
   - Access restricted to authorized administrators.

## The "Dirty Dozen" Payloads (Unauthorized Access Attempts)

| ID | Collection | Action | Payload Description | Expected Result |
|---|---|---|---|---|
| 1 | gmail_accounts | create | Non-admin user tries to create an account | PERMISSION_DENIED |
| 2 | gmail_accounts | update | Admin tries to change `id` or `createdAt` | PERMISSION_DENIED |
| 3 | gmail_accounts | update | Admin tries to inject 1MB string into `note` | PERMISSION_DENIED |
| 4 | gmail_accounts | update | Admin tries to set invalid `status` | PERMISSION_DENIED |
| 5 | web_vault | create | Non-admin user tries to create vault item | PERMISSION_DENIED |
| 6 | web_vault | read | Non-admin user tries to list vault items | PERMISSION_DENIED |
| 7 | web_vault | update | Admin tries to change `id` or `createdAt` | PERMISSION_DENIED |
| 8 | web_vault | update | Admin tries to remove required `webName` | PERMISSION_DENIED |
| 9 | web_vault | update | Admin tries to inject 1MB string into `password` | PERMISSION_DENIED |
| 10 | gmail_accounts | delete | Non-admin user tries to delete an account | PERMISSION_DENIED |
| 11 | web_vault | delete | Non-admin user tries to delete a vault item | PERMISSION_DENIED |
| 12 | global | read | Any user tries to read from non-existent collection | PERMISSION_DENIED |

## Test Plan
- Verify that only emails `sonlyhongduc@gmail.com` and `sonlyhongduc1@ghn.vn` can read/write.
- Verify schema validation for all fields (types, sizes, enums).
- Verify immutability of `id` and `createdAt`.
