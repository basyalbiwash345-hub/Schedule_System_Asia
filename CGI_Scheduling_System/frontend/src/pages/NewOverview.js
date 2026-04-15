import React, { useState, useEffect } from 'react';

// Props destructured from App.js
const SCHEDULE_CODES = {
    'IT': { bg: '#ff00ff', color: '#fff' },
    'SD': { bg: '#00ff00', color: '#000' },
    'CD': { bg: '#ffff00', color: '#000' },
    'V': { bg: '#c00000', color: '#fff' },
};

const Overview = ({ currentUser, rotations, users, isUserAdmin, getTeamDisplayMembers, onNavigate }) => {
  const [localTeams, setLocalTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState(null);
  const [localUsers, setLocalUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [todayOnCall, setTodayOnCall] = useState({ assigned: [], unassigned: [] });
  const [loadingSchedule, setLoadingSchedule] = useState(false);




    const isAdminOrLead = currentUser?.roles?.includes('Administrator') || currentUser?.roles?.includes('Team Lead / Supervisor');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoadingTeams(false);
      setLoadingUsers(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch teams
        setLoadingTeams(true);
        const teamsRes = await fetch('/api/teams', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setLocalTeams(Array.isArray(teamsData) ? teamsData : []);
          console.log('Teams loaded:', teamsData);
        }

// Fetch matrix users (with teams data)
        setLoadingUsers(true);
        const usersRes = await fetch('/api/matrix-users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setLocalUsers(Array.isArray(usersData) ? usersData : []);
          console.log('Matrix users loaded:', usersData);
        }


        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setLocalUsers(Array.isArray(usersData) ? usersData : []);
          console.log('Users loaded:', usersData);
        }

// Fetch current month schedule for today's on-call (fetch multiple months to be safe)
        setLoadingSchedule(true);
        const todayDateObj = new Date();
        const todayStr = todayDateObj.toISOString().split('T')[0];
        console.log('Today date:', todayStr);

        // Fetch current + prev/next month to ensure coverage
        const todayMonth = todayStr.slice(0, 7);
        const monthsToFetch = [todayMonth];
        const prevMonth = new Date(todayDateObj);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        monthsToFetch.push(prevMonth.toISOString().slice(0, 7));
        const nextMonth = new Date(todayDateObj);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        monthsToFetch.push(nextMonth.toISOString().slice(0, 7));


        console.log('Fetching months:', monthsToFetch);

        let allScheduleData = [];
        for (const month of monthsToFetch) {
          const scheduleRes = await fetch(`/api/schedule?month=${month}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (scheduleRes.ok) {
            const data = await scheduleRes.json();
            allScheduleData = allScheduleData.concat(data);
          }
        }

        console.log('All raw schedule data:', allScheduleData);

        const scheduleMap = allScheduleData.reduce((acc, entry) => {
          const key = `${entry.user_id}_${entry.date}`;
          acc[key] = { code: entry.code?.toUpperCase(), id: entry.id };
          return acc;
        }, {});
        setSchedule(scheduleMap);

        // Compute today's on-call
        const todayEntries = Object.entries(scheduleMap).filter(([key]) =>
          key.endsWith(`_${todayStr}`)
        );
        console.log('Today entries:', todayEntries);

        // Today's On-Call data using todayStr
        console.log('Today:', todayStr);

        // Define WORKING_CODES (missing from previous code)
        const WORKING_CODES = new Set(['IT', 'CD', 'ES', 'MT', 'WS', 'EF', 'SD']);

        // Assigned users (WORKING_CODES)
        const assignedToday = todayEntries
          .filter(([key, entry]) => {
            const [, date] = key.split('_');
            return date === todayStr && WORKING_CODES.has(entry.code);
          })

          .map(([key, entry]) => {
            const [userId] = key.split('_');
            const user = localUsers.find(u => String(u.id) === userId);
            return {
              userName: user?.name || `User ${userId}`,
              teamName: user?.teams?.[0]?.name || 'Unassigned',
              code: entry.code,
            };
          });

        // All teams assigned today (for unassigned calculation)
        const assignedTeamNames = [...new Set(assignedToday.map(item => item.teamName))];

        // Unassigned teams (teams without assignments today)
        const allTeamNames = localTeams.map(t => t.name);
        const unassignedTeams = allTeamNames.filter(team => !assignedTeamNames.includes(team));

        console.log('Assigned today:', assignedToday);
        console.log('Unassigned teams:', unassignedTeams);


        setTodayOnCall({ assigned: assignedToday, unassigned: unassignedTeams });

      } catch (error) {
        console.error('Overview data fetch error:', error);
        setTeamsError('Failed to load data');
      } finally {
        setLoadingTeams(false);
        setLoadingUsers(false);
        setLoadingSchedule(false);
      }
    };


    fetchData();
  }, []);

  const teamCount = localTeams.length;

    return (
        <div style={{ background: '#f9fafb', padding: '2rem 0', minHeight: '100vh' }}>
            <div className="container">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem' }}>
                        Matrix View: Overview
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '1.1rem', margin: 0 }}>
                        Week of January 8 - January 14, 2024
                    </p>
                </div>

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Weekly Coverage</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>97%</div>
                        <div style={{ color: '#10b981', fontWeight: 600 }}>↑ 3% from last week</div>
                    </div>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Active Rotations</div>

                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6' }}>{teamCount} Teams</div>

                        <div style={{ color: '#3b82f6', fontWeight: 600 }}>{localUsers.length} Staff</div>
                    </div>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Upcoming Holiday</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b' }}>Jan 19</div>
                        <div style={{ color: '#f59e0b', fontWeight: 600 }}>Encana Friday</div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <div style={{ color: '#991b1b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Coverage Gaps</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#991b1b' }}>2 Days</div>
                        <div style={{ color: '#991b1b', fontWeight: 600 }}>Wednesday, Friday</div>
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    {/* Left - Schedule Grid */}
                    <div>
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#111827' }}>Company-Wide Schedule</h2>
                            {/* Mock grid - replace with rotations.map */}
                            <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(7, 80px)', gap: '1px', background: '#f3f4f6' }}>
                                <div style={{ background: 'white', padding: '0.75rem', fontWeight: 600, borderRadius: '4px 0 0 4px' }}>Team</div>
                                <div style={{ background: 'white', padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}>Mon</div>
                                <div style={{ background: 'white', padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}>Tue</div>
                                <div style={{ background: 'white', padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}>Wed</div>
                                <div style={{ background: 'white', padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}>Thu</div>
                                <div style={{ background: 'white', padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}>Fri</div>
                                <div style={{ background: 'white', padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}>Sat</div>
                                <div style={{ background: 'white', padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}>Sun</div>
                                {/* Mock rows */}
                                <div style={{ background: 'white', padding: '0.75rem' }}>IT Support</div>
                                <div style={{ background: SCHEDULE_CODES.IT.bg, color: SCHEDULE_CODES.IT.color, textAlign: 'center', fontWeight: 700 }}>IT</div>
                                <div style={{ background: SCHEDULE_CODES.SD.bg, color: SCHEDULE_CODES.SD.color, textAlign: 'center', fontWeight: 700 }}>SD</div>
                                <div style={{ background: 'white' }}></div>
                                <div style={{ background: SCHEDULE_CODES.IT.bg, color: SCHEDULE_CODES.IT.color, textAlign: 'center', fontWeight: 700 }}>IT</div>
                                <div style={{ background: 'white' }}></div>
                                <div style={{ background: 'white' }}></div>
                                <div style={{ background: 'white' }}></div>
                                {/* More rows... */}
                            </div>
                        </div>

                        {/* Today's On-Call Focus */}
                        <div className="card">
                            <div className="card-header">
                                <h2 className="card-title">Today's On-Call Focus</h2>
                            </div>
                            {loadingSchedule ? (
                                <div className="loading">Loading today's schedule...</div>
                            ) : (
                                <>
                                    <div className="mb-6">

                                    <h4 className="text-label mb-2">Assigned Users ({todayOnCall?.assigned?.length || 0})</h4>

{todayOnCall?.assigned?.length === 0 ? (
    <div className="text-muted text-center py-8 bg-gray-50 rounded-lg">
        No users assigned today
    </div>
) : (
    <div className="space-y-2">
        {todayOnCall.assigned.map(({ userName, teamName, code }, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <div className="font-semibold text-gray-900">{userName}</div>
                    <div className="text-sm text-muted">{teamName}</div>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {code}
                </span>
            </div>
        ))}
    </div>
)}
                                    </div>

                                    <div>

                                        <h4 className="text-label mb-2">Unassigned Teams ({todayOnCall?.unassigned?.length || 0})</h4>

                                        {todayOnCall.unassigned.length === 0 ? (
                                            <div className="text-emerald-600 font-medium text-center py-8 bg-emerald-50 rounded-lg">
                                                ✅ All teams are assigned today
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {todayOnCall.unassigned.map((teamName, idx) => (
                                                    <div key={idx} className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm">
                                                        {teamName}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                        </div>

                    </div>

                    {/* Right Sidebar */}
                    <div>
{isAdminOrLead && (
                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#111827' }}>Team Lead Quick Actions</h2>
                                <button onClick={() => onNavigate('Teams')} className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>View Teams</button>


                                <button onClick={() => onNavigate('Rotations')} className="btn btn-primary" style={{ width: '100%', background: '#3b82f6' }}>View Rotations</button>

                            </div>
                        )}
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#111827' }}>My Managed Rotations</h2>
                            {/* Mock list */}
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>IT Support Rotation</div>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Jan 8 - Jan 14</div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Service Desk</div>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Jan 8 - Jan 14</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overview;

