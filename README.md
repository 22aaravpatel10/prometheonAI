# Batch Processing Assistant

A comprehensive web application for managing batch production schedules and maintenance events in manufacturing environments.

## Features

- **Interactive Calendar**: Timeline and monthly views showing batch and maintenance schedules
- **Comprehensive Equipment Management**: Add and manage production equipment with detailed configuration
  - Quick-add common equipment with pre-filled defaults
  - Full equipment profiles with custom IDs, locations, and specifications
  - Equipment status tracking (Available, In Use, Maintenance, Offline)
  - Size and capacity tracking with custom units
  - Material of construction documentation
- **Role-based Access Control**: Admin, Planner, and Viewer roles with appropriate permissions
- **Conflict Detection**: Prevents scheduling overlapping events on the same equipment
- **Actual vs Planned Tracking**: Track actual start/end times against planned schedules
- **Email Notifications**: Automatic reminders for upcoming events
- **Export Capabilities**: Export schedules to PDF and Excel formats
- **Import Ready**: Placeholder for Excel import functionality

## Technology Stack

### Backend
- **Node.js & Express**: REST API server
- **TypeScript**: Type-safe development
- **PostgreSQL**: Primary database
- **Prisma**: Database ORM and migrations
- **JWT**: Authentication
- **SendGrid/SMTP**: Email notifications
- **ExcelJS**: Excel export functionality

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe frontend development
- **Tailwind CSS**: Utility-first styling
- **FullCalendar**: Interactive calendar component
- **Axios**: HTTP client
- **React Router**: Client-side routing

### Infrastructure
- **Docker & Docker Compose**: Containerized deployment
- **Nginx**: Frontend web server with reverse proxy
- **PostgreSQL**: Database with persistent storage

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL (for local development)

### Production Deployment with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BatchProcessingAssistant
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and start services**
   ```bash
   docker-compose up --build -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Default login: admin@example.com / admin123

### Local Development

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure your .env file
npm run db:migrate
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/batch_processing_db
JWT_SECRET=your-secure-jwt-secret

# Email (choose one option)
SENDGRID_API_KEY=your-sendgrid-key
# OR
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email
SMTP_PASS=your-password

FROM_EMAIL=noreply@yourdomain.com
```

## Equipment Management

The application provides comprehensive equipment management capabilities to track and configure production equipment.

### Equipment Configuration Fields

Each piece of equipment can be configured with the following properties:

- **Equipment Name** (Required): Unique identifier for the equipment
- **Equipment ID**: Custom alphanumeric ID for internal tracking
- **Location**: Physical location or department where equipment is located
- **Status**: Current operational status
  - `Available`: Ready for use
  - `In Use`: Currently occupied
  - `Maintenance`: Under maintenance or repair
  - `Offline`: Not operational
- **Size**: Equipment size with custom unit (e.g., 500 L, 1000 kg)
- **Capacity**: Processing capacity with custom unit (e.g., 100 L/h, 50 kg/batch)
- **Material of Construction**: Construction material (e.g., Stainless Steel 316L, Glass-Lined)

### Quick Add Common Equipment

The system includes a quick-add feature for common equipment types:
- Reactors (1-3)
- Filter Dryers (1-2)
- Distillation Columns (1-2)
- Crystallizers (1-2)
- Centrifuges (1-2)
- Blenders (1-2)
- Packaging Lines (1-2)
- Heat Exchangers (1-2)
- Storage Tanks (1-2)

When using quick-add:
1. Click on any common equipment type button
2. Modal opens with the equipment name pre-filled
3. Optionally configure additional fields (ID, location, size, capacity, etc.)
4. Click "Create" to save

This workflow prevents errors and allows full configuration before saving, while still providing the convenience of pre-filled defaults.

### Managing Equipment

- **Add Custom Equipment**: Create equipment with custom names and configurations
- **Edit Equipment**: Update equipment details at any time
- **Delete Equipment**: Remove equipment (only if not associated with any events)
- **View Equipment**: See all equipment with event counts and status

## Inventory Management

The system provides robust inventory tracking with advanced safety features:

### Material Tracking
- **CAS Number Integration**: Track materials by their Chemical Abstracts Service (CAS) Registry Number.
- **Safety Tags**: Assign GHS Hazard Classes to materials for safety compliance.
- **AI-Powered Lookup**: Automatically fetch GHS Hazard Classes using PrometheonAI and PubChem.
  - Enter a CAS Number.
  - Click "AUTO-FILL" to retrieve official hazard statements from PubChem.
  - AI maps these statements to standard GHS categories.
- **Stock Management**: Track current quantity, minimum stock levels, and unit costs.
- **Transaction History**: Record all inventory movements (received, consumed, adjusted).

### Safety Features
- **Visual Indicators**: Safety tags are displayed in the inventory table.
- **Categorized Hazards**: Hazards are grouped by Physical, Health, and Environmental categories.
- **Automated Data**: Reduces manual entry errors by sourcing safety data from authoritative databases.

## API Documentation

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Equipment Endpoints
- `GET /equipment` - List all equipment with configuration details
- `POST /equipment` - Create equipment (admin/planner)
  - Required: `name`
  - Optional: `equipmentId`, `location`, `status`, `size`, `sizeUnit`, `capacity`, `capacityUnit`, `materialOfConstruction`, `isCustom`
- `PUT /equipment/:id` - Update equipment configuration (admin/planner)
- `DELETE /equipment/:id` - Delete equipment (admin/planner, only if no associated events)

### Batch Events Endpoints
- `GET /batches` - List batch events
- `POST /batches` - Create batch event (admin/planner)
- `PUT /batches/:id` - Update batch event (admin/planner)
- `DELETE /batches/:id` - Delete batch event (admin/planner)

### Maintenance Events Endpoints
- `GET /maintenance` - List maintenance events
- `POST /maintenance` - Create maintenance event (admin/planner)
- `PUT /maintenance/:id` - Update maintenance event (admin/planner)
- `DELETE /maintenance/:id` - Delete maintenance event (admin/planner)

### Export Endpoints
- `GET /export/events.xlsx` - Export events to Excel
- `GET /export/summary.xlsx` - Export equipment summary

### User Management (Admin only)
- `GET /users` - List all users
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

## User Roles

### Admin
- Full system access
- User management
- All CRUD operations
- System configuration

### Planner
- Create, edit, delete events
- Equipment management
- View all schedules
- Export capabilities

### Viewer
- Read-only access
- View schedules and events
- Export capabilities
- No modification permissions

## Database Schema

The application uses a normalized PostgreSQL schema with the following main entities:

- **Users**: System users with role-based permissions
- **Equipment**: Production equipment/assets with detailed configuration
  - Core fields: name, equipmentId, location, status
  - Technical specs: size, sizeUnit, capacity, capacityUnit, materialOfConstruction
  - Metadata: isCustom, createdByUserId, timestamps
- **BatchEvents**: Scheduled batch production runs
- **MaintenanceEvents**: Equipment maintenance activities
- **Notifications**: Email notification tracking

## Email Notifications

The system automatically sends email reminders:
- 1 hour before batch events start
- 1 hour before maintenance events start
- Configurable with SendGrid or SMTP

## Deployment Options

### Cloud Deployment with Terraform

Example Terraform configuration for AWS:

```hcl
# providers.tf
provider "aws" {
  region = "us-west-2"
}

# rds.tf
resource "aws_db_instance" "postgres" {
  identifier = "batch-processing-db"
  engine = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  allocated_storage = 20
  storage_type = "gp2"
  
  db_name = "batch_processing_db"
  username = "batch_user"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window = "03:00-04:00"
  maintenance_window = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
}

# ecs.tf (for container deployment)
resource "aws_ecs_cluster" "main" {
  name = "batch-processing"
}

resource "aws_ecs_service" "backend" {
  name = "batch-processing-backend"
  cluster = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count = 1
  
  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name = "backend"
    container_port = 3001
  }
}
```

### Docker Swarm Deployment

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml batch-processing
```

### Kubernetes Deployment

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: batch-processing

# k8s/postgres.yaml
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
```

## Monitoring and Logging

### Health Checks
- Backend: `GET /health`
- Frontend: `GET /health`
- Database: Built-in PostgreSQL health checks

### Logging
- Structured logging with Morgan
- Error tracking and monitoring
- Request/response logging

### Metrics
- Application performance monitoring
- Database query performance
- API response times

## Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Secure password hashing with bcrypt

### API Security
- Request rate limiting
- CORS configuration
- Security headers with Helmet
- Input validation and sanitization

### Database Security
- Connection encryption
- Parameterized queries (SQL injection prevention)
- Row-level security policies

## Backup and Recovery

### Database Backups
```bash
# Automated backup script
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_file.sql
```

### Docker Volume Backups
```bash
# Backup PostgreSQL data
docker run --rm -v batch_processing_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore PostgreSQL data
docker run --rm -v batch_processing_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation

## Recent Updates

### Equipment Management Enhancements (Latest)
- **Enhanced Equipment Configuration**: Equipment can now be configured with comprehensive details including equipment ID, location, status, size/capacity with units, and material of construction
- **Improved Quick Add Workflow**: Quick-add buttons now open a modal with pre-filled equipment name, allowing users to configure all fields before saving (prevents blank screen errors and allows full control)
- **Scrollable Equipment Modal**: Modal now supports scrolling to accommodate all configuration fields
- **Backend API Expansion**: Updated validation schema to accept all new equipment configuration fields
- **Docker Build Optimization**: Added .dockerignore files to improve build performance

### Inventory Enhancements (Latest)
- **CAS & Safety Tags**: Added support for CAS Numbers and GHS Hazard Classes.
- **AI/PubChem Integration**: Implemented smart lookup for safety data using PubChem API and OpenAI.
- **Enhanced UI**: Updated Inventory interface with "Mission Control" aesthetic and improved forms.

### AI Recipe Analysis (Latest)
- **Deep Chemical Context**: Automatically researches and stores detailed chemical engineering data for recipe steps (Thermodynamics, Kinetics, Safety).
- **AI Knowledge Base**: New modal in Progress tracking to view AI-generated insights for each process step.
- **Simulated Research**: Leverages LLM knowledge to provide instant analysis of chemical reactions.

### Recipe Ingestion & Scheduling (New)
- **PDF Recipe Ingestion**: Upload PDF recipes and use AI to automatically extract structured data (ingredients, steps, outputs).
- **Recipe Library**: Centralized repository for managing master recipes with version control and status tracking.
- **Intelligent Scheduling**: Schedule production batches directly from recipes.
  - Automatically calculates batch end times based on recipe duration.
  - Auto-scales ingredient quantities based on batch size.
  - **Inventory Integration**: Automatically deducts raw materials from inventory upon scheduling.

### Batch Cockpit & Execution (New)
- **Operator Cockpit**: Dedicated execution view for running batches step-by-step.
- **Interactive Checklists**: Track progress through recipe steps in real-time.
- **Context-Aware Safety**: Displays specific safety hazards and thermodynamic warnings for the active step.
- **Material Guidance**: Shows exact ingredient quantities required for the current operation.

## Roadmap

- [ ] Advanced reporting and analytics
- [ ] Mobile application
- [ ] Integration with ERP systems
- [ ] Advanced workflow automation
- [ ] Multi-tenant architecture
- [ ] Real-time notifications via WebSocket
