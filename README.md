# CivicFlow

## Local development

### Backend

1. Create `backend/.env` with `SUPABASE_URL`, `SUPABASE_KEY`, and `GEMINI_API_KEY`.
   Keep this file private; do not commit API keys.
2. In the Supabase SQL editor, apply the required database setup and
   `backend/sql/schema.sql`. This creates the `complaint-photos` storage bucket
   and its constrained upload policy, as well as the CivicFlow schema updates.
3. From the repository root, start the API:

   ```powershell
   cd backend
   .\venv\Scripts\python.exe -m uvicorn main:app --reload
   ```

   The API health check is available at `http://localhost:8000/health`.
   The government dashboard compares all supported complaint types across
   departments within the selected reporting area. Reports within 100 metres are
   shown as possible coordination alerts, not confirmed conflicts. It recommends
   underground drainage, sewer, or water work before road repairs when appropriate;
   other combinations request coordination without inventing a work sequence.

### Frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The Vite
development server proxies `/api` requests to the backend on port 8000.