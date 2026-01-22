# Render Environment Variables Setup

## Critical Issue
Your backend at `https://konektika.online` is returning 500 errors because environment variables are not configured in Render.

## Required Environment Variables for Render

Go to your Render dashboard → Select your service → Environment tab → Add these variables:

### 1. Database Configuration (REQUIRED)
```
DB_HOST=<your-aiven-mysql-host>
DB_PORT=3306
DB_NAME=konektika
DB_USER=<your-aiven-mysql-user>
DB_PASSWORD=<your-aiven-mysql-password>
```

### 2. JWT Authentication (REQUIRED)
```
JWT_SECRET=konektika_super_secure_jwt_secret_key_2024_please_change_in_production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=konektika_refresh_token_secret_different_from_access_2024
JWT_REFRESH_EXPIRE=30d
```

### 3. Application Settings (REQUIRED)
```
NODE_ENV=production
PORT=3000
APP_NAME=Konektika
APP_VERSION=1.0.0
```

### 4. Payment Gateway (REQUIRED for payments)
```
PESAPAL_CONSUMER_KEY=q4r7FSXc1MoI7rmF3e6pcIm99MVWoGBz
PESAPAL_CONSUMER_SECRET=F+ngyrGFDxD1dONVQHJ/Pd+LsP8=
PESAPAL_BASE_URL=https://pay.pesapal.com/v3
PESAPAL_IPN_ID=060304c9-8836-4d0c-8067-db0dbabc37b6
PESAPAL_CALLBACK_URL=https://konektika.online/api/webhook/pesapal
PESAPAL_CANCEL_URL=https://konektika.online/payment/cancel
```

### 5. Security Settings (OPTIONAL but recommended)
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_SALT_ROUNDS=12
LOG_LEVEL=info
```

## Most Likely Issue

Based on the 500 errors during login/registration, the problem is **missing database credentials**. 

Check:
1. Is the database (Aiven MySQL) running and accessible?
2. Are the DB_HOST, DB_USER, DB_PASSWORD correctly set in Render?
3. Does the database have the `users` table created?

## How to Fix

### Step 1: Check Render Logs
1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. Look for database connection errors or JWT_SECRET errors

### Step 2: Add Environment Variables
1. Go to Environment tab in Render
2. Add all REQUIRED variables listed above
3. Click "Save Changes"
4. Service will automatically redeploy

### Step 3: Verify Database
Run the database setup script to ensure tables exist:
```bash
npm run setup-db
```

## Testing After Configuration

Once environment variables are set, test the endpoints:

```bash
# Test registration
curl -X POST https://konektika.online/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name":"Test User",
    "email":"test@example.com",
    "phone":"0712345678",
    "password":"Test123!",
    "user_type":"client"
  }'

# Test login
curl -X POST https://konektika.online/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123!"
  }'
```

## Mobile App Status

✅ Mobile app configuration is CORRECT
✅ App is reaching the right backend URL
✅ Request format is correct
❌ Backend is returning 500 errors due to missing environment variables

The mobile app will work once the backend environment variables are properly configured in Render.
