import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box, Typography, Chip, Select, MenuItem, FormControl,
    InputLabel, Tooltip, Paper, IconButton, CircularProgress
} from '@mui/material';
import {
    ChevronLeft as PrevIcon,
    ChevronRight as NextIcon,
    Today as TodayIcon,
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

const CELL = 28;
const NAME_W = 200;

const getDatesForMonth = (monthIdx) =>
    Array.from({ length: DAYS_IN_MONTH[monthIdx] }, (_, i) =>
        `2026-${String(monthIdx + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    );

const getDayOfWeek  = (d) => new Date(d + 'T00:00:00').getDay();
const isWeekend     = (d) => { const dow = getDayOfWeek(d); return dow === 0 || dow === 6; };

// ── DRAGGABLE CODE CHIP ───────────────────────────────────────────────────────
function DraggableCode({ code, cfg, active }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `code-${code}`, data: { type: 'code', code }
    });
    return (
        <Tooltip title={cfg.label} placement="bottom">
            <Chip
                ref={setNodeRef} {...attributes} {...listeners}
                label={code} size="small"
                sx={{
                    backgroundColor: active === code ? cfg.color : cfg.bg,
                    color: active === code ? '#fff' : cfg.color,
                    fontWeight: 800, fontSize: '0.68rem',
                    cursor: 'grab', height: 24,
                    border: `2px solid ${active === code ? cfg.color : cfg.color + '33'}`,
                    opacity: isDragging ? 0.35 : 1,
                    transition: 'all 0.12s',
                    touchAction: 'none',        // ← ADD THIS
                    userSelect: 'none',          // ← ADD THIS
                    '&:hover': { backgroundColor: cfg.color, color: '#fff', transform: 'translateY(-1px)', boxShadow: `0 2px 8px ${cfg.color}55` },
                }}
            />
        </Tooltip>
    );
}

// ── DROPPABLE CELL ────────────────────────────────────────────────────────────
function DroppableCell({ id, code, cfg, isToday, isWeekendDay, empIdx, isRangeTarget }) {
    const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'cell' } });
    const highlight = isOver || isRangeTarget;
    return (
        <Box ref={setNodeRef} sx={{
            width: CELL, minWidth: CELL, flexShrink: 0, height: CELL,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: highlight
                ? '#fef2f2'
                : isToday ? '#fff7f7'
                    : isWeekendDay ? (empIdx % 2 === 0 ? '#f9fafb' : '#f4f4f5')
                        : 'transparent',
            borderLeft: isToday ? '2px solid #e31937' : '1px solid #f3f4f6',
            outline: highlight ? '2px solid #e31937' : 'none',
            outlineOffset: '-2px',
            cursor: 'crosshair',
            transition: 'background 0.08s',
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
function SortableRow({ emp, dates, schedule, today, highlightCode, teamColor, empIdx, rangeDrag }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: String(emp.id) });

    return (
        <Box ref={setNodeRef}
             style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
             sx={{
                 display: 'flex',
                 backgroundColor: empIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                 '&:hover': { backgroundColor: '#fef9f9' },
                 borderBottom: '1px solid #f0f0f0',
                 transition: 'background 0.08s',
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
                {/* Drag handle */}
                <Box {...attributes} {...listeners} sx={{
                    cursor: 'grab', color: '#e5e7eb', fontSize: '0.85rem',
                    px: 0.25, flexShrink: 0, lineHeight: 1,
                    '&:hover': { color: '#9ca3af' },
                    '&:active': { cursor: 'grabbing' },
                }}>⠿</Box>
                {/* Avatar */}
                <Box sx={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: teamColor + '20',
                    color: teamColor,
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
                        />
                    </Box>
                );
            })}
        </Box>
    );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function MatrixView() {
    const [selectedMonth,  setSelectedMonth]  = useState(new Date().getMonth());
    const [filterTeam,     setFilterTeam]     = useState('All');
    const [highlightCode,  setHighlightCode]  = useState(null);
    const [employees,      setEmployees]      = useState([]);
    const [employeeOrder,  setEmployeeOrder]  = useState([]);
    const [schedule,       setSchedule]       = useState({});
    const [loading,        setLoading]        = useState(true);
    const [activeDrag,     setActiveDrag]     = useState(null);
    const [rangeDrag,      setRangeDrag]      = useState(null);
    const todayRef = useRef(null);

    const dates = getDatesForMonth(selectedMonth);
    const today = new Date().toISOString().split('T')[0];
    const month = `2026-${String(selectedMonth + 1).padStart(2, '0')}`;

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 1 } }));

    // ── FETCH ──────────────────────────────────────────────────────────────────
    const fetchEmployees = useCallback(async () => {
        try {
            const res  = await fetch('/api/matrix-users');
            const data = await res.json();
            setEmployees(data);
            setEmployeeOrder(data.map(e => String(e.id)));
        } catch { setEmployees([]); }
    }, []);

    const fetchSchedule = useCallback(async () => {
        try {
            const res  = await fetch(`/api/schedule?month=${month}`);
            const data = await res.json();
            const map  = {};
            data.forEach(e => { map[`${e.user_id}_${e.date}`] = e; });
            setSchedule(map);
        } catch { setSchedule({}); }
    }, [month]);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchEmployees(), fetchSchedule()]).finally(() => setLoading(false));
    }, [fetchEmployees, fetchSchedule]);

    useEffect(() => {
        if (todayRef.current)
            todayRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [selectedMonth]);

    // ── SAVE / CLEAR CELL ──────────────────────────────────────────────────────
    const saveCell = async (userId, date, code) => {
        if (code === 'CLEAR') {
            const existing = schedule[`${userId}_${date}`];
            if (existing?.id) {
                await fetch(`/api/schedule/${existing.id}`, { method: 'DELETE' });
                setSchedule(prev => { const n = { ...prev }; delete n[`${userId}_${date}`]; return n; });
            }
            return;
        }
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

    // ── DRAG HANDLERS ──────────────────────────────────────────────────────────
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
        setRangeDrag(prev => ({ ...prev, dates: dates.slice(lo, hi + 1) }));
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

    // ── DERIVED ────────────────────────────────────────────────────────────────
    const uniqueTeams = ['All', ...Array.from(new Set(employees.map(e => e.team_name)))];

    const orderedEmployees = employeeOrder
        .map(id => employees.find(e => String(e.id) === id))
        .filter(Boolean)
        .filter(e => filterTeam === 'All' || e.team_name === filterTeam);

    const grouped = orderedEmployees.reduce((acc, emp) => {
        if (!acc[emp.team_name]) acc[emp.team_name] = [];
        acc[emp.team_name].push(emp);
        return acc;
    }, {});

    const absenceCount = Object.fromEntries(
        dates.map(date => [
            date,
            orderedEmployees.filter(e =>
                ['V','MV','AV','A'].includes((schedule[`${e.id}_${date}`]?.code || '').toUpperCase())
            ).length,
        ])
    );

    if (loading) return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 2 }}>
            <CircularProgress sx={{ color: '#e31937' }} />
            <Typography fontSize="0.85rem" color="#9ca3af">Loading schedule...</Typography>
        </Box>
    );

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <Box>
                {/* ── TOOLBAR ─────────────────────────────────────────────── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>

                    {/* Month navigator */}
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

                    {/* Today button */}
                    <Box onClick={() => setSelectedMonth(new Date().getMonth())}
                         sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: '8px', px: 1.5, py: 0.75, color: '#e31937', fontWeight: 600, fontSize: '0.82rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', '&:hover': { backgroundColor: '#fef2f2', borderColor: '#e31937' }, transition: 'all 0.12s' }}>
                        <TodayIcon sx={{ fontSize: '1rem' }} />
                        <Typography fontSize="0.82rem" fontWeight={600}>Today</Typography>
                    </Box>

                    {/* Team filter */}
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel sx={{ fontSize: '0.85rem', '&.Mui-focused': { color: '#e31937' } }}>Filter by Team</InputLabel>
                        <Select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} label="Filter by Team"
                                sx={{ borderRadius: '8px', fontSize: '0.85rem', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#e31937' } }}>
                            {uniqueTeams.map(t => <MenuItem key={t} value={t} sx={{ fontSize: '0.85rem' }}>{t}</MenuItem>)}
                        </Select>
                    </FormControl>

                    {/* Code palette */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 'auto', flexWrap: 'wrap', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', px: 1.5, py: 0.75 }}>
                        <Typography fontSize="0.65rem" fontWeight={700} color="#9ca3af" textTransform="uppercase" letterSpacing="0.06em" sx={{ mr: 0.5 }}>Drag to assign:</Typography>
                        {Object.entries(CODE_COLORS).map(([code, cfg]) => (
                            <DraggableCode key={code} code={code} cfg={cfg} active={highlightCode} />
                        ))}
                    </Box>
                </Box>

                {/* ── MATRIX GRID ─────────────────────────────────────────── */}
                <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
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
                                    return (
                                        <Box key={date} ref={isToday ? todayRef : null} sx={{
                                            width: CELL, minWidth: CELL, flexShrink: 0,
                                            textAlign: 'center', py: 0.5, height: 44,
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: isToday ? '#fef2f2' : weekend ? '#f9fafb' : '#fff',
                                            borderLeft: isToday ? '2px solid #e31937' : '1px solid #f3f4f6',
                                            borderRight: isToday ? '2px solid #e31937' : 'none',
                                        }}>
                                            <Typography fontSize="0.55rem" lineHeight={1} color={isToday ? '#e31937' : '#c4c4c4'} fontWeight={isToday ? 800 : 400} textTransform="uppercase">
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
                                        {/* Team header */}
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

                                        {/* Sortable rows */}
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

                {/* ── LEGEND ──────────────────────────────────────────────── */}
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