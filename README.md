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
2. In the **left sidebar**, click "Drop PDF or click to browse" and upload an SOP PDF
3. Wait for "Successfully indexed X chunks" toast
4. Type your question in the chat — streaming answers with cited sources!

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
```
