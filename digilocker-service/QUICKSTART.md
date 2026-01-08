# DigiLocker Service - Quick Start Guide

Get the DigiLocker Authorization Microservice running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- MongoDB running (local or cloud)
- DigiLocker credentials from API Setu

## Step 1: Install Dependencies

```bash
cd digilocker-service
npm install
```

## Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set these required values:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/digilocker-service

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-generated-secret-here

# DigiLocker Credentials (from API Setu dashboard)
DIGILOCKER_CLIENT_ID=your-client-id
DIGILOCKER_CLIENT_SECRET=your-client-secret
DIGILOCKER_REDIRECT_URI=http://localhost:3000/digilocker/callback

# Encryption Keys
ENCRYPTION_KEY=12345678901234567890123456789012  # 32 chars
ENCRYPTION_IV=1234567890123456  # 16 chars
```

## Step 3: Start MongoDB

### Option A: Local MongoDB

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Option B: Docker MongoDB

```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
```

### Option C: MongoDB Atlas

Use a cloud connection string:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/digilocker-service
```

## Step 4: Start the Service

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:

```
{"level":"info","message":"MongoDB connected successfully",...}
{"level":"info","message":"DigiLocker Service running on port 3000",...}
```

## Step 5: Test the Service

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "OK",
  "timestamp": "2024-01-08T10:00:00.000Z",
  "uptime": 12.34,
  "service": "digilocker-service",
  "database": "connected"
}
```

### Test 2: Generate JWT Token

```bash
node scripts/generateToken.js test-user-123
```

Copy the generated token.

### Test 3: Get DigiLocker Auth URL

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/digilocker/auth-url
```

Expected response:

```json
{
  "success": true,
  "data": {
    "authUrl": "https://api.setu.co/api/digilocker/authorize?...",
    "state": "..."
  }
}
```

## Step 6: Test OAuth Flow (Optional)

1. Open the `authUrl` from Step 5 in a browser
2. Complete DigiLocker authentication
3. You'll be redirected to the callback URL
4. Check MongoDB for stored tokens:

```bash
mongo mongodb://localhost:27017/digilocker-service
> db.userdigilockers.find().pretty()
```

## Quick Test Script

```bash
./scripts/testEndpoints.sh
```

## Common Issues

### MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**: Ensure MongoDB is running

```bash
# Check if MongoDB is running
mongosh  # or: mongo

# Start MongoDB if not running
brew services start mongodb-community  # macOS
sudo systemctl start mongod  # Linux
```

### JWT Validation Error

```
{"success":false,"message":"Invalid token"}
```

**Solution**: Ensure JWT_SECRET in .env matches the one used to generate the token

### DigiLocker API Error

```
DigiLocker API error: Invalid client credentials
```

**Solution**: Verify DIGILOCKER_CLIENT_ID and DIGILOCKER_CLIENT_SECRET in .env

## Next Steps

1. **Integrate with your application**: See `docs/INTEGRATION_GUIDE.md`
2. **Deploy to production**: See `docs/DEPLOYMENT.md`
3. **Understand architecture**: See `docs/ARCHITECTURE.md`
4. **Import Postman collection**: Use `postman_collection.json`

## Docker Quick Start

If you prefer Docker:

```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Production Checklist

Before going to production:

- [ ] Change JWT_SECRET to a strong random value
- [ ] Change ENCRYPTION_KEY and ENCRYPTION_IV
- [ ] Use MongoDB Atlas or managed MongoDB
- [ ] Set NODE_ENV=production
- [ ] Configure ALLOWED_ORIGINS for CORS
- [ ] Set up HTTPS/SSL
- [ ] Configure monitoring and logging
- [ ] Set up automated backups

## Support

- **Documentation**: See `README.md` and `docs/` folder
- **Issues**: Check logs in console or PM2
- **Testing**: Use Postman collection or test scripts

## Directory Structure

```
digilocker-service/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── middlewares/      # Auth, error handling
├── models/          # MongoDB schemas
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utilities (encryption, logging)
├── scripts/         # Helper scripts
├── docs/            # Documentation
├── server.js        # Entry point
└── package.json
```

## API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/digilocker/auth-url` | GET | JWT | Get DigiLocker OAuth URL |
| `/digilocker/callback` | GET | No | OAuth callback handler |
| `/digilocker/documents/issued` | GET | JWT | Get issued documents |
| `/digilocker/documents/uploaded` | GET | JWT | Get uploaded documents |
| `/digilocker/documents/download/:uri` | GET | JWT | Download document |

## Environment Variables Quick Reference

```env
# Required
MONGODB_URI=mongodb://localhost:27017/digilocker-service
JWT_SECRET=<generate-random-32-chars>
DIGILOCKER_CLIENT_ID=<from-api-setu>
DIGILOCKER_CLIENT_SECRET=<from-api-setu>
ENCRYPTION_KEY=<32-characters>
ENCRYPTION_IV=<16-characters>

# Optional
PORT=3000
NODE_ENV=development
JWT_EXPIRY=24h
ALLOWED_ORIGINS=*
```

## Useful Commands

```bash
# Generate JWT token
node scripts/generateToken.js <userId>

# Test all endpoints
./scripts/testEndpoints.sh

# View logs (if using PM2)
pm2 logs

# Restart service (PM2)
pm2 restart digilocker-service

# MongoDB shell
mongosh mongodb://localhost:27017/digilocker-service
```

Happy coding! 🚀
