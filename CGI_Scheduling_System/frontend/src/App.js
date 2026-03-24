import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import './styles/Dashboard.css';
import MatrixView from './components/MatrixView';
import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom';


const ROTATION_NAME_OPTIONS = [
    'Team-Level', 'Sub-Team', 'On-Call', 'Business Domain', 'Cross-Team Analyst'
];

const INTERVAL_PRESET_OPTIONS = [
    { value: 'daily',    label: 'Daily',     unit: 'day',    count: 1 },
    { value: 'weekly',   label: 'Weekly',    unit: 'week',   count: 1 },
    { value: 'biweekly', label: 'Bi-Weekly', unit: 'biweek', count: 1 },
    { value: 'custom',   label: 'Custom' }
];

const INTERVAL_UNIT_OPTIONS = [
    { value: 'day',    label: 'Day(s)'     },
    { value: 'week',   label: 'Week(s)'    },
    { value: 'biweek', label: 'Bi-Week(s)' },
    { value: 'month',  label: 'Month(s)'   }
];

const DEFAULT_ROTATION_FORM = {
    name: '', team_id: '', location_id: '',
    start_date: new Date().toISOString().split('T')[0],
    interval_unit: 'week', interval_count: 1, status: 'active',
    assigned_member_ids: [], notes: '', allow_double_booking: false, escalation_tiers: ''
};
const DEFAULT_TEAM_FORM = { name: '', color: '#e31937', leadId: '', members: [], description: '' };
const DEFAULT_USER_FORM = { first_name: '', last_name: '', username: '', email: '', phone: '', location: '', team_id: '', roles: [], password: '' };

function App() {

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
            setIsLoggedIn(true);
            setCurrentUser(JSON.parse(savedUser));
        }
    }, []);

    const [users,      setUsers]      = useState([]);
    const [teams,      setTeams]      = useState([]);
    const [roles,      setRoles]      = useState([]);
    const [locations,  setLocations]  = useState([]);
    const [rotations,  setRotations]  = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser,setCurrentUser]= useState(null);
    const [activePage, setActivePage] = useState('Matrix');
    const [selectedTeam, setSelectedTeam] = useState(null);

    // ── USER STATE ────────────────────────────────────────────────────────────
    const [userForm,        setUserForm]        = useState(DEFAULT_USER_FORM);
    const [userFormErrors,  setUserFormErrors]  = useState({});
    const [userFormSuccess, setUserFormSuccess] = useState('');
    const [editingUser,     setEditingUser]     = useState(null);
    const [showUserModal,   setShowUserModal]   = useState(false);
    const [viewingUser,     setViewingUser]     = useState(null);
    const [showViewModal,   setShowViewModal]   = useState(false);
    const [viewUserError,   setViewUserError]   = useState('');

    // User filters
    const [searchTerm,               setSearchTerm]               = useState('');
    const [teamFilter,               setTeamFilter]               = useState([]);
    const [roleFilter,               setRoleFilter]               = useState([]);
    const [statusFilter,             setStatusFilter]             = useState('');
    const [modalLocationSearch,      setModalLocationSearch]      = useState('');
    const [modalTeamSearch,          setModalTeamSearch]          = useState('');
    const [showModalLocationDropdown,setShowModalLocationDropdown]= useState(false);
    const [showModalTeamDropdown,    setShowModalTeamDropdown]    = useState(false);
    const [userTeamFilterSearch,     setUserTeamFilterSearch]     = useState('');

    // ── TEAM STATE ────────────────────────────────────────────────────────────
    const [showCreateTeamModal,   setShowCreateTeamModal]   = useState(false);
    const [showEditTeamModal,     setShowEditTeamModal]     = useState(false);
    const [editingTeam,           setEditingTeam]           = useState(null);
    const [teamFormData,          setTeamFormData]          = useState(DEFAULT_TEAM_FORM);
    const [showTeamDropdown,      setShowTeamDropdown]      = useState(false);
    const [showRoleDropdown,      setShowRoleDropdown]      = useState(false);
    const [viewingTeam,           setViewingTeam]           = useState(null);
    const [showViewTeamModal,     setShowViewTeamModal]     = useState(false);
    const [teamDeleteConfirm,     setTeamDeleteConfirm]     = useState({ open: false, teamId: null, teamName: '' });
    const [showModalMemberDropdown,setShowModalMemberDropdown]= useState(false);
    const [teamSearchTerm,        setTeamSearchTerm]        = useState('');
    const [leadFilter,            setLeadFilter]            = useState([]);
    const [memberFilter,          setMemberFilter]          = useState([]);
    const [showLeadDropdown,      setShowLeadDropdown]      = useState(false);
    const [showMemberDropdown,    setShowMemberDropdown]    = useState(false);
    const [modalLeadSearch,       setModalLeadSearch]       = useState('');
    const [modalMemberSearch,     setModalMemberSearch]     = useState('');
    const [showModalLeadDropdown, setShowModalLeadDropdown] = useState(false);
    const [teamLeadFilterSearch,  setTeamLeadFilterSearch]  = useState('');
    const [teamMemberFilterSearch,setTeamMemberFilterSearch]= useState('');

    // ── ROTATION STATE ────────────────────────────────────────────────────────
    const [rotationFormData,    setRotationFormData]    = useState(DEFAULT_ROTATION_FORM);
    const [rotationScope,       setRotationScope]       = useState('team');
    const [editingRotation,     setEditingRotation]     = useState(null);
    const [rotationFormError,   setRotationFormError]   = useState('');
    const [rotationFormSuccess, setRotationFormSuccess] = useState('');
    const [intervalPreset,      setIntervalPreset]      = useState('weekly');
    const [rotationNamePreset,  setRotationNamePreset]  = useState('');

    // Rotation filters
    const [rotationSearchTerm,    setRotationSearchTerm]    = useState('');
    const [rotationTeamFilter,    setRotationTeamFilter]    = useState([]);
    const [rotationIntervalFilter,setRotationIntervalFilter]= useState([]);
    const [showRotationTeamDropdown, setShowRotationTeamDropdown] = useState(false);
    const [rotationTeamFilterSearch, setRotationTeamFilterSearch] = useState('');

    // ── NOTIFICATIONS & CONFIRMS ──────────────────────────────────────────────
    const [deleteConfirm,  setDeleteConfirm]  = useState({ open: false, user: null });
    const [notification,   setNotification]   = useState({ show: false, message: '', type: 'success' });

    useEffect(() => { closeTeamModal(); }, [activePage]);

    useEffect(() => {
        if (isLoggedIn) {
            fetchUsers(); fetchTeams(); fetchRoles(); fetchLocations();
            if (activePage === 'Rotations') fetchRotations();
        }
    }, [isLoggedIn, activePage]);

    const fetchUsers     = async () => { try { const r = await fetch('/api/users');     const d = await r.json(); setUsers(Array.isArray(d) ? d : []);     } catch { setUsers([]); } };
    const fetchTeams     = async () => { try { const r = await fetch('/api/teams');     const d = await r.json(); setTeams(Array.isArray(d) ? d : []);     } catch { setTeams([]); } };
    const fetchRoles     = async () => { try { const r = await fetch('/api/roles');     const d = await r.json(); setRoles(Array.isArray(d) ? d : []);     } catch { setRoles([]); } };
    const fetchLocations = async () => { try { const r = await fetch('/api/locations'); const d = await r.json(); setLocations(Array.isArray(d) ? d : []); } catch { setLocations([]); } };
    const fetchRotations = async () => { try { const r = await fetch('/api/rotations'); const d = await r.json(); setRotations(Array.isArray(d) ? d : []); } catch { setRotations([]); } };

    const inferIntervalPreset = (unit, count) => {
        if (unit === 'day'    && count === 1) return 'daily';
        if (unit === 'week'   && count === 1) return 'weekly';
        if (unit === 'biweek' && count === 1) return 'biweekly';
        return 'custom';
    };

    const handleLoginSuccess = (userData) => {
        // Just accept the data from Login.js
        setCurrentUser(userData);
        setIsLoggedIn(true);
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
    };

    // ── USER HANDLERS ─────────────────────────────────────────────────────────
    const openCreateUser = () => { setEditingUser(null); setUserForm(DEFAULT_USER_FORM); setUserFormErrors({}); setUserFormSuccess(''); setShowUserModal(true); };
    const openEditUser   = (user) => {
        setEditingUser(user);
        setUserForm({ first_name: user.first_name || '', last_name: user.last_name || '', username: user.username || '', email: user.email || '', phone: user.phone || '', location: user.location || '', team_id: user.team_id || '', roles: user.user_roles?.map(ur => ur.role_id) || [], password: '' });
        setUserFormErrors({}); setUserFormSuccess(''); setShowUserModal(true);
    };
    const openViewUser = async (user) => {
        setViewUserError('');
        try {
            const res = await fetch(`/api/users/${user.id}`);
            if (!res.ok) { setViewUserError('User record not found.'); setViewingUser(null); setShowViewModal(true); return; }
            setViewingUser(await res.json()); setShowViewModal(true);
        } catch { setViewUserError('Failed to load user profile.'); setViewingUser(null); setShowViewModal(true); }
    };
    const closeUserModal = () => {
        setShowUserModal(false); setEditingUser(null); setUserFormSuccess(''); setUserFormErrors({});
        setShowModalLocationDropdown(false); setShowModalTeamDropdown(false);
        setModalLocationSearch(''); setModalTeamSearch('');
    };
    const handleUserFieldChange = (field, value) => {
        setUserForm(prev => ({ ...prev, [field]: value }));
        if (userFormErrors[field]) setUserFormErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    };
    const handleRoleToggle = (roleId) => {
        setUserForm(prev => { const exists = prev.roles.includes(roleId); return { ...prev, roles: exists ? prev.roles.filter(r => r !== roleId) : [...prev.roles, roleId] }; });
        if (userFormErrors.roles) setUserFormErrors(prev => { const e = { ...prev }; delete e.roles; return e; });
    };
    const handleSaveUser = async (e) => {
        e.preventDefault(); setUserFormErrors({}); setUserFormSuccess('');
        const method = editingUser ? 'PUT' : 'POST';
        const url    = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        try {
            const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) });
            const data = await res.json();
            if (!res.ok) { setUserFormErrors(data.errors || { general: data.error || 'An error occurred.' }); return; }
            setUserFormSuccess(editingUser ? 'User updated successfully.' : 'User created successfully.');
            fetchUsers();
            setTimeout(() => { closeUserModal(); }, 1500);
        } catch { setUserFormErrors({ general: 'Network error. Please try again.' }); }
    };
    const handleDeleteUser    = (user) => setDeleteConfirm({ open: true, user });
    const handleConfirmDelete = async () => {
        const user = deleteConfirm.user;
        setDeleteConfirm({ open: false, user: null });
        try {
            const res  = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) { fetchUsers(); showNotification('User deleted successfully.'); }
            else showNotification(data.error || 'Failed to delete user.', 'error');
        } catch { showNotification('Network error. Please try again.', 'error'); }
    };

    // ── TEAM HANDLERS ─────────────────────────────────────────────────────────
    const openCreateTeam = () => { setTeamFormData(DEFAULT_TEAM_FORM); setShowCreateTeamModal(true); };
    const openViewTeam   = (team) => { setViewingTeam(team); setShowViewTeamModal(true); };
    const openEditTeam   = (team) => {
        setTeamFormData({
            name: team.name, color: team.color || '#e31937', leadId: team.lead_id || '',
            members: Array.isArray(team.members) ? team.members : team.members ? JSON.parse(team.members) : [],
            description: team.description || ''
        });
        setEditingTeam(team); setShowEditTeamModal(true);
    };
    const handleTeamFieldChange = (field, value) => setTeamFormData(prev => ({ ...prev, [field]: value }));
    const handleSaveTeam = async (e) => {
        e.preventDefault();
        const method = editingTeam ? 'PUT' : 'POST';
        const url    = editingTeam ? `/api/teams/${editingTeam.id}` : '/api/teams';
        const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(teamFormData) });
        if (r.ok) { fetchTeams(); closeTeamModal(); }
    };
    const handleDeleteTeam = (id) => {
        const team = teams.find(t => t.id === id);
        setTeamDeleteConfirm({ open: true, teamId: id, teamName: team ? team.name : '' });
    };
    const handleConfirmDeleteTeam = async () => {
        const { teamId } = teamDeleteConfirm;
        setTeamDeleteConfirm({ open: false, teamId: null, teamName: '' });
        try {
            const r = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
            if (r.ok) { fetchTeams(); showNotification('Team deleted successfully.'); }
            else { const data = await r.json(); showNotification(data.error || 'Failed to delete team.', 'error'); }
        } catch { showNotification('Network error. Please try again.', 'error'); }
    };
    const closeTeamModal = () => { setShowCreateTeamModal(false); setShowEditTeamModal(false); setEditingTeam(null); setShowModalMemberDropdown(false); };

    // ── ROTATION HANDLERS ─────────────────────────────────────────────────────
    const handleSaveRotation = async (e) => {
        e.preventDefault(); setRotationFormError(''); setRotationFormSuccess('');
        if (!rotationFormData.name.trim())                                 { setRotationFormError('Rotation name is required.'); return; }
        if (rotationScope === 'team'     && !rotationFormData.team_id)     { setRotationFormError('Assigned team is required.'); return; }
        if (rotationScope === 'location' && !rotationFormData.location_id) { setRotationFormError('Assigned pool/location is required.'); return; }
        if (!rotationFormData.start_date)                                  { setRotationFormError('Start date is required.'); return; }
        const assignedMembers = (rotationFormData.assigned_member_ids || []).map(id => String(id)).filter(Boolean);
        if (!assignedMembers.length)                                       { setRotationFormError('Assign at least one member.'); return; }
        const intervalCount = Number.parseInt(rotationFormData.interval_count, 10);
        if (Number.isNaN(intervalCount) || intervalCount < 1)             { setRotationFormError('Rotation interval must be at least 1.'); return; }
        const payload = { ...rotationFormData, team_id: rotationScope === 'team' ? rotationFormData.team_id : null, location_id: rotationScope === 'location' ? rotationFormData.location_id : null, assigned_member_ids: assignedMembers.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id)), interval_count: intervalCount };
        const method = editingRotation ? 'PUT' : 'POST';
        const url    = editingRotation ? `/api/rotations/${editingRotation.id}` : '/api/rotations';
        const r    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) { setRotationFormError(Array.isArray(data.errors) ? data.errors.join(' ') : data.error || 'An error occurred.'); return; }
        setRotationFormSuccess(editingRotation ? 'Rotation updated successfully.' : 'Rotation created successfully.');
        fetchRotations();
        setRotationFormData(DEFAULT_ROTATION_FORM); setEditingRotation(null); setRotationScope('team'); setIntervalPreset('weekly'); setRotationNamePreset('');
        setTimeout(() => setRotationFormSuccess(''), 1500);
    };
    const handleDeleteRotation = async (id) => {
        if (!window.confirm('Delete this rotation?')) return;
        const r = await fetch(`/api/rotations/${id}`, { method: 'DELETE' });
        if (r.ok) fetchRotations();
    };
    const openEditRotation = (rotation) => {
        setEditingRotation(rotation);
        setRotationScope(rotation.team_id ? 'team' : 'location');
        setIntervalPreset(inferIntervalPreset(rotation.interval_unit, rotation.interval_count || 1));
        setRotationNamePreset(ROTATION_NAME_OPTIONS.includes(rotation.name) ? rotation.name : 'custom');
        setRotationFormError(''); setRotationFormSuccess('');
        setRotationFormData({
            name: rotation.name || '', team_id: rotation.team_id || '', location_id: rotation.location_id || '',
            start_date: rotation.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
            interval_unit: rotation.interval_unit || 'week', interval_count: rotation.interval_count || 1,
            status: rotation.status || 'active',
            assigned_member_ids: Array.isArray(rotation.assigned_member_ids) ? rotation.assigned_member_ids.map(id => String(id)) : [],
            notes: rotation.notes || '', allow_double_booking: Boolean(rotation.allow_double_booking),
            escalation_tiers: Array.isArray(rotation.escalation_tiers) ? rotation.escalation_tiers.join(', ') : rotation.escalation_tiers ? JSON.stringify(rotation.escalation_tiers) : ''
        });
    };

    // ── STYLE HELPERS ─────────────────────────────────────────────────────────
    const inputStyle  = (field) => ({ width: '100%', padding: '0.65rem 0.75rem', border: `1px solid ${userFormErrors[field] ? '#e31937' : '#d1d5db'}`, borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' });
    const labelStyle  = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' };
    const errorStyle  = { color: '#e31937', fontSize: '0.78rem', margin: '4px 0 0' };
    const fieldWrap   = { marginBottom: '1rem' };

    const userLookup = users.reduce((acc, user) => { acc[user.id] = user; return acc; }, {});

    const formatIntervalLabel = (unit, count) => {
        const b = { day: 'Daily', week: 'Weekly', biweek: 'Bi-Weekly', month: 'Monthly' }[unit] || unit;
        if (!count || count === 1) return b;
        return `Every ${count} ${unit === 'biweek' ? 'bi-week' : unit}${count > 1 ? 's' : ''}`;
    };
    const formatCoverageLabel = (rotation) => {
        const ids = Array.isArray(rotation.assigned_member_ids) ? rotation.assigned_member_ids : [];
        if (!ids.length) return '—';
        const names = ids.map(id => userLookup[id]?.name).filter(Boolean);
        if (!names.length) return `${ids.length} member${ids.length > 1 ? 's' : ''}`;
        if (names.length <= 3) return names.join(', ');
        return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
    };

    // ── RENDER ────────────────────────────────────────────────────────────────
    const renderPageContent = () => {

        // ✅ SAFE MEMBER PARSER — handles array, JSON string, or null
        const parseMembers = (members) => {
            if (!members) return [];
            if (Array.isArray(members)) return members;
            try { const parsed = JSON.parse(members); return Array.isArray(parsed) ? parsed : []; }
            catch { return []; }
        };

        // ── USERS ─────────────────────────────────────────────────────────────
        if (activePage === 'Users') {
            const filteredUsers = users.filter(u => {
                const userTeam  = teams.find(t => t.id === u.team_id);
                const teamName  = userTeam ? userTeam.name.toLowerCase() : '';
                const matchesSearch  = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) || teamName.includes(searchTerm.toLowerCase());
                const matchesTeam    = teamFilter.length === 0 || teamFilter.includes(String(u.team_id));
                const matchesRole    = roleFilter.length === 0  || u.user_roles?.some(ur => roleFilter.includes(String(ur.role_id)));
                const matchesStatus  = !statusFilter || u.status === statusFilter;
                return matchesSearch && matchesTeam && matchesStatus && matchesRole;
            });
            return (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: '#111827' }}>User Management</h2>
                        <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={openCreateUser}>+ Create User</button>
                    </div>
                    {/* Search & Filter Bar */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ flex: 2 }}>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Search</label>
                            <input type="text" placeholder="Search name, email, or username..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle(), marginBottom: 0 }} />
                        </div>
                        {/* Team Multi-Select */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Teams</label>
                            <button type="button" onClick={() => setShowTeamDropdown(!showTeamDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {teamFilter.length === 0 ? 'All Teams' : `${teamFilter.length} Selected`}<span>{showTeamDropdown ? '▲' : '▼'}</span>
                            </button>
                            {showTeamDropdown && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                                    <input type="text" placeholder="Search teams..." value={userTeamFilterSearch} onChange={e => setUserTeamFilterSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem', fontSize: '0.75rem' }} />
                                    {teams.filter(t => t.name.toLowerCase().includes(userTeamFilterSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            <input type="checkbox" checked={teamFilter.includes(String(t.id))} onChange={() => { const id = String(t.id); setTeamFilter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }} />
                                            {t.name}
                                        </label>
                                    ))}
                                    {teamFilter.length > 0 && <button onClick={() => setTeamFilter([])} style={{ width: '100%', marginTop: '5px', fontSize: '0.7rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>Clear All</button>}
                                </div>
                            )}
                        </div>
                        {/* Role Multi-Select */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Roles</label>
                            <button type="button" onClick={() => setShowRoleDropdown(!showRoleDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {roleFilter.length === 0 ? 'All Roles' : `${roleFilter.length} Selected`}<span>{showRoleDropdown ? '▲' : '▼'}</span>
                            </button>
                            {showRoleDropdown && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                                    {roles.map(r => (
                                        <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            <input type="checkbox" checked={roleFilter.includes(String(r.id))} onChange={() => { const id = String(r.id); setRoleFilter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }} />
                                            {r.name}
                                        </label>
                                    ))}
                                    {roleFilter.length > 0 && <button onClick={() => setRoleFilter([])} style={{ width: '100%', marginTop: '5px', fontSize: '0.7rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>Clear All</button>}
                                </div>
                            )}
                        </div>
                        {/* Status Filter */}
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Status</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle(), marginBottom: 0 }}>
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead>
                            <tr><th>First Name</th><th>Last Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Location</th><th>Assigned Team</th><th>Roles</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No users found.</td></tr>
                            ) : filteredUsers.map(u => (
                                <tr key={u.id}>
                                    <td>{u.first_name}</td>
                                    <td>{u.last_name}</td>
                                    <td style={{ color: '#6b7280' }}>{u.username || '—'}</td>
                                    <td>{u.email}</td>
                                    <td style={{ color: '#6b7280' }}>{u.phone || '—'}</td>
                                    <td style={{ color: '#6b7280' }}>{u.location || '—'}</td>
                                    <td>{teams.find(t => t.id === u.team_id)?.name || '—'}</td>
                                    <td>{u.user_roles?.map(ur => <span key={ur.role_id} style={{ display: 'inline-block', background: '#fef2f2', color: '#e31937', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600, marginRight: '4px' }}>{ur.roles?.name}</span>)}</td>
                                    <td><span style={{ background: u.status === 'active' ? '#ecfdf5' : '#f3f4f6', color: u.status === 'active' ? '#065f46' : '#6b7280', borderRadius: '12px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{u.status}</span></td>
                                    <td>
                                        <button onClick={() => openViewUser(u)} style={{ marginRight: '0.5rem', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>View</button>
                                        <button onClick={() => openEditUser(u)} style={{ marginRight: '0.5rem' }}>Edit</button>
                                        <button onClick={() => handleDeleteUser(u)} style={{ color: 'red' }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {/* View User Modal */}
                    {showViewModal && (
                        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                            <div className="modal-content" style={{ minWidth: '550px' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0 }}>User Profile Details</h2>
                                    <button onClick={() => setShowViewModal(false)} className="close-modal-btn">✕</button>
                                </div>
                                {viewingUser && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="info-box"><label>First Name</label><p>{viewingUser.first_name}</p></div>
                                        <div className="info-box"><label>Last Name</label><p>{viewingUser.last_name}</p></div>
                                        <div className="info-box"><label>Username</label><p>@{viewingUser.username || '—'}</p></div>
                                        <div className="info-box"><label>Email</label><p>{viewingUser.email}</p></div>
                                        <div className="info-box"><label>Phone</label><p>{viewingUser.phone || '—'}</p></div>
                                        <div className="info-box"><label>Location</label><p>{viewingUser.location || '—'}</p></div>
                                        <div className="info-box"><label>Status</label><span className={`status-pill ${viewingUser.status}`}>{viewingUser.status}</span></div>
                                        <div className="info-box"><label>Assigned Team</label><p>{teams.find(t => t.id === viewingUser.team_id)?.name || 'Unassigned'}</p></div>
                                        <div className="info-box" style={{ gridColumn: 'span 2' }}>
                                            <label>Assigned Roles</label>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                {viewingUser.user_roles?.map(ur => <span key={ur.role_id} className="role-badge-selected" style={{ fontSize: '0.75rem' }}>{ur.roles?.name}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button onClick={() => { setShowViewModal(false); openEditUser(viewingUser); }} className="btn-primary" style={{ flex: 1 }}>Edit This User</button>
                                    <button onClick={() => setShowViewModal(false)} className="btn-cancel" style={{ flex: 1 }}>Close</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Create/Edit User Modal */}
                    {showUserModal && (
                        <div className="modal-overlay" onClick={closeUserModal}>
                            <div className="enterprise-card" style={{ minWidth: '620px', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0 }}>{editingUser ? 'Edit User' : 'Create User'}</h2>
                                    <button onClick={closeUserModal} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
                                </div>
                                {userFormErrors.general && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>{userFormErrors.general}</div>}
                                {userFormSuccess && <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>✓ {userFormSuccess}</div>}
                                <form onSubmit={handleSaveUser}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div><label style={labelStyle}>First Name <span style={{ color: '#e31937' }}>*</span></label><input style={inputStyle('first_name')} placeholder="First name" value={userForm.first_name} onChange={e => handleUserFieldChange('first_name', e.target.value)} />{userFormErrors.first_name && <p style={errorStyle}>{userFormErrors.first_name}</p>}</div>
                                        <div><label style={labelStyle}>Last Name <span style={{ color: '#e31937' }}>*</span></label><input style={inputStyle('last_name')} placeholder="Last name" value={userForm.last_name} onChange={e => handleUserFieldChange('last_name', e.target.value)} />{userFormErrors.last_name && <p style={errorStyle}>{userFormErrors.last_name}</p>}</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div><label style={labelStyle}>Email <span style={{ color: '#e31937' }}>*</span></label><input style={inputStyle('email')} type="email" placeholder="user@cgi.com" value={userForm.email} onChange={e => handleUserFieldChange('email', e.target.value)} />{userFormErrors.email && <p style={errorStyle}>{userFormErrors.email}</p>}</div>
                                        <div><label style={labelStyle}>Username <span style={{ color: '#e31937' }}>*</span></label><input style={inputStyle('username')} placeholder="jsmith" value={userForm.username} onChange={e => handleUserFieldChange('username', e.target.value)} />{userFormErrors.username && <p style={errorStyle}>{userFormErrors.username}</p>}</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div><label style={labelStyle}>Phone</label><input style={inputStyle('phone')} placeholder="+1 (555) 000-0000" value={userForm.phone} onChange={e => handleUserFieldChange('phone', e.target.value)} />{userFormErrors.phone && <p style={errorStyle}>{userFormErrors.phone}</p>}</div>
                                        <div>
                                            <label style={labelStyle}>Location</label>
                                            <div style={{ position: 'relative' }}>
                                                <button type="button" onClick={() => setShowModalLocationDropdown(!showModalLocationDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    {userForm.location || 'Select location'}<span>{showModalLocationDropdown ? '▲' : '▼'}</span>
                                                </button>
                                                {showModalLocationDropdown && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 120, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                                                        <input type="text" placeholder="Search locations..." value={modalLocationSearch} onChange={e => setModalLocationSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem', fontSize: '0.8rem' }} />
                                                        {locations.filter(l => l.name.toLowerCase().includes(modalLocationSearch.toLowerCase())).map(l => (
                                                            <div key={l.id} onClick={() => { handleUserFieldChange('location', l.name); setShowModalLocationDropdown(false); setModalLocationSearch(''); }} style={{ padding: '8px', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', background: userForm.location === l.name ? '#fef2f2' : 'transparent' }}>{l.name}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={fieldWrap}>
                                        <label style={labelStyle}>Assigned Team</label>
                                        <div style={{ position: 'relative' }}>
                                            <button type="button" onClick={() => setShowModalTeamDropdown(!showModalTeamDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                {userForm.team_id ? (teams.find(t => String(t.id) === String(userForm.team_id))?.name) : 'Select a team'}<span>{showModalTeamDropdown ? '▲' : '▼'}</span>
                                            </button>
                                            {showModalTeamDropdown && (
                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 115, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                                                    <input type="text" placeholder="Search teams..." value={modalTeamSearch} onChange={e => setModalTeamSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem', fontSize: '0.8rem' }} />
                                                    <div onClick={() => { handleUserFieldChange('team_id', ''); setShowModalTeamDropdown(false); }} style={{ padding: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>None (Unassigned)</div>
                                                    {teams.filter(t => t.name.toLowerCase().includes(modalTeamSearch.toLowerCase())).map(t => (
                                                        <div key={t.id} onClick={() => { handleUserFieldChange('team_id', t.id); setShowModalTeamDropdown(false); setModalTeamSearch(''); }} style={{ padding: '8px', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', background: String(userForm.team_id) === String(t.id) ? '#fef2f2' : 'transparent' }}>{t.name}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={fieldWrap}>
                                        <label style={labelStyle}>Role(s) <span style={{ color: '#e31937' }}>*</span></label>
                                        {roles.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No roles available.</p> : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {roles.map(role => { const selected = userForm.roles.includes(role.id); return <button key={role.id} type="button" onClick={() => handleRoleToggle(role.id)} style={{ padding: '0.4rem 0.9rem', borderRadius: '20px', border: `2px solid ${selected ? '#e31937' : '#e5e7eb'}`, background: selected ? '#fef2f2' : '#fff', color: selected ? '#e31937' : '#6b7280', fontWeight: selected ? 700 : 400, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.15s' }}>{selected ? '✓ ' : ''}{role.name}</button>; })}
                                            </div>
                                        )}
                                        {userFormErrors.roles && <p style={errorStyle}>{userFormErrors.roles}</p>}
                                    </div>
                                    {!editingUser && (
                                        <div style={fieldWrap}>
                                            <label style={labelStyle}>Temporary Password <span style={{ color: '#e31937' }}>*</span></label>
                                            <input style={inputStyle('password')} type="password" placeholder="Min 8 chars, upper, lower, number, special" value={userForm.password} onChange={e => handleUserFieldChange('password', e.target.value)} />
                                            {userFormErrors.password ? <p style={errorStyle}>{userFormErrors.password}</p> : <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '4px 0 0' }}>User will be required to change this on first login.</p>}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingUser ? 'Update User' : 'Create User'}</button>
                                        <button type="button" onClick={closeUserModal} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // ── TEAMS ─────────────────────────────────────────────────────────────
        if (activePage === 'Teams') {
            // ✅ filteredTeams is INSIDE the Teams block — safe from initial render crash
            const filteredTeams = teams.filter(t => {
                const leadName      = t.lead?.name?.toLowerCase() || '';
                const teamMemberIds = parseMembers(t.members).map(String);
                const memberNames   = teamMemberIds.map(id => userLookup[id]?.name || '').join(' ').toLowerCase();
                const matchesSearch  = t.name.toLowerCase().includes(teamSearchTerm.toLowerCase()) || leadName.includes(teamSearchTerm.toLowerCase()) || memberNames.includes(teamSearchTerm.toLowerCase());
                const matchesLead    = leadFilter.length === 0   || leadFilter.includes(String(t.lead_id));
                const matchesMembers = memberFilter.length === 0 || memberFilter.some(id => teamMemberIds.includes(id));
                return matchesSearch && matchesLead && matchesMembers;
            });

            return (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: '#111827' }}>Team Management</h2>
                        <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={openCreateTeam}>+ Create Team</button>
                    </div>
                    {/* Team Search & Filter */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ flex: 2 }}>
                            <input type="text" placeholder="Search team name, lead, or members..." value={teamSearchTerm} onChange={e => setTeamSearchTerm(e.target.value)} style={{ ...inputStyle(), marginBottom: 0 }} />
                        </div>
                        {/* Lead Dropdown */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            <button type="button" onClick={() => setShowLeadDropdown(!showLeadDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {leadFilter.length === 0 ? 'All Leads' : `${leadFilter.length} Selected`}<span>{showLeadDropdown ? '▲' : '▼'}</span>
                            </button>
                            {showLeadDropdown && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                                    <input type="text" placeholder="Search leads..." value={teamLeadFilterSearch} onChange={e => setTeamLeadFilterSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem', fontSize: '0.75rem' }} />
                                    {users.filter(u => u.name.toLowerCase().includes(teamLeadFilterSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            <input type="checkbox" checked={leadFilter.includes(String(u.id))} onChange={() => { const id = String(u.id); setLeadFilter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }} />
                                            {u.name}
                                        </label>
                                    ))}
                                    {leadFilter.length > 0 && <button onClick={() => setLeadFilter([])} style={{ width: '100%', marginTop: '5px', fontSize: '0.7rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>✕ Clear All</button>}
                                </div>
                            )}
                        </div>
                        {/* Member Dropdown */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            <button type="button" onClick={() => setShowMemberDropdown(!showMemberDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {memberFilter.length === 0 ? 'All Members' : `${memberFilter.length} Selected`}<span>{showMemberDropdown ? '▲' : '▼'}</span>
                            </button>
                            {showMemberDropdown && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                                    <input type="text" placeholder="Search members..." value={teamMemberFilterSearch} onChange={e => setTeamMemberFilterSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem', fontSize: '0.75rem' }} />
                                    {users.filter(u => u.name.toLowerCase().includes(teamMemberFilterSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            <input type="checkbox" checked={memberFilter.includes(String(u.id))} onChange={() => { const id = String(u.id); setMemberFilter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }} />
                                            {u.name}
                                        </label>
                                    ))}
                                    {memberFilter.length > 0 && <button onClick={() => setMemberFilter([])} style={{ width: '100%', marginTop: '5px', fontSize: '0.7rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>✕ Clear All</button>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead>
                            <tr><th>Color</th><th>Team Name</th><th>Lead</th><th>Members</th><th>Description</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                            {filteredTeams.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No teams match these filters.</td></tr>
                            ) : filteredTeams.map(team => {
                                const members = parseMembers(team.members);
                                return (
                                    <tr key={team.id}>
                                        <td><div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: team.color || '#e31937', border: '1px solid #e5e7eb' }} /></td>
                                        <td><strong>{team.name}</strong></td>
                                        <td>{team.lead?.name || '—'}</td>
                                        <td style={{ minWidth: '180px' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>{members.length} Members</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {members.slice(0, 3).map(id => <span key={id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#6b7280', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{userLookup[id]?.name ? userLookup[id].name.split(' ')[0] : 'User'}</span>)}
                                                {members.length > 3 && <button onClick={() => openViewTeam(team)} style={{ fontSize: '0.7rem', color: '#0369a1', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}>+{members.length - 3} more</button>}
                                            </div>
                                        </td>
                                        <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{team.description ? (team.description.substring(0, 50) + (team.description.length > 50 ? '...' : '')) : '—'}</td>
                                        <td>
                                            <button onClick={() => openViewTeam(team)} style={{ marginRight: '0.5rem', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>View</button>
                                            <button onClick={() => openEditTeam(team)} style={{ marginRight: '0.5rem' }}>Edit</button>
                                            <button onClick={() => handleDeleteTeam(team.id)} style={{ color: 'red' }}>Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    {/* Create/Edit Team Modal */}
                    {(showCreateTeamModal || showEditTeamModal) && (
                        <div className="modal-overlay" onClick={closeTeamModal}>
                            <div className="enterprise-card" style={{ minWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0 }}>{editingTeam ? 'Edit Team' : 'Create New Team'}</h2>
                                    <button onClick={closeTeamModal} className="close-modal-btn">✕</button>
                                </div>
                                <form onSubmit={handleSaveTeam}>
                                    <div style={fieldWrap}><label style={labelStyle}>Team Name</label><input style={inputStyle()} value={teamFormData.name} onChange={e => handleTeamFieldChange('name', e.target.value)} required /></div>
                                    <div style={fieldWrap}>
                                        <label style={labelStyle}>Team Color</label>
                                        <input type="color" style={{ display: 'block', marginBottom: '1rem', width: '60px', height: '40px', border: 'none', background: 'none' }} value={teamFormData.color} onChange={e => handleTeamFieldChange('color', e.target.value)} />
                                    </div>
                                    {/* Team Lead */}
                                    <div style={fieldWrap}>
                                        <label style={labelStyle}>Team Lead</label>
                                        <div style={{ position: 'relative' }}>
                                            <button type="button" onClick={() => setShowModalLeadDropdown(!showModalLeadDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                {teamFormData.leadId ? (users.find(u => String(u.id) === String(teamFormData.leadId))?.name) : 'Select a lead'}<span>{showModalLeadDropdown ? '▲' : '▼'}</span>
                                            </button>
                                            {showModalLeadDropdown && (
                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 110, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', maxHeight: '250px', overflowY: 'auto' }}>
                                                    <input type="text" placeholder="Search leads..." value={modalLeadSearch} onChange={e => setModalLeadSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem' }} />
                                                    {users.filter(u => u.name.toLowerCase().includes(modalLeadSearch.toLowerCase())).map(u => (
                                                        <div key={u.id} onClick={() => { handleTeamFieldChange('leadId', u.id); setShowModalLeadDropdown(false); setModalLeadSearch(''); }} style={{ padding: '8px', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', background: String(teamFormData.leadId) === String(u.id) ? '#fef2f2' : 'transparent' }}>{u.name}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Members */}
                                    <div style={fieldWrap}>
                                        <label style={labelStyle}>Assign Members</label>
                                        <div style={{ position: 'relative' }}>
                                            <button type="button" onClick={() => setShowModalMemberDropdown(!showModalMemberDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                {teamFormData.members.length === 0 ? 'Select members' : `${teamFormData.members.length} member(s) selected`}<span>{showModalMemberDropdown ? '▲' : '▼'}</span>
                                            </button>
                                            {showModalMemberDropdown && (
                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', maxHeight: '300px', overflowY: 'auto' }}>
                                                    <input type="text" placeholder="Search members to add..." value={modalMemberSearch} onChange={e => setModalMemberSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem' }} />
                                                    <div style={{ paddingBottom: '8px', borderBottom: '1px solid #f3f4f6', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                                        <button type="button" onClick={() => handleTeamFieldChange('members', [])} style={{ fontSize: '0.75rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>✕ Clear All</button>
                                                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{teamFormData.members.length} selected</span>
                                                    </div>
                                                    {users.filter(u => u.name.toLowerCase().includes(modalMemberSearch.toLowerCase())).map(u => (
                                                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '6px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={teamFormData.members.includes(String(u.id))} onChange={() => { const id = String(u.id); handleTeamFieldChange('members', teamFormData.members.includes(id) ? teamFormData.members.filter(m => m !== id) : [...teamFormData.members, id]); }} />
                                                            {u.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={fieldWrap}><label style={labelStyle}>Description</label><textarea style={inputStyle()} rows="3" value={teamFormData.description} onChange={e => handleTeamFieldChange('description', e.target.value)} /></div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Team</button>
                                        <button type="button" onClick={closeTeamModal} className="btn-cancel" style={{ flex: 1 }}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* View Team Modal */}
                    {showViewTeamModal && (
                        <div className="modal-overlay" onClick={() => setShowViewTeamModal(false)}>
                            <div className="modal-content" style={{ minWidth: '500px' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0 }}>Team Details</h2>
                                    <button onClick={() => setShowViewTeamModal(false)} className="close-modal-btn">✕</button>
                                </div>
                                {viewingTeam && (() => {
                                    const vMembers = parseMembers(viewingTeam.members);
                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: viewingTeam.color }} />
                                                <div><h3 style={{ margin: 0 }}>{viewingTeam.name}</h3><p style={{ margin: 0, color: '#6b7280' }}>ID: {viewingTeam.id}</p></div>
                                            </div>
                                            <div className="info-box"><label>Team Lead</label><p>{viewingTeam.lead?.name || 'No lead assigned'}</p></div>
                                            <div className="info-box">
                                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: '#374151' }}>Team Members ({vMembers.length})</label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                                                    {vMembers.length > 0 ? vMembers.map(id => <span key={id} style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#4b5563', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 500 }}>{userLookup[id]?.name || 'Unknown User'}</span>) : <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No members assigned.</span>}
                                                </div>
                                            </div>
                                            <div className="info-box"><label>Description</label><p>{viewingTeam.description || 'No description provided.'}</p></div>
                                        </div>
                                    );
                                })()}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button onClick={() => { setShowViewTeamModal(false); openEditTeam(viewingTeam); }} className="btn-primary" style={{ flex: 1 }}>Edit Team</button>
                                    <button onClick={() => setShowViewTeamModal(false)} className="btn-cancel" style={{ flex: 1 }}>Close</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // ── ROTATIONS ─────────────────────────────────────────────────────────
        if (activePage === 'Rotations') {
            const selectedLocation = locations.find(l => String(l.id) === String(rotationFormData.location_id));
            const availableMembers = rotationScope === 'team'
                ? users.filter(u => String(u.team_id) === String(rotationFormData.team_id))
                : selectedLocation ? users.filter(u => (u.location || '').trim().toLowerCase() === selectedLocation.name.trim().toLowerCase()) : [];
                // ✅ filteredRotations is INSIDE the Rotations block — safe from initial render crash
                const filteredRotations = rotations.filter(r => {
                const scopeName       = (r.teams?.name || r.locations?.name || '').toLowerCase();
                const matchesSearch   = r.name.toLowerCase().includes(rotationSearchTerm.toLowerCase()) || scopeName.includes(rotationSearchTerm.toLowerCase());
                const matchesTeam     = rotationTeamFilter.length === 0 || rotationTeamFilter.includes(String(r.team_id)) || rotationTeamFilter.includes(`loc_${r.location_id}`);
                const matchesInterval = !rotationIntervalFilter || r.interval_unit === rotationIntervalFilter;
                return matchesSearch && matchesTeam && matchesInterval;
            });
            return (
                <div className="grid-container">
                    <div className="enterprise-card">
                        <h3>{editingRotation ? 'Edit Rotation' : 'New Rotation'}</h3>
                        {rotationFormError   && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>{rotationFormError}</div>}
                        {rotationFormSuccess && <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>{rotationFormSuccess}</div>}
                        <form onSubmit={handleSaveRotation}>
                            <div className="form-group">
                                <label>Rotation Name <span style={{ color: '#e31937' }}>*</span></label>
                                <select className="enterprise-input" value={rotationNamePreset} onChange={e => { const v = e.target.value; setRotationNamePreset(v); setRotationFormData(prev => ({ ...prev, name: v === 'custom' ? '' : v })); }} required>
                                    <option value="">Select rotation name</option>
                                    {ROTATION_NAME_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                                    <option value="custom">Custom...</option>
                                </select>
                                {rotationNamePreset === 'custom' && <input className="enterprise-input" placeholder="Custom rotation name" value={rotationFormData.name} onChange={e => setRotationFormData({ ...rotationFormData, name: e.target.value })} style={{ marginTop: '0.6rem' }} required />}
                            </div>
                            <div className="form-group">
                                <label>Assigned Scope <span style={{ color: '#e31937' }}>*</span></label>
                                <select className="enterprise-input" value={rotationScope} onChange={e => { const s = e.target.value; setRotationScope(s); setRotationFormData(prev => ({ ...prev, team_id: s === 'team' ? prev.team_id : '', location_id: s === 'location' ? prev.location_id : '', assigned_member_ids: [] })); }}>
                                    <option value="team">Team / Sub-Team</option>
                                    <option value="location">Pool (Location)</option>
                                </select>
                            </div>
                            {rotationScope === 'team' ? (
                                <div className="form-group">
                                    <label>Assigned Team <span style={{ color: '#e31937' }}>*</span></label>
                                    <select className="enterprise-input" value={rotationFormData.team_id} onChange={e => setRotationFormData({ ...rotationFormData, team_id: e.target.value, assigned_member_ids: [] })} required>
                                        <option value="">Select team</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Assigned Pool <span style={{ color: '#e31937' }}>*</span></label>
                                    <select className="enterprise-input" value={rotationFormData.location_id} onChange={e => setRotationFormData({ ...rotationFormData, location_id: e.target.value, assigned_member_ids: [] })} required>
                                        <option value="">Select pool</option>
                                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Assigned Members <span style={{ color: '#e31937' }}>*</span></label>
                                {availableMembers.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{rotationScope === 'team' ? 'Select a team to load members.' : 'Select a pool/location to load members.'}</p> : (
                                    <select className="enterprise-input" multiple size={Math.min(6, availableMembers.length)} value={rotationFormData.assigned_member_ids} onChange={e => setRotationFormData({ ...rotationFormData, assigned_member_ids: Array.from(e.target.selectedOptions).map(o => o.value) })}>
                                        {availableMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Rotation Interval <span style={{ color: '#e31937' }}>*</span></label>
                                <select className="enterprise-input" value={intervalPreset} onChange={e => { const v = e.target.value; setIntervalPreset(v); const p = INTERVAL_PRESET_OPTIONS.find(o => o.value === v); if (p?.unit) setRotationFormData(prev => ({ ...prev, interval_unit: p.unit, interval_count: p.count })); }} required>
                                    {INTERVAL_PRESET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                {intervalPreset === 'custom' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.6rem' }}>
                                        <input className="enterprise-input" type="number" min="1" value={rotationFormData.interval_count} onChange={e => setRotationFormData({ ...rotationFormData, interval_count: e.target.value })} />
                                        <select className="enterprise-input" value={rotationFormData.interval_unit} onChange={e => setRotationFormData({ ...rotationFormData, interval_unit: e.target.value })}>
                                            {INTERVAL_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="form-group"><label>Start Date <span style={{ color: '#e31937' }}>*</span></label><input className="enterprise-input" type="date" value={rotationFormData.start_date} onChange={e => setRotationFormData({ ...rotationFormData, start_date: e.target.value })} required /></div>
                            <div className="form-group"><label>Notes / Description</label><textarea className="enterprise-input" rows="3" value={rotationFormData.notes} onChange={e => setRotationFormData({ ...rotationFormData, notes: e.target.value })} /></div>
                            <div className="form-group"><label>Escalation Tiers (optional)</label><textarea className="enterprise-input" rows="2" placeholder="Tier 1, Tier 2 or JSON" value={rotationFormData.escalation_tiers} onChange={e => setRotationFormData({ ...rotationFormData, escalation_tiers: e.target.value })} /><p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.35rem' }}>Comma-separated list or JSON array.</p></div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="checkbox" checked={rotationFormData.allow_double_booking} onChange={e => setRotationFormData({ ...rotationFormData, allow_double_booking: e.target.checked })} />
                                <span style={{ fontSize: '0.85rem', color: '#374151' }}>Allow double-booking</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn-primary">{editingRotation ? 'Update Rotation' : 'Save Rotation'}</button>
                                {editingRotation && <button type="button" onClick={() => { setEditingRotation(null); setRotationFormData(DEFAULT_ROTATION_FORM); setRotationScope('team'); setIntervalPreset('weekly'); setRotationNamePreset(''); setRotationFormError(''); setRotationFormSuccess(''); }} style={{ background: '#eee', color: '#333' }} className="btn-primary">Cancel</button>}
                            </div>
                        </form>
                    </div>
                    <div className="enterprise-card no-padding">
                    {/* Rotation Filter Bar */}
                    <div style={{ display: 'flex', gap: '1rem', padding: '1rem', alignItems: 'center', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                        <div style={{ flex: 2, minWidth: '180px' }}>
                            <input type="text" placeholder="Search rotation name or scope..." value={rotationSearchTerm} onChange={e => setRotationSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                            <button type="button" onClick={() => setShowRotationTeamDropdown(!showRotationTeamDropdown)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {rotationTeamFilter.length === 0 ? 'All Teams/Pools' : `${rotationTeamFilter.length} Selected`}<span>{showRotationTeamDropdown ? '▲' : '▼'}</span>
                            </button>
                            {showRotationTeamDropdown && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                                    <input type="text" placeholder="Search..." value={rotationTeamFilterSearch} onChange={e => setRotationTeamFilterSearch(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '8px', boxSizing: 'border-box' }} />
                                    {teams.filter(t => t.name.toLowerCase().includes(rotationTeamFilterSearch.toLowerCase())).map(t => (
                                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            <input type="checkbox" checked={rotationTeamFilter.includes(String(t.id))} onChange={() => { const id = String(t.id); setRotationTeamFilter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }} />
                                            {t.name}
                                        </label>
                                    ))}
                                    {locations.filter(l => l.name.toLowerCase().includes(rotationTeamFilterSearch.toLowerCase())).map(l => (
                                        <label key={`loc_${l.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            <input type="checkbox" checked={rotationTeamFilter.includes(`loc_${l.id}`)} onChange={() => { const id = `loc_${l.id}`; setRotationTeamFilter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }} />
                                            📍 {l.name}
                                        </label>
                                    ))}
                                    {rotationTeamFilter.length > 0 && <button onClick={() => setRotationTeamFilter([])} style={{ width: '100%', marginTop: '5px', fontSize: '0.7rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>✕ Clear All</button>}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: '130px' }}>
                            <select value={rotationIntervalFilter} onChange={e => setRotationIntervalFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', background: '#fff', cursor: 'pointer' }}>
                                <option value="">All Intervals</option>
                                <option value="day">Daily</option>
                                <option value="week">Weekly</option>
                                <option value="biweek">Bi-Weekly</option>
                                <option value="month">Monthly</option>
                            </select>
                        </div>
                        {(rotationSearchTerm || rotationTeamFilter.length > 0 || rotationIntervalFilter) && (
                            <button onClick={() => { setRotationSearchTerm(''); setRotationTeamFilter([]); setRotationIntervalFilter(''); }} style={{ fontSize: '0.75rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>✕ Clear Filters</button>
                        )}
                    </div>
                    <table className="data-table">
                        <thead><tr><th>Name</th><th>Scope</th><th>Coverage</th><th>Interval</th><th>Start Date</th><th>Actions</th></tr></thead>
                        <tbody>
                        {filteredRotations.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No rotations match these filters.</td></tr> : filteredRotations.map(r => ( <tr key={r.id}>
                                                    <td><strong>{r.name}</strong></td>
                                                    <td>{r.teams?.name || r.locations?.name || 'N/A'}</td>
                                                    <td>{formatCoverageLabel(r)}</td>
                                                    <td>{formatIntervalLabel(r.interval_unit, r.interval_count || 1)}</td>
                                                    <td>{r.start_date ? r.start_date.split('T')[0] : '—'}</td>
                                                    <td><button onClick={() => openEditRotation(r)} style={{ marginRight: '0.5rem' }}>Edit</button><button onClick={() => handleDeleteRotation(r.id)} style={{ color: 'red' }}>Delete</button></td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        }

        if (activePage === 'Matrix') return <MatrixView />;

        if (activePage === 'Roles') {
            const rolePermissions = {
                'Administrator':          ['Full system access', 'Manage users & roles', 'Manage teams & rotations', 'View all schedules', 'Approve leave requests', 'Access audit logs'],
                'Team Lead / Supervisor': ['Manage team members', 'Approve leave requests', 'View team schedules', 'Assign rotations'],
                'Rotation Owner':         ['Create & manage rotations', 'Assign employees to rotations', 'View rotation schedules'],
                'Employee':               ['View personal schedule', 'Submit leave requests', 'View team calendar'],
            };
            return (
                <div>
                    <div style={{ marginBottom: '1.5rem' }}><h2 style={{ margin: 0, color: '#111827' }}>Roles and Permissions</h2><p style={{ margin: '0.4rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>System-defined roles assigned to users. Permissions are fixed per role.</p></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        {roles.length === 0 ? <div className="enterprise-card"><p style={{ color: '#9ca3af' }}>Loading roles...</p></div> : roles.map(role => {
                            const perms      = rolePermissions[role.name] || [];
                            const userCount  = users.filter(u => u.user_roles?.some(ur => ur.role_id === role.id)).length;
                            const badgeColor = role.name === 'Administrator' ? '#e31937' : role.name === 'Team Lead / Supervisor' ? '#2563eb' : role.name === 'Rotation Owner' ? '#7c3aed' : '#059669';
                            return (
                                <div key={role.id} className="enterprise-card" style={{ borderTop: '3px solid ' + badgeColor }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div><h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>{role.name}</h3><p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>{role.description}</p></div>
                                        <span style={{ background: badgeColor + '18', color: badgeColor, borderRadius: '12px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>{userCount} {userCount === 1 ? 'user' : 'users'}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permissions</p>
                                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>{perms.map(perm => <li key={perm} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#374151', padding: '3px 0' }}><span style={{ color: badgeColor, fontWeight: 700 }}>✓</span> {perm}</li>)}</ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (activePage === 'TeamDetails' && selectedTeam) {
            return (
                <div className="enterprise-card" style={{ padding: '3rem' }}>
                    <button onClick={() => setActivePage('Teams')}>← Back to Teams</button>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', backgroundColor: selectedTeam.color, margin: '20px auto', borderRadius: '15px' }} />
                        <h1>{selectedTeam.name}</h1><p>{selectedTeam.description}</p><hr />
                        <div style={{ textAlign: 'left', background: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
                            <p><strong>Lead:</strong> {selectedTeam.lead?.name || 'None'}</p>
                            <p><strong>Members:</strong> {selectedTeam.members || 'None'}</p>
                            <p><strong>Role Type:</strong> {selectedTeam.team_role || 'Member'}</p>
                        </div>
                    </div>
                </div>
            );
        }

        return <div className="enterprise-card"><h2>{activePage} Management</h2><p>Development in progress.</p></div>;
    };

    const NotificationBanner = () => notification.show ? (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, background: notification.type === 'success' ? '#ecfdf5' : '#fee2e2', color: notification.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`, borderRadius: '8px', padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '360px' }}>
            <span>{notification.type === 'success' ? '✓' : '✕'}</span>{notification.message}
        </div>
    ) : null;

    const DeleteConfirmModal = () => !deleteConfirm.open ? null : (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', maxWidth: '420px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>⚠</div>
                    <div><h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>Delete User</h3><p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Are you sure you want to delete <strong>{deleteConfirm.user?.name}</strong>?</p></div>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', background: '#f9fafb', borderRadius: '6px', padding: '0.75rem', margin: '0 0 1.5rem' }}>This action cannot be undone. The user will be permanently removed from the system and will no longer be able to log in.</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setDeleteConfirm({ open: false, user: null })} style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                    <button onClick={handleConfirmDelete} style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: 'none', background: '#e31937', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Delete User</button>
                </div>
            </div>
        </div>
    );

    const TeamDeleteConfirmModal = () => !teamDeleteConfirm.open ? null : (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', maxWidth: '420px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>⚠</div>
                    <div><h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>Delete Team</h3><p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Are you sure you want to delete <strong>{teamDeleteConfirm.teamName}</strong>?</p></div>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', background: '#f9fafb', borderRadius: '6px', padding: '0.75rem', margin: '0 0 1.5rem' }}>This will permanently remove the team. Members assigned to this team will become unassigned.</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setTeamDeleteConfirm({ open: false, teamId: null, teamName: '' })} style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                    <button onClick={handleConfirmDeleteTeam} style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: 'none', background: '#e31937', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Delete Team</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard-root">
            <NotificationBanner />
            <DeleteConfirmModal />
            <TeamDeleteConfirmModal />

            <Routes>
                {/* 1. Login Route: Show only if NOT logged in */}
                <Route
                    path="/login"
                    element={!isLoggedIn ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" replace />}
                />

                {/* 2. Dashboard Route: Show only if logged in */}
                <Route
                    path="/dashboard"
                    element={isLoggedIn ? (
                        <>
                            <Header
                                user={currentUser}
                                activePage={activePage}
                                onNavigate={setActivePage}
                                onLogout={() => {
                                    localStorage.clear();
                                    setIsLoggedIn(false);
                                }}
                            />
                            <main className="main-content">
                                <header className="page-header">
                                    <h1>{activePage} Management</h1>
                                </header>
                                {renderPageContent()}
                            </main>
                        </>
                    ) : (
                        <Navigate to="/login" replace />
                    )}
                />

                {/* 3. Catch-all: Ensure users are always sent to the right place */}
                <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />} />
            </Routes>
        </div>
    );
}

export default App;