import React, { useRef, useEffect, useState, useCallback, useMemo, useReducer } from 'react';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];

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

// Canvas layout constants
const CELL_W     = 28;
const CELL_H     = 28;
const NAME_W     = 200;
const HEADER_H   = 44;
const TEAM_HDR_H = 26;

// ── PALETTE (light theme) ─────────────────────────────────────────────────────
const PALETTE = {
    bg:          '#ffffff',
    headerBg:    '#f9fafb',
    labelBg:     '#f9fafb',
    gridLine:    '#e5e7eb',
    weekendBg:   '#f9fafb',
    todayBg:     '#fff7f7',
    teamHdrBg:   '#f3f4f6',
    text:        '#374151',
    textDim:     '#9ca3af',
    selectFill:  'rgba(227,25,55,0.08)',
    selectBorder:'rgba(227,25,55,0.7)',
    accent:      '#e31937',
};

// ── DATE HELPERS ──────────────────────────────────────────────────────────────
const getDaysInMonth = (year, monthIdx) => {
    // Correctly handles leap years
    return new Date(year, monthIdx + 1, 0).getDate();
};

const getDatesForMonth = (year, monthIdx) => {
    const count = getDaysInMonth(year, monthIdx);
    return Array.from({ length: count }, (_, i) =>
        `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    );
};

const getDayOfWeek = (dateStr) => new Date(dateStr + 'T00:00:00').getDay();
const isWeekend    = (dateStr) => { const d = getDayOfWeek(dateStr); return d === 0 || d === 6; };

// ── REDUCER ───────────────────────────────────────────────────────────────────
function scheduleReducer(state, action) {
    switch (action.type) {
        case 'SET_CELLS': {
            const next = { ...state };
            action.updates.forEach(({ key, code }) => {
                if (code === null) {
                    delete next[key];
                } else {
                    next[key] = { code };
                }
            });
            return next;
        }
        case 'MERGE':
            return { ...state, ...action.data };
        default:
            return state;
    }
}

// ── CANVAS GRID ───────────────────────────────────────────────────────────────
const CanvasGrid = React.memo(({
                                   dates, grouped, schedule, today,
                                   activeCode, highlightCode,
                                   scrollLeft, scrollTop,
                                   containerWidth, containerHeight,
                                   onCellAction,
                               }) => {
    const canvasRef  = useRef(null);
    const dpr        = window.devicePixelRatio || 1;
    const dragRef    = useRef(null);   // { painting: bool, lastKey: string }
    const hoverRef   = useRef(null);
    const needsDraw  = useRef(true);
    const rafRef     = useRef(null);

    // Build flat row list with pre-computed y positions
    const rows = useMemo(() => {
        const list = [];
        let y = HEADER_H;
        // Pre-compute even/odd index separately from team headers
        let empIdx = 0;
        for (const [teamName, emps] of Object.entries(grouped)) {
            list.push({ type: 'team', teamName, color: emps[0]?.team_color || '#6b7280', y });
            y += TEAM_HDR_H;
            for (const emp of emps) {
                list.push({ type: 'emp', emp, y, even: empIdx % 2 === 0 });
                y += CELL_H;
                empIdx++;
            }
        }
        return list;
    }, [grouped]);

    const totalH = rows.length > 0 ? rows[rows.length - 1].y + CELL_H : HEADER_H;
    const totalW = NAME_W + dates.length * CELL_W;

    // ── Hit test ──────────────────────────────────────────────────────────────
    const hitTest = useCallback((clientX, clientY) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left + scrollLeft;
        const y = clientY - rect.top  + scrollTop;
        if (x < NAME_W || y < HEADER_H) return null;
        const dateIdx = Math.floor((x - NAME_W) / CELL_W);
        if (dateIdx < 0 || dateIdx >= dates.length) return null;
        const date = dates[dateIdx];
        for (const row of rows) {
            if (row.type === 'emp' && y >= row.y && y < row.y + CELL_H) {
                return { empId: row.emp.id, date, key: `${row.emp.id}_${date}` };
            }
        }
        return null;
    }, [scrollLeft, scrollTop, dates, rows]);

    // ── Draw ──────────────────────────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width / dpr;
        const H = canvas.height / dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        const sl = scrollLeft;
        const st = scrollTop;

        // Visible date range with buffer
        const firstDateIdx = Math.max(0, Math.floor((sl - NAME_W) / CELL_W) - 1);
        const lastDateIdx  = Math.min(dates.length - 1, Math.ceil((sl + W - NAME_W) / CELL_W) + 1);

        // ── Background ─────────────────────────────────────────────────────
        ctx.fillStyle = PALETTE.bg;
        ctx.fillRect(0, 0, W, H);

        // ── Weekend & today column shading ─────────────────────────────────
        for (let i = firstDateIdx; i <= lastDateIdx; i++) {
            const date = dates[i];
            const x = NAME_W + i * CELL_W - sl;
            if (x + CELL_W < NAME_W || x > W) continue;
            if (isWeekend(date)) {
                ctx.fillStyle = PALETTE.weekendBg;
                ctx.fillRect(x, 0, CELL_W, H);
            }
            if (date === today) {
                ctx.fillStyle = PALETTE.todayBg;
                ctx.fillRect(x, 0, CELL_W, H);
            }
        }

        // ── Employee rows & cells ──────────────────────────────────────────
        for (const row of rows) {
            const ry = row.y - st;
            if (ry + CELL_H < 0 || ry > H) continue;

            if (row.type === 'team') {
                ctx.fillStyle = PALETTE.teamHdrBg;
                ctx.fillRect(0, ry, W, TEAM_HDR_H);
                ctx.strokeStyle = PALETTE.gridLine;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(W, ry); ctx.stroke();

                // Team colour dot
                ctx.fillStyle = row.color;
                ctx.beginPath(); ctx.arc(NAME_W - 16, ry + TEAM_HDR_H / 2, 4, 0, Math.PI * 2); ctx.fill();

                ctx.font = '700 11px sans-serif';
                ctx.fillStyle = PALETTE.text;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(row.teamName, 12, ry + TEAM_HDR_H / 2);
                continue;
            }

            // Row stripe
            ctx.fillStyle = row.even ? PALETTE.bg : '#fafafa';
            ctx.fillRect(NAME_W, ry, W - NAME_W, CELL_H);

            // Row grid line
            ctx.strokeStyle = PALETTE.gridLine;
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(NAME_W, ry + CELL_H); ctx.lineTo(W, ry + CELL_H); ctx.stroke();

            // Code cells
            for (let i = firstDateIdx; i <= lastDateIdx; i++) {
                const date = dates[i];
                const x = NAME_W + i * CELL_W - sl;
                if (x + CELL_W < NAME_W || x > W) continue;

                // Vertical grid line
                ctx.strokeStyle = PALETTE.gridLine;
                ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + CELL_H); ctx.stroke();

                const key  = `${row.emp.id}_${date}`;
                const entry = schedule[key];
                const code  = entry?.code?.toUpperCase();
                const cfg   = code ? CODE_COLORS[code] : null;
                if (!cfg || code === 'CLEAR') continue;

                const dimmed = highlightCode && code !== highlightCode;
                ctx.fillStyle = dimmed ? cfg.bg + '44' : cfg.bg;
                ctx.beginPath();
                ctx.roundRect(x + 2, ry + 2, CELL_W - 4, CELL_H - 4, 3);
                ctx.fill();

                ctx.font = '800 9px sans-serif';
                ctx.fillStyle = dimmed ? cfg.color + '44' : cfg.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(code, x + CELL_W / 2, ry + CELL_H / 2);
            }
        }

        // ── Sticky header (dates) ──────────────────────────────────────────
        ctx.fillStyle = PALETTE.headerBg;
        ctx.fillRect(0, 0, W, HEADER_H);

        for (let i = firstDateIdx; i <= lastDateIdx; i++) {
            const date = dates[i];
            const x = NAME_W + i * CELL_W - sl;
            if (x + CELL_W < NAME_W || x > W) continue;

            // Hover column highlight in header
            if (hoverRef.current?.dateIdx === i) {
                ctx.fillStyle = 'rgba(227,25,55,0.05)';
                ctx.fillRect(x, 0, CELL_W, HEADER_H);
            }

            const d   = new Date(date + 'T00:00:00');
            const day = d.getDate();
            const dow = ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()];

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (date === today) {
                ctx.fillStyle = PALETTE.accent;
                ctx.beginPath();
                ctx.arc(x + CELL_W / 2, 22, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
            } else {
                ctx.fillStyle = isWeekend(date) ? PALETTE.textDim : PALETTE.text;
            }

            ctx.font = '700 10px sans-serif';
            ctx.fillText(String(day), x + CELL_W / 2, 22);

            ctx.font = '500 8px sans-serif';
            ctx.fillStyle = isWeekend(date) ? PALETTE.textDim : '#9ca3af';
            ctx.fillText(dow, x + CELL_W / 2, 36);
        }

        // Header bottom border
        ctx.strokeStyle = PALETTE.gridLine;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(NAME_W, HEADER_H); ctx.lineTo(W, HEADER_H); ctx.stroke();

        // ── Sticky name column ─────────────────────────────────────────────
        ctx.fillStyle = PALETTE.labelBg;
        ctx.fillRect(0, 0, NAME_W, H);

        for (const row of rows) {
            const ry = row.y - st;
            if (ry + CELL_H < 0 || ry > H) continue;
            if (row.type !== 'emp') continue;

            const isHovered = hoverRef.current?.empId === row.emp.id;
            if (isHovered) {
                ctx.fillStyle = 'rgba(227,25,55,0.05)';
                ctx.fillRect(0, ry, NAME_W, CELL_H);
            }

            ctx.font = isHovered ? '600 11px sans-serif' : '500 11px sans-serif';
            ctx.fillStyle = isHovered ? PALETTE.accent : PALETTE.text;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(row.emp.name, 12, ry + CELL_H / 2);

            ctx.strokeStyle = PALETTE.gridLine;
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(0, ry + CELL_H); ctx.lineTo(NAME_W, ry + CELL_H); ctx.stroke();
        }

        // Name column right border
        ctx.strokeStyle = PALETTE.gridLine;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(NAME_W, 0); ctx.lineTo(NAME_W, H); ctx.stroke();

        // ── Corner ────────────────────────────────────────────────────────
        ctx.fillStyle = PALETTE.labelBg;
        ctx.fillRect(0, 0, NAME_W, HEADER_H);
        ctx.font = '600 11px sans-serif';
        ctx.fillStyle = PALETTE.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Employee', 12, HEADER_H / 2);
        ctx.strokeStyle = PALETTE.gridLine;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(NAME_W, 0); ctx.lineTo(NAME_W, HEADER_H);
        ctx.moveTo(0, HEADER_H); ctx.lineTo(NAME_W, HEADER_H);
        ctx.stroke();

    }, [dates, grouped, schedule, today, highlightCode, activeCode, scrollLeft, scrollTop, containerWidth, containerHeight, rows, dpr]);

    // RAF loop
    useEffect(() => {
        const loop = () => {
            if (needsDraw.current) { draw(); needsDraw.current = false; }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [draw]);

    // Trigger redraw on any prop change
    useEffect(() => { needsDraw.current = true; });

    // Resize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width  = containerWidth  * dpr;
        canvas.height = containerHeight * dpr;
        needsDraw.current = true;
    }, [containerWidth, containerHeight, dpr]);

    // ── Pointer handlers ──────────────────────────────────────────────────────
    const handlePointerDown = useCallback((e) => {
        if (e.button !== 0 || !activeCode) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const hit = hitTest(e.clientX, e.clientY);
        if (!hit) return;
        dragRef.current = { painting: true, lastKey: null };
        onCellAction(hit.key, hit.empId, hit.date);
        dragRef.current.lastKey = hit.key;
        needsDraw.current = true;
    }, [hitTest, activeCode, onCellAction]);

    const handlePointerMove = useCallback((e) => {
        const hit = hitTest(e.clientX, e.clientY);

        // Update hover
        const prevHover = hoverRef.current;
        hoverRef.current = hit ? { empId: hit.empId, dateIdx: dates.indexOf(hit.date) } : null;
        if (JSON.stringify(prevHover) !== JSON.stringify(hoverRef.current)) {
            needsDraw.current = true;
        }

        // Paint drag
        if (dragRef.current?.painting && hit && hit.key !== dragRef.current.lastKey) {
            onCellAction(hit.key, hit.empId, hit.date);
            dragRef.current.lastKey = hit.key;
            needsDraw.current = true;
        }
    }, [hitTest, dates, onCellAction]);

    const handlePointerUp = useCallback(() => {
        dragRef.current = null;
    }, []);

    const handlePointerLeave = useCallback(() => {
        hoverRef.current = null;
        dragRef.current  = null;
        needsDraw.current = true;
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ display: 'block', cursor: activeCode ? 'crosshair' : 'default' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
        />
    );
});

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function MatrixView() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const [year,         setYear]         = useState(today.getFullYear());
    const [monthIdx,     setMonthIdx]     = useState(today.getMonth());
    const [employees,    setEmployees]    = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [activeCode,   setActiveCode]   = useState(null);
    const [highlightCode,setHighlightCode]= useState(null);
    const [scroll,       setScroll]       = useState({ left: 0, top: 0 });
    const [containerSize,setContainerSize]= useState({ w: 800, h: 600 });
    const [fetchedMonths,setFetchedMonths]= useState(new Set());

    const [schedule, dispatchSchedule] = useReducer(scheduleReducer, {});

    const containerRef = useRef(null);
    const scrollerRef  = useRef(null);

    const dates = useMemo(() => getDatesForMonth(year, monthIdx), [year, monthIdx]);

    // ── Fetch employees once ──────────────────────────────────────────────────
    useEffect(() => {
        fetch('/api/matrix-users')
            .then(r => r.json())
            .then(d => setEmployees(Array.isArray(d) ? d : []))
            .catch(() => setEmployees([]))
            .finally(() => setLoading(false));
    }, []);

    // ── Fetch schedule for visible month + prefetch next ──────────────────────
    useEffect(() => {
        const monthKey  = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
        const nextMonth = monthIdx === 11 ? 0 : monthIdx + 1;
        const nextYear  = monthIdx === 11 ? year + 1 : year;
        const nextKey   = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`;

        const toFetch = [monthKey, nextKey].filter(k => !fetchedMonths.has(k));
        if (toFetch.length === 0) return;

        Promise.all(toFetch.map(m =>
            fetch(`/api/schedule?month=${m}`)
                .then(r => r.json())
                .catch(() => [])
        )).then(results => {
            const newMap = {};
            results.flat().forEach(e => { newMap[`${e.user_id}_${e.date}`] = { code: e.code }; });
            dispatchSchedule({ type: 'MERGE', data: newMap });
            setFetchedMonths(prev => {
                const next = new Set(prev);
                toFetch.forEach(k => next.add(k));
                return next;
            });
        });
    }, [year, monthIdx, fetchedMonths]);

    // ── Resize observer ───────────────────────────────────────────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            setContainerSize({ w: el.clientWidth, h: el.clientHeight });
        });
        ro.observe(el);
        setContainerSize({ w: el.clientWidth, h: el.clientHeight });
        return () => ro.disconnect();
    }, []);

    // ── Navigation ────────────────────────────────────────────────────────────
    const goToPrevMonth = () => {
        if (monthIdx === 0) { setYear(y => y - 1); setMonthIdx(11); }
        else setMonthIdx(m => m - 1);
    };
    const goToNextMonth = () => {
        if (monthIdx === 11) { setYear(y => y + 1); setMonthIdx(0); }
        else setMonthIdx(m => m + 1);
    };
    const goToToday = () => {
        setYear(today.getFullYear());
        setMonthIdx(today.getMonth());
    };

    // ── Group employees by team ───────────────────────────────────────────────
    const grouped = useMemo(() => {
        const g = {};
        employees.forEach(e => {
            const key = e.team_name || 'Unassigned';
            if (!g[key]) g[key] = [];
            g[key].push(e);
        });
        return g;
    }, [employees]);

    // ── Cell action (toggle or apply) ─────────────────────────────────────────
    const handleCellAction = useCallback(async (key, empId, date) => {
        if (!activeCode) return;

        const existing = schedule[key]?.code?.toUpperCase();
        // Toggle: clicking same code clears it; CLEAR code always clears
        const newCode = (activeCode === 'CLEAR' || existing === activeCode) ? null : activeCode;

        // Optimistic update
        dispatchSchedule({ type: 'SET_CELLS', updates: [{ key, code: newCode }] });

        try {
            if (newCode === null) {
                // Find the assignment id and delete it
                const res = await fetch('/api/schedule', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: empId, date, code: 'CLEAR' }),
                });
                if (!res.ok) throw new Error('Failed');
            } else {
                const res = await fetch('/api/schedule', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: empId, date, code: newCode }),
                });
                if (!res.ok) throw new Error('Failed');
            }
        } catch {
            // Rollback on failure
            dispatchSchedule({ type: 'SET_CELLS', updates: [{ key, code: existing || null }] });
        }
    }, [activeCode, schedule]);

    // ── Scroll handler ────────────────────────────────────────────────────────
    const handleScroll = useCallback((e) => {
        setScroll({ left: e.target.scrollLeft, top: e.target.scrollTop });
    }, []);

    // Total canvas dimensions for scroll
    const totalW = NAME_W + dates.length * CELL_W;
    const empCount = employees.length;
    const teamCount = Object.keys(grouped).length;
    const totalH = HEADER_H + teamCount * TEAM_HDR_H + empCount * CELL_H;

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#6b7280' }}>
                Loading schedule…
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

                {/* Month navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button onClick={goToPrevMonth} style={navBtnStyle}>‹</button>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', minWidth: 160, textAlign: 'center' }}>
                        {MONTHS[monthIdx]} {year}
                    </span>
                    <button onClick={goToNextMonth} style={navBtnStyle}>›</button>
                    <button onClick={goToToday} style={{ ...navBtnStyle, marginLeft: '0.25rem', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                        Today
                    </button>
                </div>

                <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />

                {/* Code palette */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {Object.entries(CODE_COLORS).map(([code, cfg]) => {
                        const isActive = activeCode === code;
                        return (
                            <button
                                key={code}
                                title={cfg.label}
                                onClick={() => {
                                    setActiveCode(prev => prev === code ? null : code);
                                    setHighlightCode(null);
                                }}
                                style={{
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: 20,
                                    border: `2px solid ${isActive ? cfg.color : 'transparent'}`,
                                    background: isActive ? cfg.bg : '#f3f4f6',
                                    color: isActive ? cfg.color : '#6b7280',
                                    fontWeight: isActive ? 800 : 500,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.12s',
                                    boxShadow: isActive ? `0 0 0 1px ${cfg.color}33` : 'none',
                                }}
                            >
                                {isActive ? '✓ ' : ''}{code}
                            </button>
                        );
                    })}
                </div>

                {activeCode && (
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 'auto' }}>
                        <strong style={{ color: CODE_COLORS[activeCode]?.color }}>{activeCode}</strong>
                        {' '}active — click or drag cells to apply · click again to deselect
                    </span>
                )}
            </div>

            {/* ── Legend / highlight filter ── */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginRight: '0.25rem' }}>Highlight:</span>
                {Object.entries(CODE_COLORS).filter(([c]) => c !== 'CLEAR').map(([code, cfg]) => (
                    <button
                        key={code}
                        title={`Highlight ${cfg.label}`}
                        onClick={() => setHighlightCode(prev => prev === code ? null : code)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 4,
                            border: `1px solid ${highlightCode === code ? cfg.color : '#e5e7eb'}`,
                            background: highlightCode === code ? cfg.bg : 'transparent',
                            color: highlightCode === code ? cfg.color : '#9ca3af',
                            fontSize: '0.7rem', cursor: 'pointer',
                        }}
                    >
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.bg, border: `1px solid ${cfg.color}66`, display: 'inline-block' }} />
                        {cfg.label}
                    </button>
                ))}
                {highlightCode && (
                    <button onClick={() => setHighlightCode(null)} style={{ fontSize: '0.7rem', color: '#e31937', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                        ✕ Clear
                    </button>
                )}
            </div>

            {/* ── Scrollable canvas container ── */}
            <div
                ref={scrollerRef}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    position: 'relative',
                }}
            >
                {/* Scroll spacer so the browser scrollbars reflect full dimensions */}
                <div style={{ width: totalW, height: totalH, position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />

                {/* Sticky canvas wrapper */}
                <div
                    ref={containerRef}
                    style={{
                        position: 'sticky',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                    }}
                >
                    <CanvasGrid
                        dates={dates}
                        grouped={grouped}
                        schedule={schedule}
                        today={todayStr}
                        activeCode={activeCode}
                        highlightCode={highlightCode}
                        scrollLeft={scroll.left}
                        scrollTop={scroll.top}
                        containerWidth={containerSize.w}
                        containerHeight={containerSize.h}
                        onCellAction={handleCellAction}
                    />
                </div>
            </div>

            {/* ── Footer stats ── */}
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', gap: '1rem' }}>
                <span>{employees.length} employees</span>
                <span>{Object.keys(grouped).length} teams</span>
                <span>{dates.length} days</span>
                <span>{Object.keys(schedule).length} schedule entries</span>
            </div>
        </div>
    );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const navBtnStyle = {
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '0.3rem 0.75rem',
    fontSize: '1rem',
    cursor: 'pointer',
    color: '#374151',
    fontWeight: 600,
    lineHeight: 1,
};