# TODO: Fix Registration Failed on Vercel (DB Migration)

Approved Plan: Migrate SQLite → Vercel Postgres

## Steps:
- [x] 1. Install pg/@vercel/postgres deps
- [ ] 2. Create .env.example with required vars
- [x] 3. Create api/migrations.ts (CSV → Postgres data load) **[Pending POSTGRES_URL]**
- [x] 4. Refactor server.ts: pg client, rewrite all queries **[Fixed TS error]**
- [x] 5. Update package.json scripts + vercel.json
- [x] 6. Update src/App.tsx: Better error messages
- [ ] 7. Test local register
- [ ] 8. User adds env vars to Vercel dashboard (POSTGRES_URL, GEMINI_API_KEY, JWT_SECRET)
- [ ] 9. Deploy + test registration on Vercel
- [ ] 10. Create PR for changes
