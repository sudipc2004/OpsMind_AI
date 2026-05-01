<<<<<<< HEAD
# OpsMind AI — Setup Guide

## Prerequisites

- Node.js v18+
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free M0 tier works)
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)

---

## Step 1 — Configure Environment Variables

Edit `backend/.env` and fill in:

```env
GEMINI_API_KEY=your_google_ai_studio_api_key
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=opsmind
MONGODB_COLLECTION=sop_chunks
PORT=5000
JWT_SECRET=your_secure_random_string

# Optional: To enable real email OTPs (requires a Gmail App Password)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

---

## Step 2 — Create MongoDB Atlas Vector Search Index

1. Go to your **MongoDB Atlas** cluster → **Atlas Search** (or **Vector Search**)
2. Click **Create Search Index**
3. Choose **Vector Search** (not Atlas Search)
4. Select database: `opsmind`, collection: `sop_chunks`
5. Use this JSON definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

6. Name the index exactly: **`vector_index`**
7. Click **Save**. The index builds in ~1-2 minutes.

---

## Step 3 — Allow Network Access (Atlas)

In Atlas → **Network Access** → Add your IP (or `0.0.0.0/0` for development).

---

## Step 4 — Start the Application

### Terminal 1 — Backend
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

### Terminal 2 — Frontend
```bash
cd frontend
npm run dev
# Opens http://localhost:5173
```

---

## Using the App

1. Open **http://localhost:5173**
2. **Login/Signup**: Enter your work email and password. A new account will be created automatically if it doesn't exist.
3. **Verify OTP**: Check your terminal (or your email if SMTP is configured in `.env`) for the 6-digit verification code and enter it.
4. In the **left sidebar**, click "Drop PDF or click to browse" and upload an SOP PDF
5. Wait for "Successfully indexed X chunks" toast
6. Type your question in the chat — streaming answers with cited sources!

---

## Architecture

```
User Query
    │
    ▼
React Frontend (Vite)
    │ SSE + POST /api/query
    ▼
Express Backend
    ├── Embed query via gemini-embedding-001
    ├── $vectorSearch in MongoDB Atlas (top-5 chunks)
    ├── Build RAG context prompt
    └── Stream response from gemini-2.0-flash via SSE
        │
        ▼
    React renders streaming text + sources
test change for PR
```
=======
# OpsMind AI - Enterprise SOP RAG Agent

OpsMind AI is a premium, production-grade intelligence engine that transforms your corporate Standard Operating Procedures (SOPs) into a context-aware, verifiable knowledge base.

## 🚀 Key Features

- **High-Fidelity UI**: Cinematic landing page with slow-motion animations and glassmorphism.
- **RAG Architecture**: Powered by Gemini Pro and MongoDB Atlas Vector Search.
- **Real-time Streaming**: Instant feedback using Server-Sent Events (SSE).
- **Verifiable Citations**: Every response includes exact page numbers and snippet citations from your PDF sources.
- **Secure Ingestion**: Robust pipeline for parsing, chunking, and embedding PDFs.
- **Advanced Auth**: Enterprise-grade authentication with JWT and OTP support.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Tailwind CSS (v4), Framer Motion, Lucide React.
- **Backend**: Node.js, Express, MongoDB Atlas, Gemini AI SDK.
- **ML/AI**: Vector Embeddings (text-embedding-004), Gemini Pro LLM.

## 🚦 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster with Vector Search enabled.
- Gemini API Key.

### 2. Installation
```bash
# Install dependencies for both root, client and server
npm install
npm install --prefix client
npm install --prefix server
```

### 3. Configuration
Create a `.env` file in the `server/` directory (refer to `.env.example`).

### 4. Running the App
```bash
# Run both frontend and backend concurrently
npm run dev
```

The app will be available at `http://localhost:3000`.
The backend will be running at `http://localhost:5000`.

---
*Built with ❤️ for High-Performance Enterprise Teams.*
>>>>>>> da59762 (chore: deps - update project dependencies and documentation)
