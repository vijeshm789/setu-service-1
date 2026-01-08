# Deployment Guide

Complete guide for deploying the DigiLocker Authorization Microservice to production.

## Prerequisites

- Node.js 18+
- MongoDB 7+
- DigiLocker API credentials from API Setu
- Domain name with SSL certificate (for production)

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd digilocker-service
npm install --production
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Required configurations:

```env
# Production Settings
NODE_ENV=production
PORT=3000

# MongoDB (use managed service in production)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/digilocker-service

# JWT (generate strong secret)
JWT_SECRET=<strong-random-string-min-32-chars>
JWT_EXPIRY=24h

# DigiLocker (from API Setu dashboard)
DIGILOCKER_CLIENT_ID=<your-client-id>
DIGILOCKER_CLIENT_SECRET=<your-client-secret>
DIGILOCKER_REDIRECT_URI=https://yourdomain.com/digilocker/callback
DIGILOCKER_AUTH_URL=https://api.setu.co/api/digilocker/authorize
DIGILOCKER_TOKEN_URL=https://api.setu.co/api/digilocker/token
DIGILOCKER_API_BASE_URL=https://api.setu.co/api/digilocker

# Encryption (generate secure keys)
ENCRYPTION_KEY=<32-character-random-string>
ENCRYPTION_IV=<16-character-random-string>

# CORS
ALLOWED_ORIGINS=https://yourapp.com,https://admin.yourapp.com
```

### 3. Generate Secure Keys

```bash
# Generate JWT Secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key (32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Generate Encryption IV (16 characters)
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Build and Run with Docker Compose

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f digilocker-service

# Stop services
docker-compose down
```

#### Production Docker Compose

```yaml
version: '3.8'

services:
  digilocker-service:
    build: .
    container_name: digilocker-service-prod
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - mongodb
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongodb:
    image: mongo:7
    container_name: digilocker-mongodb-prod
    restart: always
    volumes:
      - mongodb-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secure_password

volumes:
  mongodb-data:
```

### Option 2: PM2 Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start server.js --name digilocker-service

# View logs
pm2 logs digilocker-service

# Monitor
pm2 monit

# Auto-restart on reboot
pm2 startup
pm2 save

# Scale (4 instances)
pm2 scale digilocker-service 4
```

#### PM2 Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'digilocker-service',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

```bash
pm2 start ecosystem.config.js
```

### Option 3: Kubernetes Deployment

#### Deployment YAML

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: digilocker-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: digilocker-service
  template:
    metadata:
      labels:
        app: digilocker-service
    spec:
      containers:
      - name: digilocker-service
        image: your-registry/digilocker-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: digilocker-secrets
              key: mongodb-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: digilocker-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: digilocker-service
spec:
  selector:
    app: digilocker-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### Deploy to Kubernetes

```bash
# Create secrets
kubectl create secret generic digilocker-secrets \
  --from-literal=mongodb-uri='mongodb+srv://...' \
  --from-literal=jwt-secret='your-secret' \
  --from-literal=encryption-key='your-key' \
  --from-literal=encryption-iv='your-iv'

# Deploy
kubectl apply -f deployment.yaml

# Check status
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/digilocker-service
```

### Option 4: AWS ECS Deployment

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t digilocker-service .
docker tag digilocker-service:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/digilocker-service:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/digilocker-service:latest

# Create task definition and service via AWS Console or CLI
```

## Database Setup

### MongoDB Atlas (Recommended)

1. Create cluster at mongodb.com/cloud/atlas
2. Configure network access (IP whitelist)
3. Create database user
4. Get connection string
5. Update MONGODB_URI in .env

### Self-Hosted MongoDB

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Secure MongoDB
mongo admin
> db.createUser({
    user: "admin",
    pwd: "secure_password",
    roles: ["root"]
  })
```

## Reverse Proxy Setup (Nginx)

```nginx
# /etc/nginx/sites-available/digilocker-service
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/digilocker-service /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate (Let's Encrypt)
sudo certbot --nginx -d api.yourdomain.com
```

## Monitoring & Logging

### CloudWatch (AWS)

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure logs
# See AWS documentation for detailed setup
```

### Datadog

```bash
# Add environment variables
DD_API_KEY=<your-datadog-api-key>
DD_SITE=datadoghq.com

# Install agent
# See Datadog documentation
```

### Sentry (Error Tracking)

```bash
npm install @sentry/node

# Add to server.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-sentry-dsn' });
```

## Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Strong JWT_SECRET (32+ characters)
- [ ] Secure ENCRYPTION_KEY and IV
- [ ] MongoDB authentication enabled
- [ ] Firewall rules configured
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Regular security updates
- [ ] Environment variables secured
- [ ] Logs properly sanitized
- [ ] Health checks enabled
- [ ] Backups configured

## Performance Tuning

### Node.js Optimization

```bash
# Increase memory limit
node --max-old-space-size=2048 server.js

# PM2 cluster mode
pm2 start server.js -i max
```

### MongoDB Optimization

```javascript
// Add indexes
db.userdigilockers.createIndex({ userId: 1 }, { unique: true })
db.userdigilockers.createIndex({ tokenExpiry: 1 })

// Connection pooling (already configured)
maxPoolSize: 10
```

## Backup Strategy

### MongoDB Backups

```bash
# Manual backup
mongodump --uri="mongodb://..." --out=/backup/$(date +%Y%m%d)

# Automated daily backups (cron)
0 2 * * * mongodump --uri="mongodb://..." --out=/backup/$(date +\%Y\%m\%d) >> /var/log/backup.log 2>&1
```

### Application Backups

```bash
# Backup environment files
tar -czf backup-$(date +%Y%m%d).tar.gz .env* docker-compose.yml

# Store securely (encrypted)
```

## Rollback Procedure

```bash
# PM2
pm2 stop digilocker-service
git checkout <previous-commit>
npm install
pm2 start digilocker-service

# Docker
docker-compose down
docker pull <previous-image>
docker-compose up -d

# Kubernetes
kubectl rollout undo deployment/digilocker-service
```

## Health Monitoring

```bash
# Setup health check monitoring
curl -f http://localhost:3000/health || exit 1

# Uptime monitoring (UptimeRobot, Pingdom, etc.)
# Configure alerts for downtime
```

## Troubleshooting

### Service won't start

```bash
# Check logs
pm2 logs digilocker-service
# or
docker-compose logs -f

# Check MongoDB connection
mongo <your-connection-string>

# Verify environment variables
printenv | grep DIGILOCKER
```

### High CPU usage

```bash
# Check PM2 status
pm2 monit

# Restart service
pm2 restart digilocker-service
```

### Memory leaks

```bash
# Monitor memory
pm2 monit

# Set max memory restart
pm2 start server.js --max-memory-restart 1G
```

## Post-Deployment Verification

```bash
# Health check
curl https://api.yourdomain.com/health

# Test JWT auth
TOKEN=$(node scripts/generateToken.js test-user)
curl -H "Authorization: Bearer $TOKEN" https://api.yourdomain.com/digilocker/auth-url

# Monitor logs
tail -f /var/log/digilocker-service/combined.log
```

## Maintenance

### Updates

```bash
# Update dependencies
npm update
npm audit fix

# Test updates
npm test

# Deploy updates
pm2 restart digilocker-service
```

### Database Maintenance

```bash
# Compact database
mongo
> use digilocker-service
> db.runCommand({ compact: 'userdigilockers' })

# Remove old tokens (optional)
> db.userdigilockers.deleteMany({
    tokenExpiry: { $lt: new Date(Date.now() - 30*24*60*60*1000) }
  })
```

## Support & Debugging

Enable debug logging:

```env
NODE_ENV=development  # Temporarily for debugging
```

View detailed logs:

```bash
pm2 logs --lines 1000
```

Database queries:

```bash
mongo <connection-string>
> use digilocker-service
> db.userdigilockers.find().pretty()
> db.userdigilockers.countDocuments()
```
