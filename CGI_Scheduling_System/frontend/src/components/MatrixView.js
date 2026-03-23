import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box, Typography, Chip, Select, MenuItem, FormControl,
    InputLabel, Tooltip, Paper, IconButton, CircularProgress,
    ToggleButton, ToggleButtonGroup, TextField
} from '@mui/material';
import {
    ChevronLeft as PrevIcon,
    ChevronRight as NextIcon,
    Today as TodayIcon,
    CalendarMonth as MonthIcon,
    DateRange as DateRangeIcon,
} from '@mui/icons-material';
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
    useDroppable, useDraggable,
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy,
    useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];
const DAY_ABBREVS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const CODE_COLORS = {
    'V':    { bg: '#fef3c7', color: '#92400e', label: 'Vacation' },
    'MV':   { bg: '#fde68a', color: '#78350f', label: 'Morning Vacation' },
    'AV':   { bg: '#fcd34d', color: '#78350f', label: 'Afternoon Vacation' },
    'PV':   { bg: '#e5e7eb', color: '#6b7280', label: 'Pending Vacation' },
    'A':    { bg: '#fee2e2', color: '#991b1b', label: 'Absence' },
    'CD':   { bg: '#dbeafe', color: '#1e40af', label: 'SPOC CDO Stewards' },
    'IT':   { bg: '#ede9fe', color: '#5b21b6', label: 'SPOC IT Services' },
    'ES':   { bg: '#fce7f3', color: '#9d174d', label: 'SPOC Escalation' },
    'MT':   { bg: '#d1fae5', color: '#065f46', label: 'Mountain Time' },
    'SD':   { bg: '#ffedd5', color: '#9a3412', label: 'Service Desk' },
    'CLEAR':{ bg: '#f3f4f6', color: '#6b7280', label: 'Clear cell' },
};

const CELL  = 28;
const NAME_W = 200;

// ── DATE HELPERS ──────────────────────────────────────────────────────────────
const getDatesForMonth = (monthIdx) =>
    Array.from({ length: DAYS_IN_MONTH[monthIdx] }, (_, i) =>
        `2026-${String(monthIdx + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    );

const getDatesForRange = (startDate, endDate) => {
    if (!startDate || !endDate) return [];
    const dates = [];
    const cur = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (cur > end) return [];
    // Cap at 365 days to avoid massive grids
    let count = 0;
    while (cur <= end && count < 365) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
        count++;
    }
    return dates;
};

const getDayOfWeek = (d) => new Date(d + 'T00:00:00').getDay();
const isWeekend    = (d) => { const dow = getDayOfWeek(d); return dow === 0 || dow === 6; };

// Get unique months covered by a date range for fetching
const getMonthsInRange = (dates) => {
    const months = new Set();
    dates.forEach(d => months.add(d.substring(0, 7)));
    return Array.from(months);
};

// ── DRAGGABLE CODE CHIP ───────────────────────────────────────────────────────
function DraggableCode({ code, cfg, highlightCode, activeCode, onCodeClick }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `code-${code}`, data: { type: 'code', code }
    });
    const isActive = activeCode === code;
    return (
        <Tooltip title={isActive ? `${cfg.label} — click cells to assign (Esc to cancel)` : cfg.label} placement="bottom">
            <Chip
                ref={setNodeRef} {...attributes} {...listeners}
                label={code} size="small"
                onClick={(e) => { e.stopPropagation(); onCodeClick(code); }}
                sx={{
                    backgroundColor: isActive ? cfg.color : highlightCode === code ? cfg.color : cfg.bg,
                    color: isActive || highlightCode === code ? '#fff' : cfg.color,
                    fontWeight: 800, fontSize: '0.68rem',
                    cursor: isActive ? 'crosshair' : 'grab', height: 24,
                    border: `2px solid ${isActive ? cfg.color : cfg.color + '33'}`,
                    outline: isActive ? `3px solid ${cfg.color}66` : 'none',
                    outlineOffset: '2px',
                    opacity: isDragging ? 0.35 : 1,
                    transition: 'all 0.12s',
                    touchAction: 'none',
                    userSelect: 'none',
                    transform: isActive ? 'translateY(-2px)' : 'none',
                    boxShadow: isActive ? `0 4px 12px ${cfg.color}55` : 'none',
                    '&:hover': { backgroundColor: cfg.color, color: '#fff', transform: 'translateY(-1px)', boxShadow: `0 2px 8px ${cfg.color}55` },
                }}
            />
        </Tooltip>
    );
}

// ── DROPPABLE CELL ────────────────────────────────────────────────────────────
function DroppableCell({ id, code, cfg, isToday, isWeekendDay, empIdx, isRangeTarget, activeCode }) {
    const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'cell' } });
    const highlight = isOver || isRangeTarget;
    return (
        <Box ref={setNodeRef} sx={{
            width: CELL, minWidth: CELL, flexShrink: 0, height: CELL,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: highlight ? '#fef2f2'
                : isToday ? '#fff7f7'
                    : isWeekendDay ? (empIdx % 2 === 0 ? '#f9fafb' : '#f4f4f5')
                        : 'transparent',
            borderLeft: isToday ? '2px solid #e31937' : '1px solid #f3f4f6',
            outline: highlight ? '2px solid #e31937' : activeCode ? '1px dashed #e31937' : 'none',
            outlineOffset: '-2px',
            cursor: activeCode ? 'crosshair' : 'default',
            transition: 'background 0.08s',
            '&:hover': activeCode ? { backgroundColor: '#fef2f2', outline: '2px solid #e31937' } : {},
        }}>
            {code && (
                <Box sx={{
                    width: CELL - 4, height: CELL - 4, borderRadius: '4px',
                    backgroundColor: cfg?.bg || '#e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}>
                    <Typography fontSize="0.58rem" fontWeight={800}
                                color={cfg?.color || '#6b7280'}
                                sx={{ letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {code}
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

// ── SORTABLE EMPLOYEE ROW ─────────────────────────────────────────────────────
function SortableRow({ emp, dates, schedule, today, highlightCode, teamColor, empIdx, rangeDrag, activeCode, onCellClick }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: String(emp.id) });

    const overlayRef = React.useRef(null);

    // Click handler on the transparent overlay — completely above dnd-kit
    const handleOverlayClick = React.useCallback((e) => {
        if (!activeCode || !onCellClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const cellIndex = Math.floor(x / CELL);
        if (cellIndex >= 0 && cellIndex < dates.length) {
            onCellClick(`${emp.id}_${dates[cellIndex]}`);
        }
    }, [activeCode, onCellClick, dates, emp.id]);

    return (
        <Box ref={setNodeRef}
             style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
             sx={{
                 display: 'flex',
                 backgroundColor: empIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                 '&:hover': { backgroundColor: '#fef9f9' },
                 borderBottom: '1px solid #f0f0f0',
                 transition: 'background 0.08s',
                 position: 'relative',
             }}>

            {/* Name cell */}
            <Box sx={{
                width: NAME_W, minWidth: NAME_W, flexShrink: 0,
                position: 'sticky', left: 0, zIndex: 5,
                backgroundColor: empIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                borderRight: '2px solid #e5e7eb',
                borderLeft: `3px solid ${teamColor}`,
                display: 'flex', alignItems: 'center', px: 1, gap: 0.75, height: CELL,
            }}>
                <Box {...attributes} {...listeners} sx={{
                    cursor: 'grab', color: '#e5e7eb', fontSize: '0.85rem',
                    px: 0.25, flexShrink: 0, lineHeight: 1,
                    '&:hover': { color: '#9ca3af' },
                    '&:active': { cursor: 'grabbing' },
                }}>⠿</Box>
                <Box sx={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: teamColor + '20', color: teamColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 800,
                }}>
                    {emp.name.charAt(0)}
                </Box>
                <Typography fontSize="0.76rem" fontWeight={500} color="#374151" noWrap>
                    {emp.name}
                </Typography>
            </Box>

            {/* Schedule cells */}
            <Box sx={{ display: 'flex' }}>
                {dates.map(date => {
                    const entry  = schedule[`${emp.id}_${date}`];
                    const code   = entry?.code?.toUpperCase() || null;
                    const cfg    = code ? CODE_COLORS[code] : null;
                    const dimmed = highlightCode && code !== highlightCode;
                    const isRangeTarget = rangeDrag?.empId === emp.id && rangeDrag?.dates?.includes(date);
                    return (
                        <Box key={date} sx={{ opacity: dimmed ? 0.1 : 1, transition: 'opacity 0.12s' }}>
                            <DroppableCell
                                id={`${emp.id}_${date}`}
                                code={code} cfg={cfg}
                                isToday={date === today}
                                isWeekendDay={isWeekend(date)}
                                empIdx={empIdx}
                                isRangeTarget={isRangeTarget}
                                activeCode={activeCode}
                            />
                        </Box>
                    );
                })}
            </Box>


        </Box>
    );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function MatrixView() {
    // View mode: 'month' | 'range'
    const [viewMode,       setViewMode]       = useState('month');
    const [selectedMonth,  setSelectedMonth]  = useState(new Date().getMonth());
    const [rangeStart,     setRangeStart]     = useState('');
    const [rangeEnd,       setRangeEnd]       = useState('');
    const [filterTeams,    setFilterTeams]    = useState([]);
    const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
    const [highlightCode,  setHighlightCode]  = useState(null);
    const [employees,      setEmployees]      = useState([]);
    const [employeeOrder,  setEmployeeOrder]  = useState([]);
    const [schedule,       setSchedule]       = useState({});
    const [loading,        setLoading]        = useState(true);
    const [scheduleLoading,setScheduleLoading]= useState(false);
    const [activeDrag,     setActiveDrag]     = useState(null);
    const [activeCode,     setActiveCode]     = useState(null); // click-to-assign mode
    const [rangeDrag,      setRangeDrag]      = useState(null);
    const todayRef = useRef(null);
    const dropdownRef = useRef(null);
    const gridRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setTeamDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Escape key deselects active code
    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') setActiveCode(null); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Grid-level click handler moved below dates/grouped declarations

    const today = new Date().toISOString().split('T')[0];

    // Compute dates based on view mode
    const dates = viewMode === 'month'
        ? getDatesForMonth(selectedMonth)
        : getDatesForRange(rangeStart, rangeEnd);

    const month = `2026-${String(selectedMonth + 1).padStart(2, '0')}`;

    // When click-to-assign is active, disable dnd by requiring huge drag distance
    // This lets pointer events reach our row-level click handler
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: activeCode ? 99999 : 1 }
    }));

    // ── FETCH EMPLOYEES ───────────────────────────────────────────────────────
    const fetchEmployees = useCallback(async () => {
        try {
            const res  = await fetch('/api/matrix-users');
            const data = await res.json();
            setEmployees(data);
            setEmployeeOrder(data.map(e => String(e.id)));
        } catch { setEmployees([]); }
    }, []);

    // ── FETCH SCHEDULE ────────────────────────────────────────────────────────
    const fetchScheduleForMonths = useCallback(async (monthList) => {
        const allEntries = [];
        await Promise.all(monthList.map(async (m) => {
            try {
                const res  = await fetch(`/api/schedule?month=${m}`);
                const data = await res.json();
                allEntries.push(...data);
            } catch {}
        }));
        const map = {};
        allEntries.forEach(e => { map[`${e.user_id}_${e.date}`] = e; });
        return map;
    }, []);

    const fetchSchedule = useCallback(async (datesToFetch) => {
        setScheduleLoading(true);
        const months = datesToFetch.length > 0
            ? getMonthsInRange(datesToFetch)
            : [month];
        const map = await fetchScheduleForMonths(months);
        setSchedule(map);
        setScheduleLoading(false);
    }, [month, fetchScheduleForMonths]);

    // Initial load
    useEffect(() => {
        setLoading(true);
        fetchEmployees().finally(() => setLoading(false));
    }, [fetchEmployees]);

    // Fetch schedule when month changes (month mode)
    useEffect(() => {
        if (viewMode === 'month') {
            fetchSchedule(getDatesForMonth(selectedMonth));
        }
    }, [selectedMonth, viewMode]);

    // Fetch schedule when date range changes (range mode)
    useEffect(() => {
        if (viewMode === 'range' && rangeStart && rangeEnd && rangeStart <= rangeEnd) {
            const rangeDates = getDatesForRange(rangeStart, rangeEnd);
            if (rangeDates.length > 0) fetchSchedule(rangeDates);
        }
    }, [rangeStart, rangeEnd, viewMode]);

    // Scroll today into view in month mode
    useEffect(() => {
        if (viewMode === 'month' && todayRef.current) {
            todayRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [selectedMonth, viewMode]);

    // ── SAVE / CLEAR CELL ─────────────────────────────────────────────────────
    const saveCell = async (userId, date, code) => {
        if (code === 'CLEAR') {
            const existing = schedule[`${userId}_${date}`];
            if (existing?.id) {
                await fetch(`/api/schedule/${existing.id}`, { method: 'DELETE' });
                setSchedule(prev => { const n = { ...prev }; delete n[`${userId}_${date}`]; return n; });
            }
            return;
        }
        // Optimistic update
        setSchedule(prev => ({ ...prev, [`${userId}_${date}`]: { user_id: userId, date, code } }));
        const res = await fetch('/api/schedule', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, date, code }),
        });
        if (res.ok) {
            const entry = await res.json();
            setSchedule(prev => ({ ...prev, [`${userId}_${date}`]: entry }));
        }
    };

    // ── CELL CLICK (click-to-assign mode) ────────────────────────────────────
    const handleCellClick = useCallback(async (cellId) => {
        if (!activeCode) return;
        const [userId, date] = cellId.split('_');
        await saveCell(Number(userId), date, activeCode);
    }, [activeCode, saveCell]);

    // ── DRAG HANDLERS ─────────────────────────────────────────────────────────
    const handleDragStart = ({ active }) => {
        setActiveDrag(active);
        if (active.data.current?.type === 'cell') {
            const entry = schedule[active.id];
            if (entry?.code) {
                const [userId, date] = active.id.split('_');
                setRangeDrag({ empId: Number(userId), startDate: date, dates: [date], code: entry.code });
            }
        }
    };

    const handleDragOver = ({ over }) => {
        if (!over || !rangeDrag || over.data.current?.type !== 'cell') return;
        const [ovUserId, ovDate] = over.id.split('_');
        if (Number(ovUserId) !== rangeDrag.empId) return;
        const si = dates.indexOf(rangeDrag.startDate);
        const ei = dates.indexOf(ovDate);
        if (si === -1 || ei === -1) return;
        const [lo, hi] = si <= ei ? [si, ei] : [ei, si];
        setRangeDrag(prev => {
            if (!prev) return prev;
            const newDates = dates.slice(lo, hi + 1);
            if (prev.dates.length === newDates.length && prev.dates[0] === newDates[0]) return prev;
            return { ...prev, dates: newDates };
        });
    };

    const handleDragEnd = async ({ active, over }) => {
        setActiveDrag(null);

        // Row reorder
        if (active.data.current?.type !== 'code' && active.data.current?.type !== 'cell') {
            if (over && active.id !== over.id) {
                setEmployeeOrder(prev => {
                    const oi = prev.indexOf(active.id);
                    const ni = prev.indexOf(over.id);
                    return arrayMove(prev, oi, ni);
                });
            }
            setRangeDrag(null);
            return;
        }

        // Range fill
        if (rangeDrag?.dates?.length > 0) {
            for (const date of rangeDrag.dates) await saveCell(rangeDrag.empId, date, rangeDrag.code);
            setRangeDrag(null);
            return;
        }

        // Code chip → cell
        if (!over) { setRangeDrag(null); return; }
        const code = active.data.current?.code;
        if (!code || typeof over.id !== 'string' || !over.id.includes('_')) { setRangeDrag(null); return; }
        const [userId, date] = over.id.split('_');
        await saveCell(Number(userId), date, code);
        setRangeDrag(null);
    };

    // ── DERIVED ───────────────────────────────────────────────────────────────
    const uniqueTeams = Array.from(new Set(employees.map(e => e.team_name))).sort();

    const orderedEmployees = employeeOrder
        .map(id => employees.find(e => String(e.id) === id))
        .filter(Boolean)
        .filter(e => filterTeams.length === 0 || filterTeams.includes(e.team_name));

    const grouped = orderedEmployees.reduce((acc, emp) => {
        if (!acc[emp.team_name]) acc[emp.team_name] = [];
        acc[emp.team_name].push(emp);
        return acc;
    }, {});

    // Grid-level click handler for click-to-assign mode
    // Uses native DOM event listener which fires BEFORE React/dnd-kit synthetic events
    useEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;
        const handler = (e) => {
            if (!activeCode) return;
            const rect = grid.getBoundingClientRect();
            const scrollLeft = grid.scrollLeft;
            const scrollTop  = grid.scrollTop;
            const x = e.clientX - rect.left + scrollLeft;
            const y = e.clientY - rect.top  + scrollTop;
            const HEADER_HEIGHT = 68;
            if (y < HEADER_HEIGHT) return;
            if (x < NAME_W) return;
            const cellIndex = Math.floor((x - NAME_W) / CELL);
            if (cellIndex < 0 || cellIndex >= dates.length) return;
            const clickedDate = dates[cellIndex];
            let runningY = HEADER_HEIGHT;
            for (const [, emps] of Object.entries(grouped)) {
                runningY += 28; // team header row height
                for (const emp of emps) {
                    if (y >= runningY && y < runningY + CELL) {
                        handleCellClick(`${emp.id}_${clickedDate}`);
                        return;
                    }
                    runningY += CELL;
                }
            }
        };
        grid.addEventListener('click', handler, { capture: true });
        return () => grid.removeEventListener('click', handler, { capture: true });
    }, [activeCode, dates, grouped, handleCellClick]);

    const absenceCount = Object.fromEntries(
        dates.map(date => [
            date,
            orderedEmployees.filter(e =>
                ['V','MV','AV','A'].includes((schedule[`${e.id}_${date}`]?.code || '').toUpperCase())
            ).length,
        ])
    );

    const rangeValid = viewMode === 'range' && rangeStart && rangeEnd && rangeStart <= rangeEnd;
    const rangeTooBig = viewMode === 'range' && dates.length > 365;

    // ── RANGE DATE HEADER LABEL ───────────────────────────────────────────────
    const getDateHeaderLabel = (date) => {
        // In range mode show month label when date is 1st or first date in range
        if (viewMode === 'range') {
            const day = parseInt(date.split('-')[2]);
            const isFirstInRange = date === dates[0];
            const isFirstOfMonth = day === 1;
            if (isFirstInRange || isFirstOfMonth) {
                const [, m] = date.split('-');
                return MONTHS[parseInt(m) - 1].substring(0, 3);
            }
        }
        return null;
    };

    if (loading) return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 2 }}>
            <CircularProgress sx={{ color: '#e31937' }} />
            <Typography fontSize="0.85rem" color="#9ca3af">Loading schedule...</Typography>
        </Box>
    );

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <Box>
                {/* ── TOOLBAR ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>

                    {/* View mode toggle */}
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, v) => { if (v) setViewMode(v); }}
                        size="small"
                        sx={{
                            border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden',
                            '& .MuiToggleButton-root': { border: 'none', borderRadius: 0, px: 1.5, py: 0.75, fontSize: '0.8rem', textTransform: 'none', color: '#6b7280', fontWeight: 500 },
                            '& .MuiToggleButton-root.Mui-selected': { backgroundColor: '#fef2f2', color: '#e31937', fontWeight: 700 },
                            '& .MuiToggleButton-root:hover': { backgroundColor: '#fef2f2', color: '#e31937' },
                        }}
                    >
                        <ToggleButton value="month">
                            <MonthIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} /> Month
                        </ToggleButton>
                        <ToggleButton value="range">
                            <DateRangeIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} /> Date Range
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {/* Month navigator — only in month mode */}
                    {viewMode === 'month' && (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                <IconButton size="small" onClick={() => setSelectedMonth(m => Math.max(0, m - 1))}
                                            disabled={selectedMonth === 0}
                                            sx={{ borderRadius: 0, px: 1, '&:hover': { backgroundColor: '#fef2f2', color: '#e31937' } }}>
                                    <PrevIcon fontSize="small" />
                                </IconButton>
                                <Box sx={{ px: 2.5, py: 0.75, minWidth: 140, textAlign: 'center', borderLeft: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6' }}>
                                    <Typography fontWeight={700} fontSize="0.9rem" color="#111827">{MONTHS[selectedMonth]}</Typography>
                                    <Typography fontSize="0.68rem" color="#9ca3af" fontWeight={500}>2026</Typography>
                                </Box>
                                <IconButton size="small" onClick={() => setSelectedMonth(m => Math.min(11, m + 1))}
                                            disabled={selectedMonth === 11}
                                            sx={{ borderRadius: 0, px: 1, '&:hover': { backgroundColor: '#fef2f2', color: '#e31937' } }}>
                                    <NextIcon fontSize="small" />
                                </IconButton>
                            </Box>

                            <Box onClick={() => setSelectedMonth(new Date().getMonth())}
                                 sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: '8px', px: 1.5, py: 0.75, color: '#e31937', fontWeight: 600, fontSize: '0.82rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', '&:hover': { backgroundColor: '#fef2f2', borderColor: '#e31937' }, transition: 'all 0.12s' }}>
                                <TodayIcon sx={{ fontSize: '1rem' }} />
                                <Typography fontSize="0.82rem" fontWeight={600}>Today</Typography>
                            </Box>
                        </>
                    )}

                    {/* Date range pickers — only in range mode */}
                    {viewMode === 'range' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', px: 1.5, py: 0.75 }}>
                            <TextField
                                label="Start Date"
                                type="date"
                                size="small"
                                value={rangeStart}
                                onChange={e => setRangeStart(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    width: 160,
                                    '& .MuiOutlinedInput-root': { borderRadius: '6px', '&.Mui-focused fieldset': { borderColor: '#e31937' } },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#e31937' },
                                }}
                            />
                            <Typography fontSize="0.85rem" color="#9ca3af" fontWeight={500}>to</Typography>
                            <TextField
                                label="End Date"
                                type="date"
                                size="small"
                                value={rangeEnd}
                                onChange={e => setRangeEnd(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: rangeStart }}
                                sx={{
                                    width: 160,
                                    '& .MuiOutlinedInput-root': { borderRadius: '6px', '&.Mui-focused fieldset': { borderColor: '#e31937' } },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#e31937' },
                                }}
                            />
                            {rangeValid && (
                                <Typography fontSize="0.75rem" color="#6b7280" sx={{ whiteSpace: 'nowrap' }}>
                                    {dates.length} day{dates.length !== 1 ? 's' : ''}
                                </Typography>
                            )}
                            {scheduleLoading && <CircularProgress size={16} sx={{ color: '#e31937' }} />}
                        </Box>
                    )}

                    {/* Multi-select team filter */}
                    <Box ref={dropdownRef} sx={{ position: 'relative' }}>
                        <Box
                            onClick={() => setTeamDropdownOpen(o => !o)}
                            sx={{
                                display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5,
                                minWidth: 200, maxWidth: 340, minHeight: 38,
                                border: teamDropdownOpen ? '1px solid #e31937' : '1px solid #e5e7eb',
                                borderRadius: '8px', px: 1.25, py: 0.5, cursor: 'pointer',
                                backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                transition: 'border 0.12s',
                            }}
                        >
                            {filterTeams.length === 0 ? (
                                <Typography fontSize="0.85rem" color="#9ca3af">Filter by Team...</Typography>
                            ) : (
                                filterTeams.map(t => (
                                    <Chip
                                        key={t}
                                        label={t}
                                        size="small"
                                        onDelete={(e) => { e.stopPropagation(); setFilterTeams(prev => prev.filter(x => x !== t)); }}
                                        sx={{ height: 20, fontSize: '0.68rem', backgroundColor: '#fef2f2', color: '#e31937', fontWeight: 700, '& .MuiChip-deleteIcon': { fontSize: '0.75rem', color: '#e31937' } }}
                                    />
                                ))
                            )}
                            <Typography fontSize="0.75rem" color="#9ca3af" sx={{ ml: 'auto', flexShrink: 0 }}>▾</Typography>
                        </Box>

                        {/* Dropdown panel */}
                        {teamDropdownOpen && (
                            <Box sx={{
                                position: 'absolute', top: '100%', left: 0, mt: 0.5,
                                minWidth: 260, maxHeight: 280, overflowY: 'auto',
                                backgroundColor: '#fff', borderRadius: '8px',
                                border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                zIndex: 100, py: 0.5,
                            }}>
                                {/* Clear all */}
                                <Box
                                    onClick={() => setFilterTeams([])}
                                    sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { backgroundColor: '#f9fafb' }, borderBottom: '1px solid #f3f4f6' }}
                                >
                                    <Typography fontSize="0.8rem" color="#6b7280">All Teams</Typography>
                                    {filterTeams.length === 0 && <Typography fontSize="0.7rem" color="#e31937" fontWeight={700}>✓ Active</Typography>}
                                    {filterTeams.length > 0 && <Typography fontSize="0.7rem" color="#9ca3af" sx={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setFilterTeams([]); }}>Clear all</Typography>}
                                </Box>

                                {/* Team options */}
                                {uniqueTeams.map(team => {
                                    const selected = filterTeams.includes(team);
                                    return (
                                        <Box
                                            key={team}
                                            onClick={() => setFilterTeams(prev => selected ? prev.filter(t => t !== team) : [...prev, team])}
                                            sx={{
                                                px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 1,
                                                cursor: 'pointer', backgroundColor: selected ? '#fef2f2' : 'transparent',
                                                '&:hover': { backgroundColor: selected ? '#fef2f2' : '#f9fafb' },
                                            }}
                                        >
                                            <Box sx={{
                                                width: 16, height: 16, borderRadius: '4px', flexShrink: 0,
                                                border: `2px solid ${selected ? '#e31937' : '#d1d5db'}`,
                                                backgroundColor: selected ? '#e31937' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {selected && <Typography fontSize="0.55rem" color="#fff" fontWeight={800} lineHeight={1}>✓</Typography>}
                                            </Box>
                                            <Typography fontSize="0.82rem" color={selected ? '#e31937' : '#374151'} fontWeight={selected ? 600 : 400} noWrap>{team}</Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>

                    {/* Code palette */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 'auto', flexWrap: 'wrap', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', px: 1.5, py: 0.75 }}>
                        <Typography fontSize="0.65rem" fontWeight={700} color="#9ca3af" textTransform="uppercase" letterSpacing="0.06em" sx={{ mr: 0.5 }}>Drag to assign:</Typography>
                        {Object.entries(CODE_COLORS).map(([code, cfg]) => (
                            <DraggableCode
                                key={code} code={code} cfg={cfg}
                                highlightCode={highlightCode}
                                activeCode={activeCode}
                                onCodeClick={(c) => setActiveCode(prev => prev === c ? null : c)}
                            />
                        ))}
                    </Box>
                </Box>

                {/* Active code banner */}
                {activeCode && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, px: 2, py: 1, backgroundColor: CODE_COLORS[activeCode]?.bg, border: `2px solid ${CODE_COLORS[activeCode]?.color}`, borderRadius: '8px' }}>
                        <Box sx={{ width: 22, height: 22, borderRadius: '4px', backgroundColor: CODE_COLORS[activeCode]?.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography fontSize="0.65rem" fontWeight={800} color="#fff">{activeCode}</Typography>
                        </Box>
                        <Typography fontSize="0.85rem" fontWeight={600} color={CODE_COLORS[activeCode]?.color}>
                            {activeCode === 'CLEAR' ? 'Click any cell to clear it' : `Click any cell to assign "${CODE_COLORS[activeCode]?.label}"`}
                        </Typography>
                        <Typography fontSize="0.78rem" color="#9ca3af" sx={{ ml: 'auto' }}>Press Esc or click the chip again to cancel</Typography>
                        <Box onClick={() => setActiveCode(null)} sx={{ cursor: 'pointer', color: CODE_COLORS[activeCode]?.color, fontWeight: 700, fontSize: '1rem', lineHeight: 1, px: 0.5, '&:hover': { opacity: 0.7 } }}>✕</Box>
                    </Box>
                )}

                {/* Range mode — empty state */}
                {viewMode === 'range' && !rangeValid && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, border: '2px dashed #e5e7eb', borderRadius: '12px', flexDirection: 'column', gap: 1 }}>
                        <DateRangeIcon sx={{ fontSize: '2.5rem', color: '#d1d5db' }} />
                        <Typography fontSize="0.9rem" color="#9ca3af" fontWeight={500}>Select a start and end date to view the schedule</Typography>
                    </Box>
                )}

                {/* Range too large warning */}
                {rangeTooBig && (
                    <Box sx={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', px: 2, py: 1, mb: 2 }}>
                        <Typography fontSize="0.85rem" color="#92400e" fontWeight={600}>⚠ Range is too large. Please select a range of 365 days or fewer.</Typography>
                    </Box>
                )}

                {/* Matrix grid — show when dates are available */}
                {dates.length > 0 && !rangeTooBig && (
                    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <Box ref={gridRef} sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', cursor: activeCode ? 'crosshair' : 'default' }}>
                            <Box sx={{ minWidth: NAME_W + dates.length * CELL }}>

                                {/* DATE HEADER */}
                                <Box sx={{ display: 'flex', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#fff', borderBottom: '2px solid #e5e7eb' }}>
                                    <Box sx={{ width: NAME_W, minWidth: NAME_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 20, backgroundColor: '#f9fafb', borderRight: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', px: 2, height: 44 }}>
                                        <Typography fontSize="0.68rem" fontWeight={700} color="#6b7280" textTransform="uppercase" letterSpacing="0.06em">Employee</Typography>
                                    </Box>
                                    {dates.map(date => {
                                        const isToday  = date === today;
                                        const weekend  = isWeekend(date);
                                        const dow      = getDayOfWeek(date);
                                        const monthLabel = getDateHeaderLabel(date);
                                        return (
                                            <Box key={date} ref={isToday ? todayRef : null} sx={{
                                                width: CELL, minWidth: CELL, flexShrink: 0,
                                                textAlign: 'center', height: 44,
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                backgroundColor: isToday ? '#fef2f2' : weekend ? '#f9fafb' : '#fff',
                                                borderLeft: isToday ? '2px solid #e31937' : '1px solid #f3f4f6',
                                                borderRight: isToday ? '2px solid #e31937' : 'none',
                                                position: 'relative',
                                            }}>
                                                {/* Month label in range mode */}
                                                {monthLabel && viewMode === 'range' && (
                                                    <Typography fontSize="0.5rem" lineHeight={1} color="#e31937" fontWeight={700} textTransform="uppercase" sx={{ position: 'absolute', top: 2 }}>
                                                        {monthLabel}
                                                    </Typography>
                                                )}
                                                <Typography fontSize="0.55rem" lineHeight={1} color={isToday ? '#e31937' : '#c4c4c4'} fontWeight={isToday ? 800 : 400} textTransform="uppercase" mt={monthLabel && viewMode === 'range' ? 0.75 : 0}>
                                                    {DAY_ABBREVS[dow]}
                                                </Typography>
                                                <Typography fontSize="0.72rem" fontWeight={isToday ? 800 : weekend ? 400 : 600} color={isToday ? '#e31937' : weekend ? '#c4c4c4' : '#374151'} lineHeight={1.4}>
                                                    {parseInt(date.split('-')[2])}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>

                                {/* OUT OF OFFICE ROW */}
                                <Box sx={{ display: 'flex', backgroundColor: '#fafafa', borderBottom: '2px solid #e5e7eb' }}>
                                    <Box sx={{ width: NAME_W, minWidth: NAME_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#fafafa', borderRight: '2px solid #e5e7eb', px: 2, display: 'flex', alignItems: 'center', height: 24 }}>
                                        <Typography fontSize="0.62rem" fontWeight={700} color="#9ca3af" textTransform="uppercase" letterSpacing="0.05em">Out of Office</Typography>
                                    </Box>
                                    {dates.map(date => {
                                        const count   = absenceCount[date] || 0;
                                        const isToday = date === today;
                                        return (
                                            <Box key={date} sx={{ width: CELL, minWidth: CELL, flexShrink: 0, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? '#fef2f2' : isWeekend(date) ? '#f9fafb' : 'transparent', borderLeft: isToday ? '2px solid #e31937' : '1px solid #f3f4f6' }}>
                                                {count > 0 && (
                                                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: count >= 5 ? '#fee2e2' : count >= 3 ? '#fef3c7' : '#f3f4f6', color: count >= 5 ? '#991b1b' : count >= 3 ? '#92400e' : '#6b7280' }}>
                                                        <Typography fontSize="0.55rem" fontWeight={700} lineHeight={1}>{count}</Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>

                                {/* EMPLOYEE ROWS */}
                                {Object.entries(grouped).map(([teamName, emps]) => {
                                    const teamColor = emps[0]?.team_color || '#6b7280';
                                    return (
                                        <React.Fragment key={teamName}>
                                            <Box sx={{ display: 'flex', backgroundColor: '#f9fafb', borderBottom: '1px solid #e8e8e8', borderTop: '2px solid #e5e7eb' }}>
                                                <Box sx={{ width: NAME_W, minWidth: NAME_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#f9fafb', borderRight: '2px solid #e5e7eb', px: 2, py: 0.6, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, backgroundColor: teamColor }} />
                                                    <Typography fontSize="0.7rem" fontWeight={700} color="#374151" noWrap letterSpacing="0.01em">{teamName}</Typography>
                                                    <Chip label={emps.length} size="small" sx={{ height: 15, fontSize: '0.58rem', ml: 'auto', backgroundColor: teamColor + '18', color: teamColor, fontWeight: 700 }} />
                                                </Box>
                                                {dates.map(date => (
                                                    <Box key={date} sx={{ width: CELL, minWidth: CELL, flexShrink: 0, backgroundColor: date === today ? '#fef2f2' : isWeekend(date) ? '#f3f4f6' : '#f9fafb', borderLeft: date === today ? '2px solid #e31937' : '1px solid #ececec' }} />
                                                ))}
                                            </Box>

                                            <SortableContext items={emps.map(e => String(e.id))} strategy={verticalListSortingStrategy}>
                                                {emps.map((emp, idx) => (
                                                    <SortableRow
                                                        key={emp.id} emp={emp}
                                                        dates={dates} schedule={schedule}
                                                        today={today} highlightCode={highlightCode}
                                                        teamColor={teamColor} empIdx={idx}
                                                        rangeDrag={rangeDrag}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </React.Fragment>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Paper>
                )}

                {/* LEGEND */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', px: 2, py: 1 }}>
                    <Typography fontSize="0.65rem" fontWeight={700} color="#9ca3af" textTransform="uppercase" letterSpacing="0.06em">Legend:</Typography>
                    {Object.entries(CODE_COLORS).filter(([c]) => c !== 'CLEAR').map(([code, cfg]) => (
                        <Box key={code} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, cursor: 'pointer' }}
                             onClick={() => setHighlightCode(h => h === code ? null : code)}>
                            <Box sx={{ width: 18, height: 18, borderRadius: '3px', backgroundColor: highlightCode === code ? cfg.color : cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${highlightCode === code ? cfg.color : cfg.color + '33'}`, transition: 'all 0.12s' }}>
                                <Typography fontSize="0.55rem" fontWeight={800} color={highlightCode === code ? '#fff' : cfg.color} lineHeight={1}>{code}</Typography>
                            </Box>
                            <Typography fontSize="0.72rem" color={highlightCode === code ? '#374151' : '#9ca3af'} fontWeight={highlightCode === code ? 600 : 400}>{cfg.label}</Typography>
                        </Box>
                    ))}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Box sx={{ width: 18, height: 18, borderRadius: '3px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }} />
                        <Typography fontSize="0.72rem" color="#9ca3af">Weekend</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Box sx={{ width: 18, height: 18, borderRadius: '3px', backgroundColor: '#fef2f2', border: '2px solid #e31937' }} />
                        <Typography fontSize="0.72rem" color="#9ca3af">Today</Typography>
                    </Box>
                </Box>
            </Box>

            {/* DRAG OVERLAY */}
            <DragOverlay dropAnimation={{ duration: 120, easing: 'ease' }}>
                {activeDrag?.data?.current?.type === 'code' && (() => {
                    const cfg = CODE_COLORS[activeDrag.data.current.code];
                    return (
                        <Chip label={activeDrag.data.current.code} size="small" sx={{ backgroundColor: cfg?.color, color: '#fff', fontWeight: 800, fontSize: '0.7rem', cursor: 'grabbing', boxShadow: `0 6px 16px ${cfg?.color}55`, transform: 'scale(1.1)' }} />
                    );
                })()}
            </DragOverlay>
        </DndContext>
    );
}