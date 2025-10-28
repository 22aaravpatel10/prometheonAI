# terraform/variables.tf

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Name of the project (used for resource naming)"
  type        = string
  default     = "batch-processing"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

# Database Variables
variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "batch_processing_db"
}

variable "db_username" {
  description = "PostgreSQL database username"
  type        = string
  default     = "batch_user"
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 100
}

# Application Variables
variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "sendgrid_api_key" {
  description = "SendGrid API key for email notifications"
  type        = string
  sensitive   = true
  default     = ""
}

variable "from_email" {
  description = "From email address for notifications"
  type        = string
  default     = "noreply@example.com"
}

# Container Images
variable "frontend_image" {
  description = "Docker image for frontend"
  type        = string
  default     = "batch-processing-frontend:latest"
}

variable "backend_image" {
  description = "Docker image for backend"
  type        = string
  default     = "batch-processing-backend:latest"
}

# ECS Configuration
variable "frontend_cpu" {
  description = "CPU units for frontend task"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory (MiB) for frontend task"
  type        = number
  default     = 512
}

variable "backend_cpu" {
  description = "CPU units for backend task"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory (MiB) for backend task"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of running tasks"
  type        = number
  default     = 1
}

# Domain Configuration (optional)
variable "domain_name" {
  description = "Domain name for the application (optional)"
  type        = string
  default     = ""
}

variable "create_certificate" {
  description = "Whether to create SSL certificate"
  type        = bool
  default     = false
}