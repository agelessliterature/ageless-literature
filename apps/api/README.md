# Ageless Literature API

Backend server for the Ageless Literature multi-vendor rare book marketplace.

## Tech Stack

- **Database**: PostgreSQL with Sequelize ORM
- **Real-time**: Socket.IO with Redis adapter
- **Authentication**: JWT
- **Payments**: Stripe Connect
- **Search**: MeiliSearch
- **Cache**: Redis

## Project Structure

```
src/
├── collections/        # collections
├── config/            # Configuration files
├── controllers/       # Request handlers
├── middleware/        # Express middleware
├── models/           # Sequelize models (27 models)
├── routes/           # API route definitions
├── services/         # Business logic services
├── sockets/          # Socket.IO handlers
├── utils/            # Helper functions
└── server.js         # Main entry point
```

## Database Models

### Authentication & Roles

- **User**: Core user model with roles (ADMIN, VENDOR, COLLECTOR)
- **Vendor**: Vendor-specific profile with Stripe Connect
- **CollectorProfile**: Collector preferences and interests

### Catalog

- **Book**: Main catalog entity with metadata
- **BookMedia**: Images and videos for books
- **Category**: Hierarchical categories
- **Tag**: Tagging system for books
- **Collection**: Curated book collections

### Orders & Payments

- **Cart / CartItem**: Shopping cart
- **Order / OrderItem**: Order management
- **VendorPayout**: Stripe Connect payout tracking

### Wishlist & Reservation

- **Wishlist / WishlistItem**: User wishlists
- **Reservation**: 24-hour book reservations

### Messaging & Notifications

- **Conversation / Message**: User-to-user messaging
- **Notification**: Push notifications

### Memberships

- **MembershipPlan / MembershipSubscription**: Subscription tiers

### CMS

- **GlossaryTerm**: Book collecting terminology

## API Endpoints

### Books

- `GET /api/books` - List books (public, with filters)
- `GET /api/books/:id` - Get book details
- `POST /api/books` - Create book (vendor only)
- `PUT /api/books/:id` - Update book (vendor only)
- `DELETE /api/books/:id` - Delete book (vendor only)

### Cart

- `GET /api/cart` - Get user cart
- `POST /api/cart` - Add item to cart
- `DELETE /api/cart/:itemId` - Remove item
- `DELETE /api/cart` - Clear cart

### Orders

- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id/status` - Update order status

### Reservations

- `GET /api/reservations` - List user reservations
- `POST /api/reservations` - Reserve a book
- `DELETE /api/reservations/:id` - Cancel reservation

### Wishlist

- `GET /api/wishlist` - Get wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist/:itemId` - Remove from wishlist

### Conversations

- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Start conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message

### Memberships

- `GET /api/memberships/plans` - List plans
- `GET /api/memberships/subscription` - Get user subscription
- `POST /api/memberships/subscribe` - Subscribe to plan
- `POST /api/memberships/cancel` - Cancel subscription

## Socket.IO Events

### Chat Namespace (`/chat`)

- `join:conversation` - Join conversation room
- `leave:conversation` - Leave conversation room
- `message:send` - Send message
- `message:new` - Receive new message
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env
   # Edit .env with your credentials
   ```

3. **Start PostgreSQL & Redis**

   ```bash
   docker-compose up -d postgres redis
   ```

4. **Run migrations** (or use auto-sync in development)

   ```bash
   npm run migrate
   ```

5. **Start dev server**
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start with nodemon
- `npm run build` - Compile TypeScript (if using TS)
- `npm run lint` - Run ESLint
- `npm run format` - Format with Prettier

## Environment Variables

See `.env` for all required configuration keys.

Critical variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `SENDGRID_API_KEY` - SendGrid API key (required for email)

### Email Configuration (SendGrid)

Transactional emails are sent via SendGrid. Required environment variables:

```bash
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Ageless Literature
SENDGRID_REPLY_TO=support@yourdomain.com
```

**Setup Steps:**

1. Create a SendGrid account at https://sendgrid.com
2. Verify your sender email/domain in SendGrid dashboard
3. Generate an API key at https://app.sendgrid.com/settings/api_keys
4. Add the API key to your `.env` file
5. Test email sending (see below)

**Email Templates:**

The system supports two template sources:

1. **Database templates** (preferred): Store templates in the `email_templates` table with variable placeholders like `{{firstName}}`
2. **Fallback templates**: Hardcoded templates in `emailService.js` for common notification types

Current email types in use:
- `membership-*` (new, cancelled, paused, resumed, upgraded, payment-failed)
- `vendor-application-*` (submitted, approved, rejected)
- `vendor-payout-*` (created, completed)
- `vendor-withdrawal-*` (requested, approved, completed, rejected)
- `vendor-suspended`
- `stripe-account-*` (active, restricted)
- `paypal-payout-*` (succeeded, failed, blocked, returned)
- `payout-failed`, `bank-payout-failed`

**Testing Emails Locally:**

Without SendGrid configured, emails will be logged to console. To test real sending:

**Option 1: Test Script (Recommended)**
```bash
# Set SENDGRID_API_KEY in .env first, then:
npm run test:email your-email@example.com
```

**Option 2: Trigger via Webhooks**
- Use Stripe/PayPal test webhooks OR
- Create a test membership subscription OR
- Submit a vendor application

Emails are sent automatically by:
- Stripe/PayPal webhook handlers (`/webhooks/*`)
- Membership operations (`membershipsController.js`)
- Vendor application workflows (`vendorController.js`, `adminVendorsController.js`)
- Payout operations (`adminPayoutsController.js`)
- **Auction winners** (`auctionsController.js` - when auction closes with winner)
- **Order confirmations** (`ordersController.js` - buyer + vendor notifications on order creation)

**Active Transactional Notifications (Phase 2, Hardened Phase 3):**

1. **Auction Winner** (`AUCTION_WON_PAYMENT_DUE`)
   - Triggered: When auction closes with a winning bid
   - Recipient: Winner (buyer)
   - Contains: Auction title, winning amount, payment link
   - Persistence: Notification record created after successful send
   - Idempotency: Checked via `data.entityId` before sending

2. **Order Confirmation** (`ORDER_CONFIRMED_BUYER`)
   - Triggered: After successful order creation
   - Recipient: Buyer
   - Contains: Order number, items, total, shipping address, tracking link
   - Persistence: Notification record created after successful send
   - Idempotency: Checked via `data.entityId` before sending

3. **New Order Alert** (`ORDER_NEW_VENDOR`)
   - Triggered: After order creation (one email per vendor in order)
   - Recipients: Vendors whose items are in the order
   - Contains: Order number, vendor's items, vendor total, order management link
   - Persistence: Notification record created after successful send
   - Idempotency: Checked via `data.entityId` + `data.metadata.vendorId` before sending

**Notification Data Structure:**

Each notification record in the `notifications` table contains:
```json
{
  "id": "uuid",
  "userId": "recipient_user_id",
  "type": "AUCTION_WON_PAYMENT_DUE | ORDER_CONFIRMED_BUYER | ORDER_NEW_VENDOR",
  "data": {
    "entityType": "auction | order",
    "entityId": "entity_id",
    "templateName": "email_template_name",
    "recipientEmail": "email@example.com",
    "sentAt": "2026-01-06T12:00:00.000Z",
    "metadata": {
      // Event-specific data (amounts, titles, etc.)
    }
  },
  "isRead": false,
  "readAt": null
}
```

**Idempotency & Audit Trail:**

- All emails are recorded in the `notifications` table after successful send
- Before sending, the system checks for existing notifications by `type` and `data.entityId`
- Duplicate sends are prevented and logged: `"Notification already sent: <type> <entityId> <recipient>"`
- If email delivery fails, no notification record is created (allows retry)
- Notification records can later be displayed as in-app notifications without rework

**Testing Notifications Locally:**

To test auction winner email:
1. Create an auction (vendor dashboard or admin)
2. Place at least one bid
3. Manually close the auction via API: `POST /api/auctions/{id}/close`
4. Winner receives email (check console if SendGrid not configured)
5. **Verify idempotency**: Close the same auction again (should see "Notification already sent" log)
6. **Check database**: Query `notifications` table for record with `type='AUCTION_WON_PAYMENT_DUE'`

To test order emails:
1. Add items to cart
2. Complete checkout via `POST /api/orders`
3. Buyer and vendors receive emails immediately
4. **Verify idempotency**: Retry the order creation (email won't send twice)
5. **Check database**: Query `notifications` table for records with `type='ORDER_CONFIRMED_BUYER'` and `type='ORDER_NEW_VENDOR'`

**Verifying Idempotency:**
```sql
-- Check auction winner notifications
SELECT id, type, "userId", data->>'entityId' as auction_id, 
       data->>'recipientEmail' as email, "createdAt"
FROM notifications 
WHERE type = 'AUCTION_WON_PAYMENT_DUE';

-- Check order notifications
SELECT id, type, "userId", data->>'entityId' as order_id,
       data->>'recipientEmail' as email, "createdAt"
FROM notifications 
WHERE type IN ('ORDER_CONFIRMED_BUYER', 'ORDER_NEW_VENDOR')
ORDER BY "createdAt" DESC;
```

**Email Service Architecture:**

- **Service**: `src/services/emailService.js`
- **Templates**: Database (`email_templates` table) or fallback map
- **Variable replacement**: `{{variableName}}` syntax
- **Plain text**: Auto-generated from HTML (reduces spam score)
- **Error handling**: Graceful failures (logged, don't crash)
- **Idempotency**: Uses `Notification` model to prevent duplicate sends
- **Development mode**: If `SENDGRID_API_KEY` not set, logs to console only

## Authentication

JWT tokens are required for protected endpoints. Include in headers:

```
Authorization: Bearer <your_jwt_token>
```

## Role-Based Access

- **ADMIN**: Full system access
- **VENDOR**: Can manage own books, orders, payouts
- **COLLECTOR**: Can browse, purchase, message

