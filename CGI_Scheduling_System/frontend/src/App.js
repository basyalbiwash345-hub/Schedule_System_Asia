import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import './styles/Dashboard.css';

const DEFAULT_ROTATION_FORM = {
    name: '', rotation_type_id: '', team_id: '', location_id: '',
    start_date: new Date().toISOString().split('T')[0],
    interval_unit: 'week', interval_count: 1, status: 'active'
};

const DEFAULT_TEAM_FORM = {
    name: '', color: '#e31937', leadId: '', members: '', role: 'Member', description: ''
};

const DEFAULT_USER_FORM = { username: '', email: '', password: '' };

function App() {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [rotations, setRotations] = useState([]);
    const [rotationTypes, setRotationTypes] = useState([]);
    const [locations, setLocations] = useState([]);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [activePage, setActivePage] = useState("Users");
    const [selectedTeam, setSelectedTeam] = useState(null);

    // User state
    const [formData, setFormData] = useState(DEFAULT_USER_FORM);
    const [editingUser, setEditingUser] = useState(null);

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
            fetchUsers();
            fetchTeams();
            if (activePage === "Rotations") {
                fetchRotations();
                fetchRotationMetadata();
            }
        }
    }, [isLoggedIn, activePage]);

    // --- FETCHERS ---
    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) { setUsers([]); }
    };

    const fetchTeams = async () => {
        try {
            const res = await fetch('/api/teams');
            const data = await res.json();
            setTeams(Array.isArray(data) ? data : []);
        } catch (err) { setTeams([]); }
    };

    const fetchRotations = async () => {
        try {
            const res = await fetch('/api/rotations');
            const data = await res.json();
            setRotations(Array.isArray(data) ? data : []);
        } catch (err) { setRotations([]); }
    };

    const fetchRotationMetadata = async () => {
        try {
            const [tRes, lRes] = await Promise.all([
                fetch('/api/rotation-types'),
                fetch('/api/locations')
            ]);
            setRotationTypes(await tRes.json());
            setLocations(await lRes.json());
        } catch (err) { console.error(err); }
    };

    // --- AUTH ---
    const handleAdminLogin = ({ identifier, password }) => {
        if (identifier === "admin@cgi.com" && password === "AdminAdmin902") {
            setCurrentUser({ name: "CGI Administrator", role: "Admin", email: identifier });
            setIsLoggedIn(true);
            return { ok: true };
        }
        return { ok: false, error: "Access Denied." };
    };

    // --- USER HANDLERS ---
    const handleCreateUser = async (e) => {
        e.preventDefault();
        const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });
        if (res.ok) { fetchUsers(); setFormData(DEFAULT_USER_FORM); }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        const res = await fetch(`/api/users/${editingUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });
        if (res.ok) { fetchUsers(); setEditingUser(null); setFormData(DEFAULT_USER_FORM); }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) return;
        const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
        if (res.ok) fetchUsers();
    };

    const openEditUser = (user) => {
        setEditingUser(user);
        setFormData({ username: user.name, email: user.email, password: '' });
    };

    // --- TEAM HANDLERS ---
    const handleTeamFieldChange = (field, value) => setTeamFormData(prev => ({ ...prev, [field]: value }));
    const openCreateTeam = () => { setTeamFormData(DEFAULT_TEAM_FORM); setShowCreateTeamModal(true); };
    const openEditTeam = (team) => {
        setTeamFormData({
            name: team.name,
            color: team.color || '#e31937',
            leadId: team.lead_id || '',
            members: team.members || '',
            role: team.team_role || 'Member',
            description: team.description || ''
        });
        setEditingTeam(team);
        setShowEditTeamModal(true);
    };

    const handleSaveTeam = async (e) => {
        e.preventDefault();
        const method = editingTeam ? "PUT" : "POST";
        const url = editingTeam ? `/api/teams/${editingTeam.id}` : "/api/teams";
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(teamFormData),
        });
        if (res.ok) { fetchTeams(); closeTeamModal(); }
    };

    const handleDeleteTeam = async (id) => {
        if (!window.confirm('Delete this team?')) return;
        const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
        if (res.ok) fetchTeams();
    };

    const closeTeamModal = () => { setShowCreateTeamModal(false); setShowEditTeamModal(false); setEditingTeam(null); };

    // --- ROTATION HANDLERS ---
    const handleSaveRotation = async (e) => {
        e.preventDefault();
        const payload = {
            ...rotationFormData,
            team_id: rotationScope === 'team' ? rotationFormData.team_id : null,
            location_id: rotationScope === 'location' ? rotationFormData.location_id : null
        };
        const method = editingRotation ? "PUT" : "POST";
        const url = editingRotation ? `/api/rotations/${editingRotation.id}` : "/api/rotations";
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            fetchRotations();
            setRotationFormData(DEFAULT_ROTATION_FORM);
            setEditingRotation(null);
            alert(editingRotation ? "Rotation Updated." : "Rotation Saved.");
        }
    };

    const handleDeleteRotation = async (id) => {
        if (!window.confirm('Delete this rotation?')) return;
        const res = await fetch(`/api/rotations/${id}`, { method: "DELETE" });
        if (res.ok) fetchRotations();
    };

    const openEditRotation = (rotation) => {
        setEditingRotation(rotation);
        setRotationScope(rotation.team_id ? 'team' : 'location');
        setRotationFormData({
            name: rotation.name,
            rotation_type_id: rotation.rotation_type_id || '',
            team_id: rotation.team_id || '',
            location_id: rotation.location_id || '',
            start_date: rotation.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
            interval_unit: rotation.interval_unit || 'week',
            interval_count: rotation.interval_count || 1,
            status: rotation.status || 'active'
        });
    };

    // --- PAGE RENDERER ---
    const renderPageContent = () => {
        if (activePage === "Users") {
            return (
                <div className="grid-container">
                    <div className="enterprise-card">
                        <h3>{editingUser ? 'Edit User' : 'Provision New Identity'}</h3>
                        <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                            <input className="enterprise-input" placeholder="Name" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
                            <input className="enterprise-input" type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                            {!editingUser && (
                                <input className="enterprise-input" type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                            )}
                            <div style={{display: 'flex', gap: '1rem'}}>
                                <button type="submit" className="btn-primary">{editingUser ? 'Update User' : 'Sync to Database'}</button>
                                {editingUser && (
                                    <button type="button" onClick={() => { setEditingUser(null); setFormData(DEFAULT_USER_FORM); }} style={{background: '#eee', color: '#333'}} className="btn-primary">Cancel</button>
                                )}
                            </div>
                        </form>
                    </div>
                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead><tr><th>Identity</th><th>Email</th><th>Actions</th></tr></thead>
                            <tbody>{users.map(u => (
                                <tr key={u.id}>
                                    <td><strong>{u.name}</strong></td>
                                    <td>{u.email}</td>
                                    <td>
                                        <button onClick={() => openEditUser(u)} style={{marginRight: '0.5rem'}}>Edit</button>
                                        <button onClick={() => handleDeleteUser(u.id)} style={{color: 'red'}}>Delete</button>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (activePage === "Teams") {
            return (
                <div className="enterprise-card no-padding">
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Active Teams ({teams.length})</h3>
                        <button className="btn-primary" style={{width: 'auto'}} onClick={openCreateTeam}>+ Create Team</button>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                        {teams.length === 0 ? <p>No teams found.</p> : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {teams.map(team => (
                                    <div key={team.id} className="enterprise-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: team.color }} />
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{margin:0}}>{team.name}</h4>
                                            <p style={{margin:0, fontSize: '0.85rem', color: '#666'}}>{team.description || 'No description'}</p>
                                            <div style={{fontSize: '0.8rem', marginTop: '4px'}}>
                                                <strong>Lead:</strong> {team.lead?.name || 'None'} | <strong>Role:</strong> {team.team_role || 'Member'}
                                            </div>
                                        </div>
                                        <div style={{display: 'flex', gap: '0.5rem'}}>
                                            <button onClick={() => { setSelectedTeam(team); setActivePage("TeamDetails"); }}>View</button>
                                            <button onClick={() => openEditTeam(team)}>Edit</button>
                                            <button onClick={() => handleDeleteTeam(team.id)} style={{color: 'red'}}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {(showCreateTeamModal || showEditTeamModal) && (
                        <div className="modal-overlay" onClick={closeTeamModal}>
                            <div className="enterprise-card" style={{minWidth: '550px', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
                                <h2 style={{textAlign: 'center'}}>{editingTeam ? 'Edit Team' : 'New Team'}</h2>
                                <form onSubmit={handleSaveTeam}>
                                    <label>Team Name</label>
                                    <input className="enterprise-input" value={teamFormData.name} onChange={e => handleTeamFieldChange('name', e.target.value)} required />
                                    <label>Team Color</label>
                                    <input type="color" style={{display:'block', marginBottom:'1rem', width: '60px', height: '40px'}} value={teamFormData.color} onChange={e => handleTeamFieldChange('color', e.target.value)} />
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
                                    <div style={{display:'flex', gap: '1rem'}}>
                                        <button type="submit" className="btn-primary">Save Team</button>
                                        <button type="button" onClick={closeTeamModal} style={{background: '#eee', color: '#333'}} className="btn-primary">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (activePage === "Rotations") {
            return (
                <div className="grid-container">
                    <div className="enterprise-card">
                        <h3>{editingRotation ? 'Edit Rotation' : 'New Rotation'}</h3>
                        <form onSubmit={handleSaveRotation}>
                            <input className="enterprise-input" placeholder="Rotation Name" value={rotationFormData.name} onChange={e => setRotationFormData({...rotationFormData, name: e.target.value})} required />
                            <select className="enterprise-input" value={rotationFormData.rotation_type_id} onChange={e => setRotationFormData({...rotationFormData, rotation_type_id: e.target.value})} required>
                                <option value="">Select Type</option>
                                {rotationTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <select className="enterprise-input" value={rotationScope} onChange={e => setRotationScope(e.target.value)}>
                                <option value="team">Team Scope</option>
                                <option value="location">Location Scope</option>
                            </select>
                            {rotationScope === 'team' ? (
                                <select className="enterprise-input" value={rotationFormData.team_id} onChange={e => setRotationFormData({...rotationFormData, team_id: e.target.value})} required>
                                    <option value="">Select Team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            ) : (
                                <select className="enterprise-input" value={rotationFormData.location_id} onChange={e => setRotationFormData({...rotationFormData, location_id: e.target.value})} required>
                                    <option value="">Select Location</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            )}
                            <div style={{display: 'flex', gap: '1rem'}}>
                                <button type="submit" className="btn-primary">{editingRotation ? 'Update Rotation' : 'Save Rotation'}</button>
                                {editingRotation && (
                                    <button type="button" onClick={() => { setEditingRotation(null); setRotationFormData(DEFAULT_ROTATION_FORM); }} style={{background: '#eee', color: '#333'}} className="btn-primary">Cancel</button>
                                )}
                            </div>
                        </form>
                    </div>
                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Scope</th><th>Actions</th></tr></thead>
                            <tbody>{rotations.map(r => (
                                <tr key={r.id}>
                                    <td><strong>{r.name}</strong></td>
                                    <td>{r.teams?.name || r.locations?.name || "N/A"}</td>
                                    <td>
                                        <button onClick={() => openEditRotation(r)} style={{marginRight: '0.5rem'}}>Edit</button>
                                        <button onClick={() => handleDeleteRotation(r.id)} style={{color: 'red'}}>Delete</button>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (activePage === "TeamDetails" && selectedTeam) {
            return (
                <div className="enterprise-card" style={{padding: '3rem'}}>
                    <button onClick={() => setActivePage("Teams")}>← Back to Teams</button>
                    <div style={{textAlign: 'center'}}>
                        <div style={{width: '80px', height: '80px', backgroundColor: selectedTeam.color, margin: '20px auto', borderRadius: '15px'}} />
                        <h1>{selectedTeam.name}</h1>
                        <p>{selectedTeam.description}</p>
                        <hr />
                        <div style={{textAlign: 'left', background: '#f9f9f9', padding: '20px', borderRadius: '10px'}}>
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
                <header className="page-header">
                    <h1>{activePage} Management</h1>
                </header>
                {renderPageContent()}
            </main>
        </div>
    );
}

export default App;