# Feature Configuration

StoreFlow starts in **single-user mode**. The owner can use POS, inventory,
sales, transactions, reports, and the dashboard. Owner login remains required.

## Optional features

Set these environment variables before starting the backend:

```text
STORE_OPERATION_MODE=single_user
ENFORCE_AUTH=true
ENABLE_CASH_DRAWER=false
ENABLE_CUSTOMER_CREDIT=true
ENABLE_SELLING_OPTIONS=true
ENABLE_CUSTOM_AMOUNT_SALES=true
ENABLE_PRODUCT_CATALOG_EXTRAS=true
ENABLE_PRODUCT_IMAGES=true
ENABLE_DATABASE_BACKUP=true
```

`ENFORCE_AUTH` is separate from the store operation mode. It defaults to
`true`; set it to `false` only for intentional local development access.

Use `STORE_OPERATION_MODE=multi_user` to enable staff management and roles.
Cash drawer management is independent and must also be enabled:

```text
STORE_OPERATION_MODE=multi_user
ENABLE_CASH_DRAWER=true
```

Disabled features stay in the code and database for future use. Their routes
return a `FEATURE_DISABLED` error, and the frontend hides related actions.

To see the active configuration, request:

```text
GET /api/capabilities
```

Restart the backend after changing these values.
