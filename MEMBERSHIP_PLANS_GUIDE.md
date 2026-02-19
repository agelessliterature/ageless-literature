# Membership Plans Management Guide

## How to Update Membership Plan Details

When you need to change membership plan details (name, description, price, features), follow this workflow to ensure changes work both locally and in production.

---

## 📝 Step-by-Step Process

### 1. **Update the Seed Script** (for local development)

Edit: `apps/api/src/scripts/seed-membership-plans.js`

Update the `membershipPlans` array with your new values:

```javascript
const membershipPlans = [
  {
    name: 'New Name', // ← Change this
    slug: 'reader', // ← Don't change slug (used as identifier)
    description: 'New description...', // ← Change this
    price: 12.99, // ← Change this
    currency: 'USD',
    interval: 'monthly',
    features: [
      // ← Change these
      'New feature 1',
      'New feature 2',
    ],
    isActive: true,
  },
  // ... more plans
];
```

### 2. **Create a Data Migration** (for production)

Create a new migration file:

```bash
cd apps/api
npx sequelize-cli migration:generate --name update-membership-plans-YYYYMMDD
```

Copy the template from `20260219000002-update-membership-plan-data.cjs` and update the values.

**Example:**

```javascript
const planUpdates = [
  {
    slug: 'reader', // Use slug to identify which plan to update
    updates: {
      name: 'New Name',
      description: 'New description',
      price: 12.99,
      features: JSON.stringify(['New feature 1', 'New feature 2']),
    },
  },
];
```

### 3. **Test Locally**

```bash
# Option A: Run seed script (wipes and recreates)
node apps/api/src/scripts/seed-membership-plans.js --force

# Option B: Run migration (updates existing)
cd apps/api
npx sequelize-cli db:migrate
```

### 4. **Commit and Push**

```bash
git add .
git commit -m "Update membership plan details"
git push origin main
```

### 5. **Deploy to Production**

When you deploy, the migration will run automatically and update the plans in production.

---

## 🔍 Key Differences

| Aspect             | Seed Script             | Data Migration           |
| ------------------ | ----------------------- | ------------------------ |
| **Purpose**        | Local development setup | Production updates       |
| **When to use**    | Fresh database or reset | Updating existing data   |
| **Runs on deploy** | ❌ No                   | ✅ Yes (automatically)   |
| **Destructive**    | ⚠️ Yes (with --force)   | ❌ No (updates in place) |

---

## ⚠️ Important Rules

1. **Never change the `slug`** - It's used as the identifier to update the correct plan
2. **Update both files** - Seed script AND create a migration
3. **Test the migration** - Run it locally before pushing
4. **Features must be JSON** - In migrations, use `JSON.stringify()` for the features array

---

## 🛠️ Common Tasks

### Add a New Plan

1. Add to seed script array
2. Create migration with `bulkInsert`:

```javascript
await queryInterface.bulkInsert('membership_plans', [
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'For large organizations',
    price: 99.99,
    // ... other fields
    created_at: new Date(),
    updated_at: new Date(),
  },
]);
```

### Change a Price

1. Update price in seed script
2. Create migration:

```javascript
await queryInterface.bulkUpdate('membership_plans', { price: 14.99 }, { slug: 'reader' });
```

### Disable a Plan

```javascript
await queryInterface.bulkUpdate('membership_plans', { is_active: false }, { slug: 'old-plan' });
```

---

## 📁 File Locations

- **Seed Script**: `apps/api/src/scripts/seed-membership-plans.js`
- **Model**: `apps/api/src/models/MembershipPlan.js`
- **Migrations**: `apps/api/src/migrations/`
- **Example Migration**: `apps/api/src/migrations/20260219000002-update-membership-plan-data.cjs`

---

## 🚀 Quick Reference Commands

```bash
# Seed plans locally (fresh start)
node apps/api/src/scripts/seed-membership-plans.js --force

# Create new migration
cd apps/api
npx sequelize-cli migration:generate --name your-migration-name

# Run pending migrations
cd apps/api
npx sequelize-cli db:migrate

# Rollback last migration
cd apps/api
npx sequelize-cli db:migrate:undo
```
