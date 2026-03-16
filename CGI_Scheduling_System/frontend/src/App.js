import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import './styles/Dashboard.css';

const DEFAULT_ROTATION_FORM = {
    name: '', rotation_type_id: '', team_id: '', location_id: '',
    start_date: new Date().toISOString().split('T')[0],
    interval_unit: 'week', interval_count: 1, status: 'active'
};
const DEFAULT_TEAM_FORM = { name: '', color: '#e31937', leadId: '', members: '', role: 'Member', description: '' };
const DEFAULT_USER_FORM = { first_name: '', last_name: '', username: '', email: '', phone: '', location: '', team_id: '', roles: [], password: '' };

function App() {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [roles, setRoles] = useState([]);
    const [locations, setLocations] = useState([]);
    const [rotations, setRotations] = useState([]);
    const [rotationTypes, setRotationTypes] = useState([]);
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

    // Team state
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [showEditTeamModal, setShowEditTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamFormData, setTeamFormData] = useState(DEFAULT_TEAM_FORM);

    // Rotation state
    const [rotationFormData, setRotationFormData] = useState(DEFAULT_ROTATION_FORM);
    const [rotationScope, setRotationScope] = useState('team');
    const [editingRotation, setEditingRotation] = useState(null);

    useEffect(() => { closeTeamModal(); }, [activePage]);

    useEffect(() => {
        if (isLoggedIn) {
            fetchUsers(); fetchTeams(); fetchRoles(); fetchLocations();
            if (activePage === 'Rotations') { fetchRotations(); fetchRotationMetadata(); }
        }
    }, [isLoggedIn, activePage]);

    const fetchUsers = async () => { try { const r = await fetch('/api/users'); const d = await r.json(); setUsers(Array.isArray(d) ? d : []); } catch { setUsers([]); } };
    const fetchTeams = async () => { try { const r = await fetch('/api/teams'); const d = await r.json(); setTeams(Array.isArray(d) ? d : []); } catch { setTeams([]); } };
    const fetchRoles = async () => { try { const r = await fetch('/api/roles'); const d = await r.json(); setRoles(Array.isArray(d) ? d : []); } catch { setRoles([]); } };
    const fetchLocations = async () => { try { const r = await fetch('/api/locations'); const d = await r.json(); setLocations(Array.isArray(d) ? d : []); } catch { setLocations([]); } };
    const fetchRotations = async () => { try { const r = await fetch('/api/rotations'); const d = await r.json(); setRotations(Array.isArray(d) ? d : []); } catch { setRotations([]); } };
    const fetchRotationMetadata = async () => { try { const [tR, lR] = await Promise.all([fetch('/api/rotation-types'), fetch('/api/locations')]); setRotationTypes(await tR.json()); setLocations(await lR.json()); } catch (e) { console.error(e); } };

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
        setUserForm({ first_name: user.first_name || '', last_name: user.last_name || '', username: user.username || '', email: user.email || '', phone: user.phone || '', location: user.location || '', team_id: user.team_id || '', roles: user.user_roles?.map(ur => ur.role_id) || [], password: '' });
        setUserFormErrors({}); setUserFormSuccess(''); setShowUserModal(true);
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

    const handleDeleteUser = async (id) => { if (!window.confirm('Delete this user?')) return; const r = await fetch(`/api/users/${id}`, { method: 'DELETE' }); if (r.ok) fetchUsers(); };

    const handleTeamFieldChange = (field, value) => setTeamFormData(prev => ({ ...prev, [field]: value }));
    const openCreateTeam = () => { setTeamFormData(DEFAULT_TEAM_FORM); setShowCreateTeamModal(true); };
    const openEditTeam = (team) => { setTeamFormData({ name: team.name, color: team.color || '#e31937', leadId: team.lead_id || '', members: team.members || '', role: team.team_role || 'Member', description: team.description || '' }); setEditingTeam(team); setShowEditTeamModal(true); };
    const handleSaveTeam = async (e) => { e.preventDefault(); const method = editingTeam ? 'PUT' : 'POST'; const url = editingTeam ? `/api/teams/${editingTeam.id}` : '/api/teams'; const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(teamFormData) }); if (r.ok) { fetchTeams(); closeTeamModal(); } };
    const handleDeleteTeam = async (id) => { if (!window.confirm('Delete this team?')) return; const r = await fetch(`/api/teams/${id}`, { method: 'DELETE' }); if (r.ok) fetchTeams(); };
    const closeTeamModal = () => { setShowCreateTeamModal(false); setShowEditTeamModal(false); setEditingTeam(null); };

    const handleSaveRotation = async (e) => {
        e.preventDefault();
        const payload = { ...rotationFormData, team_id: rotationScope === 'team' ? rotationFormData.team_id : null, location_id: rotationScope === 'location' ? rotationFormData.location_id : null };
        const method = editingRotation ? 'PUT' : 'POST'; const url = editingRotation ? `/api/rotations/${editingRotation.id}` : '/api/rotations';
        const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (r.ok) { fetchRotations(); setRotationFormData(DEFAULT_ROTATION_FORM); setEditingRotation(null); alert(editingRotation ? 'Rotation Updated.' : 'Rotation Saved.'); }
    };
    const handleDeleteRotation = async (id) => { if (!window.confirm('Delete this rotation?')) return; const r = await fetch(`/api/rotations/${id}`, { method: 'DELETE' }); if (r.ok) fetchRotations(); };
    const openEditRotation = (rotation) => { setEditingRotation(rotation); setRotationScope(rotation.team_id ? 'team' : 'location'); setRotationFormData({ name: rotation.name, rotation_type_id: rotation.rotation_type_id || '', team_id: rotation.team_id || '', location_id: rotation.location_id || '', start_date: rotation.start_date?.split('T')[0] || new Date().toISOString().split('T')[0], interval_unit: rotation.interval_unit || 'week', interval_count: rotation.interval_count || 1, status: rotation.status || 'active' }); };

    const inputStyle = (field) => ({ width: '100%', padding: '0.65rem 0.75rem', border: `1px solid ${userFormErrors[field] ? '#e31937' : '#d1d5db'}`, borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' });
    const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' };
    const errorStyle = { color: '#e31937', fontSize: '0.78rem', margin: '4px 0 0' };
    const fieldWrap = { marginBottom: '1rem' };

    const renderPageContent = () => {
        if (activePage === 'Users') {
            return (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: '#111827' }}>User Management</h2>
                        <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={openCreateUser}>+ Create User</button>
                    </div>

                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead>
                            <tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Location</th><th>Roles</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                            {users.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No users found.</td></tr>
                            ) : users.map(u => (
                                <tr key={u.id}>
                                    <td><strong>{u.name}</strong></td>
                                    <td style={{ color: '#6b7280' }}>{u.username || '—'}</td>
                                    <td>{u.email}</td>
                                    <td style={{ color: '#6b7280' }}>{u.phone || '—'}</td>
                                    <td style={{ color: '#6b7280' }}>{u.location || '—'}</td>
                                    <td>{u.user_roles?.map(ur => <span key={ur.role_id} style={{ display: 'inline-block', background: '#fef2f2', color: '#e31937', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600, marginRight: '4px' }}>{ur.roles?.name}</span>)}</td>
                                    <td><span style={{ background: u.status === 'active' ? '#ecfdf5' : '#f3f4f6', color: u.status === 'active' ? '#065f46' : '#6b7280', borderRadius: '12px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{u.status}</span></td>
                                    <td>
                                        <button onClick={() => openEditUser(u)} style={{ marginRight: '0.5rem' }}>Edit</button>
                                        <button onClick={() => handleDeleteUser(u.id)} style={{ color: 'red' }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {showUserModal && (
                        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                            <div className="enterprise-card" style={{ minWidth: '620px', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0 }}>{editingUser ? 'Edit User' : 'Create User'}</h2>
                                    <button onClick={() => setShowUserModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
                                </div>

                                {userFormErrors.general && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>{userFormErrors.general}</div>}
                                {userFormSuccess && <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>✓ {userFormSuccess}</div>}

                                <form onSubmit={handleSaveUser}>
                                    {/* First + Last Name */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={labelStyle}>First Name <span style={{ color: '#e31937' }}>*</span></label>
                                            <input style={inputStyle('first_name')} placeholder="First name" value={userForm.first_name} onChange={e => handleUserFieldChange('first_name', e.target.value)} />
                                            {userFormErrors.first_name && <p style={errorStyle}>{userFormErrors.first_name}</p>}
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Last Name <span style={{ color: '#e31937' }}>*</span></label>
                                            <input style={inputStyle('last_name')} placeholder="Last name" value={userForm.last_name} onChange={e => handleUserFieldChange('last_name', e.target.value)} />
                                            {userFormErrors.last_name && <p style={errorStyle}>{userFormErrors.last_name}</p>}
                                        </div>
                                    </div>

                                    {/* Email + Username */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={labelStyle}>Email <span style={{ color: '#e31937' }}>*</span></label>
                                            <input style={inputStyle('email')} type="email" placeholder="user@cgi.com" value={userForm.email} onChange={e => handleUserFieldChange('email', e.target.value)} />
                                            {userFormErrors.email && <p style={errorStyle}>{userFormErrors.email}</p>}
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Username <span style={{ color: '#e31937' }}>*</span></label>
                                            <input style={inputStyle('username')} placeholder="jsmith" value={userForm.username} onChange={e => handleUserFieldChange('username', e.target.value)} />
                                            {userFormErrors.username && <p style={errorStyle}>{userFormErrors.username}</p>}
                                        </div>
                                    </div>

                                    {/* Phone + Location */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={labelStyle}>Phone</label>
                                            <input style={inputStyle('phone')} placeholder="+1 (555) 000-0000" value={userForm.phone} onChange={e => handleUserFieldChange('phone', e.target.value)} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Location</label>
                                            <select style={inputStyle('location')} value={userForm.location} onChange={e => handleUserFieldChange('location', e.target.value)}>
                                                <option value="">Select location</option>
                                                {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Assigned Team */}
                                    <div style={fieldWrap}>
                                        <label style={labelStyle}>Assigned Team</label>
                                        <select style={inputStyle('team_id')} value={userForm.team_id} onChange={e => handleUserFieldChange('team_id', e.target.value)}>
                                            <option value="">Select a team</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Roles */}
                                    <div style={fieldWrap}>
                                        <label style={labelStyle}>Role(s) <span style={{ color: '#e31937' }}>*</span></label>
                                        {roles.length === 0 ? (
                                            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No roles available. Add roles first.</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {roles.map(role => {
                                                    const selected = userForm.roles.includes(role.id);
                                                    return (
                                                        <button key={role.id} type="button" onClick={() => handleRoleToggle(role.id)} style={{ padding: '0.4rem 0.9rem', borderRadius: '20px', border: `2px solid ${selected ? '#e31937' : '#e5e7eb'}`, background: selected ? '#fef2f2' : '#fff', color: selected ? '#e31937' : '#6b7280', fontWeight: selected ? 700 : 400, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.15s' }}>
                                                            {selected ? '✓ ' : ''}{role.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {userFormErrors.roles && <p style={errorStyle}>{userFormErrors.roles}</p>}
                                    </div>

                                    {/* Temp Password (create only) */}
                                    {!editingUser && (
                                        <div style={fieldWrap}>
                                            <label style={labelStyle}>Temporary Password <span style={{ color: '#e31937' }}>*</span></label>
                                            <input style={inputStyle('password')} type="password" placeholder="Min 8 chars, upper, lower, number, special" value={userForm.password} onChange={e => handleUserFieldChange('password', e.target.value)} />
                                            {userFormErrors.password
                                                ? <p style={errorStyle}>{userFormErrors.password}</p>
                                                : <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '4px 0 0' }}>User will be required to change this on first login.</p>}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingUser ? 'Update User' : 'Create User'}</button>
                                        <button type="button" onClick={() => setShowUserModal(false)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
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
            return (
                <div className="grid-container">
                    <div className="enterprise-card">
                        <h3>{editingRotation ? 'Edit Rotation' : 'New Rotation'}</h3>
                        <form onSubmit={handleSaveRotation}>
                            <input className="enterprise-input" placeholder="Rotation Name" value={rotationFormData.name} onChange={e => setRotationFormData({ ...rotationFormData, name: e.target.value })} required />
                            <select className="enterprise-input" value={rotationFormData.rotation_type_id} onChange={e => setRotationFormData({ ...rotationFormData, rotation_type_id: e.target.value })} required>
                                <option value="">Select Type</option>
                                {rotationTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <select className="enterprise-input" value={rotationScope} onChange={e => setRotationScope(e.target.value)}>
                                <option value="team">Team Scope</option>
                                <option value="location">Location Scope</option>
                            </select>
                            {rotationScope === 'team' ? (
                                <select className="enterprise-input" value={rotationFormData.team_id} onChange={e => setRotationFormData({ ...rotationFormData, team_id: e.target.value })} required>
                                    <option value="">Select Team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            ) : (
                                <select className="enterprise-input" value={rotationFormData.location_id} onChange={e => setRotationFormData({ ...rotationFormData, location_id: e.target.value })} required>
                                    <option value="">Select Location</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            )}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn-primary">{editingRotation ? 'Update Rotation' : 'Save Rotation'}</button>
                                {editingRotation && <button type="button" onClick={() => { setEditingRotation(null); setRotationFormData(DEFAULT_ROTATION_FORM); }} style={{ background: '#eee', color: '#333' }} className="btn-primary">Cancel</button>}
                            </div>
                        </form>
                    </div>
                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Scope</th><th>Actions</th></tr></thead>
                            <tbody>{rotations.map(r => (<tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.teams?.name || r.locations?.name || 'N/A'}</td><td><button onClick={() => openEditRotation(r)} style={{ marginRight: '0.5rem' }}>Edit</button><button onClick={() => handleDeleteRotation(r.id)} style={{ color: 'red' }}>Delete</button></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            );
        }

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

    return (
        <div className="dashboard-root">
            <Header user={currentUser} activePage={activePage} onNavigate={setActivePage} onLogout={() => setIsLoggedIn(false)} />
            <main className="main-content">
                <header className="page-header"><h1>{activePage} Management</h1></header>
                {renderPageContent()}
            </main>
        </div>
    );
}

export default App;