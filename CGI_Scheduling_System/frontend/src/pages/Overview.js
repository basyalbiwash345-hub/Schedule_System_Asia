import React, { useState, useEffect, useMemo } from 'react';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOLIDAY_COLORS = { CA: '#2563eb', US: '#dc2626' };

// Working schedule codes (excluding vacations, absences, holidays, weekends)
const WORKING_CODES = new Set(['IT', 'CD', 'ES', 'MT', 'WS', 'EF', 'SD']);

const zeroTime = (date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatShortDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatDateRange = (start, end) => {
    if (!start || !end) return '';
    const startLabel = formatShortDate(start);
    const endLabel = formatShortDate(end);
    if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleString(undefined, { month: 'long' })} ${start.getDate()} – ${endLabel}`;
    }
    return `${startLabel} – ${endLabel}`;
};

const getCurrentWeekRange = (baseDate = new Date()) => {
    const date = zeroTime(baseDate);
    const dayIndex = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((dayIndex + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { weekStart: monday, weekEnd: sunday };
};

const getWeekDays = (weekStart) => {
    return Array.from({ length: 7 }, (_, idx) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + idx);
        return day;
    });
};

const buildRotationEvent = (rotation) => {
    const startDate = parseDate(rotation.start_date || rotation.startDate || rotation.date);
    const endDate = parseDate(rotation.end_date || rotation.endDate) || startDate;
    return {
        id: `rotation-${rotation.id}`,
        title: rotation.name || rotation.title || 'Rotation',
        description: rotation.teams?.name || rotation.team?.name || 'Rotation',
        category: 'Rotation',
        startDate,
        endDate,
        status: rotation.status || 'active',
        raw: rotation,
    };
};

const buildScheduleEvent = (entry, getUserTeam) => {
    const date = parseDate(entry.date);
    const teamName = getUserTeam(entry.user_id) || 'Unassigned';
    return {
        id: `schedule-${entry.id}`,
        title: teamName,
        description: `User ${entry.user_id}`,
        userId: entry.user_id,
        category: 'Schedule',
        startDate: date,
        endDate: date,
        status: entry.code || 'scheduled',
        raw: entry,
    };
};

const buildHolidayEvent = (holiday) => {
    const date = parseDate(holiday.date);
    return {
        id: `holiday-${holiday.countryCode}-${holiday.date}`,
        title: holiday.localName || holiday.name,
        description: holiday.countryCode,
        category: 'Holiday',
        startDate: date,
        endDate: date,
        countryCode: holiday.countryCode,
        raw: holiday,
    };
};

const getDateKeysForEvent = (event) => {
    const keys = [];
    if (!event.startDate) return keys;
    const current = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
    while (current <= end) {
        keys.push(toDateKey(current));
        current.setDate(current.getDate() + 1);
    }
    return keys;
};

const Overview = ({ users = [] }) => {
    const [matrixUsers, setMatrixUsers] = useState([]);
    const [rotations, setRotations] = useState([]);
    const [scheduleEvents, setScheduleEvents] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const today = useMemo(() => zeroTime(new Date()), []);
    const { weekStart, weekEnd } = useMemo(() => getCurrentWeekRange(today), [today]);
    const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
    const todayKey = useMemo(() => toDateKey(today), [today]);

    const getUserName = useMemo(() => {
        return (userId) => {
            const user = users.find((u) => String(u.id) === String(userId) || String(u.user_id) === String(userId));
            if (!user) return `User ${userId}`;
            if (user.name) return user.name;
            return [user.first_name, user.last_name].filter(Boolean).join(' ') || `User ${userId}`;
        };
    }, [users]);

    const getUserTeam = useMemo(() => {
        return (userId) => {
            // First try matrix users (has complete team data from matrix-users endpoint)
            let user = matrixUsers.find((u) => String(u.id) === String(userId) || String(u.user_id) === String(userId));
            
            // Fallback to regular users if not found
            if (!user) {
                user = users.find((u) => String(u.id) === String(userId) || String(u.user_id) === String(userId));
            }
            
            if (!user) return null;
            
            // Try to find team name from teams array
            if (user.teams && Array.isArray(user.teams) && user.teams.length > 0) {
                return user.teams[0].name || user.teams[0];
            }
            
            // Try single team property variations
            if (typeof user.team === 'string') return user.team;
            if (user.team?.name) return user.team.name;
            
            // If no team found, return null (will show as 'Unassigned')
            return null;
        };
    }, [matrixUsers, users]);

    const monthsToFetch = useMemo(() => {
        const monthKeys = new Set();
        const startMonth = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}`;
        monthKeys.add(startMonth);
        const endMonth = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}`;
        monthKeys.add(endMonth);
        return Array.from(monthKeys);
    }, [weekStart, weekEnd]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const fetchMatrixUsers = async () => {
            console.log('Overview: fetching /api/matrix-users');
            try {
                const response = await fetch('/api/matrix-users', { headers });
                if (response.ok) {
                    const data = await response.json();
                    console.log('Overview: matrix-users response', data);
                    setMatrixUsers(Array.isArray(data) ? data : []);
                } else {
                    console.warn('Matrix users fetch failed:', response.status);
                }
            } catch (err) {
                console.warn('Matrix users fetch error:', err);
            }
        };

        const fetchRotations = async () => {
            console.log('Overview: fetching /api/rotations');
            const response = await fetch('/api/rotations', { headers });
            if (!response.ok) throw new Error(`Rotations fetch failed: ${response.status} ${response.statusText}`);
            const data = await response.json();
            console.log('Overview: rotations response', data);
            setRotations(Array.isArray(data) ? data : []);
        };

        const fetchSchedule = async () => {
            console.log('Overview: fetching /api/schedule for months', monthsToFetch);
            const responses = await Promise.all(monthsToFetch.map((month) =>
                fetch(`/api/schedule?month=${month}`, { headers })
                    .then((res) => {
                        if (!res.ok) throw new Error(`Schedule fetch failed for ${month}: ${res.status}`);
                        return res.json();
                    })
            ));
            const merged = responses.flat();
            console.log('Overview: schedule response', merged);
            setScheduleEvents(Array.isArray(merged) ? merged : []);
        };

        const fetchHolidays = async () => {
            const year = today.getFullYear();
            const urls = [
                `https://date.nager.at/api/v3/PublicHolidays/${year}/CA`,
                `https://date.nager.at/api/v3/PublicHolidays/${year}/US`,
            ];
            console.log('Overview: fetching holidays', urls);
            const results = await Promise.all(urls.map((url) =>
                fetch(url).then((res) => {
                    if (!res.ok) {
                        console.warn('Holiday fetch failed', url, res.status);
                        return [];
                    }
                    return res.json();
                })
            ));
            const merged = results.flat();
            console.log('Overview: holidays response', merged);
            setHolidays(Array.isArray(merged) ? merged : []);
        };

        const loadAllData = async () => {
            setLoading(true);
            setError('');
            try {
                await Promise.all([fetchMatrixUsers(), fetchRotations(), fetchSchedule(), fetchHolidays()]);
            } catch (err) {
                console.error('Overview: data load error', err);
                setError(err?.message || 'Unable to load overview data.');
            } finally {
                setLoading(false);
            }
        };

        loadAllData();
    }, [monthsToFetch, today]);

    const rotationEvents = useMemo(() => {
        return rotations
            .map(buildRotationEvent)
            .filter((event) => event.startDate && event.endDate && event.startDate <= weekEnd && event.endDate >= weekStart);
    }, [rotations, weekStart, weekEnd]);

    const scheduleEventsNormalized = useMemo(() => {
        return scheduleEvents
            .map((entry) => buildScheduleEvent(entry, getUserTeam))
            .filter((event) => event.startDate && event.startDate >= weekStart && event.startDate <= weekEnd);
    }, [scheduleEvents, weekStart, weekEnd, getUserTeam]);

    const holidayEvents = useMemo(() => {
        return holidays
            .map(buildHolidayEvent)
            .filter((event) => event.startDate && event.startDate >= weekStart && event.startDate <= weekEnd);
    }, [holidays, weekStart, weekEnd]);

    const mergedEvents = useMemo(() => {
        return [...rotationEvents, ...scheduleEventsNormalized, ...holidayEvents];
    }, [rotationEvents, scheduleEventsNormalized, holidayEvents]);

    const eventsByDay = useMemo(() => {
        const grouped = weekDays.reduce((acc, day) => {
            acc[toDateKey(day)] = [];
            return acc;
        }, {});
        mergedEvents.forEach((event) => {
            getDateKeysForEvent(event).forEach((key) => {
                if (grouped[key]) grouped[key].push(event);
            });
        });
        return grouped;
    }, [mergedEvents, weekDays]);

    const todayEvents = useMemo(() => eventsByDay[toDateKey(today)] || [], [eventsByDay, today]);

    const todayScheduleEmployees = useMemo(() => {
        const scheduleUsers = todayEvents
            .filter((event) => event.category === 'Schedule' && event.userId != null && WORKING_CODES.has(event.status))
            .map((event) => getUserName(event.userId));
        return Array.from(new Set(scheduleUsers));
    }, [todayEvents, getUserName]);

    const upcomingEvents = useMemo(() => {
        return mergedEvents
            .filter((event) => event.startDate && event.startDate >= today)
            .sort((a, b) => a.startDate - b.startDate)
            .slice(0, 6);
    }, [mergedEvents, today]);

    const busyDays = useMemo(() => {
        return weekDays.map((day) => {
            const key = toDateKey(day);
            const count = eventsByDay[key]?.length || 0;
            return { day, count, busy: count >= 2 };
        });
    }, [eventsByDay, weekDays]);

    const weeklyStats = useMemo(() => {
        const totalEvents = mergedEvents.length;
        const rotationCount = rotationEvents.length;
        const holidayCount = holidayEvents.length;
        const scheduleCount = scheduleEventsNormalized.length;
        return { totalEvents, rotationCount, scheduleCount, holidayCount };
    }, [mergedEvents.length, rotationEvents.length, scheduleEventsNormalized.length, holidayEvents.length]);

    const getEventLabel = (event) => {
        if (event.category === 'Holiday') return `${event.title} (${event.description})`;
        if (event.category === 'Schedule') return `${event.title} · ${event.userId ? getUserName(event.userId) : event.description}`;
        return `${event.title} · ${event.description}`;
    };

    const badgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600 };
    const sectionHeadingStyle = { margin: '0 0 1rem', color: '#111827' };

    if (loading) {
        return (
            <div className="enterprise-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <h3 style={{ margin: 0 }}>Loading overview</h3>
                <p style={{ color: '#6b7280', marginTop: '0.75rem' }}>Connecting to backend APIs and fetching this week’s data.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="enterprise-card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#fecaca', background: '#fef2f2' }}>
                <h3 style={{ margin: 0, color: '#991b1b' }}>Unable to load overview</h3>
                <p style={{ color: '#991b1b', marginTop: '0.75rem' }}>{error}</p>
                <p style={{ color: '#6b7280', marginTop: '1rem' }}>Open DevTools network tab and confirm /api/rotations and /api/schedule requests.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end' }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#111827' }}>Weekly Overview</h2>
                        <p style={{ margin: '0.4rem 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
                            {formatDateRange(weekStart, weekEnd)} · {weeklyStats.totalEvents} total items
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ ...badgeStyle, background: '#eef2ff', color: '#1d4ed8' }}>{weeklyStats.rotationCount} rotations</span>
                        <span style={{ ...badgeStyle, background: '#ecfdf5', color: '#166534' }}>{weeklyStats.scheduleCount} schedule items</span>
                        <span style={{ ...badgeStyle, background: '#fee2e2', color: '#b91c1c' }}>{weeklyStats.holidayCount} holidays</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                <section className="enterprise-card" style={{ padding: '1.25rem' }}>
                    <h3 style={sectionHeadingStyle}>Weekly Calendar Summary</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                        {weekDays.map((day, idx) => {
                            const key = toDateKey(day);
                            const dayEvents = eventsByDay[key] || [];
                            const isToday = key === todayKey;
                            const holiday = holidayEvents.find((item) => item.startDate && toDateKey(item.startDate) === key);
                            return (
                                <div key={key} style={{
                                    background: '#ffffff',
                                    borderRadius: '14px',
                                    border: isToday ? '2px solid #e31937' : '1px solid #e5e7eb',
                                    padding: '1rem',
                                    minHeight: '140px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{SHORT_WEEK[idx]}</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{day.getDate()}</div>
                                        </div>
                                        {holiday && (
                                            <span style={{ ...badgeStyle, background: HOLIDAY_COLORS[holiday.countryCode] + '22', color: HOLIDAY_COLORS[holiday.countryCode] }}>
                                                Holiday
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                                        {dayEvents.length} item{dayEvents.length === 1 ? '' : 's'}
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>
                                        {dayEvents.length > 0 ? getEventLabel(dayEvents[0]) : 'No events'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }}>
                    <section className="enterprise-card" style={{ padding: '1.25rem' }}>
                        <h3 style={sectionHeadingStyle}>Today's Schedule</h3>
                        {todayEvents.length === 0 ? (
                            <div style={{ color: '#6b7280' }}>No events scheduled for today.</div>
                        ) : (
                            <>
                                {todayScheduleEmployees.length > 0 && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Employees working today:</div>
                                        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#374151' }}>
                                            {todayScheduleEmployees.map((name) => (
                                                <li key={name} style={{ marginBottom: '0.25rem' }}>{name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div style={{ display: 'grid', gap: '0.85rem' }}>
                                    {todayEvents.map((event) => {
                                        const employeeLabel = event.category === 'Schedule' && event.userId ? getUserName(event.userId) : null;
                                        return (
                                            <div key={event.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>{event.title}</div>
                                                    <span style={{ ...badgeStyle, background: event.category === 'Holiday' ? '#fee2e2' : '#eef2ff', color: event.category === 'Holiday' ? '#b91c1c' : '#1d4ed8' }}>{event.category}</span>
                                                </div>
                                                <div style={{ marginTop: '0.5rem', color: '#4b5563', fontSize: '0.88rem' }}>
                                                    {employeeLabel || event.description}
                                                </div>
                                                <div style={{ marginTop: '0.75rem', color: '#6b7280', fontSize: '0.85rem' }}>Date: {event.startDate ? formatShortDate(event.startDate) : 'TBD'}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </section>

                    <section className="enterprise-card" style={{ padding: '1.25rem' }}>
                        <h3 style={sectionHeadingStyle}>Weekly Stats</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Total items this week</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>{weeklyStats.totalEvents}</div>
                            </div>
                            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Rotation entries</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>{weeklyStats.rotationCount}</div>
                            </div>
                            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Scheduled items</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>{weeklyStats.scheduleCount}</div>
                            </div>
                            <div style={{ padding: '1rem', background: '#fff1f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                                <div style={{ fontSize: '0.85rem', color: '#991b1b' }}>Holidays</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#991b1b' }}>{weeklyStats.holidayCount}</div>
                            </div>
                        </div>
                    </section>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <section className="enterprise-card" style={{ padding: '1.25rem' }}>
                        <h3 style={sectionHeadingStyle}>Upcoming This Week</h3>
                        {upcomingEvents.length === 0 ? (
                            <div style={{ color: '#6b7280' }}>No upcoming events found for the rest of this week.</div>
                        ) : (
                            <div style={{ display: 'grid', gap: '0.85rem' }}>
                                {upcomingEvents.map((event) => (
                                    <div key={event.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                        <div style={{ fontWeight: 700, color: '#111827' }}>{event.title}</div>
                                        <div style={{ color: '#4b5563', marginTop: '0.4rem' }}>{event.description}</div>
                                        <div style={{ color: '#6b7280', marginTop: '0.5rem' }}>{event.startDate ? formatShortDate(event.startDate) : 'TBD'}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="enterprise-card" style={{ padding: '1.25rem' }}>
                        <h3 style={sectionHeadingStyle}>Busy vs Free Days</h3>
                        <div style={{ display: 'grid', gap: '0.85rem' }}>
                            {busyDays.map(({ day, count, busy }) => (
                                <div key={toDateKey(day)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '12px', background: busy ? '#fef2f2' : '#eff6ff', border: '1px solid #e5e7eb' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#111827' }}>{DAY_NAMES[(day.getDay() + 6) % 7]}</div>
                                        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{count} item{count === 1 ? '' : 's'}</div>
                                    </div>
                                    <span style={{ ...badgeStyle, background: busy ? '#fee2e2' : '#e0f2fe', color: busy ? '#b91c1c' : '#0c4a6e' }}>{busy ? 'Busy' : 'Free'}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <section className="enterprise-card" style={{ padding: '1.25rem' }}>
                    <h3 style={sectionHeadingStyle}>Holidays</h3>
                    {holidayEvents.length === 0 ? (
                        <div style={{ color: '#6b7280' }}>No holidays are scheduled for this week in Canada or the US.</div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.85rem' }}>
                            {holidayEvents.map((holiday) => (
                                <div key={holiday.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 700, color: '#111827' }}>{holiday.title}</div>
                                        <span style={{ ...badgeStyle, background: HOLIDAY_COLORS[holiday.countryCode] + '22', color: HOLIDAY_COLORS[holiday.countryCode] }}>{holiday.countryCode}</span>
                                    </div>
                                    <div style={{ marginTop: '0.5rem', color: '#4b5563' }}>{holiday.startDate ? formatShortDate(holiday.startDate) : holiday.raw.date}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Overview;
