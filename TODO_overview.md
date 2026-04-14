# Weekly Overview Dashboard Progress

**Files analyzed:**
1. ✅ Overview.js (current user stats)
2. ✅ MatrixView.js (schedule state, codes V/A/holidays)
3. ✅ schema.prisma (rotations, leave_requests, holidays)
4. ❌ No leave/holiday API routes found

**Data available:**
- rotations (main events)
- users, teams (lookups)
- holidays model exists but no API
- leave_requests (V/A absences) in schema but no API

**Implementation Plan:**
1. **Keep** user profile KPI cards (good UX)
2. **Add** weekly sections using rotations:
   - Current week Mon-Sun dates
   - Rotations grouped by day
   - Today's schedule
   - Upcoming events
   - Busy/free days (>3 rotations = busy)
   - Weekly stats
3. **Static holidays** (Canada/US 2024-2026)
4. **Matrix integration** (highlight V/A codes)
5. **Card layout** matching app style

**Missing:** leave_requests API. Use rotations for events, static holidays.

**Next:** Replace Overview.js with new dashboard.

Approve plan before editing?

