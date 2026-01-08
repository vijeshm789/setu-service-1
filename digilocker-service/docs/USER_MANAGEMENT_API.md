# UserDigiLocker Management API - Usage Guide

## Overview

Three new API endpoints have been added for direct management of UserDigiLocker records:

1. **POST /digilocker/user** - Create or update UserDigiLocker record
2. **GET /digilocker/user** - Retrieve UserDigiLocker record
3. **DELETE /digilocker/user** - Delete UserDigiLocker record

All endpoints require JWT authentication.

---

## 1. Create UserDigiLocker

### Endpoint
```
POST /digilocker/user
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "accessToken": "your_digilocker_access_token",
  "refreshToken": "your_digilocker_refresh_token",
  "expiresIn": 3600
}
```

**Parameters:**
- `accessToken` (required): DigiLocker access token
- `refreshToken` (required): DigiLocker refresh token
- `expiresIn` (optional): Token expiry in seconds (default: 86400 - 24 hours)

### Response (201 Created)
```json
{
  "success": true,
  "message": "UserDigiLocker record created/updated successfully",
  "data": {
    "userId": "user123",
    "digilockerClientId": "your_client_id",
    "tokenExpiry": "2024-01-09T10:00:00.000Z",
    "createdAt": "2024-01-08T10:00:00.000Z",
    "updatedAt": "2024-01-08T10:00:00.000Z"
  }
}
```

### Use Cases

1. **Manual Token Storage**
   ```javascript
   // If you already have DigiLocker tokens from another source
   const response = await axios.post(
     'http://localhost:3000/digilocker/user',
     {
       accessToken: 'existing_access_token',
       refreshToken: 'existing_refresh_token',
       expiresIn: 3600
     },
     {
       headers: { Authorization: `Bearer ${jwtToken}` }
     }
   );
   ```

2. **Admin Operations**
   ```javascript
   // Admin setting up DigiLocker for a user
   const adminToken = generateJWT(targetUserId);
   await createUserDigiLocker(adminToken, tokens);
   ```

3. **Testing**
   ```javascript
   // Create test DigiLocker credentials
   await axios.post('http://localhost:3000/digilocker/user', {
     accessToken: 'test_access_token',
     refreshToken: 'test_refresh_token',
     expiresIn: 3600
   }, {
     headers: { Authorization: `Bearer ${testJWT}` }
   });
   ```

### cURL Example
```bash
# Generate JWT first
TOKEN=$(node scripts/generateToken.js user123)

# Create UserDigiLocker
curl -X POST http://localhost:3000/digilocker/user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "sample_access_token",
    "refreshToken": "sample_refresh_token",
    "expiresIn": 3600
  }'
```

---

## 2. Get UserDigiLocker

### Endpoint
```
GET /digilocker/user
Authorization: Bearer <jwt_token>
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "digilockerClientId": "your_client_id",
    "tokenExpiry": "2024-01-09T10:00:00.000Z",
    "isTokenExpired": false,
    "createdAt": "2024-01-08T10:00:00.000Z",
    "updatedAt": "2024-01-08T10:00:00.000Z"
  }
}
```

### Response (404 Not Found)
```json
{
  "success": false,
  "message": "DigiLocker credentials not found for user"
}
```

### Use Cases

1. **Check DigiLocker Link Status**
   ```javascript
   const checkDigiLockerStatus = async (userId) => {
     try {
       const token = generateJWT(userId);
       const response = await axios.get(
         'http://localhost:3000/digilocker/user',
         { headers: { Authorization: `Bearer ${token}` }}
       );

       const { isTokenExpired, tokenExpiry } = response.data.data;

       if (isTokenExpired) {
         console.log('DigiLocker token expired, need to refresh');
       } else {
         console.log(`Token valid until ${tokenExpiry}`);
       }

       return response.data.data;
     } catch (error) {
       if (error.response?.status === 404) {
         console.log('DigiLocker not linked');
       }
       throw error;
     }
   };
   ```

2. **Pre-flight Check Before Document Fetch**
   ```javascript
   // Check if user has DigiLocker linked before attempting to fetch documents
   const hasDigiLocker = async (userId) => {
     try {
       await axios.get('http://localhost:3000/digilocker/user', {
         headers: { Authorization: `Bearer ${generateJWT(userId)}` }
       });
       return true;
     } catch (error) {
       return false;
     }
   };

   // Usage
   if (await hasDigiLocker(userId)) {
     fetchDocuments();
   } else {
     redirectToAuthorization();
   }
   ```

3. **Dashboard Display**
   ```javascript
   // Display DigiLocker connection status in user dashboard
   const response = await axios.get('http://localhost:3000/digilocker/user', {
     headers: { Authorization: `Bearer ${userToken}` }
   });

   const { isTokenExpired, tokenExpiry, updatedAt } = response.data.data;

   console.log(`DigiLocker Status: ${isTokenExpired ? 'Expired' : 'Active'}`);
   console.log(`Last Updated: ${new Date(updatedAt).toLocaleDateString()}`);
   ```

### cURL Example
```bash
# Generate JWT
TOKEN=$(node scripts/generateToken.js user123)

# Get UserDigiLocker
curl -X GET http://localhost:3000/digilocker/user \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. Delete UserDigiLocker

### Endpoint
```
DELETE /digilocker/user
Authorization: Bearer <jwt_token>
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "DigiLocker credentials deleted successfully"
}
```

### Response (404 Not Found)
```json
{
  "success": false,
  "message": "DigiLocker credentials not found for user"
}
```

### Use Cases

1. **User Account Deletion**
   ```javascript
   const deleteUserAccount = async (userId) => {
     const token = generateJWT(userId);

     // Delete DigiLocker credentials
     await axios.delete('http://localhost:3000/digilocker/user', {
       headers: { Authorization: `Bearer ${token}` }
     });

     // Delete other user data...
     console.log('DigiLocker credentials removed');
   };
   ```

2. **Unlink DigiLocker**
   ```javascript
   // User wants to unlink DigiLocker from their account
   const unlinkDigiLocker = async (userToken) => {
     try {
       await axios.delete('http://localhost:3000/digilocker/user', {
         headers: { Authorization: `Bearer ${userToken}` }
       });

       alert('DigiLocker unlinked successfully. You can re-link anytime.');
     } catch (error) {
       console.error('Failed to unlink DigiLocker:', error);
     }
   };
   ```

3. **Force Re-authorization**
   ```javascript
   // Admin forces user to re-authorize DigiLocker
   const forceReauthorization = async (userId) => {
     const token = generateJWT(userId);

     // Delete existing credentials
     await axios.delete('http://localhost:3000/digilocker/user', {
       headers: { Authorization: `Bearer ${token}` }
     });

     console.log('User will need to re-authorize DigiLocker');
   };
   ```

4. **Security: Revoke Access**
   ```javascript
   // Revoke DigiLocker access in case of security breach
   const revokeAccess = async (userId) => {
     try {
       await axios.delete('http://localhost:3000/digilocker/user', {
         headers: { Authorization: `Bearer ${generateJWT(userId)}` }
       });

       // Log security event
       console.log(`DigiLocker access revoked for user ${userId}`);
     } catch (error) {
       console.error('Failed to revoke access:', error);
     }
   };
   ```

### cURL Example
```bash
# Generate JWT
TOKEN=$(node scripts/generateToken.js user123)

# Delete UserDigiLocker
curl -X DELETE http://localhost:3000/digilocker/user \
  -H "Authorization: Bearer $TOKEN"
```

---

## Complete Integration Example

### React Component
```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DigiLockerManager = () => {
  const [digilocker, setDigilocker] = useState(null);
  const [loading, setLoading] = useState(false);

  const apiClient = axios.create({
    baseURL: 'http://localhost:3000',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken')}`
    }
  });

  // Check DigiLocker status
  const checkStatus = async () => {
    try {
      const response = await apiClient.get('/digilocker/user');
      setDigilocker(response.data.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setDigilocker(null);
      }
    }
  };

  // Create/Update DigiLocker credentials
  const createDigiLocker = async (accessToken, refreshToken, expiresIn) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/digilocker/user', {
        accessToken,
        refreshToken,
        expiresIn
      });
      setDigilocker(response.data.data);
      alert('DigiLocker linked successfully!');
    } catch (error) {
      alert('Failed to link DigiLocker');
    } finally {
      setLoading(false);
    }
  };

  // Delete DigiLocker credentials
  const deleteDigiLocker = async () => {
    if (!confirm('Are you sure you want to unlink DigiLocker?')) return;

    setLoading(true);
    try {
      await apiClient.delete('/digilocker/user');
      setDigilocker(null);
      alert('DigiLocker unlinked successfully');
    } catch (error) {
      alert('Failed to unlink DigiLocker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div>
      <h2>DigiLocker Management</h2>

      {digilocker ? (
        <div>
          <p>Status: <strong>{digilocker.isTokenExpired ? 'Expired' : 'Active'}</strong></p>
          <p>Token Expiry: {new Date(digilocker.tokenExpiry).toLocaleString()}</p>
          <p>Last Updated: {new Date(digilocker.updatedAt).toLocaleString()}</p>

          <button onClick={deleteDigiLocker} disabled={loading}>
            Unlink DigiLocker
          </button>
        </div>
      ) : (
        <div>
          <p>DigiLocker not linked</p>
          <button onClick={() => {/* Open OAuth flow */}}>
            Link DigiLocker
          </button>
        </div>
      )}
    </div>
  );
};

export default DigiLockerManager;
```

### Node.js Backend Integration
```javascript
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
const DIGILOCKER_SERVICE = 'http://localhost:3000';

// Generate internal JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// Create DigiLocker credentials
app.post('/api/users/:userId/digilocker', async (req, res) => {
  const { userId } = req.params;
  const { accessToken, refreshToken, expiresIn } = req.body;

  const token = generateToken(userId);

  try {
    const response = await axios.post(
      `${DIGILOCKER_SERVICE}/digilocker/user`,
      { accessToken, refreshToken, expiresIn },
      { headers: { Authorization: `Bearer ${token}` }}
    );

    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to create DigiLocker'
    });
  }
});

// Get DigiLocker status
app.get('/api/users/:userId/digilocker', async (req, res) => {
  const { userId } = req.params;
  const token = generateToken(userId);

  try {
    const response = await axios.get(
      `${DIGILOCKER_SERVICE}/digilocker/user`,
      { headers: { Authorization: `Bearer ${token}` }}
    );

    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({ linked: false });
    }

    res.status(500).json({ error: 'Failed to check DigiLocker status' });
  }
});

// Delete DigiLocker credentials
app.delete('/api/users/:userId/digilocker', async (req, res) => {
  const { userId } = req.params;
  const token = generateToken(userId);

  try {
    const response = await axios.delete(
      `${DIGILOCKER_SERVICE}/digilocker/user`,
      { headers: { Authorization: `Bearer ${token}` }}
    );

    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to delete DigiLocker'
    });
  }
});

app.listen(4000, () => console.log('App running on port 4000'));
```

---

## Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Invalid token"
}
```
**Solution:** Ensure JWT token is valid and not expired.

**400 Bad Request**
```json
{
  "success": false,
  "message": "accessToken and refreshToken are required"
}
```
**Solution:** Provide both accessToken and refreshToken in POST request.

**404 Not Found**
```json
{
  "success": false,
  "message": "DigiLocker credentials not found for user"
}
```
**Solution:** User hasn't linked DigiLocker yet. Guide them through OAuth flow.

---

## Security Best Practices

1. **Never expose tokens in logs**
   ```javascript
   // ❌ Bad
   console.log('Access token:', accessToken);

   // ✅ Good
   console.log('Access token stored successfully');
   ```

2. **Validate tokens before storage**
   ```javascript
   // Validate token format
   if (!accessToken || accessToken.length < 10) {
     throw new Error('Invalid access token');
   }
   ```

3. **Use HTTPS in production**
   ```javascript
   const DIGILOCKER_SERVICE = process.env.NODE_ENV === 'production'
     ? 'https://api.yourdomain.com'
     : 'http://localhost:3000';
   ```

4. **Implement rate limiting**
   ```javascript
   // Limit DigiLocker operations per user
   const rateLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 10 // 10 requests per window
   });

   app.use('/api/*/digilocker', rateLimiter);
   ```

---

## Testing

### Test Script
```bash
#!/bin/bash

# Generate JWT
TOKEN=$(node scripts/generateToken.js test-user-123)

echo "1. Creating UserDigiLocker..."
curl -X POST http://localhost:3000/digilocker/user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"test_access","refreshToken":"test_refresh","expiresIn":3600}'

echo -e "\n\n2. Getting UserDigiLocker..."
curl -X GET http://localhost:3000/digilocker/user \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n3. Deleting UserDigiLocker..."
curl -X DELETE http://localhost:3000/digilocker/user \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n4. Verifying deletion (should get 404)..."
curl -X GET http://localhost:3000/digilocker/user \
  -H "Authorization: Bearer $TOKEN"
```

---

## Summary

| Endpoint | Method | Purpose | Returns |
|----------|--------|---------|---------|
| `/digilocker/user` | POST | Create/update credentials | User record |
| `/digilocker/user` | GET | Check link status | User record with expiry |
| `/digilocker/user` | DELETE | Unlink DigiLocker | Success message |

All endpoints:
- ✅ Require JWT authentication
- ✅ Encrypt tokens with AES-256-CBC
- ✅ Support one record per user (upsert)
- ✅ Return non-sensitive data only
- ✅ Log all operations

For complete API documentation, see README.md and Postman collection.
