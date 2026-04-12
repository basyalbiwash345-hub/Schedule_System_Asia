import React, { useState } from 'react';

// CHANGED: team_id is now team_ids array
const DEFAULT_USER_FORM = { first_name: '', last_name: '', username: '', email: '', phone: '', location: '', team_ids: [], roles: [], password: '' };

const Users = ({ users, teams, roles, locations, isUserAdmin, fetchUsers, showNotification, onTeamMutated }) => {
    // ── LOCAL STATE ──────────────────────────────────────────────────────────
    const [userForm, setUserForm] = useState(DEFAULT_USER_FORM);
    const [userFormErrors, setUserFormErrors] = useState({});
    const [userFormSuccess, setUserFormSuccess] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewUserError, setViewUserError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, user: null });

    const [searchTerm, setSearchTerm] = useState('');
    const [teamFilter, setTeamFilter] = useState([]);
    const [roleFilter, setRoleFilter] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [modalLocationSearch, setModalLocationSearch] = useState('');
    const [modalTeamSearch, setModalTeamSearch] = useState('');
    const [showModalLocationDropdown, setShowModalLocationDropdown] = useState(false);
    const [showModalTeamDropdown, setShowModalTeamDropdown] = useState(false);
    const [userTeamFilterSearch, setUserTeamFilterSearch] = useState('');
    const [showTeamDropdown, setShowTeamDropdown] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);

    // ── STYLE HELPERS ─────────────────────────────────────────────────────────
    const inputStyle = (field) => ({ width: '100%', padding: '0.65rem 0.75rem', border: `1px solid ${userFormErrors[field] ? '#e31937' : '#d1d5db'}`, borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' });
    const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' };
    const errorStyle = { color: '#e31937', fontSize: '0.78rem', margin: '4px 0 0' };
    const fieldWrap = { marginBottom: '1rem' };

    // ── HANDLERS ──────────────────────────────────────────────────────────────
    const openCreateUser = () => { setEditingUser(null); setUserForm(DEFAULT_USER_FORM); setUserFormErrors({}); setUserFormSuccess(''); setShowUserModal(true); };

    const openEditUser = (user) => {
        setEditingUser(user);
        setUserForm({
            first_name: user.first_name || '', last_name: user.last_name || '', username: user.username || '',
            email: user.email || '', phone: user.phone || '', location: user.location || '',
            team_ids: user.team_memberships?.map(t => String(t.id)) || [], // CHANGED: Load array of IDs
            roles: user.user_roles?.map(ur => ur.role_id) || [], password: ''
        });
        setUserFormErrors({}); setUserFormSuccess(''); setShowUserModal(true);
    };

    const openViewUser = async (user) => {
        setViewUserError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) { setViewUserError('User record not found.'); setViewingUser(null); setShowViewModal(true); return; }
            setViewingUser(await res.json());
            setShowViewModal(true);
        } catch {
            setViewUserError('Failed to load user profile.');
            setViewingUser(null);
            setShowViewModal(true);
        }
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
        e.preventDefault();
        setUserFormErrors({});
        setUserFormSuccess('');
        const method = editingUser ? 'PUT' : 'POST';
        const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(userForm)
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 401) { setUserFormErrors({ general: 'Session expired or unauthorized. Please log in again.' }); return; }
                setUserFormErrors(data.errors || { general: data.error || 'An error occurred.' }); return;
            }
            setUserFormSuccess(editingUser ? 'User updated successfully.' : 'User created successfully.');
            fetchUsers();
            onTeamMutated?.();
            setTimeout(() => { closeUserModal(); }, 1500);
        } catch { setUserFormErrors({ general: 'Network error. Please try again.' }); }
    };

    const handleDeleteUser = (user) => setDeleteConfirm({ open: true, user });

    const handleConfirmDelete = async () => {
        const user = deleteConfirm.user;
        const token = localStorage.getItem('token');
        setDeleteConfirm({ open: false, user: null });
        try {
            const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) { fetchUsers(); showNotification('User deleted successfully.'); onTeamMutated?.(); }
            else { showNotification(data.error || 'Failed to delete user.', 'error'); }
        } catch { showNotification('Network error. Please try again.', 'error'); }
    };

    // ── RENDER HELPERS ────────────────────────────────────────────────────────
    const filteredUsers = users.filter(u => {
        const teamNames = u.team_memberships?.map(t => t.name.toLowerCase()).join(' ') || '';
        const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) || teamNames.includes(searchTerm.toLowerCase());
        const matchesTeam = teamFilter.length === 0 || u.team_memberships?.some(t => teamFilter.includes(String(t.id)));
        const matchesRole = roleFilter.length === 0 || u.user_roles?.some(ur => roleFilter.includes(String(ur.role_id)));
        const matchesStatus = !statusFilter || u.status === statusFilter;
        return matchesSearch && matchesTeam && matchesStatus && matchesRole;
    });

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

    return (
        <div>
            <DeleteConfirmModal />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#111827' }}>User Management</h2>
                {isUserAdmin ? <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={openCreateUser}>+ Create User</button> : null}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ flex: 2 }}>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Search</label>
                    <input type="text" placeholder="Search name, email, or username..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle(), marginBottom: 0 }} />
                </div>
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
                    <tr><th>First Name</th><th>Last Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Location</th><th>Assigned Teams</th><th>Roles</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                    {filteredUsers.length === 0 ? (
                        <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No users found.</td></tr>
                    ) : filteredUsers.map(u => (
                        <tr key={u.id}>
                            <td>{u.first_name}</td>
                            <td>{u.last_name}</td>
                            <td style={{color: '#6b7280'}}>{u.username || '—'}</td>
                            <td>{u.email}</td>
                            <td style={{color: '#6b7280'}}>{u.phone || '—'}</td>
                            <td style={{color: '#6b7280'}}>{u.location || '—'}</td>
                            <td>{u.team_memberships?.length > 0 ? u.team_memberships.map(t => t.name).join(', ') : '—'}</td>
                            <td>{u.user_roles?.map(ur => <span key={ur.role_id} style={{ display: 'inline-block', background: '#fef2f2', color: '#e31937', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600, marginRight: '4px' }}>{ur.roles?.name}</span>)}</td>
                            <td><span style={{ background: u.status === 'active' ? '#ecfdf5' : '#f3f4f6', color: u.status === 'active' ? '#065f46' : '#6b7280', borderRadius: '12px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{u.status}</span></td>
                            <td>
                                <button onClick={() => openViewUser(u)} style={{ marginRight: '0.5rem', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>View</button>
                                {isUserAdmin && <button onClick={() => openEditUser(u)} style={{ marginRight: '0.5rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Edit</button>}
                                {isUserAdmin && <button onClick={() => handleDeleteUser(u)} style={{ background: '#fef2f2', color: '#e31937', border: '1px solid #fecaca', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Delete</button>}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* View User Modal */}
            {showViewModal && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal-content" style={{minWidth: '550px'}} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{margin: 0}}>User Profile Details</h2>
                            <button onClick={() => setShowViewModal(false)} className="close-modal-btn">✕</button>
                        </div>
                        {viewingUser && (
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="info-box"><label>First Name</label><p>{viewingUser.first_name}</p></div>
                                <div className="info-box"><label>Last Name</label><p>{viewingUser.last_name}</p></div>
                                <div className="info-box"><label>Username</label><p>@{viewingUser.username || '—'}</p></div>
                                <div className="info-box"><label>Email</label><p>{viewingUser.email}</p></div>
                                <div className="info-box"><label>Phone</label><p>{viewingUser.phone || '—'}</p></div>
                                <div className="info-box"><label>Location</label><p>{viewingUser.location || '—'}</p></div>
                                <div className="info-box"><label>Status</label><span className={`status-pill ${viewingUser.status}`}>{viewingUser.status}</span></div>
                                <div className="info-box"><label>Assigned Teams</label><p>{viewingUser.team_memberships?.length > 0 ? viewingUser.team_memberships.map(t => t.name).join(', ') : 'Unassigned'}</p></div>
                                <div className="info-box" style={{ gridColumn: 'span 2' }}>
                                    <label>Assigned Roles</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                        {viewingUser.user_roles?.map(ur => <span key={ur.role_id} className="role-badge-selected" style={{ fontSize: '0.75rem' }}>{ur.roles?.name}</span>)}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            {isUserAdmin && ( <button onClick={() => { setShowViewModal(false); openEditUser(viewingUser); }} className="btn-primary" style={{ flex: 1 }}>Edit This User</button> )}
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
                            {/* CHANGED: Team selection is now a Multi-Select Checkbox list */}
                            <div style={fieldWrap}>
                                <label style={labelStyle}>Assigned Teams</label>
                                <div style={{ position: 'relative' }}>
                                    <button type="button" onClick={() => setShowModalTeamDropdown(!showModalTeamDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {userForm.team_ids.length === 0 ? 'Select teams' : `${userForm.team_ids.length} team(s) selected`}<span>{showModalTeamDropdown ? '▲' : '▼'}</span>
                                    </button>
                                    {showModalTeamDropdown && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 115, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                                            <input type="text" placeholder="Search teams..." value={modalTeamSearch} onChange={e => setModalTeamSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem', fontSize: '0.8rem' }} />
                                            <div style={{ paddingBottom: '8px', borderBottom: '1px solid #f3f4f6', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                                <button type="button" onClick={() => handleUserFieldChange('team_ids', [])} style={{ fontSize: '0.75rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>✕ Clear All</button>
                                            </div>
                                            {teams.filter(t => t.name.toLowerCase().includes(modalTeamSearch.toLowerCase())).map(t => (
                                                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '6px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                    <input type="checkbox" checked={userForm.team_ids.includes(String(t.id))} onChange={() => { const id = String(t.id); handleUserFieldChange('team_ids', userForm.team_ids.includes(id) ? userForm.team_ids.filter(tid => tid !== id) : [...userForm.team_ids, id]); }} />
                                                    {t.name}
                                                </label>
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
};

export default Users;