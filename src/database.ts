// src/database.ts
import { Sequelize, DataTypes, Model } from 'sequelize';
import path from 'path';
import * as fs from 'fs';

// Define the database file path.
const DB_PATH = path.resolve(__dirname, '../data', 'youtube_videos.db');

// Ensure the 'data' directory exists.
const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize Sequelize
// dialect: 'sqlite' specifies the database type.
// storage: DB_PATH specifies the path to the SQLite database file.
export const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: DB_PATH,
    logging: false, // Set to true to see SQL queries in console
});

// Define the Video Model
export class Video extends Model {
    public id!: number;
    public url!: string;
    public processed!: number; // 0 for false, 1 for true

    // Define custom static methods if needed, e.g., for upsert
    public static async upsertVideo(url: string, processedStatus: number = 0): Promise<[Video, boolean | null]> {
        // findOrCreate will either find an existing record or create a new one.
        // If a record is found, it updates the 'processed' status.
        const [video, created] = await this.findOrCreate({
            where: { url: url },
            defaults: { url: url, processed: processedStatus },
        });

        if (!created && video.processed !== processedStatus) {
            video.processed = processedStatus;
            await video.save();
        }
        return [video, created];
    }
}

/**
 * Initializes the database connection and synchronizes models.
 * This function should be called once when the application starts.
 */
export async function initializeDatabase(): Promise<void> {
    try {
        // Define the model's schema
        Video.init({
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            url: {
                type: DataTypes.TEXT,
                unique: true,
                allowNull: false,
            },
            processed: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
        }, {
            sequelize, // Pass the Sequelize instance
            tableName: 'videos', // Explicitly set the table name
            modelName: 'Video', // Model name
            timestamps: false, // Disable createdAt and updatedAt columns
        });

        // Synchronize all models with the database.
        // This will create the 'videos' table if it doesn't exist.
        // { force: true } would drop the table first if it exists, use with caution in production.
        await sequelize.sync();
        console.log('Database initialized and models synchronized.');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1); // Exit the process if database initialization fails.
    }
}