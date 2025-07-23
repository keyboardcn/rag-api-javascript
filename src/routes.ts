// src/routes.ts
import { Router, Request, Response } from 'express';
import { 
    getYoutubeVideoId, 
    getYoutubeTranscript, 
    addTranscriptToGlobalFaissIndex, 
    getGlobalRagChain 
} from './ragService'; // Import the necessary functions from ragService
import { videoService } from './services/videoService'; // Import the videoService
import { HttpError } from './utils/errors'; // Import the custom error class
const router = Router();

/**
 * POST /process_video
 * Processes a YouTube video by fetching its transcript and adding it to the global FAISS index.
 * It also records the video URL in the SQLite database.
 */
router.post('/process_video', async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url) {
        throw new HttpError('Video URL is required.', 400);
    }

    let videoId: string;
    try {
        videoId = getYoutubeVideoId(url);
    } catch (error: any) {
        throw new HttpError(error.message, 400);
    }

    // Check if the video URL is already in the database and marked as processed
    const existingVideo = await videoService.getVideoByUrl(url);
    if (existingVideo && existingVideo.processed === 1) {
        return res.status(200).json({
            message: "Video already processed and transcript added to global FAISS index.",
            video_id: videoId,
            url: url
        });
    }

    console.log(`Processing video: ${url}`);
    const transcriptText = await getYoutubeTranscript(url);

    if (!transcriptText) {
        throw new HttpError(
            "Could not retrieve transcript for the provided YouTube URL. It might be unavailable or disabled.",
            404
        );
    }

    try {
        // Add the transcript to the global FAISS index
        const globalFaissIndexPath = await addTranscriptToGlobalFaissIndex(url, transcriptText);

        // Record or update the video in the database as processed using videoService
        await videoService.upsertVideoByUrl(url, 1); // Mark as processed (1)

        res.status(200).json({
            message: "Video processed and added to global FAISS index successfully",
            video_id: videoId,
            global_faiss_index_path: globalFaissIndexPath,
            url: url
        });
    } catch (error: any) {
        console.error(`Failed to process video ${url}:`, error);
        throw new HttpError(`Failed to process video or update global FAISS index: ${error.message}`, 500);
    }
});

/**
 * POST /chat
 * Answers a question based on the transcripts of all previously processed YouTube videos.
 * Uses similarity search on the combined FAISS index and incorporates chat history for context.
 */
router.post('/chat', async (req: Request, res: Response) => {
    const { question, chat_history = [] } = req.body;

    if (!question) {
        throw new HttpError('Question is required.', 400);
    }

    try {
        // Get the RAG chain using the global FAISS index and provided chat history
        const ragChain = await getGlobalRagChain(chat_history);
        
        // Invoke the chain with the user's question
        const response = await ragChain.invoke({ input: question });

        const answer = response.text || "No answer could be generated.";
        const sourceDocuments = response.sourceDocuments || [];

        // Extract unique video URLs from source documents
        const sourceVideoUrls = Array.from(
            new Set(sourceDocuments.map((doc: any) => doc.metadata?.video_url).filter(Boolean))
        );

        res.status(200).json({ answer: answer, source_videos: sourceVideoUrls });
    } catch (error: any) {
        console.error(`An error occurred during chat:`, error);
        // Check if the error is due to the FAISS index not being found
        if (error.message.includes("Global FAISS index file not found")) {
            throw new HttpError(
                "No videos have been processed yet. Please process videos first via /process_video.",
                400
            );
        }
        throw new HttpError(`An error occurred during chat: ${error.message}`, 500);
    }
});

export default router;