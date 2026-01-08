# DigiLocker Service Integration Guide

This guide explains how to integrate the DigiLocker Authorization Microservice into your application.

## Overview

The DigiLocker Service is a standalone microservice that handles:
- DigiLocker token management (storage, refresh, encryption)
- DigiLocker API interactions (fetch documents, download files)
- User credential management (create, read, delete)

Your main application communicates with this service using userId parameters (no authentication required).

## Prerequisites

1. DigiLocker Service running (default: `http://localhost:3000`)
2. User authentication system in your main application
3. DigiLocker credentials (clientId, clientSecret, tokens) obtained via your own OAuth flow

## Integration Steps

### Step 1: Store DigiLocker Credentials

After obtaining DigiLocker credentials via your own OAuth flow, store them in the service:

```javascript
const axios = require('axios');

const storeDigiLockerCredentials = async (userId, digilockerData) => {
  try {
    const response = await axios.post(
      'http://localhost:3000/digilocker/user',
      {
        userId: userId,
        clientId: digilockerData.clientId,
        clientSecret: digilockerData.clientSecret,
        accessToken: digilockerData.accessToken,
        refreshToken: digilockerData.refreshToken,
        expiresIn: digilockerData.expiresIn || 3600
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error storing credentials:', error.response?.data);
    throw error;
  }
};
```

### Step 2: Check DigiLocker Link Status

Check if a user has DigiLocker credentials stored:

```javascript
const checkDigiLockerStatus = async (userId) => {
  try {
    const response = await axios.get(
      `http://localhost:3000/digilocker/user?userId=${userId}`
    );

    const { isTokenExpired, tokenExpiry } = response.data.data;

    if (isTokenExpired) {
      console.log('Token expired, user needs to re-authorize');
      return { linked: true, expired: true };
    }

    return { linked: true, expired: false };
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('DigiLocker not linked');
      return { linked: false };
    }
    throw error;
  }
};
```

### Step 3: Fetch DigiLocker Documents

Fetch issued and uploaded documents:

```javascript
const getIssuedDocuments = async (userId) => {
  try {
    const response = await axios.get(
      `http://localhost:3000/digilocker/documents/issued?userId=${userId}`
    );

    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('DigiLocker not linked');
    }
    throw error;
  }
};

const getUploadedDocuments = async (userId) => {
  const response = await axios.get(
    `http://localhost:3000/digilocker/documents/uploaded?userId=${userId}`
  );

  return response.data.data;
};
```

### Step 4: Download Documents

Download a specific document:

```javascript
const downloadDocument = async (userId, documentUri) => {
  try {
    const response = await axios.get(
      `http://localhost:3000/digilocker/documents/download/${encodeURIComponent(documentUri)}?userId=${userId}`
    );

    return response.data.data;
  } catch (error) {
    console.error('Error downloading document:', error.response?.data);
    throw error;
  }
};
```

### Step 5: Delete DigiLocker Credentials

Unlink DigiLocker from user account:

```javascript
const unlinkDigiLocker = async (userId) => {
  try {
    const response = await axios.delete(
      `http://localhost:3000/digilocker/user?userId=${userId}`
    );

    return response.data;
  } catch (error) {
    console.error('Error unlinking DigiLocker:', error.response?.data);
    throw error;
  }
};
```

## Complete Example: Express.js Backend Integration

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const DIGILOCKER_SERVICE_URL = 'http://localhost:3000';

// Middleware to authenticate users in YOUR application
const authenticateUser = (req, res, next) => {
  // Your authentication logic
  const userId = req.session.userId; // or JWT, etc.
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.userId = userId;
  next();
};

// Route: Store DigiLocker credentials
app.post('/api/digilocker/credentials', authenticateUser, async (req, res) => {
  try {
    const { clientId, clientSecret, accessToken, refreshToken, expiresIn } = req.body;

    const response = await axios.post(
      `${DIGILOCKER_SERVICE_URL}/digilocker/user`,
      {
        userId: req.userId,
        clientId,
        clientSecret,
        accessToken,
        refreshToken,
        expiresIn
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to store credentials' });
  }
});

// Route: Get user's DigiLocker documents
app.get('/api/digilocker/documents', authenticateUser, async (req, res) => {
  try {
    const [issued, uploaded] = await Promise.all([
      axios.get(
        `${DIGILOCKER_SERVICE_URL}/digilocker/documents/issued?userId=${req.userId}`
      ),
      axios.get(
        `${DIGILOCKER_SERVICE_URL}/digilocker/documents/uploaded?userId=${req.userId}`
      )
    ]);

    res.json({
      issued: issued.data.data,
      uploaded: uploaded.data.data
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: 'DigiLocker not connected. Please store credentials first.'
      });
    }
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Route: Unlink DigiLocker
app.delete('/api/digilocker/credentials', authenticateUser, async (req, res) => {
  try {
    const response = await axios.delete(
      `${DIGILOCKER_SERVICE_URL}/digilocker/user?userId=${req.userId}`
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to unlink DigiLocker' });
  }
});

app.listen(4000, () => {
  console.log('Main app running on port 4000');
});
```

## Complete Example: React Frontend

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DigiLockerConnect = ({ userId }) => {
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // Store DigiLocker credentials (after obtaining via your OAuth flow)
  const storeCredentials = async (digilockerData) => {
    try {
      setLoading(true);

      await axios.post('http://localhost:4000/api/digilocker/credentials', {
        clientId: digilockerData.clientId,
        clientSecret: digilockerData.clientSecret,
        accessToken: digilockerData.accessToken,
        refreshToken: digilockerData.refreshToken,
        expiresIn: digilockerData.expiresIn
      });

      alert('DigiLocker linked successfully!');
      fetchDocuments();
    } catch (error) {
      console.error('Failed to store credentials:', error);
      alert('Failed to link DigiLocker');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      // Your backend proxy that adds userId
      const response = await axios.get(
        'http://localhost:4000/api/digilocker/documents'
      );

      setDocuments(response.data.issued);
      setConnected(true);
    } catch (error) {
      if (error.response?.status === 404) {
        setConnected(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const unlinkDigiLocker = async () => {
    try {
      setLoading(true);

      await axios.delete('http://localhost:4000/api/digilocker/credentials');

      alert('DigiLocker unlinked successfully');
      setConnected(false);
      setDocuments(null);
    } catch (error) {
      console.error('Failed to unlink DigiLocker:', error);
      alert('Failed to unlink DigiLocker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div>
      <h2>DigiLocker Integration</h2>

      {!connected ? (
        <div>
          <p>DigiLocker not linked</p>
          <button onClick={() => {/* Trigger your OAuth flow */}}>
            Connect DigiLocker
          </button>
        </div>
      ) : (
        <div>
          <h3>Your Documents</h3>
          <button onClick={fetchDocuments} disabled={loading}>Refresh</button>
          <button onClick={unlinkDigiLocker} disabled={loading}>Unlink</button>
          {documents && <pre>{JSON.stringify(documents, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
};

export default DigiLockerConnect;
```

## Error Handling

Handle these common error cases:

```javascript
try {
  // API call
} catch (error) {
  const status = error.response?.status;
  const message = error.response?.data?.message;

  switch (status) {
    case 400:
      // Missing required parameters
      console.error('Bad request:', message);
      break;

    case 404:
      // DigiLocker not connected for this user
      console.error('DigiLocker not linked:', message);
      break;

    case 500:
      // DigiLocker API error or server error
      console.error('Server error:', message);
      break;

    default:
      console.error('Unknown error:', message);
  }
}
```

## Security Best Practices

1. **Protect userId**: Ensure your application authenticates users and provides correct userId
2. **Use HTTPS in production**: Always use secure connections
3. **Encrypt sensitive data**: DigiLocker Service automatically encrypts tokens and clientSecret
4. **Token expiry**: Service automatically refreshes tokens before expiry
5. **CORS**: Configure `ALLOWED_ORIGINS` in DigiLocker Service
6. **Rate limiting**: Add rate limiting to your API gateway
7. **Access control**: Implement authorization in your backend to ensure users can only access their own data

## Testing

Test the endpoints using curl:

```bash
# Store credentials
curl -X POST http://localhost:3000/digilocker/user \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123","clientId":"client_id","clientSecret":"secret","accessToken":"token","refreshToken":"refresh","expiresIn":3600}'

# Get user status
curl "http://localhost:3000/digilocker/user?userId=test123"

# Get documents
curl "http://localhost:3000/digilocker/documents/issued?userId=test123"

# Delete credentials
curl -X DELETE "http://localhost:3000/digilocker/user?userId=test123"
```

## Architecture Diagram

```
┌─────────────────┐
│  Your Frontend  │
│   (React/Vue)   │
└────────┬────────┘
         │ HTTP Requests (Authenticated)
         ▼
┌─────────────────┐                     ┌──────────────────────┐
│  Your Backend   │────────────────────►│  DigiLocker Service  │
│  (Express/NestJS)│  userId parameter  │   (This Service)     │
│                 │◄────────────────────│                      │
└─────────────────┘    Encrypted Data   └──────────┬───────────┘
         │                                          │
         │                                          │ DigiLocker API
         ▼                                          ▼
┌─────────────────┐                     ┌──────────────────────┐
│   Your MongoDB  │                     │  API Setu/DigiLocker │
│  (User Data)    │                     │      (Documents)     │
└─────────────────┘                     └──────────────────────┘

                              ┌──────────────────────┐
                              │  DigiLocker Service  │
                              │      MongoDB         │
                              │ (Encrypted Tokens)   │
                              └──────────────────────┘

Flow:
1. Your frontend obtains DigiLocker credentials via your own OAuth flow
2. Your backend sends credentials to DigiLocker Service with userId
3. DigiLocker Service encrypts and stores tokens in MongoDB
4. Your backend requests documents using userId parameter
5. DigiLocker Service auto-refreshes tokens and fetches from DigiLocker API
```

## Support

For issues or questions:
1. Check logs in DigiLocker Service
2. Verify userId parameter is being sent correctly
3. Ensure MongoDB is running
4. Check DigiLocker API credentials are valid
5. Verify tokens are not expired

## Next Steps

1. Deploy DigiLocker Service to production
2. Configure production environment variables
3. Set up monitoring and logging
4. Implement rate limiting
5. Add webhook handlers (if needed)
