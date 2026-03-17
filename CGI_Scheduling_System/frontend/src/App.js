import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import './styles/Dashboard.css';
import MatrixView from './components/MatrixView';
import './App.css';

const ROTATION_NAME_OPTIONS = [
    'Team-Level',
    'Sub-Team',
    'On-Call',
    'Business Domain',
    'Cross-Team Analyst'
];

const INTERVAL_PRESET_OPTIONS = [
    { value: 'daily', label: 'Daily', unit: 'day', count: 1 },
    { value: 'weekly', label: 'Weekly', unit: 'week', count: 1 },
    { value: 'biweekly', label: 'Bi-Weekly', unit: 'biweek', count: 1 },
    { value: 'custom', label: 'Custom' }
];

const INTERVAL_UNIT_OPTIONS = [
    { value: 'day', label: 'Day(s)' },
    { value: 'week', label: 'Week(s)' },
    { value: 'biweek', label: 'Bi-Week(s)' },
    { value: 'month', label: 'Month(s)' }
];

const DEFAULT_ROTATION_FORM = {
    name: '',
    team_id: '',
    location_id: '',
    start_date: new Date().toISOString().split('T')[0],
    interval_unit: 'week',
    interval_count: 1,
    status: 'active',
    assigned_member_ids: [],
    notes: '',
    allow_double_booking: false,
    escalation_tiers: ''
};
const DEFAULT_TEAM_FORM = { name: '', color: '#e31937', leadId: '', members: '', role: 'Member', description: '' };
const DEFAULT_USER_FORM = { first_name: '', last_name: '', username: '', email: '', phone: '', location: '', team_id: '', roles: [], password: '' };

function App() {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [roles, setRoles] = useState([]);
    const [locations, setLocations] = useState([]);
    const [rotations, setRotations] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [activePage, setActivePage] = useState('Users');
    const [selectedTeam, setSelectedTeam] = useState(null);

    // User state
    const [userForm, setUserForm] = useState(DEFAULT_USER_FORM);
    const [userFormErrors, setUserFormErrors] = useState({});
    const [userFormSuccess, setUserFormSuccess] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewUserError, setViewUserError] = useState('');

    // Add these with your other User states in App.js
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Team state
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [showEditTeamModal, setShowEditTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamFormData, setTeamFormData] = useState(DEFAULT_TEAM_FORM);

    // Rotation state
    const [rotationFormData, setRotationFormData] = useState(DEFAULT_ROTATION_FORM);
    const [rotationScope, setRotationScope] = useState('team');
    const [editingRotation, setEditingRotation] = useState(null);
    const [rotationFormError, setRotationFormError] = useState('');
    const [rotationFormSuccess, setRotationFormSuccess] = useState('');
    const [intervalPreset, setIntervalPreset] = useState('weekly');
    const [rotationNamePreset, setRotationNamePreset] = useState('');

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, user: null });
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => { closeTeamModal(); }, [activePage]);

    useEffect(() => {
        if (isLoggedIn) {
            fetchUsers(); fetchTeams(); fetchRoles(); fetchLocations();
            if (activePage === 'Rotations') { fetchRotations(); }
        }
    }, [isLoggedIn, activePage]);

    const fetchUsers = async () => { try { const r = await fetch('/api/users'); const d = await r.json(); setUsers(Array.isArray(d) ? d : []); } catch { setUsers([]); } };
    const fetchTeams = async () => { try { const r = await fetch('/api/teams'); const d = await r.json(); setTeams(Array.isArray(d) ? d : []); } catch { setTeams([]); } };
    const fetchRoles = async () => { try { const r = await fetch('/api/roles'); const d = await r.json(); setRoles(Array.isArray(d) ? d : []); } catch { setRoles([]); } };
    const fetchLocations = async () => { try { const r = await fetch('/api/locations'); const d = await r.json(); setLocations(Array.isArray(d) ? d : []); } catch { setLocations([]); } };
    const fetchRotations = async () => { try { const r = await fetch('/api/rotations'); const d = await r.json(); setRotations(Array.isArray(d) ? d : []); } catch { setRotations([]); } };
    const inferIntervalPreset = (unit, count) => {
        if (unit === 'day' && count === 1) return 'daily';
        if (unit === 'week' && count === 1) return 'weekly';
        if (unit === 'biweek' && count === 1) return 'biweekly';
        return 'custom';
    };

    const handleAdminLogin = ({ identifier, password }) => {
        if (identifier === 'admin@cgi.com' && password === 'AdminAdmin902') {
            setCurrentUser({ name: 'CGI Administrator', role: 'Admin', email: identifier });
            setIsLoggedIn(true); return { ok: true };
        }
        return { ok: false, error: 'Access Denied.' };
    };

    const openCreateUser = () => { setEditingUser(null); setUserForm(DEFAULT_USER_FORM); setUserFormErrors({}); setUserFormSuccess(''); setShowUserModal(true); };
    const openEditUser = (user) => {
        setEditingUser(user);
        setUserForm({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            username: user.username || '',
            email: user.email || '',
            phone: user.phone || '',
            location: user.location || '',
            team_id: user.team_id || '',
            status: user.status || 'active', // Add this
            roles: user.user_roles?.map(ur => ur.role_id) || [],
            password: '' // Don't fill password on edit
        });
        setUserFormErrors({});
        setUserFormSuccess('');
        setShowUserModal(true);
    };
    const openViewUser = async (user) => {
        setViewUserError('');
        try {
            const res = await fetch(`/api/users/${user.id}`);
            if (!res.ok) {
                setViewUserError('User record not found.');
                setViewingUser(null);
                setShowViewModal(true);
                return;
            }
            const data = await res.json();
            setViewingUser(data);
            setShowViewModal(true);
        } catch {
            setViewUserError('Failed to load user profile.');
            setViewingUser(null);
            setShowViewModal(true);
        }
    };

    const handleUserFieldChange = (field, value) => { setUserForm(prev => ({ ...prev, [field]: value })); if (userFormErrors[field]) setUserFormErrors(prev => { const e = { ...prev }; delete e[field]; return e; }); };
    const handleRoleToggle = (roleId) => { setUserForm(prev => { const exists = prev.roles.includes(roleId); return { ...prev, roles: exists ? prev.roles.filter(r => r !== roleId) : [...prev.roles, roleId] }; }); if (userFormErrors.roles) setUserFormErrors(prev => { const e = { ...prev }; delete e.roles; return e; }); };

    const handleSaveUser = async (e) => {
        e.preventDefault(); setUserFormErrors({}); setUserFormSuccess('');
        const method = editingUser ? 'PUT' : 'POST';
        const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) });
            const data = await res.json();
            if (!res.ok) { setUserFormErrors(data.errors || { general: data.error || 'An error occurred.' }); return; }
            setUserFormSuccess(editingUser ? 'User updated successfully.' : 'User created successfully.');
            fetchUsers();
            setTimeout(() => { setShowUserModal(false); setUserFormSuccess(''); }, 1500);
        } catch { setUserFormErrors({ general: 'Network error. Please try again.' }); }
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
    };

    const handleDeleteUser = (user) => {
        setDeleteConfirm({ open: true, user });
    };

    const handleConfirmDelete = async () => {
        const user = deleteConfirm.user;
        setDeleteConfirm({ open: false, user: null });
        try {
            const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                fetchUsers();
                showNotification('User deleted successfully.');
            } else {
                showNotification(data.error || 'Failed to delete user.', 'error');
            }
        } catch {
            showNotification('Network error. Please try again.', 'error');
        }
    };

    const handleTeamFieldChange = (field, value) => setTeamFormData(prev => ({ ...prev, [field]: value }));
    const openCreateTeam = () => { setTeamFormData(DEFAULT_TEAM_FORM); setShowCreateTeamModal(true); };
    const openEditTeam = (team) => { setTeamFormData({ name: team.name, color: team.color || '#e31937', leadId: team.lead_id || '', members: team.members || '', role: team.team_role || 'Member', description: team.description || '' }); setEditingTeam(team); setShowEditTeamModal(true); };
    const handleSaveTeam = async (e) => { e.preventDefault(); const method = editingTeam ? 'PUT' : 'POST'; const url = editingTeam ? `/api/teams/${editingTeam.id}` : '/api/teams'; const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(teamFormData) }); if (r.ok) { fetchTeams(); closeTeamModal(); } };
    const handleDeleteTeam = async (id) => { if (!window.confirm('Delete this team?')) return; const r = await fetch(`/api/teams/${id}`, { method: 'DELETE' }); if (r.ok) fetchTeams(); };
    const closeTeamModal = () => { setShowCreateTeamModal(false); setShowEditTeamModal(false); setEditingTeam(null); };

    const handleSaveRotation = async (e) => {
        e.preventDefault();
        setRotationFormError('');
        setRotationFormSuccess('');

        if (!rotationFormData.name.trim()) {
            setRotationFormError('Rotation name is required.');
            return;
        }
        if (rotationScope === 'team' && !rotationFormData.team_id) {
            setRotationFormError('Assigned team is required.');
            return;
        }
        if (rotationScope === 'location' && !rotationFormData.location_id) {
            setRotationFormError('Assigned pool/location is required.');
            return;
        }
        if (!rotationFormData.start_date) {
            setRotationFormError('Start date is required.');
            return;
        }

        const assignedMembers = (rotationFormData.assigned_member_ids || [])
            .map((id) => String(id))
            .filter(Boolean);
        if (!assignedMembers.length) {
            setRotationFormError('Assign at least one member.');
            return;
        }

        const intervalCount = Number.parseInt(rotationFormData.interval_count, 10);
        if (Number.isNaN(intervalCount) || intervalCount < 1) {
            setRotationFormError('Rotation interval must be at least 1.');
            return;
        }

        const payload = {
            ...rotationFormData,
            team_id: rotationScope === 'team' ? rotationFormData.team_id : null,
            location_id: rotationScope === 'location' ? rotationFormData.location_id : null,
            assigned_member_ids: assignedMembers
                .map((id) => Number.parseInt(id, 10))
                .filter((id) => !Number.isNaN(id)),
            interval_count: intervalCount
        };

        const method = editingRotation ? 'PUT' : 'POST';
        const url = editingRotation ? `/api/rotations/${editingRotation.id}` : '/api/rotations';
        const r = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            setRotationFormError(
                Array.isArray(data.errors) ? data.errors.join(' ') : data.error || 'An error occurred.'
            );
            return;
        }
        setRotationFormSuccess(editingRotation ? 'Rotation updated successfully.' : 'Rotation created successfully.');
        fetchRotations();
        setRotationFormData(DEFAULT_ROTATION_FORM);
        setEditingRotation(null);
        setRotationScope('team');
        setIntervalPreset('weekly');
        setRotationNamePreset('');
        setTimeout(() => setRotationFormSuccess(''), 1500);
    };
    const handleDeleteRotation = async (id) => { if (!window.confirm('Delete this rotation?')) return; const r = await fetch(`/api/rotations/${id}`, { method: 'DELETE' }); if (r.ok) fetchRotations(); };
    const openEditRotation = (rotation) => {
        setEditingRotation(rotation);
        setRotationScope(rotation.team_id ? 'team' : 'location');
        setIntervalPreset(inferIntervalPreset(rotation.interval_unit, rotation.interval_count || 1));
        setRotationNamePreset(
            ROTATION_NAME_OPTIONS.includes(rotation.name) ? rotation.name : 'custom'
        );
        setRotationFormError('');
        setRotationFormSuccess('');
        setRotationFormData({
            name: rotation.name || '',
            team_id: rotation.team_id || '',
            location_id: rotation.location_id || '',
            start_date: rotation.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
            interval_unit: rotation.interval_unit || 'week',
            interval_count: rotation.interval_count || 1,
            status: rotation.status || 'active',
            assigned_member_ids: Array.isArray(rotation.assigned_member_ids)
                ? rotation.assigned_member_ids.map((id) => String(id))
                : [],
            notes: rotation.notes || '',
            allow_double_booking: Boolean(rotation.allow_double_booking),
            escalation_tiers: Array.isArray(rotation.escalation_tiers)
                ? rotation.escalation_tiers.join(', ')
                : rotation.escalation_tiers
                    ? JSON.stringify(rotation.escalation_tiers)
                    : ''
        });
    };

    const inputStyle = (field) => ({ width: '100%', padding: '0.65rem 0.75rem', border: `1px solid ${userFormErrors[field] ? '#e31937' : '#d1d5db'}`, borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' });
    const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' };
    const errorStyle = { color: '#e31937', fontSize: '0.78rem', margin: '4px 0 0' };
    const fieldWrap = { marginBottom: '1rem' };

    const userLookup = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {});

    const formatIntervalLabel = (unit, count) => {
        const baseLabels = { day: 'Daily', week: 'Weekly', biweek: 'Bi-Weekly', month: 'Monthly' };
        const base = baseLabels[unit] || unit;
        if (!count || count === 1) return base;
        const unitLabel = unit === 'biweek' ? 'bi-week' : unit;
        return `Every ${count} ${unitLabel}${count > 1 ? 's' : ''}`;
    };

    const formatCoverageLabel = (rotation) => {
        const ids = Array.isArray(rotation.assigned_member_ids)
            ? rotation.assigned_member_ids
            : [];
        if (!ids.length) return '—';
        const names = ids
            .map((id) => userLookup[id]?.name)
            .filter(Boolean);
        if (!names.length) return `${ids.length} member${ids.length > 1 ? 's' : ''}`;
        if (names.length <= 3) return names.join(', ');
        return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
    };

    const renderPageContent = () => {
        if (activePage === 'Users') {
            const filteredUsers = users.filter(u => {
                const matchesSearch =
                    (u.first_name + ' ' + u.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()));

                const matchesTeam = !teamFilter || u.team_id === parseInt(teamFilter);
                const matchesStatus = !statusFilter || u.status === statusFilter;
                const matchesRole = !roleFilter || u.user_roles?.some(ur => ur.role_id === parseInt(roleFilter));

                return matchesSearch && matchesTeam && matchesStatus && matchesRole;
            });

            return (
                <div style={{ position: 'relative' }}>
                    {/* Header & Filters */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: '#111827' }}>User Management</h2>
                        <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={openCreateUser}>+ Create User</button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle(), flex: 2, marginBottom: 0 }} />
                        <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} style={{ ...inputStyle(), flex: 1, marginBottom: 0 }}>
                            <option value="">All Teams</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ ...inputStyle(), flex: 1, marginBottom: 0 }}>
                            <option value="">All Roles</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle(), flex: 1, marginBottom: 0 }}>
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {/* User Table */}
                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>First Name</th>
                                <th>Last Name</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Phone</th>     {/* Re-added column */}
                                <th>Location</th>  {/* Re-added column */}
                                <th>Assigned Team</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No users found.</td></tr>
                            ) : filteredUsers.map(u => (
                                <tr key={u.id}>
                                    <td>{u.first_name}</td>
                                    <td>{u.last_name}</td>
                                    <td style={{color: '#6b7280'}}>{u.username || '—'}</td>
                                    <td>{u.email}</td>
                                    <td>{u.phone || '—'}</td>     {/* Display Phone */}
                                    <td>{u.location || '—'}</td>  {/* Display Location */}
                                    <td>{teams.find(t => t.id === u.team_id)?.name || '—'}</td>
                                    <td><span className={`status-pill ${u.status}`}>{u.status}</span></td>
                                    <td className="action-cell" style={{whiteSpace: 'nowrap', textAlign: 'right'}}>
                                        <button
                                            onClick={() => openViewUser(u)}
                                            className="btn-table btn-view"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => openEditUser(u)}
                                            className="btn-table btn-edit"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(u)}
                                            className="btn-table btn-delete"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── VIEW USER MODAL ── */}
                    {showViewModal && (
                        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                            <div className="modal-content" style={{ minWidth: '550px' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0 }}>User Profile Details</h2>
                                    <button onClick={() => setShowViewModal(false)} className="close-modal-btn">✕</button>
                                </div>

                                {viewingUser && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {/* Full Name Row */}
                                        <div className="info-box"><label>First Name</label><p>{viewingUser.first_name}</p></div>
                                        <div className="info-box"><label>Last Name</label><p>{viewingUser.last_name}</p></div>

                                        {/* Contact Row */}
                                        <div className="info-box"><label>Username</label><p>@{viewingUser.username || '—'}</p></div>
                                        <div className="info-box"><label>Email</label><p>{viewingUser.email}</p></div>

                                        {/* Secondary Info Row */}
                                        <div className="info-box"><label>Phone</label><p>{viewingUser.phone || '—'}</p></div>
                                        <div className="info-box"><label>Location</label><p>{viewingUser.location || '—'}</p></div>

                                        {/* Status and Team Row */}
                                        <div className="info-box">
                                            <label>Status</label>
                                            <span className={`status-pill ${viewingUser.status}`}>{viewingUser.status}</span>
                                        </div>
                                        <div className="info-box">
                                            <label>Assigned Team</label>
                                            <p>{teams.find(t => t.id === viewingUser.team_id)?.name || 'Unassigned'}</p>
                                        </div>

                                        {/* Roles Display */}
                                        <div className="info-box" style={{ gridColumn: 'span 2' }}>
                                            <label>Assigned Roles</label>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                {viewingUser.user_roles?.map(ur => (
                                                    <span key={ur.role_id} className="role-badge-selected" style={{ fontSize: '0.75rem' }}>
                                    {ur.roles?.name}
                                </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button
                                        onClick={() => { setShowViewModal(false); openEditUser(viewingUser); }}
                                        className="btn-primary" style={{ flex: 1 }}
                                    >
                                        Edit This User
                                    </button>
                                    <button onClick={() => setShowViewModal(false)} className="btn-cancel" style={{ flex: 1 }}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── CREATE/EDIT USER MODAL ── */}
                    {showUserModal && (
                        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                            <div className="modal-content" style={{ minWidth: '600px' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0 }}>{editingUser ? 'Edit User' : 'Create New User'}</h2>
                                    <button onClick={() => setShowUserModal(false)} className="close-modal-btn">✕</button>
                                </div>

                                <form onSubmit={handleSaveUser}>
                                    {/* Name Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={labelStyle}>First Name</label>
                                            <input style={inputStyle()} value={userForm.first_name} onChange={e => handleUserFieldChange('first_name', e.target.value)} required />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Last Name</label>
                                            <input style={inputStyle()} value={userForm.last_name} onChange={e => handleUserFieldChange('last_name', e.target.value)} required />
                                        </div>
                                    </div>

                                    {/* Email + Username Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={labelStyle}>Email</label>
                                            <input type="email" style={inputStyle()} value={userForm.email} onChange={e => handleUserFieldChange('email', e.target.value)} required />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Username</label>
                                            <input style={inputStyle()} value={userForm.username} onChange={e => handleUserFieldChange('username', e.target.value)} required />
                                        </div>
                                    </div>

                                    {/* Phone + Location Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={labelStyle}>Phone</label>
                                            <input style={inputStyle()} placeholder="+1 (555) 000-0000" value={userForm.phone} onChange={e => handleUserFieldChange('phone', e.target.value)} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Location</label>
                                            <select style={inputStyle()} value={userForm.location} onChange={e => handleUserFieldChange('location', e.target.value)}>
                                                <option value="">Select location</option>
                                                {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Team Selection */}
                                    <div style={fieldWrap}>
                                        <label style={labelStyle}>Assigned Team</label>
                                        <select style={inputStyle()} value={userForm.team_id} onChange={e => handleUserFieldChange('team_id', e.target.value)}>
                                            <option value="">Select Team</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Status (Only show when editing) */}
                                    {editingUser && (
                                        <div style={fieldWrap}>
                                            <label style={labelStyle}>Status</label>
                                            <select style={inputStyle()} value={userForm.status} onChange={e => handleUserFieldChange('status', e.target.value)}>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Roles Selection */}
                                    <div style={fieldWrap}>
                                        <label style={labelStyle}>Role(s)</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {roles.map(role => {
                                                const selected = userForm.roles.includes(role.id);
                                                return (
                                                    <button
                                                        key={role.id}
                                                        type="button"
                                                        onClick={() => handleRoleToggle(role.id)}
                                                        className={selected ? 'role-badge-selected' : 'role-badge-default'}
                                                    >
                                                        {role.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Password Row (Only for new users) */}
                                    {!editingUser && (
                                        <div style={fieldWrap}>
                                            <label style={labelStyle}>Temporary Password</label>
                                            <input type="password" style={inputStyle()} value={userForm.password} onChange={e => handleUserFieldChange('password', e.target.value)} required />
                                        </div>
                                    )}

                                    {/* Footer Actions */}
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                                            {editingUser ? 'Save Changes' : 'Create User'}
                                        </button>
                                        <button type="button" onClick={() => setShowUserModal(false)} className="btn-cancel" style={{ flex: 1 }}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (activePage === 'Teams') {
            return (
                <div className="enterprise-card no-padding">
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #eee',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h3>Active Teams ({teams.length})</h3>
                        <button className="btn-primary" style={{width: 'auto'}} onClick={openCreateTeam}>+ Create Team
                        </button>
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
                    {(showCreateTeamModal || showEditTeamModal) && (
                        <div className="modal-overlay" onClick={closeTeamModal}>
                            <div className="enterprise-card" style={{ minWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                                <h2 style={{ textAlign: 'center' }}>{editingTeam ? 'Edit Team' : 'New Team'}</h2>
                                <form onSubmit={handleSaveTeam}>
                                    <label>Team Name</label>
                                    <input className="enterprise-input" value={teamFormData.name} onChange={e => handleTeamFieldChange('name', e.target.value)} required />
                                    <label>Team Color</label>
                                    <input type="color" style={{ display: 'block', marginBottom: '1rem', width: '60px', height: '40px' }} value={teamFormData.color} onChange={e => handleTeamFieldChange('color', e.target.value)} />
                                    <label>Team Lead</label>
                                    <select className="enterprise-input" value={teamFormData.leadId} onChange={e => handleTeamFieldChange('leadId', e.target.value)} required>
                                        <option value="">Select a lead</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                    <label>Assign Members (comma-separated names)</label>
                                    <input className="enterprise-input" placeholder="john, jane, bob" value={teamFormData.members} onChange={e => handleTeamFieldChange('members', e.target.value)} />
                                    <label>Role</label>
                                    <select className="enterprise-input" value={teamFormData.role} onChange={e => handleTeamFieldChange('role', e.target.value)}>
                                        <option value="Lead">Lead</option>
                                        <option value="Member">Member</option>
                                    </select>
                                    <label>Description</label>
                                    <textarea className="enterprise-input" rows="4" value={teamFormData.description} onChange={e => handleTeamFieldChange('description', e.target.value)} />
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button type="submit" className="btn-primary">Save Team</button>
                                        <button type="button" onClick={closeTeamModal} style={{ background: '#eee', color: '#333' }} className="btn-primary">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (activePage === 'Rotations') {
            const selectedLocation = locations.find(
                (l) => String(l.id) === String(rotationFormData.location_id)
            );
            const availableMembers =
                rotationScope === 'team'
                    ? users.filter((u) => String(u.team_id) === String(rotationFormData.team_id))
                    : selectedLocation
                        ? users.filter(
                            (u) =>
                                (u.location || '').trim().toLowerCase() ===
                                selectedLocation.name.trim().toLowerCase()
                        )
                        : [];
            return (
                <div className="grid-container">
                    <div className="enterprise-card">
                        <h3>{editingRotation ? 'Edit Rotation' : 'New Rotation'}</h3>
                        {rotationFormError && (
                            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                {rotationFormError}
                            </div>
                        )}
                        {rotationFormSuccess && (
                            <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                {rotationFormSuccess}
                            </div>
                        )}
                        <form onSubmit={handleSaveRotation}>
                            <div className="form-group">
                                <label>Rotation Name <span style={{ color: '#e31937' }}>*</span></label>
                                <select
                                    className="enterprise-input"
                                    value={rotationNamePreset}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setRotationNamePreset(value);
                                        if (value === 'custom') {
                                            setRotationFormData((prev) => ({ ...prev, name: '' }));
                                        } else {
                                            setRotationFormData((prev) => ({ ...prev, name: value }));
                                        }
                                    }}
                                    required
                                >
                                    <option value="">Select rotation name</option>
                                    {ROTATION_NAME_OPTIONS.map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                    <option value="custom">Custom...</option>
                                </select>
                                {rotationNamePreset === 'custom' && (
                                    <input
                                        className="enterprise-input"
                                        placeholder="Custom rotation name"
                                        value={rotationFormData.name}
                                        onChange={(e) => setRotationFormData({ ...rotationFormData, name: e.target.value })}
                                        style={{ marginTop: '0.6rem' }}
                                        required
                                    />
                                )}
                            </div>

                            <div className="form-group">
                                <label>Assigned Scope <span style={{ color: '#e31937' }}>*</span></label>
                                <select
                                    className="enterprise-input"
                                    value={rotationScope}
                                    onChange={(e) => {
                                        const scope = e.target.value;
                                        setRotationScope(scope);
                                        setRotationFormData((prev) => ({
                                            ...prev,
                                            team_id: scope === 'team' ? prev.team_id : '',
                                            location_id: scope === 'location' ? prev.location_id : '',
                                            assigned_member_ids: []
                                        }));
                                    }}
                                >
                                    <option value="team">Team / Sub-Team</option>
                                    <option value="location">Pool (Location)</option>
                                </select>
                            </div>

                            {rotationScope === 'team' ? (
                                <div className="form-group">
                                    <label>Assigned Team / Sub-Team <span style={{ color: '#e31937' }}>*</span></label>
                                    <select
                                        className="enterprise-input"
                                        value={rotationFormData.team_id}
                                        onChange={(e) =>
                                            setRotationFormData({
                                                ...rotationFormData,
                                                team_id: e.target.value,
                                                assigned_member_ids: []
                                            })
                                        }
                                        required
                                    >
                                        <option value="">Select team</option>
                                        {teams.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Assigned Pool (Location) <span style={{ color: '#e31937' }}>*</span></label>
                                    <select
                                        className="enterprise-input"
                                        value={rotationFormData.location_id}
                                        onChange={(e) =>
                                            setRotationFormData({
                                                ...rotationFormData,
                                                location_id: e.target.value,
                                                assigned_member_ids: []
                                            })
                                        }
                                        required
                                    >
                                        <option value="">Select pool</option>
                                        {locations.map((l) => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Assigned Members <span style={{ color: '#e31937' }}>*</span></label>
                                {availableMembers.length === 0 ? (
                                    <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                                        {rotationScope === 'team'
                                            ? 'Select a team to load members.'
                                            : 'Select a pool/location to load members.'}
                                    </p>
                                ) : (
                                    <select
                                        className="enterprise-input"
                                        multiple
                                        size={Math.min(6, availableMembers.length)}
                                        value={rotationFormData.assigned_member_ids}
                                        onChange={(e) => {
                                            const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                                            setRotationFormData({ ...rotationFormData, assigned_member_ids: values });
                                        }}
                                    >
                                        {availableMembers.map((u) => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Rotation Interval <span style={{ color: '#e31937' }}>*</span></label>
                                <select
                                    className="enterprise-input"
                                    value={intervalPreset}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setIntervalPreset(value);
                                        const preset = INTERVAL_PRESET_OPTIONS.find((p) => p.value === value);
                                        if (preset?.unit) {
                                            setRotationFormData((prev) => ({
                                                ...prev,
                                                interval_unit: preset.unit,
                                                interval_count: preset.count
                                            }));
                                        }
                                    }}
                                    required
                                >
                                    {INTERVAL_PRESET_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                {intervalPreset === 'custom' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.6rem' }}>
                                        <input
                                            className="enterprise-input"
                                            type="number"
                                            min="1"
                                            value={rotationFormData.interval_count}
                                            onChange={(e) => setRotationFormData({ ...rotationFormData, interval_count: e.target.value })}
                                        />
                                        <select
                                            className="enterprise-input"
                                            value={rotationFormData.interval_unit}
                                            onChange={(e) => setRotationFormData({ ...rotationFormData, interval_unit: e.target.value })}
                                        >
                                            {INTERVAL_UNIT_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Start Date <span style={{ color: '#e31937' }}>*</span></label>
                                <input
                                    className="enterprise-input"
                                    type="date"
                                    value={rotationFormData.start_date}
                                    onChange={(e) => setRotationFormData({ ...rotationFormData, start_date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Notes / Description</label>
                                <textarea
                                    className="enterprise-input"
                                    rows="3"
                                    value={rotationFormData.notes}
                                    onChange={(e) => setRotationFormData({ ...rotationFormData, notes: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Escalation Tiers (optional)</label>
                                <textarea
                                    className="enterprise-input"
                                    rows="2"
                                    placeholder="Tier 1, Tier 2 or JSON"
                                    value={rotationFormData.escalation_tiers}
                                    onChange={(e) => setRotationFormData({ ...rotationFormData, escalation_tiers: e.target.value })}
                                />
                                <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                                    Comma-separated list or JSON array.
                                </p>
                            </div>

                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={rotationFormData.allow_double_booking}
                                    onChange={(e) => setRotationFormData({ ...rotationFormData, allow_double_booking: e.target.checked })}
                                />
                                <span style={{ fontSize: '0.85rem', color: '#374151' }}>Allow double-booking</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn-primary">{editingRotation ? 'Update Rotation' : 'Save Rotation'}</button>
                                {editingRotation && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingRotation(null);
                                            setRotationFormData(DEFAULT_ROTATION_FORM);
                                            setRotationScope('team');
                                            setIntervalPreset('weekly');
                                            setRotationNamePreset('');
                                            setRotationFormError('');
                                            setRotationFormSuccess('');
                                        }}
                                        style={{ background: '#eee', color: '#333' }}
                                        className="btn-primary"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Scope</th>
                                    <th>Coverage</th>
                                    <th>Interval</th>
                                    <th>Start Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rotations.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                                            No rotations found.
                                        </td>
                                    </tr>
                                ) : (
                                    rotations.map(r => (
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
                                    ))
                                )}
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
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: '#111827' }}>Roles and Permissions</h2>
                        <p style={{ margin: '0.4rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>System-defined roles assigned to users. Permissions are fixed per role.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        {roles.length === 0 ? (
                            <div className="enterprise-card"><p style={{ color: '#9ca3af' }}>Loading roles...</p></div>
                        ) : roles.map(role => {
                            const perms = rolePermissions[role.name] || [];
                            const userCount = users.filter(u => u.user_roles?.some(ur => ur.role_id === role.id)).length;
                            const badgeColor = role.name === 'Administrator' ? '#e31937' : role.name === 'Team Lead / Supervisor' ? '#2563eb' : role.name === 'Rotation Owner' ? '#7c3aed' : '#059669';
                            return (
                                <div key={role.id} className="enterprise-card" style={{ borderTop: '3px solid ' + badgeColor }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>{role.name}</h3>
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>{role.description}</p>
                                        </div>
                                        <span style={{ background: badgeColor + '18', color: badgeColor, borderRadius: '12px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                                            {userCount} {userCount === 1 ? 'user' : 'users'}
                                        </span>
                                    </div>
                                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permissions</p>
                                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                            {perms.map(perm => (
                                                <li key={perm} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#374151', padding: '3px 0' }}>
                                                    <span style={{ color: badgeColor, fontWeight: 700 }}><span style={{ color: badgeColor, fontWeight: 700 }}>checkmark</span>#10003;</span> {perm}
                                                </li>
                                            ))}
                                        </ul>
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

    const NotificationBanner = () => notification.show ? (
        <div style={{
            position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
            background: notification.type === 'success' ? '#ecfdf5' : '#fee2e2',
            color: notification.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            borderRadius: '8px', padding: '0.85rem 1.25rem',
            fontWeight: 600, fontSize: '0.875rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '360px',
        }}>
            <span>{notification.type === 'success' ? '✓' : '✕'}</span>
            {notification.message}
        </div>
    ) : null;

    const DeleteConfirmModal = () => !deleteConfirm.open ? null : (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', maxWidth: '420px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>⚠</div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>Delete User</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                            Are you sure you want to delete <strong>{deleteConfirm.user?.name}</strong>?
                        </p>
                    </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', background: '#f9fafb', borderRadius: '6px', padding: '0.75rem', margin: '0 0 1.5rem' }}>
                    This action cannot be undone. The user will be permanently removed from the system and will no longer be able to log in.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setDeleteConfirm({ open: false, user: null })}
                            style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                        Cancel
                    </button>
                    <button onClick={handleConfirmDelete}
                            style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: 'none', background: '#e31937', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                        Delete User
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard-root">
            <NotificationBanner />
            <DeleteConfirmModal />
            <Header user={currentUser} activePage={activePage} onNavigate={setActivePage} onLogout={() => setIsLoggedIn(false)} />
            <main className="main-content">
                <header className="page-header"><h1>{activePage} Management</h1></header>
                {renderPageContent()}
            </main>
        </div>
    );
}

export default App;
