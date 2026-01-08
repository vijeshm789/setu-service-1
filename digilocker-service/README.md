# DigiLocker Authorization Microservice

Production-ready microservice for DigiLocker OAuth 2.0 integration with JWT-based internal authentication.

## Architecture

- **Node.js** v18+
- **Express.js** - Web framework
- **MongoDB** with Mongoose - Data persistence
- **OAuth 2.0** - DigiLocker authorization via API Setu
- **JWT** - Internal authentication for service-to-service communication
- **AES-256-CBC** - Token encryption

## Features

- ✅ Complete OAuth 2.0 flow for DigiLocker
- ✅ One DigiLocker credential per user (upsert logic)
- ✅ Automatic token refresh before expiry
- ✅ Encrypted token storage
- ✅ JWT-based internal authentication
- ✅ Production-ready error handling
- ✅ Request logging
- ✅ CORS support
- ✅ Health check endpoint

## Project Structure

```
digilocker-service/
├── config/
│   └── config.js              # Configuration management
├── controllers/
│   ├── healthController.js    # Health check controller
│   └── digilockerController.js # DigiLocker endpoints
├── middlewares/
│   ├── auth.js                # JWT authentication middleware
│   └── errorMiddleware.js     # Global error handler
├── models/
│   └── UserDigiLocker.js      # MongoDB schema
├── routes/
│   ├── healthRoutes.js        # Health routes
│   ├── digilockerRoutes.js    # DigiLocker routes
│   └── index.js               # Route aggregator
├── services/
│   └── digilockerService.js   # DigiLocker OAuth service
├── utils/
│   ├── encryption.js          # AES encryption utilities
│   ├── logger.js              # Logging utility
│   └── errorHandler.js        # Custom error class
├── .env.example               # Environment variables template
├── .gitignore
├── package.json
├── server.js                  # Application entry point
└── README.md
```

## Installation

1. Clone the repository
2. Install dependencies:
```bash
cd digilocker-service
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Start MongoDB (local or Docker)

5. Run the service:
```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

See `.env.example` for all required variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT signing
- `DIGILOCKER_CLIENT_ID` - DigiLocker client ID from API Setu
- `DIGILOCKER_CLIENT_SECRET` - DigiLocker client secret
- `DIGILOCKER_REDIRECT_URI` - OAuth callback URL
- `ENCRYPTION_KEY` - 32-character key for AES-256
- `ENCRYPTION_IV` - 16-character initialization vector

## API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-08T10:00:00.000Z",
  "uptime": 123.45,
  "service": "digilocker-service",
  "database": "connected"
}
```

### DigiLocker Authorization

#### 1. Get Authorization URL

```
GET /digilocker/auth-url
Authorization: Bearer <internal_jwt>
```

Response:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://api.setu.co/api/digilocker/authorize?...",
    "state": "random_state_token"
  }
}
```

**Flow:**
1. Client calls this endpoint with JWT
2. Service generates DigiLocker OAuth URL
3. Client redirects user to authUrl
4. User completes DigiLocker authentication

#### 2. OAuth Callback

```
GET /digilocker/callback?code=xxx&state=yyy
```

Response:
```json
{
  "success": true,
  "message": "DigiLocker authorization successful",
  "data": {
    "userId": "user123",
    "success": true
  }
}
```

**Flow:**
1. DigiLocker redirects here after user authorization
2. Service exchanges code for access_token and refresh_token
3. Tokens are encrypted and stored in MongoDB
4. One record per user (upsert logic)

### Document Management

#### 3. Get Issued Documents

```
GET /digilocker/documents/issued
Authorization: Bearer <internal_jwt>
```

Response:
```json
{
  "success": true,
  "data": {
    // DigiLocker issued documents
  }
}
```

#### 4. Get Uploaded Documents

```
GET /digilocker/documents/uploaded
Authorization: Bearer <internal_jwt>
```

Response:
```json
{
  "success": true,
  "data": {
    // DigiLocker uploaded documents
  }
}
```

#### 5. Download Document

```
GET /digilocker/documents/download/:uri
Authorization: Bearer <internal_jwt>
```

Response:
```json
{
  "success": true,
  "data": {
    // Document data
  }
}
```

## Authentication Flow

### Internal JWT Authentication

All protected endpoints require an internal JWT token:

```javascript
// Generate JWT (in your main application)
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 'user123' },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Use token in requests
Authorization: Bearer <token>
```

### DigiLocker OAuth Flow

```
1. Client → GET /digilocker/auth-url (with JWT)
   ↓
2. Service → Returns DigiLocker OAuth URL
   ↓
3. Client → Redirects user to DigiLocker
   ↓
4. User → Completes DigiLocker authentication
   ↓
5. DigiLocker → Redirects to /digilocker/callback?code=xxx
   ↓
6. Service → Exchanges code for tokens
   ↓
7. Service → Encrypts and stores tokens in MongoDB
   ↓
8. Service → Returns success response
```

## Security Features

1. **Token Encryption**: All DigiLocker tokens encrypted with AES-256-CBC
2. **JWT Validation**: Internal authentication on all protected routes
3. **State Parameter**: CSRF protection in OAuth flow
4. **HTTPS Ready**: Helmet middleware for security headers
5. **No Sensitive Data Persistence**: Aadhaar numbers not stored
6. **Automatic Token Refresh**: Tokens refreshed before expiry (5-min buffer)

## Database Schema

```javascript
UserDigiLocker {
  userId: String (unique, indexed)
  digilockerClientId: String
  digilockerAccessToken: String (encrypted)
  digilockerRefreshToken: String (encrypted)
  tokenExpiry: Date
  createdAt: Date
  updatedAt: Date
}
```

## Error Handling

Centralized error handling with proper status codes:

```json
{
  "success": false,
  "message": "Error description",
  "stack": "... (only in development)"
}
```

## Logging

Structured JSON logging:

```json
{
  "level": "info",
  "message": "Request logged",
  "timestamp": "2024-01-08T10:00:00.000Z",
  "userId": "user123"
}
```

## Token Refresh Logic

Automatic token refresh with 5-minute expiry buffer:

```javascript
// Check if token expires within 5 minutes
if (now >= tokenExpiry - 5 minutes) {
  // Refresh token automatically
  newAccessToken = await refreshAccessToken(userId);
}
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` and `ENCRYPTION_KEY`
3. Enable MongoDB authentication
4. Use HTTPS for all endpoints
5. Set appropriate `ALLOWED_ORIGINS` for CORS
6. Configure reverse proxy (nginx)
7. Set up monitoring and logging

## Docker Support

```bash
# Build image
docker build -t digilocker-service .

# Run container
docker run -p 3000:3000 --env-file .env digilocker-service
```

## Testing

Use tools like Postman or curl:

```bash
# Generate JWT for testing
node -e "console.log(require('jsonwebtoken').sign({userId:'test123'}, 'your-jwt-secret', {expiresIn:'24h'}))"

# Test health endpoint
curl http://localhost:3000/health

# Test auth URL (with JWT)
curl -H "Authorization: Bearer <token>" http://localhost:3000/digilocker/auth-url
```

## License

ISC
