# Deployment Guide

This guide covers different deployment options for the Batch Processing Assistant application.

## Quick Start with Docker Compose (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- 4GB+ RAM available
- Ports 3000, 3001, and 5432 available

### 1. Clone and Configure
```bash
git clone <repository-url>
cd BatchProcessingAssistant

# Copy and configure environment variables
cp .env.example .env
```

### 2. Configure Environment Variables
Edit the `.env` file with your settings:

```bash
# Required: Secure passwords
POSTGRES_PASSWORD=your-secure-database-password
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Email configuration (choose one)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# OR for SMTP
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Deploy
```bash
# Build and start all services
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Default Login**: admin@example.com / admin123

### 5. Initial Setup
1. Login with default credentials
2. Change admin password
3. Create additional users as needed
4. Add your equipment
5. Start scheduling events

## Production Deployment on AWS

### Prerequisites
- AWS CLI configured
- Terraform installed
- Docker for building images
- Domain name (optional)

### 1. Build and Push Images

```bash
# Build images
docker build -t your-registry/batch-processing-backend:latest ./backend
docker build -t your-registry/batch-processing-frontend:latest ./frontend

# Push to your container registry (ECR, Docker Hub, etc.)
docker push your-registry/batch-processing-backend:latest
docker push your-registry/batch-processing-frontend:latest
```

### 2. Configure Terraform

```bash
cd terraform

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
vim terraform.tfvars
```

### 3. Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply configuration
terraform apply
```

### 4. Get Connection Details

```bash
# Get application URL
terraform output application_url

# Get database connection (sensitive)
terraform output database_url
```

### 5. Deploy Application Tasks

After infrastructure is created, deploy ECS tasks (additional Terraform configuration or manual deployment via AWS Console).

## Manual Cloud Deployment

### AWS EC2 Deployment

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.medium or larger
   - Security groups: 22 (SSH), 80 (HTTP), 443 (HTTPS)

2. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd BatchProcessingAssistant
   
   # Configure environment
   cp .env.example .env
   vim .env
   
   # Deploy
   docker-compose up --build -d
   ```

4. **Configure Reverse Proxy (Nginx)**
   ```bash
   # Install Nginx
   sudo apt install nginx -y
   
   # Configure reverse proxy
   sudo vim /etc/nginx/sites-available/batch-processing
   ```

   Nginx configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api/ {
           proxy_pass http://localhost:3001/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

5. **Enable Site and SSL**
   ```bash
   # Enable site
   sudo ln -s /etc/nginx/sites-available/batch-processing /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   
   # Install SSL with Let's Encrypt
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

### Google Cloud Platform (GCP)

1. **Create GCP Project and Enable APIs**
   ```bash
   gcloud projects create batch-processing-app
   gcloud config set project batch-processing-app
   gcloud services enable sqladmin.googleapis.com
   gcloud services enable run.googleapis.com
   ```

2. **Create Cloud SQL PostgreSQL Instance**
   ```bash
   gcloud sql instances create batch-processing-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1
   
   gcloud sql databases create batch_processing_db \
     --instance=batch-processing-db
   
   gcloud sql users create batch_user \
     --instance=batch-processing-db \
     --password=your-secure-password
   ```

3. **Deploy to Cloud Run**
   ```bash
   # Build and push backend
   gcloud builds submit ./backend --tag gcr.io/batch-processing-app/backend
   
   # Build and push frontend
   gcloud builds submit ./frontend --tag gcr.io/batch-processing-app/frontend
   
   # Deploy backend
   gcloud run deploy backend \
     --image gcr.io/batch-processing-app/backend \
     --platform managed \
     --region us-central1 \
     --set-env-vars DATABASE_URL="postgresql://batch_user:password@/batch_processing_db?host=/cloudsql/batch-processing-app:us-central1:batch-processing-db" \
     --add-cloudsql-instances batch-processing-app:us-central1:batch-processing-db
   
   # Deploy frontend
   gcloud run deploy frontend \
     --image gcr.io/batch-processing-app/frontend \
     --platform managed \
     --region us-central1
   ```

## Kubernetes Deployment

### 1. Create Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: batch-processing
```

### 2. Deploy PostgreSQL
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: batch-processing
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: "batch_processing_db"
        - name: POSTGRES_USER
          value: "batch_user"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: batch-processing
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### 3. Deploy Backend
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: batch-processing
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/batch-processing-backend:latest
        env:
        - name: DATABASE_URL
          value: "postgresql://batch_user:password@postgres-service:5432/batch_processing_db"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        ports:
        - containerPort: 3001
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: batch-processing
spec:
  selector:
    app: backend
  ports:
  - port: 3001
    targetPort: 3001
```

## Monitoring and Logging

### Health Checks
Set up monitoring for:
- Application health endpoints
- Database connectivity
- Container resource usage

### Logging
Configure centralized logging:
```bash
# View Docker Compose logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Follow specific service
docker-compose logs -f postgres
```

### Backup Strategy
```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U batch_user batch_processing_db > backup_$DATE.sql

# Schedule with cron
# 0 2 * * * /path/to/backup-script.sh
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancers for multiple frontend instances
- Database connection pooling for multiple backend instances
- Redis for session storage in multi-instance setups

### Vertical Scaling
- Monitor CPU/memory usage
- Adjust container resource limits
- Scale database instance as needed

### Performance Optimization
- Enable database query caching
- Implement CDN for static assets
- Use database read replicas for heavy read workloads

## Security Checklist

- [ ] Change default passwords
- [ ] Use environment variables for secrets
- [ ] Enable SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up regular security updates
- [ ] Enable audit logging
- [ ] Implement backup encryption
- [ ] Configure rate limiting
- [ ] Set up intrusion detection

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database container
   docker-compose ps postgres
   docker-compose logs postgres
   
   # Test connection
   docker-compose exec backend npx prisma db push
   ```

2. **Frontend Not Loading**
   ```bash
   # Check frontend container
   docker-compose logs frontend
   
   # Verify backend API is accessible
   curl http://localhost:3001/health
   ```

3. **Email Notifications Not Sending**
   ```bash
   # Check backend logs for email errors
   docker-compose logs backend | grep -i email
   
   # Verify environment variables
   docker-compose exec backend env | grep -E "(SENDGRID|SMTP)"
   ```

4. **Memory Issues**
   ```bash
   # Check container resource usage
   docker stats
   
   # Increase memory limits in docker-compose.yml
   ```

### Getting Help

1. Check application logs first
2. Review environment variable configuration
3. Ensure all required ports are available
4. Verify Docker and Docker Compose versions
5. Check system resource availability (RAM, disk space)

For additional support, please refer to the main README.md or create an issue in the repository.