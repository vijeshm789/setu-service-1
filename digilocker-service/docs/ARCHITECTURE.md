# DigiLocker Service - Architecture Documentation

## System Architecture

### High-Level Overview

The DigiLocker Authorization Microservice is designed as a standalone service that handles all DigiLocker-related operations for your application ecosystem.

```
┌──────────────────────────────────────────────────────────────────┐
│                        Your Application                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐                │
│  │  Frontend  │  │   Backend  │  │   MongoDB   │                │
│  │  (React)   │  │  (Express) │  │ (User Data) │                │
│  └──────┬─────┘  └──────┬─────┘  └─────────────┘                │
│         │               │                                         │
│         └───────┬───────┘                                         │
│                 │ JWT Token (userId)                              │
└─────────────────┼─────────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│              DigiLocker Authorization Service                    │
│                                                                  │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  JWT Auth      │  │  DigiLocker     │  │  Token Mgmt     │  │
│  │  Middleware    │  │  OAuth Service  │  │  (Encryption)   │  │
│  └────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    MongoDB                                 │ │
│  │  - Encrypted access_token                                  │ │
│  │  - Encrypted refresh_token                                 │ │
│  │  - Token expiry                                            │ │
│  │  - User mapping (userId → DigiLocker credentials)         │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               │ OAuth 2.0 / REST API
                               ▼
                    ┌─────────────────────┐
                    │   API Setu          │
                    │   (DigiLocker)      │
                    └─────────────────────┘
```

## Component Architecture

### 1. API Layer (Express.js)

#### Routes (`/routes`)
- **Health Routes**: System health monitoring
- **DigiLocker Routes**: OAuth and document management
- Mounted in hierarchical structure for maintainability

#### Controllers (`/controllers`)
- **Health Controller**: Health check logic
- **DigiLocker Controller**: Request handling, validation, response formatting

### 2. Business Logic Layer

#### Services (`/services`)
- **DigiLocker Service**: Core OAuth and API integration
  - Authorization URL generation
  - Token exchange
  - Token refresh (automatic)
  - Document fetching
  - Document download

### 3. Security Layer

#### Middlewares (`/middlewares`)
- **Auth Middleware**: JWT token validation
- **Error Middleware**: Global error handling

#### Encryption (`/utils/encryption.js`)
- AES-256-CBC encryption for tokens
- Key and IV management from environment

### 4. Data Layer

#### Models (`/models`)
- **UserDigiLocker**: Mongoose schema
  - One record per user (userId unique constraint)
  - Encrypted token storage
  - Automatic timestamps

#### Database (`/config/database.js`)
- Connection pooling
- Event handling
- Graceful shutdown

## Data Flow

### Authorization Flow

```
1. User Request
   Frontend → Backend (User logged in)

2. JWT Generation
   Backend generates JWT with userId

3. Get Auth URL
   Backend → DigiLocker Service: GET /digilocker/auth-url
   Headers: Authorization: Bearer <JWT>

4. JWT Validation
   DigiLocker Service validates JWT
   Extracts userId from token

5. Generate OAuth URL
   Service creates DigiLocker OAuth URL with:
   - client_id
   - redirect_uri
   - state (includes userId)

6. User Authorization
   Frontend redirects to DigiLocker
   User logs in with Aadhaar

7. OAuth Callback
   DigiLocker redirects to callback URL
   Includes: code, state

8. Token Exchange
   Service exchanges code for:
   - access_token
   - refresh_token
   - expires_in

9. Token Storage
   Service encrypts tokens
   Upserts to MongoDB (one record per userId)

10. Success Response
    Returns success to user
```

### Document Fetch Flow

```
1. User Request
   Frontend → Backend: Get documents

2. JWT Generation
   Backend generates JWT with userId

3. API Call
   Backend → DigiLocker Service: GET /digilocker/documents/issued
   Headers: Authorization: Bearer <JWT>

4. JWT Validation
   Service validates JWT
   Extracts userId

5. Token Retrieval
   Service fetches user's DigiLocker credentials from MongoDB
   Decrypts access_token

6. Token Expiry Check
   If token expires within 5 minutes:
     - Refresh token automatically
     - Update MongoDB

7. DigiLocker API Call
   Service calls DigiLocker API
   Headers: Authorization: Bearer <access_token>

8. Response
   DigiLocker API returns documents
   Service forwards to backend
   Backend forwards to frontend
```

## Security Architecture

### 1. Multi-Layer Authentication

```
Layer 1: Your Application
├── User Login (Your auth system)
├── Session/JWT management
└── User authorization

Layer 2: Internal Service Communication
├── JWT Token (shared secret)
├── userId in token payload
└── Token expiry (24h default)

Layer 3: DigiLocker OAuth
├── OAuth 2.0 authorization
├── Access token (from DigiLocker)
├── Refresh token (from DigiLocker)
└── State parameter (CSRF protection)
```

### 2. Token Encryption

```
Plain Text Token (from DigiLocker)
         ↓
AES-256-CBC Encryption
  - Key: 32 characters
  - IV: 16 characters
  - Algorithm: aes-256-cbc
         ↓
Encrypted Token (hex format)
         ↓
Stored in MongoDB
```

### 3. Token Lifecycle

```
Token Acquisition:
DigiLocker → access_token + refresh_token + expires_in
         ↓
Encrypt both tokens
         ↓
Store in MongoDB with expiry timestamp
         ↓
One record per userId (upsert logic)

Token Usage:
Check expiry before each API call
         ↓
If expires_in < 5 minutes:
    Use refresh_token to get new access_token
    Update MongoDB with new tokens
         ↓
Decrypt access_token
         ↓
Call DigiLocker API
```

## Database Schema

### UserDigiLocker Collection

```javascript
{
  _id: ObjectId,
  userId: "user123",                    // Unique, indexed
  digilockerClientId: "client_id",      // OAuth client
  digilockerAccessToken: "encrypted...", // AES-256 encrypted
  digilockerRefreshToken: "encrypted...",// AES-256 encrypted
  tokenExpiry: ISODate("2024-01-09T10:00:00Z"),
  createdAt: ISODate("2024-01-08T10:00:00Z"),
  updatedAt: ISODate("2024-01-08T10:00:00Z")
}
```

### Indexes

```javascript
{ userId: 1 }         // Primary lookup (unique)
{ tokenExpiry: 1 }    // Token expiry monitoring
{ createdAt: 1 }      // Audit trail
```

## Configuration Management

### Environment Variables

```
Application Config:
├── PORT (Server port)
├── NODE_ENV (Environment)
└── MONGODB_URI (Database connection)

Security Config:
├── JWT_SECRET (Internal auth)
├── JWT_EXPIRY (Token lifetime)
├── ENCRYPTION_KEY (AES key)
└── ENCRYPTION_IV (AES IV)

DigiLocker Config:
├── DIGILOCKER_CLIENT_ID
├── DIGILOCKER_CLIENT_SECRET
├── DIGILOCKER_REDIRECT_URI
├── DIGILOCKER_AUTH_URL
├── DIGILOCKER_TOKEN_URL
└── DIGILOCKER_API_BASE_URL

Network Config:
└── ALLOWED_ORIGINS (CORS)
```

## Error Handling

### Error Flow

```
Request → Controller → Service → DigiLocker API
                                       ↓
                                   Error?
                                       ↓
                          ┌────────────┴─────────────┐
                          ↓                          ↓
                    Operational Error          System Error
                    (AppError)                 (Generic Error)
                          ↓                          ↓
                    Error Middleware            Error Middleware
                          ↓                          ↓
                    Formatted Response         500 Response
```

### Error Types

1. **Authentication Errors (401)**
   - Invalid JWT token
   - Expired JWT token
   - Missing Authorization header

2. **Authorization Errors (404)**
   - DigiLocker not linked
   - User credentials not found

3. **DigiLocker API Errors (4xx/5xx)**
   - OAuth errors
   - API rate limits
   - Invalid requests

4. **System Errors (500)**
   - Database errors
   - Encryption errors
   - Unexpected errors

## Scalability Considerations

### Horizontal Scaling

```
Load Balancer
      │
      ├─── Service Instance 1 ─┐
      ├─── Service Instance 2 ─┼─── MongoDB Cluster
      └─── Service Instance N ─┘
```

- Stateless design (session-free)
- Shared MongoDB for state
- No in-memory caching
- Load balancer ready

### Performance Optimizations

1. **Database**
   - Indexed queries (userId)
   - Connection pooling
   - Compound indexes if needed

2. **Token Management**
   - 5-minute expiry buffer (reduces refresh calls)
   - Automatic refresh (transparent to client)
   - Single token per user (no duplicates)

3. **API Calls**
   - Axios connection pooling
   - Timeout configuration
   - Retry logic (can be added)

## Monitoring & Logging

### Log Structure

```json
{
  "level": "info|error|warn|debug",
  "message": "Descriptive message",
  "timestamp": "ISO 8601",
  "userId": "user123",
  "path": "/digilocker/documents/issued",
  "method": "GET",
  "statusCode": 200
}
```

### Health Monitoring

```
GET /health
{
  "status": "OK",
  "uptime": 123.45,
  "database": "connected",
  "timestamp": "ISO 8601"
}
```

## Deployment Architecture

### Development

```
Docker Compose
├── digilocker-service (Node.js)
└── mongodb (MongoDB container)
```

### Production

```
Kubernetes/ECS
├── DigiLocker Service Pods/Tasks
│   ├── Auto-scaling (CPU/Memory)
│   └── Health checks
├── MongoDB (Managed Service)
│   └── Atlas/DocumentDB
├── Load Balancer
└── Monitoring
    ├── CloudWatch/Datadog
    └── Error tracking (Sentry)
```

## API Gateway Integration

```
Internet
    ↓
API Gateway (Kong/AWS API Gateway)
    ├── Rate Limiting
    ├── Authentication
    ├── CORS
    └── Logging
    ↓
DigiLocker Service
```

## Disaster Recovery

### Backup Strategy

1. **MongoDB Backups**
   - Daily automated backups
   - Point-in-time recovery
   - Cross-region replication

2. **Token Recovery**
   - Tokens encrypted at rest
   - Backup encryption keys securely
   - Users can re-authorize if needed

### High Availability

```
Multi-AZ Deployment
├── Service replicas across zones
├── MongoDB replica set
└── Load balancer health checks
```

## Future Enhancements

1. **Caching Layer**
   - Redis for token caching
   - Reduce MongoDB reads

2. **Webhook Support**
   - DigiLocker webhook handling
   - Real-time document updates

3. **Audit Logging**
   - Track all API calls
   - Compliance requirements

4. **Rate Limiting**
   - Per-user rate limits
   - DigiLocker API quota management

5. **Metrics**
   - Token refresh rate
   - API call success/failure
   - Response times
