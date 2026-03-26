import React, {
    useRef, useEffect, useState, useCallback,
    useMemo, useReducer
} from 'react';

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
    'Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_LONG  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const CODE_COLORS = {
    'V':    { bg:'#fef3c7', color:'#92400e', label:'Vacation' },
    'MV':   { bg:'#fde68a', color:'#78350f', label:'Morning Vacation' },
    'AV':   { bg:'#fcd34d', color:'#78350f', label:'Afternoon Vacation' },
    'PV':   { bg:'#e5e7eb', color:'#6b7280', label:'Pending Vacation' },
    'A':    { bg:'#fee2e2', color:'#991b1b', label:'Absence' },
    'CD':   { bg:'#dbeafe', color:'#1e40af', label:'SPOC CDO Stewards' },
    'IT':   { bg:'#ede9fe', color:'#5b21b6', label:'SPOC IT Services' },
    'ES':   { bg:'#fce7f3', color:'#9d174d', label:'SPOC Escalation' },
    'MT':   { bg:'#d1fae5', color:'#065f46', label:'Mountain Time' },
    'SD':   { bg:'#ffedd5', color:'#9a3412', label:'Service Desk' },
    'CLEAR':{ bg:'#f3f4f6', color:'#6b7280', label:'Clear cell' },
};

const STATUS_OPTIONS = ['confirmed','pending','blocked'];
const STATUS_COLORS  = { confirmed:'#065f46', pending:'#92400e', blocked:'#991b1b' };
const STATUS_BG      = { confirmed:'#ecfdf5', pending:'#fef3c7', blocked:'#fee2e2' };

// Canvas layout
const CELL_W     = 28;
const CELL_H     = 28;
const NAME_W     = 200;
const HEADER_H   = 48;
const TEAM_HDR_H = 26;

const PALETTE = {
    bg:'#ffffff', headerBg:'#f9fafb', labelBg:'#f9fafb',
    gridLine:'#e5e7eb', weekendBg:'#f9fafb', todayBg:'#fff7f7',
    teamHdrBg:'#f3f4f6', text:'#374151', textDim:'#9ca3af',
    accent:'#e31937',
};

// ── DATE HELPERS ───────────────────────────────────────────────────────────────
const getDaysInMonth = (year, monthIdx) =>
    new Date(year, monthIdx + 1, 0).getDate();

const getDatesForMonth = (year, monthIdx) => {
    const count = getDaysInMonth(year, monthIdx);
    return Array.from({ length: count }, (_, i) =>
        `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
    );
};

const strToDate = (s) => {
    if (!s) return null;
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
};

const dateToStr = (d) => {
    if (!d) return '';
    if (typeof d === 'string') return d;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const isWeekendStr = (s) => { const d = new Date(s+'T00:00:00').getDay(); return d===0||d===6; };

const getDateRange = (startStr, endStr) => {
    const dates = [];
    const cur = strToDate(startStr);
    const end = strToDate(endStr);
    if (!cur || !end || cur > end) return [startStr];
    while (cur <= end) { dates.push(dateToStr(cur)); cur.setDate(cur.getDate()+1); }
    return dates;
};

const formatDisplay = (s) => {
    if (!s) return '';
    const d = strToDate(s);
    return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const today = new Date();
const todayStr = dateToStr(today);

// ── SCHEDULE REDUCER ───────────────────────────────────────────────────────────
function scheduleReducer(state, action) {
    switch (action.type) {
        case 'SET_CELLS': {
            const next = { ...state };
            action.updates.forEach(({ key, code, meta }) => {
                if (code === null) delete next[key];
                else next[key] = { code, ...(meta||{}) };
            });
            return next;
        }
        case 'MERGE': return { ...state, ...action.data };
        default:      return state;
    }
}

// ── SHARED STYLES ──────────────────────────────────────────────────────────────
const labelSt = { display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:'0.3rem' };
const inputSt = { width:'100%', padding:'0.55rem 0.75rem', border:'1px solid #d1d5db', borderRadius:6, fontSize:'0.875rem', boxSizing:'border-box', outline:'none', color:'#374151', background:'#fff' };
const navBtnSt = { background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:7, padding:'0.3rem 0.75rem', fontSize:'1rem', cursor:'pointer', color:'#374151', fontWeight:600, lineHeight:1 };

// ── EVENT MODAL ────────────────────────────────────────────────────────────────
function EventModal({ entry, empId, date, empName, onSave, onDelete, onClose }) {
    const [tab,       setTab]       = useState('quick');
    const [code,      setCode]      = useState(entry?.code?.toUpperCase()||'');
    const [title,     setTitle]     = useState(entry?.title||'');
    const [status,    setStatus]    = useState(entry?.status||'confirmed');
    const [notes,     setNotes]     = useState(entry?.notes||'');
    const [startDate, setStartDate] = useState(entry?.startDate||date||'');
    const [endDate,   setEndDate]   = useState(entry?.endDate||date||'');

    const cfg = code ? CODE_COLORS[code] : null;

    return (
        <div
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={onClose}
        >
            <div
                style={{ background:'#fff', borderRadius:12, width:480, maxWidth:'95vw', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', overflow:'hidden', display:'flex', flexDirection:'column' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding:'1rem 1.25rem 0.75rem', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                        <div style={{ fontSize:'0.68rem', color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>
                            {empName} · {formatDisplay(date)}
                        </div>
                        <h3 style={{ margin:0, fontSize:'1rem', color:'#111827' }}>
                            {entry ? 'Edit Schedule Entry' : 'New Schedule Entry'}
                        </h3>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#9ca3af', lineHeight:1, padding:0 }}>✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display:'flex', borderBottom:'1px solid #f3f4f6' }}>
                    {[['quick','⚡ Quick Code'],['details','📋 Full Details']].map(([t,label]) => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            flex:1, padding:'0.6rem', border:'none', background:'none', cursor:'pointer',
                            fontSize:'0.8rem', fontWeight:tab===t?700:500,
                            color:tab===t?'#e31937':'#6b7280',
                            borderBottom:tab===t?'2px solid #e31937':'2px solid transparent',
                            transition:'all 0.15s',
                        }}>{label}</button>
                    ))}
                </div>

                <div style={{ padding:'1.25rem', overflowY:'auto', maxHeight:'55vh' }}>
                    {tab === 'quick' ? (
                        <>
                            <label style={labelSt}>Select Code <span style={{ color:'#e31937' }}>*</span></label>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginBottom:'1rem' }}>
                                {Object.entries(CODE_COLORS).map(([c, cf]) => {
                                    const active = code === c;
                                    return (
                                        <button key={c} onClick={() => setCode(active?'':c)} style={{
                                            padding:'0.3rem 0.75rem', borderRadius:20, fontSize:'0.75rem',
                                            border:`2px solid ${active?cf.color:'#e5e7eb'}`,
                                            background:active?cf.bg:'#fff',
                                            color:active?cf.color:'#6b7280',
                                            fontWeight:active?800:500, cursor:'pointer',
                                        }}>
                                            {active?'✓ ':''}{c}
                                        </button>
                                    );
                                })}
                            </div>
                            {cfg && (
                                <div style={{ background:cfg.bg, border:`1px solid ${cfg.color}33`, borderRadius:8, padding:'0.65rem 1rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
                                    <span style={{ fontWeight:800, fontSize:'1rem', color:cfg.color }}>{code}</span>
                                    <span style={{ color:cfg.color, fontSize:'0.85rem' }}>{cfg.label}</span>
                                </div>
                            )}
                            <label style={labelSt}>Date Range</label>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                                <div><div style={{ fontSize:'0.7rem', color:'#9ca3af', marginBottom:4 }}>Start</div><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputSt} /></div>
                                <div><div style={{ fontSize:'0.7rem', color:'#9ca3af', marginBottom:4 }}>End</div><input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={inputSt} /></div>
                            </div>
                        </>
                    ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                                <div>
                                    <label style={labelSt}>Code <span style={{ color:'#e31937' }}>*</span></label>
                                    <select value={code} onChange={e => setCode(e.target.value)} style={inputSt}>
                                        <option value="">Select code…</option>
                                        {Object.entries(CODE_COLORS).filter(([c]) => c!=='CLEAR').map(([c,cf]) => (
                                            <option key={c} value={c}>{c} — {cf.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelSt}>Status</label>
                                    <select value={status} onChange={e => setStatus(e.target.value)} style={inputSt}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={labelSt}>Title / Description</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. On-call coverage…" style={inputSt} />
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                                <div><label style={labelSt}>Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputSt} /></div>
                                <div><label style={labelSt}>End Date</label><input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={inputSt} /></div>
                            </div>
                            <div>
                                <label style={labelSt}>Notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Optional notes…" style={{ ...inputSt, resize:'vertical' }} />
                            </div>
                            {status && (
                                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:12, background:STATUS_BG[status]||'#f3f4f6', color:STATUS_COLORS[status]||'#6b7280', fontSize:'0.72rem', fontWeight:700, width:'fit-content' }}>
                                    ● {status.charAt(0).toUpperCase()+status.slice(1)}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding:'1rem 1.25rem', borderTop:'1px solid #f3f4f6', display:'flex', gap:'0.6rem' }}>
                    <button
                        onClick={() => code && onSave({ code, title, status, notes, startDate, endDate })}
                        disabled={!code}
                        style={{ flex:1, padding:'0.65rem', borderRadius:7, border:'none', background:code?'#e31937':'#e5e7eb', color:code?'#fff':'#9ca3af', fontWeight:700, fontSize:'0.875rem', cursor:code?'pointer':'default', transition:'all 0.15s' }}
                    >
                        {entry ? 'Update Entry' : 'Save Entry'}
                    </button>
                    {entry && (
                        <button onClick={onDelete} style={{ padding:'0.65rem 1rem', borderRadius:7, border:'1px solid #fecaca', background:'#fff', color:'#e31937', fontWeight:700, fontSize:'0.875rem', cursor:'pointer' }}>
                            Delete
                        </button>
                    )}
                    <button onClick={onClose} style={{ padding:'0.65rem 1rem', borderRadius:7, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontWeight:600, fontSize:'0.875rem', cursor:'pointer' }}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── CANVAS GRID ────────────────────────────────────────────────────────────────
// Self-contained: owns its own wrapper div, measures itself, manages scroll state.
// Parent only needs to supply data + callbacks.
const CanvasGrid = React.memo(({
                                   dates, grouped, schedule, activeCode, highlightCode,
                                   onCellAction, onCellDoubleClick,
                               }) => {
    const wrapperRef = useRef(null);   // outer div — we measure THIS
    const canvasRef  = useRef(null);
    const dpr        = window.devicePixelRatio || 1;
    const dragRef    = useRef(null);
    const hoverRef   = useRef(null);
    const needsDraw  = useRef(true);
    const rafRef     = useRef(null);
    const scrollRef  = useRef({ left:0, top:0 });
    const sizeRef    = useRef({ w:0, h:0 });

    // Stable pre-computed row list — even/odd computed once, not per-render
    const rows = useMemo(() => {
        const list = [];
        let y = HEADER_H, empIdx = 0;
        for (const [teamName, emps] of Object.entries(grouped)) {
            list.push({ type:'team', teamName, color:emps[0]?.team_color||'#6b7280', y });
            y += TEAM_HDR_H;
            for (const emp of emps) {
                list.push({ type:'emp', emp, y, even: empIdx%2===0 });
                y += CELL_H; empIdx++;
            }
        }
        return list;
    }, [grouped]);

    const hitTest = useCallback((clientX, clientY) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const sl = scrollRef.current.left;
        const st = scrollRef.current.top;
        const x = clientX - rect.left + sl;
        const y = clientY - rect.top  + st;
        if (x < NAME_W || y < HEADER_H) return null;
        const dateIdx = Math.floor((x - NAME_W) / CELL_W);
        if (dateIdx < 0 || dateIdx >= dates.length) return null;
        const date = dates[dateIdx];
        for (const row of rows) {
            if (row.type==='emp' && y>=row.y && y<row.y+CELL_H)
                return { empId:row.emp.id, empName:row.emp.name, date, key:`${row.emp.id}_${date}`, dateIdx };
        }
        return null;
    }, [dates, rows]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = sizeRef.current.w, H = sizeRef.current.h;
        ctx.setTransform(dpr,0,0,dpr,0,0);
        ctx.clearRect(0,0,W,H);

        const sl=scrollRef.current.left, st=scrollRef.current.top;
        const fi=Math.max(0, Math.floor((sl-NAME_W)/CELL_W)-1);
        const li=Math.min(dates.length-1, Math.ceil((sl+W-NAME_W)/CELL_W)+1);

        ctx.fillStyle=PALETTE.bg; ctx.fillRect(0,0,W,H);

        // Column shading
        for (let i=fi; i<=li; i++) {
            const date=dates[i], x=NAME_W+i*CELL_W-sl;
            if (isWeekendStr(date)) { ctx.fillStyle=PALETTE.weekendBg; ctx.fillRect(x,0,CELL_W,H); }
            if (date===todayStr)    { ctx.fillStyle=PALETTE.todayBg;   ctx.fillRect(x,0,CELL_W,H); }
        }

        // Rows
        for (const row of rows) {
            const ry=row.y-st;
            if (ry+CELL_H<0||ry>H) continue;

            if (row.type==='team') {
                ctx.fillStyle=PALETTE.teamHdrBg; ctx.fillRect(0,ry,W,TEAM_HDR_H);
                ctx.strokeStyle=PALETTE.gridLine; ctx.lineWidth=1;
                ctx.beginPath(); ctx.moveTo(0,ry); ctx.lineTo(W,ry); ctx.stroke();
                ctx.fillStyle=row.color;
                ctx.beginPath(); ctx.arc(NAME_W-14, ry+TEAM_HDR_H/2, 4, 0, Math.PI*2); ctx.fill();
                ctx.font='700 11px sans-serif'; ctx.fillStyle=PALETTE.text;
                ctx.textAlign='left'; ctx.textBaseline='middle';
                ctx.fillText(row.teamName, 12, ry+TEAM_HDR_H/2);
                continue;
            }

            ctx.fillStyle=row.even?PALETTE.bg:'#fafafa';
            ctx.fillRect(NAME_W,ry,W-NAME_W,CELL_H);
            ctx.strokeStyle=PALETTE.gridLine; ctx.lineWidth=0.5;
            ctx.beginPath(); ctx.moveTo(NAME_W,ry+CELL_H); ctx.lineTo(W,ry+CELL_H); ctx.stroke();

            for (let i=fi; i<=li; i++) {
                const date=dates[i], x=NAME_W+i*CELL_W-sl;
                ctx.strokeStyle=PALETTE.gridLine; ctx.lineWidth=0.5;
                ctx.beginPath(); ctx.moveTo(x,ry); ctx.lineTo(x,ry+CELL_H); ctx.stroke();

                if (hoverRef.current?.key===`${row.emp.id}_${date}`) {
                    ctx.fillStyle='rgba(227,25,55,0.06)'; ctx.fillRect(x,ry,CELL_W,CELL_H);
                }

                const entry=schedule[`${row.emp.id}_${date}`];
                const code=entry?.code?.toUpperCase();
                const cfg=code?CODE_COLORS[code]:null;
                if (!cfg||code==='CLEAR') continue;

                const dim=highlightCode&&code!==highlightCode;
                ctx.fillStyle=dim?cfg.bg+'44':cfg.bg;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x+2,ry+2,CELL_W-4,CELL_H-4,3);
                else ctx.rect(x+2,ry+2,CELL_W-4,CELL_H-4);
                ctx.fill();
                ctx.font='800 9px sans-serif';
                ctx.fillStyle=dim?cfg.color+'44':cfg.color;
                ctx.textAlign='center'; ctx.textBaseline='middle';
                ctx.fillText(code, x+CELL_W/2, ry+CELL_H/2);
            }
        }

        // Sticky header
        ctx.fillStyle=PALETTE.headerBg; ctx.fillRect(0,0,W,HEADER_H);
        for (let i=fi; i<=li; i++) {
            const date=dates[i], x=NAME_W+i*CELL_W-sl;
            if (hoverRef.current?.dateIdx===i) { ctx.fillStyle='rgba(227,25,55,0.05)'; ctx.fillRect(x,0,CELL_W,HEADER_H); }
            const d=new Date(date+'T00:00:00'), day=d.getDate(), dow=DAYS_SHORT[d.getDay()];
            const isT=date===todayStr, isW=isWeekendStr(date);
            ctx.textAlign='center'; ctx.textBaseline='middle';
            if (isT) { ctx.fillStyle=PALETTE.accent; ctx.beginPath(); ctx.arc(x+CELL_W/2,22,11,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; }
            else ctx.fillStyle=isW?PALETTE.textDim:PALETTE.text;
            ctx.font='700 10px sans-serif'; ctx.fillText(String(day),x+CELL_W/2,22);
            ctx.font='500 8px sans-serif'; ctx.fillStyle=isW?'#d1d5db':'#9ca3af';
            ctx.fillText(dow,x+CELL_W/2,38);
        }
        ctx.strokeStyle=PALETTE.gridLine; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(NAME_W,HEADER_H); ctx.lineTo(W,HEADER_H); ctx.stroke();

        // Sticky name column
        ctx.fillStyle=PALETTE.labelBg; ctx.fillRect(0,0,NAME_W,H);
        for (const row of rows) {
            const ry=row.y-st;
            if (ry+CELL_H<0||ry>H) continue;

            if (row.type==='team') {
                // Team header label in name column — matches the row drawn in main grid
                ctx.fillStyle=PALETTE.teamHdrBg;
                ctx.fillRect(0,ry,NAME_W,TEAM_HDR_H);
                ctx.strokeStyle=PALETTE.gridLine; ctx.lineWidth=1;
                ctx.beginPath(); ctx.moveTo(0,ry); ctx.lineTo(NAME_W,ry); ctx.stroke();
                // Colour dot
                ctx.fillStyle=row.color;
                ctx.beginPath(); ctx.arc(10, ry+TEAM_HDR_H/2, 4, 0, Math.PI*2); ctx.fill();
                // Team name text — truncate if needed
                ctx.font='700 11px sans-serif';
                ctx.fillStyle='#374151';
                ctx.textAlign='left'; ctx.textBaseline='middle';
                const maxW = NAME_W - 24;
                let teamLabel = row.teamName;
                ctx.save();
                while (ctx.measureText(teamLabel).width > maxW && teamLabel.length > 4) {
                    teamLabel = teamLabel.slice(0, -1);
                }
                if (teamLabel !== row.teamName) teamLabel += '…';
                ctx.restore();
                ctx.fillText(teamLabel, 22, ry+TEAM_HDR_H/2);
                continue;
            }

            const hov=hoverRef.current?.empId===row.emp.id;
            if (hov) { ctx.fillStyle='rgba(227,25,55,0.05)'; ctx.fillRect(0,ry,NAME_W,CELL_H); }
            ctx.font=hov?'600 11px sans-serif':'500 11px sans-serif';
            ctx.fillStyle=hov?PALETTE.accent:PALETTE.text;
            ctx.textAlign='left'; ctx.textBaseline='middle';
            ctx.fillText(row.emp.name,12,ry+CELL_H/2);
            ctx.strokeStyle=PALETTE.gridLine; ctx.lineWidth=0.5;
            ctx.beginPath(); ctx.moveTo(0,ry+CELL_H); ctx.lineTo(NAME_W,ry+CELL_H); ctx.stroke();
        }
        ctx.strokeStyle=PALETTE.gridLine; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(NAME_W,0); ctx.lineTo(NAME_W,H); ctx.stroke();

        // Corner
        ctx.fillStyle=PALETTE.labelBg; ctx.fillRect(0,0,NAME_W,HEADER_H);
        ctx.font='600 11px sans-serif'; ctx.fillStyle=PALETTE.text;
        ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText('Employee',12,HEADER_H/2);
        ctx.strokeStyle=PALETTE.gridLine; ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(NAME_W,0); ctx.lineTo(NAME_W,HEADER_H);
        ctx.moveTo(0,HEADER_H); ctx.lineTo(NAME_W,HEADER_H);
        ctx.stroke();
    }, [dates, grouped, schedule, highlightCode, rows, dpr]);

    // RAF draw loop
    useEffect(() => {
        const loop = () => {
            if (needsDraw.current) { draw(); needsDraw.current = false; }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [draw]);

    // Mark dirty on any prop change
    useEffect(() => { needsDraw.current = true; });

    // Self-sizing: ResizeObserver on the wrapper div
    useEffect(() => {
        const wrapper = wrapperRef.current;
        const canvas  = canvasRef.current;
        if (!wrapper || !canvas) return;
        const resize = () => {
            const w = wrapper.clientWidth;
            const h = wrapper.clientHeight;
            sizeRef.current = { w, h };
            canvas.width  = w * dpr;
            canvas.height = h * dpr;
            needsDraw.current = true;
        };
        const ro = new ResizeObserver(resize);
        ro.observe(wrapper);
        resize(); // run immediately
        return () => ro.disconnect();
    }, [dpr]);

    // Wheel scroll handler on the wrapper
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const empCount  = Object.values(grouped).flat().length;
        const teamCount = Object.keys(grouped).length;
        const totalH = HEADER_H + teamCount * TEAM_HDR_H + empCount * CELL_H;
        const totalW = NAME_W + dates.length * CELL_W;
        const { w, h } = sizeRef.current;
        const maxLeft = Math.max(0, totalW - w);
        const maxTop  = Math.max(0, totalH - h);
        scrollRef.current = {
            left: Math.max(0, Math.min(maxLeft, scrollRef.current.left + e.deltaX)),
            top:  Math.max(0, Math.min(maxTop,  scrollRef.current.top  + e.deltaY)),
        };
        needsDraw.current = true;
    }, [grouped, dates]);

    const handlePointerDown=useCallback((e)=>{
        if(e.button!==0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const hit=hitTest(e.clientX,e.clientY); if(!hit) return;
        if(activeCode){ dragRef.current={painting:true,lastKey:null}; onCellAction(hit.key,hit.empId,hit.date,hit.empName); dragRef.current.lastKey=hit.key; needsDraw.current=true; }
    },[hitTest,activeCode,onCellAction]);

    const handlePointerMove=useCallback((e)=>{
        const hit=hitTest(e.clientX,e.clientY);
        const prev=hoverRef.current; hoverRef.current=hit||null;
        if(JSON.stringify(prev)!==JSON.stringify(hoverRef.current)) needsDraw.current=true;
        if(dragRef.current?.painting&&hit&&hit.key!==dragRef.current.lastKey&&activeCode){
            onCellAction(hit.key,hit.empId,hit.date,hit.empName);
            dragRef.current.lastKey=hit.key; needsDraw.current=true;
        }
    },[hitTest,activeCode,onCellAction]);

    const handlePointerUp=useCallback(()=>{ dragRef.current=null; },[]);
    const handlePointerLeave=useCallback(()=>{ hoverRef.current=null; dragRef.current=null; needsDraw.current=true; },[]);
    const handleDoubleClick=useCallback((e)=>{
        const hit=hitTest(e.clientX,e.clientY); if(hit) onCellDoubleClick(hit.key,hit.empId,hit.date,hit.empName);
    },[hitTest,onCellDoubleClick]);

    return (
        <div
            ref={wrapperRef}
            style={{ width:'100%', height:'100%', overflow:'hidden', position:'relative' }}
            onWheel={handleWheel}
        >
            <canvas
                ref={canvasRef}
                style={{ display:'block', cursor:activeCode?'crosshair':'default' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onDoubleClick={handleDoubleClick}
            />
        </div>
    );
});

// ── CALENDAR VIEW ──────────────────────────────────────────────────────────────
function CalendarView({ year, monthIdx, schedule, employees, onOpenModal }) {
    const firstDay  = new Date(year, monthIdx, 1).getDay();
    const daysInMon = getDaysInMonth(year, monthIdx);
    const cells     = [];
    for (let i=0; i<firstDay; i++) cells.push(null);
    for (let d=1; d<=daysInMon; d++)
        cells.push(`${year}-${String(monthIdx+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    while (cells.length%7!==0) cells.push(null);

    const dayMap = useMemo(() => {
        const map = {};
        Object.entries(schedule).forEach(([key, entry]) => {
            const [empId, date] = key.split('_');
            if (!map[date]) map[date]=[];
            const emp=employees.find(e=>String(e.id)===String(empId));
            if (emp) map[date].push({ emp, code:entry.code, entry, key });
        });
        return map;
    }, [schedule, employees]);

    const weeks=[];
    for (let i=0; i<cells.length; i+=7) weeks.push(cells.slice(i,i+7));

    return (
        <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' }}>
                {DAYS_LONG.map(d => (
                    <div key={d} style={{ padding:'0.5rem', fontSize:'0.72rem', fontWeight:700, color:'#6b7280', textAlign:'center', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        {d.slice(0,3)}
                    </div>
                ))}
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
                {weeks.map((week,wi) => (
                    <div key={wi} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid #f3f4f6', minHeight:90 }}>
                        {week.map((dateStr,di) => {
                            const isT=dateStr===todayStr, isW=dateStr?isWeekendStr(dateStr):false;
                            const dayEntries=dateStr?(dayMap[dateStr]||[]):[];
                            const d=dateStr?new Date(dateStr+'T00:00:00').getDate():null;
                            return (
                                <div key={di}
                                     onDoubleClick={()=>dateStr&&onOpenModal(null,null,dateStr,null)}
                                     style={{ padding:'0.4rem 0.5rem', background:isT?'#fff7f7':isW?'#fafafa':'#fff', borderRight:di<6?'1px solid #f3f4f6':'none', cursor:dateStr?'default':'default', minHeight:90 }}
                                >
                                    {dateStr && (
                                        <>
                                            <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:'50%', marginBottom:4, background:isT?'#e31937':'none', color:isT?'#fff':isW?'#9ca3af':'#374151', fontSize:'0.75rem', fontWeight:700 }}>{d}</div>
                                            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                                                {dayEntries.slice(0,3).map(({ emp, code, key }) => {
                                                    const cf=CODE_COLORS[code?.toUpperCase()]; if(!cf) return null;
                                                    return (
                                                        <div key={key} onClick={e=>{ e.stopPropagation(); onOpenModal(key,emp.id,dateStr,emp.name); }}
                                                             style={{ background:cf.bg, color:cf.color, borderRadius:4, padding:'1px 5px', fontSize:'0.65rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                                            {code} · {emp.name.split(' ')[0]}
                                                        </div>
                                                    );
                                                })}
                                                {dayEntries.length>3 && <div style={{ fontSize:'0.65rem', color:'#9ca3af', paddingLeft:5 }}>+{dayEntries.length-3} more</div>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function MatrixView() {
    const [year,          setYear]          = useState(today.getFullYear());
    const [monthIdx,      setMonthIdx]      = useState(today.getMonth());
    const [viewMode,      setViewMode]      = useState('matrix');
    const [employees,     setEmployees]     = useState([]);
    const [teams,         setTeams]         = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [activeCode,    setActiveCode]    = useState(null);
    const [highlightCode, setHighlightCode] = useState(null);
    const [rowMode,       setRowMode]       = useState('users');
    const [fetchedMonths, setFetchedMonths] = useState(new Set());
    const [modal,         setModal]         = useState(null);
    const [showFilters,   setShowFilters]   = useState(false);
    const [filterCode,    setFilterCode]    = useState([]);
    const [filterTeam,    setFilterTeam]    = useState([]);
    const [searchTerm,    setSearchTerm]    = useState('');
    // Date range mode
    const [rangeMode,     setRangeMode]     = useState('month'); // 'month' | 'range'
    const [rangeStart,    setRangeStart]    = useState(todayStr);
    const [rangeEnd,      setRangeEnd]      = useState(todayStr);

    const [schedule, dispatchSchedule] = useReducer(scheduleReducer, {});

    // Dates shown — full month OR custom range
    const dates = useMemo(() => {
        if (rangeMode === 'range' && rangeStart && rangeEnd && rangeStart <= rangeEnd)
            return getDateRange(rangeStart, rangeEnd);
        return getDatesForMonth(year, monthIdx);
    }, [rangeMode, rangeStart, rangeEnd, year, monthIdx]);

    // All YYYY-MM months visible in the current date set
    const monthsInView = useMemo(() => {
        const seen = new Set();
        dates.forEach(d => seen.add(d.slice(0,7)));
        return Array.from(seen);
    }, [dates]);

    // Fetch employees + teams
    useEffect(() => {
        Promise.all([
            fetch('/api/matrix-users').then(r=>r.json()).catch(()=>[]),
            fetch('/api/teams').then(r=>r.json()).catch(()=>[]),
        ]).then(([emps,tms]) => {
            setEmployees(Array.isArray(emps)?emps:[]);
            setTeams(Array.isArray(tms)?tms:[]);
        }).finally(()=>setLoading(false));
    }, []);

    // Fetch all months currently in view + one prefetch month ahead
    useEffect(() => {
        // Prefetch: one month after the last visible month
        const lastMonth = monthsInView[monthsInView.length - 1];
        const [ly, lm] = lastMonth.split('-').map(Number);
        const prefetchMonth = lm === 12
            ? `${ly+1}-01`
            : `${ly}-${String(lm+1).padStart(2,'0')}`;

        const toFetch = [...monthsInView, prefetchMonth].filter(k => !fetchedMonths.has(k));
        if (!toFetch.length) return;

        Promise.all(toFetch.map(m =>
            fetch(`/api/schedule?month=${m}`).then(r=>r.json()).catch(()=>[])
        )).then(results => {
            const newMap = {};
            results.flat().forEach(e => { newMap[`${e.user_id}_${e.date}`] = { code:e.code, id:e.id }; });
            dispatchSchedule({ type:'MERGE', data:newMap });
            setFetchedMonths(prev => { const n=new Set(prev); toFetch.forEach(k=>n.add(k)); return n; });
        });
    }, [monthsInView, fetchedMonths]);

    // (Resize is now handled inside CanvasGrid itself via ResizeObserver on its wrapper div)

    // Navigation
    const goToPrev  = () => monthIdx===0  ? (setYear(y=>y-1), setMonthIdx(11))  : setMonthIdx(m=>m-1);
    const goToNext  = () => monthIdx===11 ? (setYear(y=>y+1), setMonthIdx(0))   : setMonthIdx(m=>m+1);
    const goToToday = () => { setYear(today.getFullYear()); setMonthIdx(today.getMonth()); };

    // Grouped employees (respects search, team filter, row mode)
    const grouped = useMemo(() => {
        let emps = employees;
        if (searchTerm.trim()) {
            const q=searchTerm.toLowerCase();
            emps=emps.filter(e=>e.name.toLowerCase().includes(q)||e.team_name?.toLowerCase().includes(q));
        }
        if (filterTeam.length>0) emps=emps.filter(e=>filterTeam.includes(String(e.team_id)));
        const g={};
        emps.forEach(e=>{ const k=e.team_name||'Unassigned'; if(!g[k]) g[k]=[]; g[k].push(e); });
        return g;
    }, [employees, searchTerm, filterTeam]);

    // Filtered schedule (by code filter)
    const filteredSchedule = useMemo(() => {
        if (!filterCode.length) return schedule;
        const r={};
        Object.entries(schedule).forEach(([k,v])=>{ if(filterCode.includes(v.code?.toUpperCase())) r[k]=v; });
        return r;
    }, [schedule, filterCode]);

    // Cell action (drag-paint / click)
    const handleCellAction = useCallback(async (key, empId, date, empName) => {
        if (!activeCode) return;
        const existing=schedule[key]?.code?.toUpperCase();
        const newCode=(activeCode==='CLEAR'||existing===activeCode)?null:activeCode;
        dispatchSchedule({ type:'SET_CELLS', updates:[{ key, code:newCode }] });
        try {
            await fetch('/api/schedule', { method:'PUT', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ user_id:empId, date, code:newCode||'CLEAR' }) });
        } catch {
            dispatchSchedule({ type:'SET_CELLS', updates:[{ key, code:existing||null }] });
        }
    }, [activeCode, schedule]);

    // Double-click → open modal
    const handleCellDoubleClick = useCallback((key, empId, date, empName) => setModal({ key, empId, date, empName }), []);
    const openModal = useCallback((key, empId, date, empName) => setModal({ key, empId, date, empName }), []);

    // Modal save
    const handleModalSave = useCallback(async ({ code, title, status, notes, startDate, endDate }) => {
        if (!modal) return;
        const { empId, date } = modal;
        const rangeDates = startDate && endDate ? getDateRange(startDate, endDate) : [date];
        const updates = rangeDates.map(d=>({ key:`${empId}_${d}`, code:code==='CLEAR'?null:code, meta:{ title, status, notes } }));
        dispatchSchedule({ type:'SET_CELLS', updates });
        await Promise.all(rangeDates.map(d=>fetch('/api/schedule',{ method:'PUT', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ user_id:empId, date:d, code }) }).catch(()=>{})));
        setModal(null);
    }, [modal]);

    // Modal delete
    const handleModalDelete = useCallback(async () => {
        if (!modal) return;
        const { key, empId, date } = modal;
        dispatchSchedule({ type:'SET_CELLS', updates:[{ key, code:null }] });
        const entry=schedule[key];
        if (entry?.id) await fetch(`/api/schedule/${entry.id}`,{ method:'DELETE' }).catch(()=>{});
        else await fetch('/api/schedule',{ method:'PUT', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ user_id:empId, date, code:'CLEAR' }) }).catch(()=>{});
        setModal(null);
    }, [modal, schedule]);

    const allEmps = useMemo(()=>Object.values(grouped).flat(), [grouped]);
    const modalEntry = modal ? schedule[modal.key] : null;
    const modalEmpName = modal?.empName || employees.find(e=>String(e.id)===String(modal?.empId))?.name || '';

    const hasActiveFilters = filterCode.length>0||filterTeam.length>0;

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#6b7280', gap:'0.5rem' }}>
            <div style={{ width:16, height:16, border:'2px solid #e31937', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
            Loading schedule…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', minHeight:'calc(100vh - 160px)' }}>

            {/* ── Toolbar ── */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap', background:'#fff', padding:'0.65rem 1rem', borderRadius:10, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>

                {/* View toggle */}
                <div style={{ display:'flex', background:'#f3f4f6', borderRadius:8, padding:3, gap:2 }}>
                    {[['matrix','⊞ Matrix'],['calendar','▦ Calendar']].map(([v,lbl])=>(
                        <button key={v} onClick={()=>setViewMode(v)} style={{ padding:'0.28rem 0.85rem', borderRadius:6, border:'none', background:viewMode===v?'#fff':'none', color:viewMode===v?'#111827':'#6b7280', fontWeight:viewMode===v?700:500, fontSize:'0.78rem', cursor:'pointer', boxShadow:viewMode===v?'0 1px 3px rgba(0,0,0,0.08)':'none', transition:'all 0.15s' }}>{lbl}</button>
                    ))}
                </div>

                <div style={{ width:1, height:22, background:'#e5e7eb' }} />

                {/* Month / Range mode toggle */}
                <div style={{ display:'flex', background:'#f3f4f6', borderRadius:8, padding:3, gap:2 }}>
                    {[['month','📅 Month'],['range','↔ Range']].map(([v,lbl])=>(
                        <button key={v} onClick={()=>setRangeMode(v)} style={{ padding:'0.28rem 0.65rem', borderRadius:6, border:'none', background:rangeMode===v?'#fff':'none', color:rangeMode===v?'#111827':'#6b7280', fontWeight:rangeMode===v?700:500, fontSize:'0.73rem', cursor:'pointer', boxShadow:rangeMode===v?'0 1px 3px rgba(0,0,0,0.08)':'none', transition:'all 0.15s' }}>{lbl}</button>
                    ))}
                </div>

                {/* Month nav — shown in month mode */}
                {rangeMode === 'month' && (
                    <div style={{ display:'flex', alignItems:'center', gap:'0.2rem' }}>
                        <button onClick={goToPrev} style={navBtnSt}>‹</button>
                        <span style={{ fontWeight:700, fontSize:'0.92rem', color:'#111827', minWidth:148, textAlign:'center' }}>{MONTHS[monthIdx]} {year}</span>
                        <button onClick={goToNext} style={navBtnSt}>›</button>
                        <button onClick={goToToday} style={{ ...navBtnSt, fontSize:'0.73rem', padding:'0.28rem 0.65rem', marginLeft:4 }}>Today</button>
                    </div>
                )}

                {/* Date range pickers — shown in range mode */}
                {rangeMode === 'range' && (
                    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        <label style={{ fontSize:'0.7rem', color:'#6b7280', fontWeight:600 }}>From</label>
                        <input type="date" value={rangeStart} onChange={e => {
                            const v = e.target.value;
                            setRangeStart(v);
                            if (v > rangeEnd) setRangeEnd(v);
                        }} style={{ padding:'0.28rem 0.5rem', border:'1px solid #e5e7eb', borderRadius:7, fontSize:'0.78rem', outline:'none', color:'#374151', cursor:'pointer' }} />
                        <label style={{ fontSize:'0.7rem', color:'#6b7280', fontWeight:600 }}>To</label>
                        <input type="date" value={rangeEnd} min={rangeStart} onChange={e => setRangeEnd(e.target.value)}
                               style={{ padding:'0.28rem 0.5rem', border:'1px solid #e5e7eb', borderRadius:7, fontSize:'0.78rem', outline:'none', color:'#374151', cursor:'pointer' }} />
                        {rangeStart && rangeEnd && (
                            <span style={{ fontSize:'0.7rem', color:'#9ca3af', whiteSpace:'nowrap' }}>
                                {dates.length} day{dates.length !== 1 ? 's' : ''}
                            </span>
                        )}
                        <button onClick={() => { setRangeStart(todayStr); setRangeEnd(todayStr); }} style={{ ...navBtnSt, fontSize:'0.73rem', padding:'0.28rem 0.65rem' }}>Reset</button>
                    </div>
                )}

                <div style={{ width:1, height:22, background:'#e5e7eb' }} />

                {/* Row mode */}
                <div style={{ display:'flex', background:'#f3f4f6', borderRadius:8, padding:3, gap:2 }}>
                    {[['users','👤 Users'],['teams','👥 Teams']].map(([v,lbl])=>(
                        <button key={v} onClick={()=>setRowMode(v)} style={{ padding:'0.28rem 0.65rem', borderRadius:6, border:'none', background:rowMode===v?'#fff':'none', color:rowMode===v?'#111827':'#6b7280', fontWeight:rowMode===v?700:500, fontSize:'0.73rem', cursor:'pointer', boxShadow:rowMode===v?'0 1px 3px rgba(0,0,0,0.08)':'none', transition:'all 0.15s' }}>{lbl}</button>
                    ))}
                </div>

                <div style={{ width:1, height:22, background:'#e5e7eb' }} />

                {/* Code palette (matrix only) */}
                {viewMode==='matrix' && (
                    <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap', alignItems:'center' }}>
                        {Object.entries(CODE_COLORS).map(([code,cfg])=>{
                            const on=activeCode===code;
                            return <button key={code} title={cfg.label} onClick={()=>{ setActiveCode(p=>p===code?null:code); setHighlightCode(null); }} style={{ padding:'0.18rem 0.55rem', borderRadius:20, fontSize:'0.7rem', border:`2px solid ${on?cfg.color:'transparent'}`, background:on?cfg.bg:'#f3f4f6', color:on?cfg.color:'#6b7280', fontWeight:on?800:500, cursor:'pointer', transition:'all 0.12s' }}>{on?'✓ ':''}{code}</button>;
                        })}
                    </div>
                )}

                {/* Search */}
                <input type="text" placeholder="Search…" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                       style={{ marginLeft:'auto', padding:'0.32rem 0.7rem', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.78rem', outline:'none', width:180, color:'#374151' }} />

                {/* Filters button */}
                <button onClick={()=>setShowFilters(f=>!f)} style={{ ...navBtnSt, fontSize:'0.73rem', padding:'0.28rem 0.65rem', background:hasActiveFilters?'#fef2f2':'#f3f4f6', color:hasActiveFilters?'#e31937':'#374151', border:`1px solid ${hasActiveFilters?'#fca5a5':'#e5e7eb'}` }}>
                    ⚙ Filters{hasActiveFilters?` (${filterCode.length+filterTeam.length})`:''}
                </button>
            </div>

            {/* ── Filter Panel ── */}
            {showFilters && (
                <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'1rem 1.25rem', display:'flex', gap:'2rem', flexWrap:'wrap', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div>
                        <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#374151', marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>Filter by Code</div>
                        <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap' }}>
                            {Object.entries(CODE_COLORS).filter(([c])=>c!=='CLEAR').map(([code,cfg])=>{
                                const on=filterCode.includes(code);
                                return <button key={code} onClick={()=>setFilterCode(p=>on?p.filter(c=>c!==code):[...p,code])} style={{ padding:'0.18rem 0.55rem', borderRadius:20, fontSize:'0.7rem', border:`2px solid ${on?cfg.color:'#e5e7eb'}`, background:on?cfg.bg:'#fff', color:on?cfg.color:'#9ca3af', fontWeight:on?700:400, cursor:'pointer' }}>{on?'✓ ':''}{code}</button>;
                            })}
                            {filterCode.length>0 && <button onClick={()=>setFilterCode([])} style={{ fontSize:'0.7rem', color:'#e31937', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>✕ Clear</button>}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#374151', marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>Filter by Team</div>
                        <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap' }}>
                            {teams.map(t=>{ const on=filterTeam.includes(String(t.id)); return <button key={t.id} onClick={()=>setFilterTeam(p=>on?p.filter(i=>i!==String(t.id)):[...p,String(t.id)])} style={{ padding:'0.18rem 0.55rem', borderRadius:20, fontSize:'0.7rem', border:`2px solid ${on?(t.color||'#e31937'):'#e5e7eb'}`, background:on?(t.color||'#e31937')+'22':'#fff', color:on?(t.color||'#e31937'):'#9ca3af', fontWeight:on?700:400, cursor:'pointer' }}>{on?'✓ ':''}{t.name}</button>; })}
                            {filterTeam.length>0 && <button onClick={()=>setFilterTeam([])} style={{ fontSize:'0.7rem', color:'#e31937', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>✕ Clear</button>}
                        </div>
                    </div>
                    {viewMode==='matrix' && (
                        <div>
                            <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#374151', marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>Highlight Code</div>
                            <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap' }}>
                                {Object.entries(CODE_COLORS).filter(([c])=>c!=='CLEAR').map(([code,cfg])=>{ const on=highlightCode===code; return <button key={code} onClick={()=>setHighlightCode(p=>p===code?null:code)} style={{ padding:'0.18rem 0.55rem', borderRadius:20, fontSize:'0.7rem', border:`2px solid ${on?cfg.color:'#e5e7eb'}`, background:on?cfg.bg:'#fff', color:on?cfg.color:'#9ca3af', fontWeight:on?700:400, cursor:'pointer' }}>{on?'✓ ':''}{code}</button>; })}
                                {highlightCode && <button onClick={()=>setHighlightCode(null)} style={{ fontSize:'0.7rem', color:'#e31937', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>✕ Clear</button>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Active code hint */}
            {viewMode==='matrix' && activeCode && (
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.35rem 0.75rem', background:CODE_COLORS[activeCode]?.bg||'#f3f4f6', borderRadius:8, fontSize:'0.75rem', border:`1px solid ${CODE_COLORS[activeCode]?.color||'#e5e7eb'}33` }}>
                    <span style={{ fontWeight:800, color:CODE_COLORS[activeCode]?.color }}>{activeCode}</span>
                    <span style={{ color:CODE_COLORS[activeCode]?.color }}>— {CODE_COLORS[activeCode]?.label}</span>
                    <span style={{ color:'#9ca3af', marginLeft:4 }}>Click or drag to apply · click same code to deselect · double-click cell for details</span>
                    <button onClick={()=>setActiveCode(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}>✕</button>
                </div>
            )}

            {/* ── Matrix View ── */}
            {viewMode==='matrix' && (
                <div style={{ height:'calc(100vh - 260px)', minHeight:400, border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                    <CanvasGrid
                        dates={dates}
                        grouped={grouped}
                        schedule={filteredSchedule}
                        activeCode={activeCode}
                        highlightCode={highlightCode}
                        onCellAction={handleCellAction}
                        onCellDoubleClick={handleCellDoubleClick}
                    />
                </div>
            )}

            {/* ── Calendar View ── */}
            {viewMode==='calendar' && (
                <div style={{ height:'calc(100vh - 260px)', minHeight:400, border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                    <CalendarView year={year} monthIdx={monthIdx} schedule={filteredSchedule} employees={allEmps} teams={teams} onOpenModal={openModal} />
                </div>
            )}

            {/* Footer */}
            <div style={{ display:'flex', gap:'1.5rem', fontSize:'0.7rem', color:'#9ca3af', paddingLeft:4, flexShrink:0 }}>
                <span>{allEmps.length} employees</span>
                <span>{Object.keys(grouped).length} teams</span>
                <span>{dates.length} days shown</span>
                {rangeMode === 'range' && rangeStart && rangeEnd && (
                    <span style={{ color:'#e31937', fontWeight:600 }}>
                        {formatDisplay(rangeStart)} → {formatDisplay(rangeEnd)}
                    </span>
                )}
                <span style={{ marginLeft:'auto' }}>{viewMode==='matrix'?'Scroll to navigate · drag to paint · double-click for details':'Double-click a day to add · click an entry to edit'}</span>
            </div>

            {/* Event Modal */}
            {modal && (
                <EventModal
                    entry={modalEntry} empId={modal.empId} date={modal.date} empName={modalEmpName}
                    onSave={handleModalSave} onDelete={handleModalDelete} onClose={()=>setModal(null)}
                />
            )}
        </div>
    );
}