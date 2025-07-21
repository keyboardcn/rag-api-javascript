// src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import 'dotenv/config'; // Loads environment variables from .env file
import { initializeDatabase } from './database';
import apiRoutes from './routes';
import { HttpError } from './utils/errors'; // Import the custom error class
import * as path from 'path';
import * as fs from 'fs';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Create the 'faiss_index' directory if it doesn't exist.
// This is where the FAISS index file will be stored.
const FAISS_INDEX_DIR = path.resolve(__dirname, '../faiss_index');
if (!fs.existsSync(FAISS_INDEX_DIR)) {
    fs.mkdirSync(FAISS_INDEX_DIR, { recursive: true });
}

// Register API routes
app.use('/api', apiRoutes);

// Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Global error handler caught an error:', err);

    if (err instanceof HttpError) {
        return res.status(err.statusCode).json({ message: err.message });
    }

    // For any other unhandled errors, send a generic 500 response
    res.status(500).json({ message: 'An unexpected error occurred.' });
});

// Initialize the database and start the server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log('API documentation (Swagger/OpenAPI) will not be automatically generated like FastAPI. You might use tools like Swagger-jsdoc for that.');
        console.log('To test, use tools like Postman, Insomnia, or curl.');
    });
}).catch(error => {
    console.error("Failed to start server due to database initialization error:", error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing database connection and exiting.');
    // In a real application, you might also want to close other resources here.
    process.exit(0);
});

