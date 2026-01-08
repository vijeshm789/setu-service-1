# DigiLocker Service Integration Guide

This guide explains how to integrate the DigiLocker Authorization Microservice into your application.

## Overview

The DigiLocker Service is a standalone microservice that handles:
- DigiLocker OAuth 2.0 authorization
- Token management (storage, refresh)
- DigiLocker API interactions

Your main application communicates with this service using JWT tokens.

## Prerequisites

1. DigiLocker Service running (default: `http://localhost:3000`)
2. JWT secret shared between your app and DigiLocker Service
3. User authentication system in your main application

## Integration Steps

### Step 1: Generate JWT Token

In your main application, generate a JWT token for authenticated users:

```javascript
const jwt = require('jsonwebtoken');

// After user logs in to your application
const generateInternalToken = (userId) => {
  return jwt.sign(
    { userId: userId.toString() }, // Use your user's ID
    process.env.JWT_SECRET, // Same secret as DigiLocker Service
    { expiresIn: '24h' }
  );
};

// Example
const userToken = generateInternalToken('user123');
```

### Step 2: Initiate DigiLocker Authorization

```javascript
const axios = require('axios');

const initiateDigiLockerAuth = async (userToken) => {
  try {
    const response = await axios.get(
      'http://localhost:3000/digilocker/auth-url',
      {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      }
    );

    const { authUrl, state } = response.data.data;

    // Redirect user to DigiLocker authorization page
    return authUrl;
  } catch (error) {
    console.error('Error getting auth URL:', error.response?.data);
    throw error;
  }
};
```

### Step 3: Handle User Flow in Frontend

```javascript
// React/Vue/Angular example
const handleDigiLockerConnect = async () => {
  try {
    // Get JWT token from your auth system
    const userToken = localStorage.getItem('authToken');

    // Get DigiLocker auth URL
    const response = await fetch('http://localhost:3000/digilocker/auth-url', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    const data = await response.json();

    // Redirect user to DigiLocker
    window.location.href = data.data.authUrl;
  } catch (error) {
    console.error('Failed to connect DigiLocker:', error);
  }
};
```

### Step 4: Handle OAuth Callback

The DigiLocker Service automatically handles the callback. You need to:

1. Configure your redirect URI in DigiLocker Service `.env`:
   ```
   DIGILOCKER_REDIRECT_URI=http://localhost:3000/digilocker/callback
   ```

2. Optionally, create a frontend callback page to show success:
   ```
   DIGILOCKER_REDIRECT_URI=http://yourapp.com/digilocker/success
   ```

   Then redirect to DigiLocker Service:
   ```javascript
   // On your success page
   const urlParams = new URLSearchParams(window.location.search);
   const code = urlParams.get('code');
   const state = urlParams.get('state');

   // Forward to DigiLocker Service
   fetch(`http://localhost:3000/digilocker/callback?code=${code}&state=${state}`)
     .then(() => {
       alert('DigiLocker connected successfully!');
     });
   ```

### Step 5: Fetch DigiLocker Documents

After authorization, fetch documents using the same JWT token:

```javascript
const getIssuedDocuments = async (userToken) => {
  try {
    const response = await axios.get(
      'http://localhost:3000/digilocker/documents/issued',
      {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      }
    );

    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      // User hasn't connected DigiLocker yet
      console.log('DigiLocker not linked');
    }
    throw error;
  }
};

const getUploadedDocuments = async (userToken) => {
  const response = await axios.get(
    'http://localhost:3000/digilocker/documents/uploaded',
    {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    }
  );

  return response.data.data;
};
```

### Step 6: Download Documents

```javascript
const downloadDocument = async (userToken, documentUri) => {
  try {
    const response = await axios.get(
      `http://localhost:3000/digilocker/documents/download/${encodeURIComponent(documentUri)}`,
      {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      }
    );

    return response.data.data;
  } catch (error) {
    console.error('Error downloading document:', error.response?.data);
    throw error;
  }
};
```

## Complete Example: Express.js Backend Integration

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
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

// Generate internal JWT for DigiLocker Service
const generateInternalToken = (userId) => {
  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Route: Initiate DigiLocker connection
app.get('/api/connect-digilocker', authenticateUser, async (req, res) => {
  try {
    const internalToken = generateInternalToken(req.userId);

    const response = await axios.get(
      `${DIGILOCKER_SERVICE_URL}/digilocker/auth-url`,
      {
        headers: { 'Authorization': `Bearer ${internalToken}` }
      }
    );

    res.json({
      authUrl: response.data.data.authUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Route: Get user's DigiLocker documents
app.get('/api/digilocker/documents', authenticateUser, async (req, res) => {
  try {
    const internalToken = generateInternalToken(req.userId);

    const [issued, uploaded] = await Promise.all([
      axios.get(
        `${DIGILOCKER_SERVICE_URL}/digilocker/documents/issued`,
        {
          headers: { 'Authorization': `Bearer ${internalToken}` }
        }
      ),
      axios.get(
        `${DIGILOCKER_SERVICE_URL}/digilocker/documents/uploaded`,
        {
          headers: { 'Authorization': `Bearer ${internalToken}` }
        }
      )
    ]);

    res.json({
      issued: issued.data.data,
      uploaded: uploaded.data.data
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: 'DigiLocker not connected. Please authorize first.'
      });
    }
    res.status(500).json({ error: 'Failed to fetch documents' });
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

const DigiLockerConnect = () => {
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const userToken = localStorage.getItem('authToken'); // Your app's auth token

  const connectDigiLocker = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        'http://localhost:3000/digilocker/auth-url',
        {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        }
      );

      // Redirect to DigiLocker
      window.location.href = response.data.data.authUrl;
    } catch (error) {
      console.error('Failed to connect DigiLocker:', error);
      alert('Failed to connect DigiLocker');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        'http://localhost:3000/digilocker/documents/issued',
        {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        }
      );

      setDocuments(response.data.data);
      setConnected(true);
    } catch (error) {
      if (error.response?.status === 404) {
        setConnected(false);
      }
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
        <button onClick={connectDigiLocker} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect DigiLocker'}
        </button>
      ) : (
        <div>
          <h3>Your Documents</h3>
          <button onClick={fetchDocuments}>Refresh</button>
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
    case 401:
      // Invalid or expired JWT token
      console.error('Authentication failed:', message);
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

1. **Never expose JWT secret**: Keep `JWT_SECRET` in environment variables
2. **Use HTTPS in production**: Always use secure connections
3. **Validate tokens**: DigiLocker Service validates all JWT tokens
4. **Token expiry**: Tokens expire after 24h by default
5. **CORS**: Configure `ALLOWED_ORIGINS` in DigiLocker Service
6. **Rate limiting**: Add rate limiting to your API gateway

## Testing

Use the provided scripts:

```bash
# Generate test JWT token
node digilocker-service/scripts/generateToken.js user123

# Test endpoints
./digilocker-service/scripts/testEndpoints.sh
```

## Architecture Diagram

```
┌─────────────────┐
│  Your Frontend  │
│   (React/Vue)   │
└────────┬────────┘
         │ HTTP Requests
         ▼
┌─────────────────┐      JWT Auth       ┌──────────────────────┐
│  Your Backend   │◄────────────────────►│  DigiLocker Service  │
│  (Express/NestJS)│                     │   (This Service)     │
└─────────────────┘                     └──────────┬───────────┘
         │                                          │
         │                                          │ OAuth 2.0
         ▼                                          ▼
┌─────────────────┐                     ┌──────────────────────┐
│   Your MongoDB  │                     │  API Setu/DigiLocker │
│  (User Data)    │                     │       (OAuth)        │
└─────────────────┘                     └──────────────────────┘
                                                    │
                                                    ▼
                                         ┌──────────────────────┐
                                         │  DigiLocker Service  │
                                         │      MongoDB         │
                                         │   (Tokens Storage)   │
                                         └──────────────────────┘
```

## Support

For issues or questions:
1. Check logs in DigiLocker Service
2. Verify JWT token is valid
3. Ensure MongoDB is running
4. Check DigiLocker API credentials

## Next Steps

1. Deploy DigiLocker Service to production
2. Configure production environment variables
3. Set up monitoring and logging
4. Implement rate limiting
5. Add webhook handlers (if needed)
