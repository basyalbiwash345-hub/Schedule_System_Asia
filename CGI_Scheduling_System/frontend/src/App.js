import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import './styles/Dashboard.css';
import MatrixView from './components/MatrixView';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Select, MenuItem, FormControl,
    InputLabel, Divider, IconButton, Typography, Box,
    Chip, CircularProgress
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';

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
const DEFAULT_TEAM_FORM    = { name: '', color: '#e31937', leadId: '', members: '', role: 'Member', description: '' };
const DEFAULT_USER_FORM    = { first_name: '', last_name: '', username: '', email: '', phone: '', location: '', team_id: '', roles: [], password: '' };

// ── MUI DIALOG STYLE HELPERS ──────────────────────────────────────────────────
const muiInputSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: '#e31937' } },
    '& .MuiInputLabel-root.Mui-focused': { color: '#e31937' }
};
const dialogPaperSx = { borderRadius: '16px', maxHeight: '90vh' };
const primaryBtnSx  = { backgroundColor: '#e31937', borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#c41230' } };
const cancelBtnSx   = { borderRadius: '8px', textTransform: 'none', color: '#6b7280' };

function App() {
    const [users,         setUsers]         = useState([]);
    const [teams,         setTeams]         = useState([]);
    const [roles,         setRoles]         = useState([]);
    const [locations,     setLocations]     = useState([]);
    const [rotations,     setRotations]     = useState([]);
    const [isLoggedIn,    setIsLoggedIn]    = useState(false);
    const [currentUser,   setCurrentUser]   = useState(null);
    const [activePage,    setActivePage]    = useState('Users');
    const [selectedTeam,  setSelectedTeam]  = useState(null);

    // User state
    const [userForm,        setUserForm]        = useState(DEFAULT_USER_FORM);
    const [userFormErrors,  setUserFormErrors]  = useState({});
    const [userFormSuccess, setUserFormSuccess] = useState('');
    const [userSaving,      setUserSaving]      = useState(false);
    const [editingUser,     setEditingUser]     = useState(null);
    const [showUserModal,   setShowUserModal]   = useState(false);
    const [viewingUser,     setViewingUser]     = useState(null);
    const [showViewModal,   setShowViewModal]   = useState(false);
    const [viewUserError,   setViewUserError]   = useState('');

    // Search/filter state
    const [searchTerm,   setSearchTerm]   = useState('');
    const [roleFilter,   setRoleFilter]   = useState('');
    const [teamFilter,   setTeamFilter]   = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Team state
    const [teamForm,          setTeamForm]          = useState(DEFAULT_TEAM_FORM);
    const [editingTeam,       setEditingTeam]       = useState(null);
    const [showTeamModal,     setShowTeamModal]     = useState(false);
    const [teamSaving,        setTeamSaving]        = useState(false);

    // Rotation state
    const [rotationFormData,    setRotationFormData]    = useState(DEFAULT_ROTATION_FORM);
    const [rotationScope,       setRotationScope]       = useState('team');
    const [editingRotation,     setEditingRotation]     = useState(null);
    const [showRotationModal,   setShowRotationModal]   = useState(false);
    const [rotationFormError,   setRotationFormError]   = useState('');
    const [rotationFormSuccess, setRotationFormSuccess] = useState('');
    const [rotationSaving,      setRotationSaving]      = useState(false);
    const [intervalPreset,      setIntervalPreset]      = useState('weekly');
    const [rotationNamePreset,  setRotationNamePreset]  = useState('');

    // Notifications & delete confirm
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, user: null });
    const [notification,  setNotification]  = useState({ show: false, message: '', type: 'success' });

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

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
    };

    const handleAdminLogin = ({ identifier, password }) => {
        if (identifier === 'admin@cgi.com' && password === 'AdminAdmin902') {
            setCurrentUser({ name: 'CGI Administrator', role: 'Admin', email: identifier });
            setIsLoggedIn(true); return { ok: true };
        }
        return { ok: false, error: 'Access Denied.' };
    };

    // ── USER HANDLERS ─────────────────────────────────────────────────────────
    const openCreateUser = () => { setEditingUser(null); setUserForm(DEFAULT_USER_FORM); setUserFormErrors({}); setUserFormSuccess(''); setShowUserModal(true); };
    const openEditUser   = (user) => {
        setEditingUser(user);
        setUserForm({ first_name: user.first_name || '', last_name: user.last_name || '', username: user.username || '', email: user.email || '', phone: user.phone || '', location: user.location || '', team_id: user.team_id ? String(user.team_id) : '', roles: user.user_roles?.map(ur => ur.role_id) || [], password: '' });
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

    const handleUserFieldChange = (field, value) => {
        setUserForm(prev => ({ ...prev, [field]: value }));
        if (userFormErrors[field]) setUserFormErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    };
    const handleRoleToggle = (roleId) => {
        setUserForm(prev => { const exists = prev.roles.includes(roleId); return { ...prev, roles: exists ? prev.roles.filter(r => r !== roleId) : [...prev.roles, roleId] }; });
        if (userFormErrors.roles) setUserFormErrors(prev => { const e = { ...prev }; delete e.roles; return e; });
    };
    const handleSaveUser = async (e) => {
        e.preventDefault(); setUserFormErrors({}); setUserFormSuccess(''); setUserSaving(true);
        const method = editingUser ? 'PUT' : 'POST';
        const url    = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        try {
            const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) });
            const data = await res.json();
            if (!res.ok) { setUserFormErrors(data.errors || { general: data.error || 'An error occurred.' }); setUserSaving(false); return; }
            setUserFormSuccess(editingUser ? 'User updated successfully.' : 'User created successfully.');
            fetchUsers();
            setTimeout(() => { setShowUserModal(false); setUserFormSuccess(''); }, 1500);
        } catch { setUserFormErrors({ general: 'Network error. Please try again.' }); }
        setUserSaving(false);
    };
    const handleDeleteUser     = (user) => setDeleteConfirm({ open: true, user });
    const handleConfirmDelete  = async () => {
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
    const openCreateTeam = () => { setEditingTeam(null); setTeamForm(DEFAULT_TEAM_FORM); setShowTeamModal(true); };
    const openEditTeam   = (team) => {
        setEditingTeam(team);
        setTeamForm({ name: team.name, color: team.color || '#e31937', leadId: team.lead_id ? String(team.lead_id) : '', members: team.members || '', role: team.team_role || 'Member', description: team.description || '' });
        setShowTeamModal(true);
    };
    const handleTeamFieldChange = (field, value) => setTeamForm(prev => ({ ...prev, [field]: value }));
    const handleSaveTeam = async (e) => {
        e.preventDefault(); setTeamSaving(true);
        const method = editingTeam ? 'PUT' : 'POST';
        const url    = editingTeam ? `/api/teams/${editingTeam.id}` : '/api/teams';
        try {
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(teamForm) });
            if (r.ok) { fetchTeams(); setShowTeamModal(false); showNotification(editingTeam ? 'Team updated successfully.' : 'Team created successfully.'); }
        } catch { showNotification('Failed to save team.', 'error'); }
        setTeamSaving(false);
    };
    const handleDeleteTeam = async (id) => {
        if (!window.confirm('Delete this team?')) return;
        const r = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
        if (r.ok) { fetchTeams(); showNotification('Team deleted successfully.'); }
    };

    // ── ROTATION HANDLERS ─────────────────────────────────────────────────────
    const openCreateRotation = () => { setEditingRotation(null); setRotationFormData(DEFAULT_ROTATION_FORM); setRotationScope('team'); setIntervalPreset('weekly'); setRotationNamePreset(''); setRotationFormError(''); setRotationFormSuccess(''); setShowRotationModal(true); };
    const openEditRotation   = (rotation) => {
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
        setShowRotationModal(true);
    };
    const inferIntervalPreset = (unit, count) => {
        if (unit === 'day'    && count === 1) return 'daily';
        if (unit === 'week'   && count === 1) return 'weekly';
        if (unit === 'biweek' && count === 1) return 'biweekly';
        return 'custom';
    };
    const handleSaveRotation = async (e) => {
        e.preventDefault(); setRotationFormError(''); setRotationFormSuccess(''); setRotationSaving(true);
        if (!rotationFormData.name.trim())                                    { setRotationFormError('Rotation name is required.');          setRotationSaving(false); return; }
        if (rotationScope === 'team'     && !rotationFormData.team_id)        { setRotationFormError('Assigned team is required.');          setRotationSaving(false); return; }
        if (rotationScope === 'location' && !rotationFormData.location_id)    { setRotationFormError('Assigned pool/location is required.'); setRotationSaving(false); return; }
        if (!rotationFormData.start_date)                                     { setRotationFormError('Start date is required.');             setRotationSaving(false); return; }
        const assignedMembers = (rotationFormData.assigned_member_ids || []).map(id => String(id)).filter(Boolean);
        if (!assignedMembers.length)                                          { setRotationFormError('Assign at least one member.');         setRotationSaving(false); return; }
        const intervalCount = Number.parseInt(rotationFormData.interval_count, 10);
        if (Number.isNaN(intervalCount) || intervalCount < 1)                 { setRotationFormError('Rotation interval must be at least 1.'); setRotationSaving(false); return; }
        const payload = { ...rotationFormData, team_id: rotationScope === 'team' ? rotationFormData.team_id : null, location_id: rotationScope === 'location' ? rotationFormData.location_id : null, assigned_member_ids: assignedMembers.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id)), interval_count: intervalCount };
        const method = editingRotation ? 'PUT' : 'POST';
        const url    = editingRotation ? `/api/rotations/${editingRotation.id}` : '/api/rotations';
        try {
            const r    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) { setRotationFormError(Array.isArray(data.errors) ? data.errors.join(' ') : data.error || 'An error occurred.'); setRotationSaving(false); return; }
            setRotationFormSuccess(editingRotation ? 'Rotation updated successfully.' : 'Rotation created successfully.');
            fetchRotations();
            setTimeout(() => { setShowRotationModal(false); setRotationFormSuccess(''); }, 1500);
        } catch { setRotationFormError('Network error. Please try again.'); }
        setRotationSaving(false);
    };
    const handleDeleteRotation = async (id) => {
        if (!window.confirm('Delete this rotation?')) return;
        const r = await fetch(`/api/rotations/${id}`, { method: 'DELETE' });
        if (r.ok) { fetchRotations(); showNotification('Rotation deleted successfully.'); }
    };

    const userLookup = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    const formatIntervalLabel = (unit, count) => { const b = { day: 'Daily', week: 'Weekly', biweek: 'Bi-Weekly', month: 'Monthly' }[unit] || unit; if (!count || count === 1) return b; return `Every ${count} ${unit === 'biweek' ? 'bi-week' : unit}${count > 1 ? 's' : ''}`; };
    const formatCoverageLabel = (rotation) => { const ids = Array.isArray(rotation.assigned_member_ids) ? rotation.assigned_member_ids : []; if (!ids.length) return '—'; const names = ids.map(id => userLookup[id]?.name).filter(Boolean); if (!names.length) return `${ids.length} member${ids.length > 1 ? 's' : ''}`; if (names.length <= 3) return names.join(', '); return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`; };

    // ── PAGE RENDERER ─────────────────────────────────────────────────────────
    const renderPageContent = () => {

        // ── USERS ─────────────────────────────────────────────────────────────
        if (activePage === 'Users') {
            const filteredUsers = users.filter(u => {
                const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()));
                const matchesTeam   = !teamFilter   || u.team_id === parseInt(teamFilter);
                const matchesStatus = !statusFilter || u.status === statusFilter;
                const matchesRole   = !roleFilter   || u.user_roles?.some(ur => ur.role_id === parseInt(roleFilter));
                return matchesSearch && matchesTeam && matchesStatus && matchesRole;
            });
            const inputStyle = () => ({ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' });
            return (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: '#111827' }}>User Management</h2>
                        <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={openCreateUser}>+ Create User</button>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ flex: 2 }}><input type="text" placeholder="Search name, email, or username..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={inputStyle()} /></div>
                        <div style={{ flex: 1 }}><select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={inputStyle()}><option value="">All Teams</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                        <div style={{ flex: 1 }}><select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={inputStyle()}><option value="">All Roles</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                        <div style={{ flex: 1 }}><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle()}><option value="">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                    </div>
                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead><tr><th>First Name</th><th>Last Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Location</th><th>Assigned Team</th><th>Roles</th><th>Status</th><th>Actions</th></tr></thead>
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
                </div>
            );
        }

        // ── TEAMS ─────────────────────────────────────────────────────────────
        if (activePage === 'Teams') {
            return (
                <div className="enterprise-card no-padding">
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Active Teams ({teams.length})</h3>
                        <button className="btn-primary" style={{ width: 'auto' }} onClick={openCreateTeam}>+ Create Team</button>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                        {teams.length === 0 ? <p>No teams found.</p> : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {teams.map(team => (
                                    <div key={team.id} className="enterprise-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: team.color }} />
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0 }}>{team.name}</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>{team.description || 'No description'}</p>
                                            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}><strong>Lead:</strong> {team.lead?.name || 'None'} | <strong>Role:</strong> {team.team_role || 'Member'}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => { setSelectedTeam(team); setActivePage('TeamDetails'); }}>View</button>
                                            <button onClick={() => openEditTeam(team)}>Edit</button>
                                            <button onClick={() => handleDeleteTeam(team.id)} style={{ color: 'red' }}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // ── ROTATIONS ─────────────────────────────────────────────────────────
        if (activePage === 'Rotations') {
            return (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: '#111827' }}>Rotations</h2>
                        <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={openCreateRotation}>+ New Rotation</button>
                    </div>
                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Scope</th><th>Coverage</th><th>Interval</th><th>Start Date</th><th>Actions</th></tr></thead>
                            <tbody>
                            {rotations.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No rotations found.</td></tr>
                            ) : rotations.map(r => (
                                <tr key={r.id}>
                                    <td><strong>{r.name}</strong></td>
                                    <td>{r.teams?.name || r.locations?.name || 'N/A'}</td>
                                    <td>{formatCoverageLabel(r)}</td>
                                    <td>{formatIntervalLabel(r.interval_unit, r.interval_count || 1)}</td>
                                    <td>{r.start_date ? r.start_date.split('T')[0] : '—'}</td>
                                    <td>
                                        <button onClick={() => openEditRotation(r)} style={{ marginRight: '0.5rem' }}>Edit</button>
                                        <button onClick={() => handleDeleteRotation(r.id)} style={{ color: 'red' }}>Delete</button>
                                    </td>
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
            const rolePermissions = { 'Administrator': ['Full system access', 'Manage users & roles', 'Manage teams & rotations', 'View all schedules', 'Approve leave requests', 'Access audit logs'], 'Team Lead / Supervisor': ['Manage team members', 'Approve leave requests', 'View team schedules', 'Assign rotations'], 'Rotation Owner': ['Create & manage rotations', 'Assign employees to rotations', 'View rotation schedules'], 'Employee': ['View personal schedule', 'Submit leave requests', 'View team calendar'] };
            return (
                <div>
                    <div style={{ marginBottom: '1.5rem' }}><h2 style={{ margin: 0, color: '#111827' }}>Roles and Permissions</h2><p style={{ margin: '0.4rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>System-defined roles assigned to users. Permissions are fixed per role.</p></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        {roles.length === 0 ? <div className="enterprise-card"><p style={{ color: '#9ca3af' }}>Loading roles...</p></div> : roles.map(role => {
                            const perms = rolePermissions[role.name] || [];
                            const userCount = users.filter(u => u.user_roles?.some(ur => ur.role_id === role.id)).length;
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

    if (!isLoggedIn) return <Login onLogin={handleAdminLogin} />;

    // ── ROTATION MEMBERS HELPER ───────────────────────────────────────────────
    const selectedLocation = locations.find(l => String(l.id) === String(rotationFormData.location_id));
    const availableMembers = rotationScope === 'team'
        ? users.filter(u => String(u.team_id) === String(rotationFormData.team_id))
        : selectedLocation ? users.filter(u => (u.location || '').trim().toLowerCase() === selectedLocation.name.trim().toLowerCase()) : [];

    return (
        <div className="dashboard-root">

            {/* ── NOTIFICATION BANNER ── */}
            {notification.show && (
                <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, background: notification.type === 'success' ? '#ecfdf5' : '#fee2e2', color: notification.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`, borderRadius: '8px', padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '360px' }}>
                    <span>{notification.type === 'success' ? '✓' : '✕'}</span>{notification.message}
                </div>
            )}

            {/* ── DELETE CONFIRM DIALOG ── */}
            <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, user: null })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>⚠</Box>
                    <Typography fontWeight={700}>Delete User</Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography color="#6b7280" fontSize="0.9rem">Are you sure you want to delete <strong>{deleteConfirm.user?.name}</strong>? This action cannot be undone.</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setDeleteConfirm({ open: false, user: null })} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} variant="contained" sx={primaryBtnSx}>Delete User</Button>
                </DialogActions>
            </Dialog>

            {/* ── VIEW USER DIALOG ── */}
            <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontWeight={700} fontSize="1.1rem">User Profile</Typography>
                    <IconButton size="small" onClick={() => setShowViewModal(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    {viewUserError ? (
                        <Box sx={{ background: '#fee2e2', color: '#991b1b', p: 2, borderRadius: '8px', textAlign: 'center', fontWeight: 600 }}>⚠ {viewUserError}</Box>
                    ) : viewingUser && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, background: '#f9fafb', borderRadius: '10px', mb: 2.5, border: '1px solid #e5e7eb' }}>
                                <Box sx={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#e31937', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800, flexShrink: 0 }}>
                                    {viewingUser.first_name?.charAt(0).toUpperCase()}{viewingUser.last_name?.charAt(0).toUpperCase()}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography fontWeight={700} fontSize="1.05rem">{viewingUser.name}</Typography>
                                    <Typography fontSize="0.85rem" color="#6b7280">{viewingUser.email}</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                        {viewingUser.user_roles?.map(ur => <Chip key={ur.role_id} label={ur.roles?.name} size="small" sx={{ backgroundColor: '#fef2f2', color: '#e31937', fontWeight: 700, fontSize: '0.7rem' }} />)}
                                    </Box>
                                </Box>
                                <Chip label={viewingUser.status} size="small" sx={{ background: viewingUser.status === 'active' ? '#ecfdf5' : '#f3f4f6', color: viewingUser.status === 'active' ? '#065f46' : '#6b7280', fontWeight: 700 }} />
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                                {[{ label: 'First Name', value: viewingUser.first_name }, { label: 'Last Name', value: viewingUser.last_name }, { label: 'Username', value: viewingUser.username ? `@${viewingUser.username}` : '—' }, { label: 'Email', value: viewingUser.email }, { label: 'Phone', value: viewingUser.phone || '—' }, { label: 'Location', value: viewingUser.location || '—' }].map(f => (
                                    <Box key={f.label} sx={{ background: '#f9fafb', borderRadius: '8px', p: 1.5, border: '1px solid #f3f4f6' }}>
                                        <Typography fontSize="0.65rem" fontWeight={700} color="#9ca3af" textTransform="uppercase" letterSpacing="0.05em">{f.label}</Typography>
                                        <Typography fontSize="0.9rem" fontWeight={500} color="#111827" mt={0.3}>{f.value || '—'}</Typography>
                                    </Box>
                                ))}
                            </Box>
                            <Box sx={{ background: '#f9fafb', borderRadius: '8px', p: 1.5, border: '1px solid #f3f4f6', mb: 2 }}>
                                <Typography fontSize="0.65rem" fontWeight={700} color="#9ca3af" textTransform="uppercase" letterSpacing="0.05em">Assigned Team</Typography>
                                <Typography fontSize="0.9rem" fontWeight={500} color="#111827" mt={0.3}>{teams.find(t => t.id === viewingUser.team_id)?.name || '—'}</Typography>
                            </Box>
                            <Typography fontSize="0.78rem" color="#9ca3af" textAlign="center">🔒 Profile is read-only. Click Edit to make changes.</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button onClick={() => { setShowViewModal(false); openEditUser(viewingUser); }} variant="contained" sx={primaryBtnSx}>Edit Profile</Button>
                    <Button onClick={() => setShowViewModal(false)} sx={cancelBtnSx}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* ── CREATE / EDIT USER DIALOG ── */}
            <Dialog open={showUserModal} onClose={() => setShowUserModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography fontWeight={700} fontSize="1.1rem">{editingUser ? 'Edit User' : 'Create User'}</Typography>
                    <IconButton size="small" onClick={() => setShowUserModal(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    {userFormErrors.general && <Box sx={{ background: '#fee2e2', color: '#991b1b', p: 1.5, borderRadius: '8px', mb: 2, fontSize: '0.875rem' }}>{userFormErrors.general}</Box>}
                    {userFormSuccess && <Box sx={{ background: '#ecfdf5', color: '#065f46', p: 1.5, borderRadius: '8px', mb: 2, fontSize: '0.875rem', fontWeight: 600 }}>✓ {userFormSuccess}</Box>}
                    <Box component="form" id="user-form" onSubmit={handleSaveUser}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                            <Box>
                                <TextField label="First Name" value={userForm.first_name} onChange={e => handleUserFieldChange('first_name', e.target.value)} fullWidth required size="small" error={!!userFormErrors.first_name} helperText={userFormErrors.first_name} sx={muiInputSx} />
                            </Box>
                            <Box>
                                <TextField label="Last Name" value={userForm.last_name} onChange={e => handleUserFieldChange('last_name', e.target.value)} fullWidth required size="small" error={!!userFormErrors.last_name} helperText={userFormErrors.last_name} sx={muiInputSx} />
                            </Box>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                            <TextField label="Email" type="email" value={userForm.email} onChange={e => handleUserFieldChange('email', e.target.value)} fullWidth required size="small" error={!!userFormErrors.email} helperText={userFormErrors.email} sx={muiInputSx} />
                            <TextField label="Username" value={userForm.username} onChange={e => handleUserFieldChange('username', e.target.value)} fullWidth required size="small" error={!!userFormErrors.username} helperText={userFormErrors.username} sx={muiInputSx} />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                            <TextField label="Phone" value={userForm.phone} onChange={e => handleUserFieldChange('phone', e.target.value)} fullWidth size="small" error={!!userFormErrors.phone} helperText={userFormErrors.phone} sx={muiInputSx} />
                            <FormControl fullWidth size="small" sx={muiInputSx}>
                                <InputLabel>Location</InputLabel>
                                <Select value={userForm.location} onChange={e => handleUserFieldChange('location', e.target.value)} label="Location" sx={{ borderRadius: '8px' }}>
                                    <MenuItem value=""><em>Select location</em></MenuItem>
                                    {locations.map(l => <MenuItem key={l.id} value={l.name}>{l.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Box>
                        <FormControl fullWidth size="small" sx={{ ...muiInputSx, mb: 2 }}>
                            <InputLabel>Assigned Team</InputLabel>
                            <Select value={userForm.team_id} onChange={e => handleUserFieldChange('team_id', e.target.value)} label="Assigned Team" sx={{ borderRadius: '8px' }}>
                                <MenuItem value=""><em>Select a team</em></MenuItem>
                                {teams.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Box sx={{ mb: 2 }}>
                            <Typography fontSize="0.875rem" fontWeight={600} color="#374151" mb={1}>Role(s) <span style={{ color: '#e31937' }}>*</span></Typography>
                            {roles.length === 0 ? <Typography fontSize="0.875rem" color="#9ca3af">No roles available.</Typography> : (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                    {roles.map(role => { const selected = userForm.roles.includes(role.id); return <Chip key={role.id} label={selected ? `✓ ${role.name}` : role.name} onClick={() => handleRoleToggle(role.id)} sx={{ backgroundColor: selected ? '#fef2f2' : '#fff', color: selected ? '#e31937' : '#6b7280', border: `2px solid ${selected ? '#e31937' : '#e5e7eb'}`, fontWeight: selected ? 700 : 400, cursor: 'pointer', '&:hover': { backgroundColor: '#fef2f2', color: '#e31937' } }} />; })}
                                </Box>
                            )}
                            {userFormErrors.roles && <Typography fontSize="0.78rem" color="#e31937" mt={0.5}>{userFormErrors.roles}</Typography>}
                        </Box>
                        {!editingUser && (
                            <TextField label="Temporary Password" type="password" value={userForm.password} onChange={e => handleUserFieldChange('password', e.target.value)} fullWidth required size="small" error={!!userFormErrors.password} helperText={userFormErrors.password || 'User will be required to change this on first login.'} sx={muiInputSx} />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button onClick={() => setShowUserModal(false)} sx={cancelBtnSx}>Cancel</Button>
                    <Button type="submit" form="user-form" variant="contained" disabled={userSaving} startIcon={userSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} sx={primaryBtnSx}>
                        {editingUser ? 'Update User' : 'Create User'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── CREATE / EDIT TEAM DIALOG ── */}
            <Dialog open={showTeamModal} onClose={() => setShowTeamModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography fontWeight={700} fontSize="1.1rem">{editingTeam ? 'Edit Team' : 'Create Team'}</Typography>
                    <IconButton size="small" onClick={() => setShowTeamModal(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    <Box component="form" id="team-form" onSubmit={handleSaveTeam} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Team Name" value={teamForm.name} onChange={e => handleTeamFieldChange('name', e.target.value)} fullWidth required size="small" sx={muiInputSx} />
                        <Box>
                            <Typography fontSize="0.875rem" fontWeight={600} color="#374151" mb={1}>Team Color</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <input type="color" value={teamForm.color} onChange={e => handleTeamFieldChange('color', e.target.value)} style={{ width: 48, height: 40, border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                                <Typography fontSize="0.875rem" color="#6b7280">{teamForm.color}</Typography>
                            </Box>
                        </Box>
                        <FormControl fullWidth size="small" sx={muiInputSx}>
                            <InputLabel>Team Lead</InputLabel>
                            <Select value={teamForm.leadId} onChange={e => handleTeamFieldChange('leadId', e.target.value)} label="Team Lead" sx={{ borderRadius: '8px' }}>
                                <MenuItem value=""><em>Select a lead</em></MenuItem>
                                {users.map(u => <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Members (comma-separated names)" value={teamForm.members} onChange={e => handleTeamFieldChange('members', e.target.value)} fullWidth size="small" placeholder="john, jane, bob" sx={muiInputSx} />
                        <FormControl fullWidth size="small" sx={muiInputSx}>
                            <InputLabel>Role</InputLabel>
                            <Select value={teamForm.role} onChange={e => handleTeamFieldChange('role', e.target.value)} label="Role" sx={{ borderRadius: '8px' }}>
                                <MenuItem value="Lead">Lead</MenuItem>
                                <MenuItem value="Member">Member</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField label="Description" value={teamForm.description} onChange={e => handleTeamFieldChange('description', e.target.value)} fullWidth multiline rows={3} size="small" sx={muiInputSx} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button onClick={() => setShowTeamModal(false)} sx={cancelBtnSx}>Cancel</Button>
                    <Button type="submit" form="team-form" variant="contained" disabled={teamSaving} startIcon={teamSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} sx={primaryBtnSx}>
                        {editingTeam ? 'Update Team' : 'Create Team'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── CREATE / EDIT ROTATION DIALOG ── */}
            <Dialog open={showRotationModal} onClose={() => setShowRotationModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography fontWeight={700} fontSize="1.1rem">{editingRotation ? 'Edit Rotation' : 'New Rotation'}</Typography>
                    <IconButton size="small" onClick={() => setShowRotationModal(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    {rotationFormError   && <Box sx={{ background: '#fee2e2', color: '#991b1b', p: 1.5, borderRadius: '8px', mb: 2, fontSize: '0.875rem' }}>{rotationFormError}</Box>}
                    {rotationFormSuccess && <Box sx={{ background: '#ecfdf5', color: '#065f46', p: 1.5, borderRadius: '8px', mb: 2, fontSize: '0.875rem', fontWeight: 600 }}>✓ {rotationFormSuccess}</Box>}
                    <Box component="form" id="rotation-form" onSubmit={handleSaveRotation} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Rotation Name */}
                        <FormControl fullWidth size="small" sx={muiInputSx}>
                            <InputLabel>Rotation Name *</InputLabel>
                            <Select value={rotationNamePreset} onChange={e => { const v = e.target.value; setRotationNamePreset(v); setRotationFormData(prev => ({ ...prev, name: v === 'custom' ? '' : v })); }} label="Rotation Name *" sx={{ borderRadius: '8px' }}>
                                <MenuItem value=""><em>Select rotation name</em></MenuItem>
                                {ROTATION_NAME_OPTIONS.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                                <MenuItem value="custom">Custom...</MenuItem>
                            </Select>
                        </FormControl>
                        {rotationNamePreset === 'custom' && (
                            <TextField label="Custom Name" value={rotationFormData.name} onChange={e => setRotationFormData({ ...rotationFormData, name: e.target.value })} fullWidth required size="small" sx={muiInputSx} />
                        )}
                        {/* Scope */}
                        <FormControl fullWidth size="small" sx={muiInputSx}>
                            <InputLabel>Assigned Scope *</InputLabel>
                            <Select value={rotationScope} onChange={e => { const s = e.target.value; setRotationScope(s); setRotationFormData(prev => ({ ...prev, team_id: s === 'team' ? prev.team_id : '', location_id: s === 'location' ? prev.location_id : '', assigned_member_ids: [] })); }} label="Assigned Scope *" sx={{ borderRadius: '8px' }}>
                                <MenuItem value="team">Team / Sub-Team</MenuItem>
                                <MenuItem value="location">Pool (Location)</MenuItem>
                            </Select>
                        </FormControl>
                        {/* Team or Location */}
                        {rotationScope === 'team' ? (
                            <FormControl fullWidth size="small" sx={muiInputSx}>
                                <InputLabel>Assigned Team *</InputLabel>
                                <Select value={rotationFormData.team_id} onChange={e => setRotationFormData({ ...rotationFormData, team_id: e.target.value, assigned_member_ids: [] })} label="Assigned Team *" sx={{ borderRadius: '8px' }}>
                                    <MenuItem value=""><em>Select team</em></MenuItem>
                                    {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        ) : (
                            <FormControl fullWidth size="small" sx={muiInputSx}>
                                <InputLabel>Assigned Pool *</InputLabel>
                                <Select value={rotationFormData.location_id} onChange={e => setRotationFormData({ ...rotationFormData, location_id: e.target.value, assigned_member_ids: [] })} label="Assigned Pool *" sx={{ borderRadius: '8px' }}>
                                    <MenuItem value=""><em>Select pool</em></MenuItem>
                                    {locations.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        )}
                        {/* Members */}
                        <Box>
                            <Typography fontSize="0.875rem" fontWeight={600} color="#374151" mb={1}>Assigned Members <span style={{ color: '#e31937' }}>*</span></Typography>
                            {availableMembers.length === 0 ? (
                                <Typography fontSize="0.85rem" color="#9ca3af">{rotationScope === 'team' ? 'Select a team to load members.' : 'Select a pool/location to load members.'}</Typography>
                            ) : (
                                <select multiple size={Math.min(6, availableMembers.length)} value={rotationFormData.assigned_member_ids} onChange={e => setRotationFormData({ ...rotationFormData, assigned_member_ids: Array.from(e.target.selectedOptions).map(o => o.value) })}
                                        style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.5rem', fontSize: '0.9rem', outline: 'none' }}>
                                    {availableMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            )}
                        </Box>
                        {/* Interval */}
                        <FormControl fullWidth size="small" sx={muiInputSx}>
                            <InputLabel>Rotation Interval *</InputLabel>
                            <Select value={intervalPreset} onChange={e => { const v = e.target.value; setIntervalPreset(v); const p = INTERVAL_PRESET_OPTIONS.find(o => o.value === v); if (p?.unit) setRotationFormData(prev => ({ ...prev, interval_unit: p.unit, interval_count: p.count })); }} label="Rotation Interval *" sx={{ borderRadius: '8px' }}>
                                {INTERVAL_PRESET_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        {intervalPreset === 'custom' && (
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <TextField label="Count" type="number" inputProps={{ min: 1 }} value={rotationFormData.interval_count} onChange={e => setRotationFormData({ ...rotationFormData, interval_count: e.target.value })} size="small" sx={muiInputSx} />
                                <FormControl size="small" sx={muiInputSx}>
                                    <InputLabel>Unit</InputLabel>
                                    <Select value={rotationFormData.interval_unit} onChange={e => setRotationFormData({ ...rotationFormData, interval_unit: e.target.value })} label="Unit" sx={{ borderRadius: '8px' }}>
                                        {INTERVAL_UNIT_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Box>
                        )}
                        <TextField label="Start Date *" type="date" value={rotationFormData.start_date} onChange={e => setRotationFormData({ ...rotationFormData, start_date: e.target.value })} fullWidth required size="small" InputLabelProps={{ shrink: true }} sx={muiInputSx} />
                        <TextField label="Notes / Description" value={rotationFormData.notes} onChange={e => setRotationFormData({ ...rotationFormData, notes: e.target.value })} fullWidth multiline rows={2} size="small" sx={muiInputSx} />
                        <TextField label="Escalation Tiers (optional)" value={rotationFormData.escalation_tiers} onChange={e => setRotationFormData({ ...rotationFormData, escalation_tiers: e.target.value })} fullWidth multiline rows={2} size="small" placeholder="Tier 1, Tier 2 or JSON" helperText="Comma-separated list or JSON array." sx={muiInputSx} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <input type="checkbox" id="allow-double-booking" checked={rotationFormData.allow_double_booking} onChange={e => setRotationFormData({ ...rotationFormData, allow_double_booking: e.target.checked })} />
                            <label htmlFor="allow-double-booking" style={{ fontSize: '0.85rem', color: '#374151', cursor: 'pointer' }}>Allow double-booking</label>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button onClick={() => setShowRotationModal(false)} sx={cancelBtnSx}>Cancel</Button>
                    <Button type="submit" form="rotation-form" variant="contained" disabled={rotationSaving} startIcon={rotationSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} sx={primaryBtnSx}>
                        {editingRotation ? 'Update Rotation' : 'Save Rotation'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Header user={currentUser} activePage={activePage} onNavigate={setActivePage} onLogout={() => setIsLoggedIn(false)} />
            <main className="main-content">
                <header className="page-header"><h1>{activePage} Management</h1></header>
                {renderPageContent()}
            </main>
        </div>
    );
}

export default App;