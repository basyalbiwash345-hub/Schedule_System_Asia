# Fix Prisma DATABASE_URL Error - Progress Tracker

## Steps:
- [x] 1. Rename `CGI_Scheduling_System/server/env` → `CGI_Scheduling_System/server/.env`
- [x] 2. Edit `.env`: Remove quotes from `DATABASE_URL=...` line
- [x] 3. Run `cd CGI_Scheduling_System/server && npx prisma generate`
- [ ] 4. **Fix DATABASE_URL search_path error** (remove ?schema=public)
- [ ] 4b. Test `cd CGI_Scheduling_System/server && node index.js` (expect success, seeds data)

- [ ] 5. Verify API: curl http://localhost:5000/api/roles

**Current step: 1/5**
