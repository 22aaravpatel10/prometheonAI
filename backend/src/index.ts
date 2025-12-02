import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import equipmentRoutes from './routes/equipment';
import batchRoutes from './routes/batches';
import maintenanceRoutes from './routes/maintenance';
import notificationRoutes from './routes/notifications';
import exportRoutes from './routes/export';
import importRoutes from './routes/import';
import materialsRoutes from './routes/materials';
import sdsRoutes from './routes/sds';
import copilotRoutes from './routes/copilot';
import uploadPlanRoutes from './routes/upload-plan';
import recipeRoutes from './routes/recipes';
import './services/emailService'; // Initialize email service

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(limiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/equipment', equipmentRoutes);
app.use('/batches', batchRoutes);
app.use('/maintenance', maintenanceRoutes);
app.use('/notifications', notificationRoutes);
app.use('/export', exportRoutes);
app.use('/import', importRoutes);
app.use('/materials', materialsRoutes);
app.use('/sds', sdsRoutes);
app.use('/recipes', recipeRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/upload-plan', uploadPlanRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});