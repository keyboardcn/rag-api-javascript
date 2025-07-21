// src/services/videoService.ts
// Ensure the correct path to baseService.ts; adjust if it's in a different directory
import { BaseService } from './baseService';
import { Video } from '../database'; // Import the Video model

// Define the type for Video creation attributes
interface VideoCreationAttributes {
    url: string;
    processed?: number;
}

/**
 * VideoService extends BaseService for specific Video model operations.
 */
class VideoService extends BaseService<Video, VideoCreationAttributes> {
    constructor() {
        super(Video as any); // Pass the Video model to the BaseService constructor
    }

    /**
     * Custom upsert method for Video model.
     * @param url The YouTube video URL to insert or update.
     * @param processedStatus The processing status (0 or 1).
     * @returns The upserted Video instance and a boolean indicating if it was created.
     */
    async upsertVideoByUrl(url: string, processedStatus: number = 0): Promise<[Video, boolean | null]> {
        // Use the static upsert method defined on the Video model
        return Video.upsertVideo(url, processedStatus);
    }

    /**
     * Retrieves a video record by its URL.
     * @param url The YouTube video URL to retrieve.
     * @returns The Video instance if found, otherwise null.
     */
    async getVideoByUrl(url: string): Promise<Video | null> {
        return this.findOne({ where: { url: url } });
    }
}

export const videoService = new VideoService();
