# Ageless Literature

Full-stack marketplace for rare books and collectibles with real-time messaging, auctions, and payment processing.

## Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS  
**Backend:** Node.js, Express, PostgreSQL, Redis  
**Payments:** Stripe Connect, PayPal  
**Real-time:** Socket.IO  
**DevOps:** Docker, PM2

## Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev

# API: http://localhost:3001
# Web: http://localhost:3000
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ageless_literature

# Redis
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
```

## Project Structure

```
apps/
├── api/          # Node.js backend
│   └── src/
│       ├── controllers/
│       ├── models/
│       ├── routes/
│       └── services/
└── web/          # Next.js frontend
    └── src/
        ├── app/
        ├── components/
        └── lib/
```

## Scripts

```bash
npm run dev              # Start both apps
npm run dev:api          # Backend only
npm run dev:web          # Frontend only
npm run build            # Production build
npm test                 # Run tests
npm run test:coverage    # Coverage report
```

## Testing

```bash
# Quick start
docker-compose up -d postgres redis
npm run test:local

# Individual suites
npm run test:unit          # Unit tests
npm run test:integration   # API tests
npm run test:e2e          # Browser tests
```

Tests use your dev database with automatic cleanup - no data persists after tests.

## Docker Deployment

```bash
docker-compose up -d
```

Build arguments required for web container:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXTAUTH_SECRET`

## API Documentation

Base URL: `http://localhost:3001/api`

**Authentication:**

- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `GET /auth/me` - Current user

**Products:**

- `GET /products` - List products
- `GET /products/:id` - Product details
- `POST /admin/products` - Create product (admin)

Full API docs in `/apps/api/README.md`

## Support

Contact: support@agelessliterature.com

## License

Private - All Rights Reserved
