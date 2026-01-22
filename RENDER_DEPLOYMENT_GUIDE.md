# Konektika - Render Deployment Guide

## Current Status

- **Domain**: konektika.online
- **Backend**: Deployed on Render
- **Database**: Aiven MySQL
- **Mobile App**: KonektikaMobile (React Native)

## Issues Found & Solutions

### 1. Backend Not Responding

**Problem**: `https://konektika.online` is timing out

**Possible Causes**:
1. Render service is suspended (free tier sleeps after inactivity)
2. Environment variables not properly configured
3. Database connection issues with Aiven
4. Domain DNS misconfiguration

**Solutions**:

#### A. Check Render Dashboard
1. Go to https://dashboard.render.com
2. Find the `konektika-api` service
3. Check if it's:
   - Running (green)
   - Suspended (gray) - click "Resume"
   - Failed (red) - check logs

#### B. Check Logs
```bash
# In Render dashboard:
1. Click on your service
2. Go to "Logs" tab
3. Look for errors:
   - Database connection errors
   - Missing environment variables
   - Port binding issues
```

#### C. Verify Environment Variables
In Render dashboard, ensure these are set:

**Required Variables**:
```
NODE_ENV=production
PORT=3000
JWT_SECRET=<your-secret-here>
JWT_EXPIRE=7d

# Aiven Database (get from Aiven dashboard)
DB_HOST=<your-aiven-host>
DB_PORT=<your-aiven-port>
DB_NAME=konektika
DB_USER=<your-aiven-user>
DB_PASSWORD=<your-aiven-password>

# Payment Gateway (Pesapal)
PESAPAL_CONSUMER_KEY=q4r7FSXc1MoI7rmF3e6pcIm99MVWoGBz
PESAPAL_CONSUMER_SECRET=F+ngyrGFDxD1dONVQHJ/Pd+LsP8=
PESAPAL_BASE_URL=https://pay.pesapal.com/v3
PESAPAL_IPN_ID=060304c9-8836-4d0c-8067-db0dbabc37b6
PESAPAL_CALLBACK_URL=https://konektika.online/api/webhooks/pesapal

# App Settings
DEFAULT_CURRENCY=TZS
LOG_LEVEL=info
BCRYPT_SALT_ROUNDS=12
```

#### D. Database Setup

1. **Log into Aiven Console**
   - Go to https://console.aiven.io
   - Select your MySQL service

2. **Get Connection Details**
   - Host: `<service-name>-<project>.aivencloud.com`
   - Port: Usually `3306`
   - Database: `konektika`
   - User: Your username
   - Password: Your password

3. **Test Connection**
   ```bash
   mysql -h <aiven-host> -P <aiven-port> -u <user> -p<password> konektika
   ```

4. **Seed Database** (if empty)
   ```bash
   # Connect to Aiven MySQL
   mysql -h <aiven-host> -P <aiven-port> -u <user> -p<password> konektika < database/schema.sql
   
   # Or manually seed bundles
   # Update server/.env with Aiven credentials temporarily
   cd server
   node scripts/seed_bundles.js
   ```

### 2. Domain Configuration

If domain is not resolving:

1. **Check DNS Settings** (in your domain registrar)
   ```
   Type: CNAME
   Name: @ or konektika.online
   Value: <your-render-service>.onrender.com
   TTL: 3600
   ```

2. **Custom Domain in Render**
   - Go to Render dashboard → Your service → Settings
   - Add custom domain: `konektika.online`
   - Follow SSL certificate setup

### 3. Quick Fixes

#### Fix 1: Restart Service
```bash
# Push any change to trigger redeploy
git commit --allow-empty -m "Trigger Render redeploy"
git push origin main
```

#### Fix 2: Check Build Logs
In Render dashboard:
- Look for build failures
- Check if dependencies installed
- Verify start command executed

#### Fix 3: Manual Deploy
In Render dashboard:
- Click "Manual Deploy" → "Deploy latest commit"

## Testing the Deployment

### 1. Health Check
```bash
curl https://konektika.online/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-01-22T...",
  "uptime": 123.456,
  "environment": "production",
  "version": "1.0.0",
  "service": "Konektika VPN Server"
}
```

### 2. Test Bundles API
```bash
curl https://konektika.online/api/bundles
```

### 3. Test Mobile App
The mobile app is already configured to use:
```typescript
BASE_URL: 'https://konektika.online/api'
```

Just build and run the app:
```bash
cd KonektikaMobile
npm run android
```

## Render Service Configuration

### Build Settings
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && node server.js`
- **Environment**: Node
- **Branch**: main
- **Root Directory**: (leave empty, commands use `cd server`)

### Health Check
- **Path**: `/health`
- **Grace Period**: 60 seconds

### Auto-Deploy
- Enable "Auto-Deploy" for `main` branch
- Every push to main triggers deployment

## Common Issues & Solutions

### Issue: "Service Unavailable"
**Solution**: Render free tier sleeps after 15 min inactivity
- First request wakes it up (takes 30-60 seconds)
- Consider upgrading to paid plan for always-on

### Issue: Database Connection Timeout
**Solution**: 
- Verify Aiven service is running
- Check firewall rules allow Render IP ranges
- Increase connection timeout in code

### Issue: "Missing Environment Variable"
**Solution**:
- Check Render dashboard for all required env vars
- Redeploy after adding variables

### Issue: Build Fails
**Solution**:
- Check `package.json` in server directory
- Verify Node version compatibility
- Check build logs for specific errors

## Monitoring

### Render Dashboard
- CPU/Memory usage
- Request logs
- Error tracking
- Uptime monitoring

### Enable Better Logging
In Render environment variables:
```
LOG_LEVEL=debug  # For detailed logs
```

## Next Steps

1. **Immediate**: Fix Render deployment
   - Check if service is running
   - Verify environment variables
   - Test Aiven database connection

2. **Database**: Ensure data is seeded
   - Run seed_bundles.js with Aiven credentials
   - Verify tables exist and have data

3. **Mobile App**: Test end-to-end
   - Register new user
   - Browse bundles
   - Make test payment
   - Download VPN config

4. **Production Hardening**:
   - Add proper SSL certificates
   - Set up monitoring/alerts
   - Configure proper secrets
   - Add rate limiting
   - Set up backups

## Support

If issues persist:
1. Check Render status page: https://status.render.com
2. Check Aiven status: https://status.aiven.io
3. Review server logs in Render dashboard
4. Test locally first to isolate the issue
