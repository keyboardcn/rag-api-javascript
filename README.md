# **YouTube RAG API (TypeScript, Node.js, Express, Langchain.js)**

## **Table of Contents**

* [Introduction](https://www.google.com/search?q=%23introduction)  
* [Features](https://www.google.com/search?q=%23features)  
* [Tech Stack](https://www.google.com/search?q=%23tech-stack)  
* [Project Structure](https://www.google.com/search?q=%23project-structure)  
* [Setup Instructions](https://www.google.com/search?q=%23setup-instructions)  
  * [Prerequisites](https://www.google.com/search?q=%23prerequisites)  
  * [Installation](https://www.google.com/search?q=%23installation)  
  * [Environment Variables](https://www.google.com/search?q=%23environment-variables)  
* [How to Run the Application](https://www.google.com/search?q=%23how-to-run-the-application)  
  * [Development Mode](https://www.google.com/search?q=%23development-mode)  
  * [Production Mode](https://www.google.com/search?q=%23production-mode)  
* [API Endpoints](https://www.google.com/search?q=%23api-endpoints)  
  * [1\. Process a YouTube Video](https://www.google.com/search?q=%231-process-a-youtube-video)  
  * [2\. Chat with Processed Videos](https://www.google.com/search?q=%232-chat-with-processed-videos)  
* [Database](https://www.google.com/search?q=%23database)  
* [FAISS Index](https://www.google.com/search?q=%23faiss-index)  
* [Future Improvements](https://www.google.com/search?q=%23future-improvements)  
* [License](https://www.google.com/search?q=%23license)

## **Introduction**

This project provides a Retrieval Augmented Generation (RAG) API for YouTube videos, built with TypeScript, Node.js, and Express. It allows you to process YouTube video transcripts, store them in a centralized vector database (FAISS), and then query across all processed videos to get answers, leveraging Langchain.js for the RAG pipeline.

Unlike traditional RAG systems that process documents individually, this API combines all video transcripts into a single FAISS index, enabling a unified search experience across your entire library of processed videos.

## **Features**

* **YouTube Transcript Extraction**: Fetches transcripts from public YouTube videos.  
* **Centralized Vector Store**: All video transcripts are embedded and stored in a single FAISS index.  
* **Metadata Preservation**: Each text chunk in the FAISS index retains metadata about its original YouTube video URL, allowing for source attribution.  
* **Conversational AI**: Uses Langchain.js with OpenAI's GPT models to provide conversational answers based on retrieved transcript segments and chat history.  
* **Database Persistence (SQLite with Sequelize)**: Stores processed video URLs and their processing status using SQLite and Sequelize ORM.  
* **Generic CRUD Service**: Implements a BaseService for common database operations, promoting code reusability and maintainability.  
* **RESTful API**: Exposes endpoints for processing videos and chatting, built with Express.js.  
* **TypeScript**: Ensures type safety and improves code quality and maintainability.

## **Tech Stack**

* **Backend**: Node.js, Express.js  
* **Language**: TypeScript  
* **Database**: SQLite (local file-based)  
* **ORM**: Sequelize  
* **RAG Framework**: Langchain.js  
  * **Embeddings**: HuggingFaceInferenceEmbeddings (sentence-transformers/all-MiniLM-L6-v2)  
  * **Vector Store**: FAISS (using hnswlib-node for native bindings)  
  * **LLM**: OpenAI GPT-3.5 Turbo (via @langchain/openai)  
* **Transcript Fetching**: youtube-transcript-api (used internally by Langchain's YoutubeLoader)  
* **Environment Management**: dotenv

## **Project Structure**

youtube-rag-api-ts/  
├── src/  
│   ├── database.ts             \# Sequelize setup and Video model definition  
│   ├── ragService.ts           \# Core RAG logic: transcript fetching, FAISS management, Langchain chain setup  
│   ├── routes.ts               \# Express API routes definition  
│   ├── app.ts                  \# Express application setup, middleware, and server start  
│   └── utils/  
│       └── errors.ts           \# Custom HTTP error class  
│   └── services/  
│       ├── baseService.ts      \# Generic CRUD service  
│       └── videoService.ts     \# Specific service for Video model operations  
├── data/                       \# Directory for SQLite database file (created automatically)  
│   └── youtube\_videos.db  
├── faiss\_index/                \# Directory for the global FAISS index file (created automatically)  
│   └── combined\_videos.faiss  
├── .env.example                \# Example environment variables file  
├── .env                        \# Your actual environment variables (ignored by Git)  
├── package.json                \# Project dependencies and scripts  
├── tsconfig.json               \# TypeScript compiler configuration  
└── README.md                   \# This README file

## **Setup Instructions**

### **Prerequisites**

* Node.js (v18 or higher recommended)  
* npm (Node Package Manager)

### **Installation**

1. **Clone the repository (or create the project structure manually):**  
   git clone \<repository\_url\>  
   cd youtube-rag-api-ts

   (If you are copying the files, create the youtube-rag-api-ts directory and then the src, src/utils, src/services subdirectories, and place the files accordingly.)  
2. Install dependencies:  
   Navigate to the project root directory in your terminal and run:  
   npm install

   This command will install all the necessary Node.js packages listed in package.json and automatically compile the TypeScript code into JavaScript in the dist/ directory.

### **Environment Variables**

Create a .env file in the root of your project (same level as package.json).

OPENAI\_API\_KEY="your\_openai\_api\_key\_here"  
HF\_API\_KEY="your\_hugging\_face\_api\_key\_here" \# Optional, but recommended for higher rate limits  
PORT=3000 \# Optional: specify a port, defaults to 3000

* **OPENAI\_API\_KEY**: Your API key for OpenAI's GPT models. Required for the RAG chain to function.  
* **HF\_API\_KEY**: (Optional but Recommended) Your Hugging Face API key. While HuggingFaceInferenceEmbeddings can use a public inference API, providing your own API key can help avoid rate limits and ensure more stable performance, especially in production.  
* **PORT**: (Optional) The port on which the Express server will run. Defaults to 3000\.

## **How to Run the Application**

### **Development Mode**

For development, ts-node-dev is used to automatically restart the server when file changes are detected.

npm run dev

The server will start on http://localhost:3000 (or your specified PORT).

### **Production Mode**

First, build the TypeScript code:

npm run build

Then, start the compiled JavaScript application:

npm start

The server will start on http://localhost:3000 (or your specified PORT).

## **API Endpoints**

You can interact with the API using tools like Postman, Insomnia, or curl.

### **1\. Process a YouTube Video**

This endpoint fetches the transcript of a given YouTube video, embeds it, and adds it to the global FAISS vector index. The video URL is also recorded in the SQLite database.

* **URL**: /api/process\_video  
* **Method**: POST  
* **Headers**: Content-Type: application/json  
* **Request Body (JSON)**:  
  {  
    "url": "https://www.youtube.com/watch?v=YOUR\_VIDEO\_ID"  
  }

  Replace YOUR\_VIDEO\_ID with an actual YouTube video ID (e.g., a public video with available transcripts).  
* **Example curl command**:  
  curl \-X POST "http://localhost:3000/api/process\_video" \\  
       \-H "Content-Type: application/json" \\  
       \-d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

* **Success Response**:  
  {  
    "message": "Video processed and added to global FAISS index successfully",  
    "video\_id": "dQw4w9WgXcQ",  
    "global\_faiss\_index\_path": "/path/to/your/project/faiss\_index/combined\_videos.faiss",  
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  
  }

* **Error Responses**:  
  * 400 Bad Request: If url is missing or invalid.  
  * 404 Not Found: If transcript cannot be retrieved.  
  * 500 Internal Server Error: For other processing failures.

### **2\. Chat with Processed Videos**

This endpoint allows you to ask questions about the content of all previously processed YouTube videos. It uses the combined FAISS index for retrieval and incorporates chat history for contextual answers.

* **URL**: /api/chat  
* **Method**: POST  
* **Headers**: Content-Type: application/json  
* **Request Body (JSON)**:  
  {  
    "question": "What are the main topics discussed in the videos?",  
    "chat\_history": \[  
      {"role": "user", "content": "Tell me about the first video."},  
      {"role": "assistant", "content": "The first video discusses \[summary\]."}  
    \]  
  }

  * question: The user's current question.  
  * chat\_history: (Optional) An array of previous user and assistant messages to maintain conversation context. For the first question, this can be an empty array \[\].  
* **Example curl command**:  
  curl \-X POST "http://localhost:3000/api/chat" \\  
       \-H "Content-Type: application/json" \\  
       \-d '{"question": "Can you summarize the key points from the videos?", "chat\_history": \[\]}'

* **Success Response**:  
  {  
    "answer": "Based on the processed videos, the key points discussed include...",  
    "source\_videos": \[  
      "https://www.youtube.com/watch?v=VIDEO\_ID\_1",  
      "https://www.youtube.com/watch?v=VIDEO\_ID\_2"  
    \]  
  }

  * answer: The generated answer from the LLM.  
  * source\_videos: A list of YouTube URLs from which the context for the answer was retrieved.  
* **Error Responses**:  
  * 400 Bad Request: If question is missing or no videos have been processed yet.  
  * 500 Internal Server Error: For other errors during the chat process.

## **Database**

* The SQLite database file youtube\_videos.db is stored in the data/ directory at the project root.  
* It contains a videos table with id, url, and processed columns.  
* processed column indicates whether the video's transcript has been successfully added to the FAISS index (1 for true, 0 for false).

## **FAISS Index**

* The combined FAISS index file combined\_videos.faiss is stored in the faiss\_index/ directory at the project root.  
* This single file contains the embedded representations of all processed video transcripts.  
* Each document chunk in the index includes video\_url metadata for source attribution.

## **Future Improvements**

* **Authentication/Authorization**: Secure API endpoints.  
* **Rate Limiting**: Prevent abuse of the API.  
* **Error Handling**: More granular error logging and user-friendly error messages.  
* **Asynchronous Processing**: For long video transcripts, consider using a message queue (e.g., RabbitMQ, Kafka) and worker processes to handle transcript processing asynchronously, preventing API timeouts.  
* **Scalability**: Explore options for scaling the vector store (e.g., using a dedicated vector database like Pinecone, Weaviate, Qdrant instead of local FAISS for larger datasets).  
* **Advanced RAG Techniques**: Implement more sophisticated retrieval strategies (e.g., hybrid search, re-ranking) or generation techniques.  
* **Monitoring and Logging**: Add robust logging and monitoring tools.  
* **Dockerization**: Containerize the application for easier deployment.  
* **Configuration Management**: Externalize configuration for different environments.