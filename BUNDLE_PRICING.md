# Konektika VPN Bundle Pricing

## Default Bundle Plans

| Bundle Name | Data Limit | Duration | Price (TZS) | Max Users |
|-------------|-----------|----------|-------------|-----------|
| Daily Bundle | 5 GB | 1 day | 1,000 | 50 |
| Weekly Bundle | 20 GB | 7 days | 3,000 | 50 |
| Monthly Bundle | 100 GB | 30 days | 17,000 | 50 |
| Premium 3-Month | 500 GB | 90 days | 45,000 | 30 |

## Seeding Instructions

To add these bundles to your database, run:

```bash
cd C:\konektika\server
node scripts\seed_bundles.js
```

This will:
1. Create a default owner user (owner@konektika.com / admin123)
2. Clear any existing bundles from that owner
3. Insert the 4 standard bundles with the pricing above

## Database Location

- **Database Name**: konektika
- **Schema**: C:\konektika\database\schema.sql
- **Seed Script**: C:\konektika\server\scripts\seed_bundles.js
- **SQL Seed**: C:\konektika\database\seed_bundles.sql

## Mobile App Integration

The mobile app (C:\konektika\KonektikaMobile) will automatically fetch and display these bundles through the BundleService API.

Features:
- Browse all available bundles
- Search bundles by name/description
- View detailed bundle information
- Purchase bundles via mobile money (M-Pesa, Tigo Pesa, Airtel Money)
- Download VPN configurations after purchase

## API Endpoints

- `GET /api/bundles` - List all active bundles
- `GET /api/bundles/:id` - Get bundle details
- `POST /api/payments/initiate` - Purchase a bundle
- `POST /api/vpn/generate-config` - Generate VPN config after purchase
