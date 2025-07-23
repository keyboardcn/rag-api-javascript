// src/ragService.ts
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

import { BufferMemory } from "langchain/memory";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config'; // Loads environment variables from .env file
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { RunnableLambda } from "@langchain/core/runnables";
// Get OpenAI API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.warn("Warning: OPENAI_API_KEY not found in environment variables. Please set it for LLM functionality.");
}

// Get Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.warn("Warning: GEMINI_API_KEY not found in environment variables. Please set it for Gemini functionality.");
}

// Define the directory to store FAISS indices
const FAISS_INDEX_DIR = path.resolve(__dirname, '../faiss_index');
if (!fs.existsSync(FAISS_INDEX_DIR)) {
    fs.mkdirSync(FAISS_INDEX_DIR, { recursive: true });
}

// Define the single, global FAISS index file path
const GLOBAL_FAISS_INDEX_PATH = path.join(FAISS_INDEX_DIR, "combined_videos.faiss");

// Initialize the embedding model.
const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "embedding-001", // Specify the model
    apiKey: GEMINI_API_KEY, // Use your API key
});

// Global variable to store the loaded combined FAISS vector store in memory.
let combinedFaissStore: FaissStore | null = null;

/**
 * Extracts the YouTube video ID from a given URL.
 * Handles various YouTube URL formats.
 * @param url The YouTube video URL.
 * @returns The extracted video ID.
 * @throws {Error} If the URL format is invalid.
 */
export function getYoutubeVideoId(url: string): string {
    let videoIdMatch;
    // Standard YouTube URL
    videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (videoIdMatch && videoIdMatch[1]) {
        return videoIdMatch[1];
    }
    throw new Error("Invalid YouTube URL format");
}

/**
 * Fetches the transcript for a given YouTube video URL.
 * Uses YoutubeLoader from @langchain/community to load the transcript.
 * @param url The YouTube video URL.
 * @returns The transcript text, or an empty string if not found/disabled.
 */
export async function getYoutubeTranscript(url: string): Promise<string> {
    try {
        const loader = YoutubeLoader.createFromUrl(url, {
            addVideoInfo: true,
            language: "en", // Specify language if needed
        });
        const docs = await loader.load();
        console.log(`Loaded ${docs.length} documents from YouTube video: ${url}`);
        if (!docs || docs.length === 0) {
            return "";
        }
        // The transcript content is in the 'pageContent' attribute of the first document
        return docs[0].pageContent;
    } catch (error: any) {
        // Check for specific YouTubeTranscriptApi errors
        if (error.name === 'NoTranscriptFound' || error.name === 'TranscriptsDisabled') {
            console.error(`Error fetching transcript for ${url}: ${error.message}`);
        } else {
            console.error(`An unexpected error occurred while fetching transcript for ${url}:`, error);
        }
        return "";
    }
}

/**
 * Adds the given transcript text to the global FAISS index.
 * If the index doesn't exist, it creates it. Otherwise, it updates it.
 * @param videoUrl The URL of the video whose transcript is being added.
 * @param transcriptText The transcript content.
 * @returns The path to the global FAISS index.
 * @throws {Error} If transcript text is empty.
 */
export async function addTranscriptToGlobalFaissIndex(videoUrl: string, transcriptText: string): Promise<string> {
    if (!transcriptText) {
        throw new Error("Transcript text cannot be empty for FAISS index creation.");
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    // Split the transcript text into documents (chunks).
    // Add the video_url as metadata to each document.
    const texts: Document[] = await textSplitter.createDocuments([transcriptText]);
    texts.forEach(doc => {
        doc.metadata.video_url = videoUrl;
    });

    // Check if the global FAISS index already exists in memory or on disk
    if (combinedFaissStore === null && fs.existsSync(GLOBAL_FAISS_INDEX_PATH)) {
        console.log(`Loading existing global FAISS index from ${GLOBAL_FAISS_INDEX_PATH}...`);
        // Note: allowDangerousDeserialization is needed for loading from disk
        combinedFaissStore = await FaissStore.load(GLOBAL_FAISS_INDEX_PATH, embeddings);
        console.log("Global FAISS index loaded.");
    }

    if (combinedFaissStore === null) {
        // If no index exists (first video being processed), create a new one
        console.log("Creating new global FAISS index...");
        combinedFaissStore = await FaissStore.fromDocuments(texts, embeddings);
    } else {
        // If an index exists, add the new documents to it
        console.log("Adding new documents to existing global FAISS index...");
        await combinedFaissStore.addDocuments(texts);
    }

    // Save the updated (or newly created) global FAISS index to disk.
    await combinedFaissStore.save(GLOBAL_FAISS_INDEX_PATH);

    console.log(`Transcript for ${videoUrl} added to global FAISS index at ${GLOBAL_FAISS_INDEX_PATH}`);
    return GLOBAL_FAISS_INDEX_PATH;
}

/**
 * Loads the global FAISS index into memory if it's not already loaded.
 * @returns The loaded FAISS instance.
 * @throws {Error} If the global FAISS index file is not found.
 */
export async function loadGlobalFaissIndex(): Promise<FaissStore> {
    if (combinedFaissStore === null) {
        if (!fs.existsSync(GLOBAL_FAISS_INDEX_PATH)) {
            throw new Error(`Global FAISS index file not found at ${GLOBAL_FAISS_INDEX_PATH}. Please process videos first.`);
        }
        console.log(`Loading global FAISS index from ${GLOBAL_FAISS_INDEX_PATH} for chat...`);
        combinedFaissStore = await FaissStore.load(GLOBAL_FAISS_INDEX_PATH, embeddings);
        console.log("Global FAISS index loaded for chat.");
    }
    return combinedFaissStore;
}

/**
 * Represents a chat message in the history.
 */
interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

/**
 * Sets up a ConversationalRetrievalQAChain with memory using the global FAISS index.
 * @param chatHistory An array of previous chat messages to populate the memory.
 * @returns A configured ConversationalRetrievalQAChain.
 * @throws {Error} If the global FAISS index is not loaded.
 */
export async function getGlobalRagChain(chatHistory: ChatMessage[]): Promise<any> {
    const vectorStore = await loadGlobalFaissIndex(); // Ensure the index is loaded

    // Initialize the Language Model (LLM). We use ChatOpenAI.
    const llm = new ChatGoogleGenerativeAI({
        model: "gemini-1.5-pro", // Specify the model
        temperature: 0.0,
        apiKey: GEMINI_API_KEY,
    });

    // Initialize BufferMemory to store chat history.
    const memory = new BufferMemory({
        memoryKey: "chat_history", // The key under which chat history will be stored
        returnMessages: true, // Return history as a list of message objects
    });

    // Populate memory with existing chat history
    for (const message of chatHistory) {
        if (message.role === "user") {
            await memory.chatHistory.addUserMessage(message.content);
        } else if (message.role === "assistant") {
            await memory.chatHistory.addAIChatMessage(message.content);
        }
    }

    const historyAwarePrompt = ChatPromptTemplate.fromMessages([
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        ["human", "Given the above conversation, generate a search query to look up in order to get" + 
            "information relevant to the conversation and the last question. " + 
            "If the question is already a good search query, use it as is. " + 
            "Do not include any conversational phrases or greetings. Just the search query."
        ],
    ]);
    const historyAwareRetrieverChain = await createHistoryAwareRetriever({
        llm: llm,
        retriever: vectorStore.asRetriever(),
        rephrasePrompt: historyAwarePrompt,
    });
    const answerPrompt = ChatPromptTemplate.fromMessages([
        ["system", "Answer the user's question based on the below context:\n\n{context}"],
        new MessagesPlaceholder("chat_history"), // Placeholder for chat history
        ["human", "{input}"],
    ]);
    console.log("Answer prompt defined.");

    // 8. Create the stuff documents chain (combines retrieved docs with prompt)
    const stuffDocumentsChain = await createStuffDocumentsChain({
        llm: llm,
        prompt: answerPrompt,
    });

  const chain = new RunnableLambda({
    func: async (input: { input: string }) => {
      const memoryVars = await memory.loadMemoryVariables({});
      const chatHistory = memoryVars["chat_history"];

      const docs = await historyAwareRetrieverChain.invoke({
        input: input.input,
        chat_history: chatHistory,
      });

      const result = await stuffDocumentsChain.invoke({
        input: input.input,
        context: docs,
        chat_history: chatHistory,
      });

      return result;
    },
  });

  return chain;
}
