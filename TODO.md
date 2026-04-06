# TODO: Deploy to GCP Cloud Run + Cloud SQL Postgres

Approved Plan: Serverless Node.js + Postgres (divine-apogee-477606-c1)

Project ID: divine-apogee-477606-c1
Region: us-central1

## Steps:
- [x] 1. Install pg/@vercel/postgres deps
- [ ] 2. Create .env.example with required vars
- [x] 3. Create Dockerfile for Cloud Run (tsx server.ts)
- [x] 4. Clean Vercel config (rm vercel.json/.vercel)
- [ ] 5. Complete GCP CLI install (`source ~/.zshrc; gcloud init`)
- [ ] 6. Create Cloud SQL Postgres: gcloud sql instances create...
- [ ] 7. Deploy: gcloud run deploy ai-hospital-system...
- [x] 5. Update package.json scripts + vercel.json
- [x] 6. Update src/App.tsx: Better error messages
- [ ] 7. Test local register
- [ ] 8. User adds env vars to Vercel dashboard (POSTGRES_URL, GEMINI_API_KEY, JWT_SECRET)
- [ ] 9. Deploy + test registration on Vercel
- [ ] 10. Create PR for changes
