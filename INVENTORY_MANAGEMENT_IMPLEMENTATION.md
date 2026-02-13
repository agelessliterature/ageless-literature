# Inventory Management Implementation Summary

## Overview

Implemented comprehensive inventory management system from "order created" through "paid/completed" through "delivered", including atomic concurrency protection, search visibility controls, and UI management.

## Completed Implementation

### 1. Database / Models ✅

**Migration**: `apps/api/src/migrations/20260213000001-add-inventory-management-fields.cjs`

- Added `'sold'` and `'archived'` statuses to `enum_books_status`
- Added `track_quantity` BOOLEAN field (default: `true`)
- Changed `quantity` from DECIMAL to INTEGER with NOT NULL constraint
- Added index on `quantity` column for performance
- Auto-sets books with `quantity = 0` to `'sold'` status

**Book Model Updates**: `apps/api/src/models/Book.js`

```javascript
status: DataTypes.ENUM('draft', 'pending', 'published', 'sold', 'archived')
quantity: DataTypes.INTEGER (NOT NULL, default: 1)
trackQuantity: DataTypes.BOOLEAN (NOT NULL, default: true)
```

**Product Model**: Already had `track quantity` and `quantity` fields

### 2. Inventory Service ✅

**New File**: `apps/api/src/services/inventoryService.js`

**Key Functions**:

- `checkAvailability(item, quantity)` - Validates if item can be purchased
- `reserveBookInventory(bookId, quantity, transaction)` - Atomic inventory decrement with row locking
- `reserveProductInventory(productId, quantity, transaction)` - Same for products
- `relistBook(bookId)` - Explicitly relist sold items (requires quantity > 0)
- `updateBookQuantity(bookId, newQuantity)` - Admin/vendor quantity updates

**Concurrency Protection**:

- Uses `SELECT ... FOR UPDATE` row-level locking via `transaction.LOCK.UPDATE`
- All operations require Sequelize transaction
- Prevents race conditions and overselling
- Atomic decrement: `quantity = quantity - requested`
- Auto-sets status to `'sold'` when quantity reaches 0

### 3. Order Lifecycle ✅

**Updated**: `apps/api/src/controllers/ordersController.js`

**createOrder Flow**:

1. Wraps entire order creation in transaction
2. For each item:
   - Fetches book/product with transaction
   - Calls `inventoryService.reserveBookInventory()` or `reserveProductInventory()`
   - Validates availability and reserves inventory atomically
3. If any item fails reservation, entire transaction rolls back
4. Creates order and order items only after all inventory reserved
5. Commits transaction
6. Sends emails/SMS asynchronously (non-blocking)

**Error Handling**:

- Returns specific error messages: "Book is sold out", "Only X available"
- No partial inventory consumption
- Full rollback on any failure

### 4. Search / Shop Visibility ✅

**Updated**: `apps/api/src/controllers/booksController.js`

- `getAllBooks()` filters: `status = 'published' AND (trackQuantity = false OR quantity > 0)`
- Sold items excluded from public catalog

**Updated**: `apps/api/src/utils/meilisearch.js`

- Added `quantity` and `trackQuantity` to filterable/displayable attributes
- `search()` function applies filters: `status = "published" AND (quantity > 0 OR trackQuantity = false)`
- Sold items removed from public search results
- Index auto-updates when items become sold (async)

**Index Transform Functions**:

- `transformBookForIndex()` includes `trackQuantity` field
- `transformProductForIndex()` includes `trackQuantity` field

### 5. Vendor Dashboard UI ✅

**Updated**: `apps/web/src/app/vendor/books/page.tsx`

**Changes**:

- Added "Quantity" column showing:
  - Numeric quantity for tracked items
  - "∞" symbol for non-tracked items
- Updated status badge colors:
  - `'published'` → green
  - `'draft'` → yellow
  - `'sold'` → red
  - `'archived'` → gray
- Added "Relist" button (redo icon):
  - Only visible for `status = 'sold'` AND `quantity > 0`
  - Calls `POST /api/vendor/products/{id}/relist`
  - Confirmation prompt before relisting
- Status filter already had "Sold" option

### 6. Admin Dashboard UI ✅

**Updated**: `apps/web/src/app/admin/products/page.tsx`

- Added `'sold'` option to status filter dropdown
- Admins can filter and view sold items
- Same visibility as vendor dashboard

### 7. API Endpoints ✅

**New Routes**: `apps/api/src/routes/vendorRoutes.js`

```javascript
PATCH /api/vendor/products/:id/quantity - Update product quantity
POST  /api/vendor/products/:id/relist   - Relist sold product
```

**New Controller Functions**: `apps/api/src/controllers/vendorProductsController.js`

**`updateProductQuantity()`**:

- Updates book/product quantity
- Validates quantity >= 0
- Auto-sets status to `'sold'` if quantity becomes 0
- Updates search index
- Does NOT auto-relist if quantity increases (requires explicit relist)

**`relistProduct()`**:

- Validates `status = 'sold'` and `quantity > 0`
- Sets status to `'published'`
- Updates search index
- Returns error if quantity = 0

**Existing `getVendorProducts()`**:

- Already supports `?status=sold` filter
- Returns quantity in response

### 8. Testing ✅

**New Test File**: `tests/unit/inventoryService.test.js`

**Test Coverage**:

- ✅ Availability checks for published/sold/draft statuses
- ✅ Availability with/without quantity tracking
- ✅ Atomic quantity decrement
- ✅ Status change to 'sold' when quantity = 0
- ✅ Insufficient quantity errors
- ✅ **Concurrency**: Two parallel orders for last item → only one succeeds
- ✅ Relist validation (requires quantity > 0)
- ✅ Quantity update with auto-sold status
- ✅ Negative quantity rejection

**Run Tests**:

```bash
npm test tests/unit/inventoryService.test.js
```

## Key Design Decisions

### 1. No Automatic Relisting

- When quantity increases from 0 → positive, status stays `'sold'`
- Vendors/admin MUST explicitly click "Relist" to make it available again
- Prevents accidental re-listing of items marked sold for other reasons

### 2. Inventory Consumed on Order Creation

- Not on payment success
- Simplifies flow, prevents checkout race conditions
- If payment fails, order is cancelled but inventory already reserved
- Alternative approach (reserve on checkout, consume on payment) would require:
  - Reservation expiry system
  - Webhook idempotency
  - More complex state management

### 3. trackQuantity Flag

- Allows unlimited quantity items (e.g., digital products, services)
- If `trackQuantity = false`, always available regardless of quantity value
- Defaults to `true` for books (rare items)

### 4. Transaction-Required Operations

- All inventory mutations require passing a Sequelize transaction
- Enforces consistency
- Prevents accidental non-transactional updates

### 5. Search Index Updates

- Async (non-blocking) via `setImmediate()`
- Failures logged but don't block order creation
- Eventually consistent

## Deployment

### What Was Deployed:

1. ✅ Database migration (ran manually via psql)
2. ✅ Backend code (API container restarted)
3. ✅ Frontend code (Web container restarted)
4. ✅ Container restarts completed

### Deployment Commands Used:

```bash
# Copy files to server
scp -i ~/.ssh/dev-VM-key.pem {files} AgelessLiteratureDev@20.118.237.147:/mnt/v2/

# Run migration manually
docker exec ageless-lit-postgres psql -U postgres -d ageless_literature_dev -c "..."

# Restart containers
docker compose -f docker-compose.prod.yml restart
```

### Server: `20.118.237.147`

- Database: `ageless_literature_dev`
- API Container: `ageless-lit-api`
- Web Container: `ageless-lit-web`
- Postgres Container: `ageless-lit-postgres`

## Verification Checklist

- [x] Migration ran successfully
- [x] API container restarted
- [x] Web container restarted
- [x] Enum values `'sold'` and `'archived'` added
- [x] `track_quantity` column added
- [x] Index on `quantity` created
- [x] Inventory service created
- [x] Order controller uses inventory service
- [x] Books controller filters sold items
- [x] MeiliSearch excludes sold from public search
- [x] Vendor UI shows quantity and relist button
- [x] Admin UI has sold filter
- [x] Tests created

## Next Steps / Recommendations

### Immediate

1. Test order creation on dev v2:
   - Create order for item with quantity > 1 → verify quantity decrements
   - Create order for last item → verify status changes to 'sold'
   - Try to order sold item → verify error message
   - Test relist functionality in vendor dashboard

2. Verify search visibility:
   - Search for a book → find it
   - Order it until sold → verify it disappears from search
   - Relist it → verify it reappears

### Future Enhancements

1. **Reservation System** (if needed):
   - Add `reservedQuantity` and `reservedUntil` fields
   - Reserve on cart checkout, consume on payment success
   - Background job to release expired reservations
   - More complex but prevents checkout conflicts

2. **Order Cancellation**:
   - Implement `cancelOrder()` function
   - Restore inventory via `releaseBookInventory()`
   - Update order status workflow

3. **Low Stock Alerts**:
   - Add `lowStockThreshold` field (already exists in Product model)
   - Send notifications when `quantity <= threshold`
   - Dashboard badge for low stock items

4. **Inventory History**:
   - Create `inventory_transactions` table
   - Log all quantity changes with reason, user, timestamp
   - Audit trail for inventory discrepancies

5. **Bulk Operations**:
   - Bulk quantity updates
   - Bulk relist
   - Bulk status changes

6. **Analytics**:
   - Track sales velocity
   - Alert on items selling faster than expected
   - Suggest restock based on historical data

## Files Modified

### Backend (API)

1. `apps/api/src/migrations/20260213000001-add-inventory-management-fields.cjs` [NEW]
2. `apps/api/src/services/inventoryService.js` [NEW]
3. `apps/api/src/models/Book.js` [MODIFIED]
4. `apps/api/src/controllers/ordersController.js` [MODIFIED]
5. `apps/api/src/controllers/booksController.js` [MODIFIED]
6. `apps/api/src/controllers/vendorProductsController.js` [MODIFIED]
7. `apps/api/src/routes/vendorRoutes.js` [MODIFIED]
8. `apps/api/src/utils/meilisearch.js` [MODIFIED]

### Frontend (Next.js)

9. `apps/web/src/app/vendor/books/page.tsx` [MODIFIED]
10. `apps/web/src/app/admin/products/page.tsx` [MODIFIED]

### Tests

11. `tests/unit/inventoryService.test.js` [NEW]

## Total: 11 Files (3 new, 8 modified)

---

**Implementation Date**: February 13, 2026  
**Status**: ✅ Complete and Deployed  
**Environment**: Dev v2 (20.118.237.147)
