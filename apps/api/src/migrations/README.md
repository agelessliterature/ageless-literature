# Database Migrations

## Overview

This directory contains Sequelize migrations for the Ageless Literature application. All migrations use Sequelize's QueryInterface for database schema modifications.

## Migration Files (Chronological Order)

### 1. Auction System (Nov 11, 2025)

- `20251111000001-create-auction-tables.js` - Creates auctions, auction_bids, auction_wins tables
- `20251111000002-add-user-profile-fields.js` - Adds profile fields to users
- `20251111000003-add-oauth-fields-to-users.js` - OAuth support (Google/Apple)

### 2. User & Vendor Enhancements (Nov 13, 2025)

- `20251113000001-add-cloudinary-image-fields.js` - Cloudinary image URLs and public IDs
- `20251113000002-add-social-links-to-vendors.js` - Social media links (FB, Twitter, IG, LinkedIn)
- `20251113000003-add-stripe-and-address-fields.js` - Stripe customer IDs and addresses
- `20251113000004-add-vendor-address-fields.js` - Business and billing addresses for vendors
- `20251113000005-create-vendor-earnings-payouts.js` - Vendor earnings and payouts tables
- `20251113000006-remove-user-banner-fields.js` - Removes banner fields (vendors only)
- `20251113000007-add-stripe-paypal-fields.js` - Stripe Connect and PayPal fields
- `20251113000008-update-payout-method.js` - Payment method constraints

### 3. Vendor Withdrawals (Nov 17, 2025)

- NOTE: ACH support was removed from the codebase

### 4. Orders & Shopping (Nov 18, 2025)

- `20251118000001-create-orders-and-cart-tables.js` - Complete e-commerce schema

## Created Tables (22 total)

### 1. Orders & Shopping (4 tables)

- `orders` - Main order table with payment and shipping info
- `order_items` - Line items for each order
- `carts` - User shopping carts
- `cart_items` - Items in shopping carts

### 2. Wishlists (2 tables)

- `wishlists` - User wishlist containers
- `wishlist_items` - Books in wishlists

### 3. Reservations (1 table)

- `reservations` - Book reservations with expiration

### 4. Auctions (3 tables)

- `auctions` - Auction listings
- `auction_bids` - Bids placed on auctions
- `auction_wins` - Winning auction records

### 5. Communication (3 tables)

- `conversations` - Chat conversations between users and vendors
- `messages` - Individual messages in conversations
- `notifications` - User notifications

### 6. Book Organization (6 tables)

- `categories` - Book categories (hierarchical)
- `tags` - Book tags
- `book_categories` - Many-to-many: books ↔ categories
- `book_tags` - Many-to-many: books ↔ tags
- `collections` - User-created book collections
- `book_collections` - Many-to-many: books ↔ collections

### 7. Vendor Features (3 tables)

- `vendor_earnings` - Track vendor earnings per order
- `vendor_payouts` - Payout transactions to vendors
- `vendor_withdrawals` - Vendor withdrawal requests

### 8. Other (2 tables)

- `collector_profiles` - Extended profile for collectors
- `glossary_terms` - Book terminology glossary

## Running Migrations

### Using Sequelize CLI

```bash
# Install Sequelize CLI globally (if needed)
npm install -g sequelize-cli

# Run all pending migrations
npx sequelize-cli db:migrate

# Run migrations in specific workspace
cd apps/api
npx sequelize-cli db:migrate

# Rollback last migration
npx sequelize-cli db:migrate:undo

# Rollback all migrations
npx sequelize-cli db:migrate:undo:all

# Rollback to specific migration
npx sequelize-cli db:migrate:undo:all --to XXXXXXXXXXXXXX-migration-name.js
```

### Using npm scripts (if configured)

```bash
# From project root
npm run db:migrate

# From apps/api
npm run migrate
```

### Configuration

Migrations use the database configuration from:

- `apps/api/src/config/database.js`
- Environment variables from `.env` file
- `DATABASE_URL` connection string (production)

## Migration Features

### Sequelize QueryInterface

All migrations use Sequelize's QueryInterface for:

- `createTable()` / `dropTable()` - Table creation/deletion
- `addColumn()` / `removeColumn()` - Column modifications
- `addIndex()` / `removeIndex()` - Index management
- `changeColumn()` - Column type/constraint changes
- `sequelize.query()` - Raw SQL for complex operations (CHECK constraints)

### Up/Down Pattern

Every migration has reversible `up` and `down` methods:

```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Apply changes
  },
  down: async (queryInterface, Sequelize) => {
    // Revert changes
  },
};
```

### Key Features Implemented

#### Foreign Keys

- All foreign keys have appropriate `onDelete` actions
- CASCADE for dependent records (cart_items when cart deleted)
- SET NULL for optional references
- RESTRICT on critical references

#### Indexes

All tables include indexes on:

- Foreign keys (for JOIN performance)
- Status fields (for filtering)
- Frequently queried fields
- Unique constraints where needed

#### Check Constraints

ENUM-like values enforced with CHECK constraints:

- Order status: pending, processing, shipped, delivered, cancelled, refunded
- Payment status: pending, paid, failed, refunded
- Payout methods: stripe, paypal (ach deprecated)
- Auction status: upcoming, active, ended, cancelled

#### Data Types

- `INTEGER` - Auto-incrementing IDs
- `DECIMAL(10,2)` - Currency values
- `JSONB` - Address and structured data
- `TEXT` - Long text fields
- `STRING(n)` - VARCHAR with length
- `BOOLEAN` - True/false flags
- `DATE` - Timestamps

## Schema Alignment

### Naming Convention

- **Database columns:** `snake_case` (e.g., `user_id`, `created_at`)
- **Sequelize models:** `camelCase` (e.g., `userId`, `createdAt`)
- **Automatic mapping:** Via `underscored: true` in model configuration

### Sequelize Model Configuration Example

```javascript
{
  tableName: 'orders',
  timestamps: true,
  underscored: true,  // Automatically maps camelCase ↔ snake_case
}
```

### Field Mapping Example

```javascript
userId: {
  type: DataTypes.INTEGER,
  field: 'user_id',  // Explicit mapping to database column
  allowNull: false,
}
```

### ID Strategy

All tables use `INTEGER` auto-incrementing IDs:

- Consistent with existing schema
- Simpler than UUIDs for smaller datasets
- Foreign keys reference INTEGER IDs
- Sequential and predictable

## Testing & Verification

### Check Migration Status

```bash
# List all migrations and their status
npx sequelize-cli db:migrate:status
```

### Verify Tables Exist

```bash
# Connect to database
docker exec -it ageless-lit-postgres psql -U postgres -d ageless_literature

# List all tables
\dt

# Describe specific table
\d orders
\d vendors

# Count rows in table
SELECT COUNT(*) FROM orders;

# Exit psql
\q
```

### Test Specific Migration

```bash
# Run specific migration
npx sequelize-cli db:migrate --to 20251113000001-add-cloudinary-image-fields.js

# Rollback specific migration
npx sequelize-cli db:migrate:undo --to 20251113000001-add-cloudinary-image-fields.js
```

### Check Foreign Keys

```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'orders';
```

### Check Indexes

```sql
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'orders'
ORDER BY tablename, indexname;
```

## Best Practices

### Creating New Migrations

```bash
# Generate new migration file
npx sequelize-cli migration:generate --name your-migration-name

# This creates: YYYYMMDDHHMMSS-your-migration-name.js
```

### Migration Naming Convention

Format: `YYYYMMDDHHMMSS-descriptive-action-name.js`

Examples:

- `20251113000001-add-cloudinary-image-fields.js`
- `20251118000001-create-orders-and-cart-tables.js`

### Writing Migrations

**DO:**

- Always include both `up` and `down` methods
- Use transactions for multiple operations
- Add indexes for foreign keys and frequently queried fields
- Add comments to document column purposes
- Use CHECK constraints for ENUM-like fields
- Test both migration and rollback before committing

**DON'T:**

- Modify existing migration files after they're run in production
- Skip the `down` method (makes rollbacks impossible)
- Forget to add indexes on foreign keys
- Use raw SQL when QueryInterface methods exist
- Hard-code values that should be configurable

### Example Migration Template

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('table_name', 'column_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Description of the column',
    });

    await queryInterface.addIndex('table_name', ['column_name'], {
      name: 'idx_table_name_column_name',
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeIndex('table_name', 'idx_table_name_column_name');
    await queryInterface.removeColumn('table_name', 'column_name');
  },
};
```

## Troubleshooting

### Migration Failed

```bash
# Check which migrations have run
npx sequelize-cli db:migrate:status

# View detailed error
npx sequelize-cli db:migrate --debug

# Force mark migration as executed (use with caution!)
npx sequelize-cli db:migrate --name XXXXXX-migration-name.js
```

### Rollback Issues

If a migration rollback fails:

```bash
# Manually fix the issue in database, then mark as not executed
# Connect to database
docker exec -it ageless-lit-postgres psql -U postgres -d ageless_literature

# Check SequelizeMeta table
SELECT * FROM "SequelizeMeta";

# Delete the failed migration record
DELETE FROM "SequelizeMeta" WHERE name = '20251113000001-migration-name.js';
```

### Database Out of Sync

If database schema doesn't match migrations:

```bash
# Option 1: Reset database (CAUTION: Deletes all data!)
npx sequelize-cli db:migrate:undo:all
npx sequelize-cli db:migrate

# Option 2: Create baseline migration
# Manually create tables to match current state
# Then mark all migrations as executed
```

### Common Errors

**Error: "relation already exists"**

- Migration trying to create existing table
- Solution: Check if table exists before creating or skip migration

**Error: "column does not exist"**

- Rollback references non-existent column
- Solution: Check if column exists before removing

**Error: "violates foreign key constraint"**

- Data exists that violates new constraint
- Solution: Clean up data before adding constraint

## Production Deployment

### Pre-Deployment Checklist

- [ ] All migrations tested locally
- [ ] Rollback procedures tested
- [ ] Database backup created
- [ ] Migration order verified
- [ ] No hardcoded values in migrations
- [ ] All team members aware of schema changes

### Deployment Steps

```bash
# 1. Backup database
pg_dump -U postgres -d ageless_literature > backup_$(date +%Y%m%d).sql

# 2. Run migrations
npx sequelize-cli db:migrate --env production

# 3. Verify tables
npx sequelize-cli db:migrate:status

# 4. Test application
# Run smoke tests to verify functionality

# 5. If issues occur, rollback
npx sequelize-cli db:migrate:undo --env production
```

### Environment-Specific Migrations

```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Only run in production
    if (process.env.NODE_ENV === 'production') {
      // Production-specific changes
    }

    // Run in all environments
    await queryInterface.addColumn(...);
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback logic
  }
};
```

## Additional Resources

- [Sequelize Migrations Documentation](https://sequelize.org/docs/v6/other-topics/migrations/)
- [QueryInterface API](https://sequelize.org/api/v6/class/src/dialects/abstract/query-interface.js~queryinterface)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated:** November 20, 2025  
**Total Migrations:** 13  
**Database Version:** PostgreSQL 16
