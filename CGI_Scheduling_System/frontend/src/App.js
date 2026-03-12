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
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });

    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [showEditTeamModal, setShowEditTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamFormData, setTeamFormData] = useState(DEFAULT_TEAM_FORM);

    const [rotationFormData, setRotationFormData] = useState(DEFAULT_ROTATION_FORM);
    const [rotationScope, setRotationScope] = useState('team');

    // --- EFFECT: Close modals when switching pages ---
    useEffect(() => {
        closeTeamModal();
    }, [activePage]);

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
            const [tRes, lRes] = await Promise.all([fetch('/api/rotation-types'), fetch('/api/locations')]);
            setRotationTypes(await tRes.json());
            setLocations(await lRes.json());
        } catch (err) { console.error(err); }
    };

    const handleAdminLogin = ({ identifier, password }) => {
        if (identifier === "admin@cgi.com" && password === "AdminAdmin902") {
            setCurrentUser({ name: "CGI Administrator", role: "Admin", email: identifier });
            setIsLoggedIn(true);
            return { ok: true };
        }
        return { ok: false, error: "Access Denied." };
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });
        if (res.ok) { fetchUsers(); setFormData({ username: '', email: '', password: '' }); alert("User Synced."); }
    };

    const handleTeamFieldChange = (field, value) => setTeamFormData(prev => ({ ...prev, [field]: value }));
    const openCreateTeam = () => { setTeamFormData(DEFAULT_TEAM_FORM); setShowCreateTeamModal(true); };
    const closeTeamModal = () => { setShowCreateTeamModal(false); setShowEditTeamModal(false); setEditingTeam(null); };

    const handleSaveTeam = async (e) => {
        e.preventDefault();
        const method = editingTeam ? "PUT" : "POST";
        const url = editingTeam ? `/api/teams/${editingTeam.id}` : "/api/teams";
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(teamFormData),
        });
        if (res.ok) { fetchTeams(); closeTeamModal(); }
    };

    const handleSaveRotation = async (e) => {
        e.preventDefault();
        const payload = {
            ...rotationFormData,
            team_id: rotationScope === 'team' ? rotationFormData.team_id : null,
            location_id: rotationScope === 'location' ? rotationFormData.location_id : null
        };
        const res = await fetch('/api/rotations', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) { fetchRotations(); setRotationFormData(DEFAULT_ROTATION_FORM); alert("Rotation Saved."); }
    };

    const renderPageContent = () => {
        if (activePage === "Users") {
            return (
                <div className="grid-container">
                    <div className="enterprise-card">
                        <h3>Provision New Identity</h3>
                        <form onSubmit={handleCreateUser}>
                            <input className="enterprise-input" placeholder="Name" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
                            <input className="enterprise-input" type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                            <input className="enterprise-input" type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                            <button type="submit" className="btn-primary">Sync to Database</button>
                        </form>
                    </div>
                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead><tr><th>Identity</th><th>Email</th><th>Status</th></tr></thead>
                            <tbody>{users.map(u => <tr key={u.id}><td><strong>{u.name}</strong></td><td>{u.email}</td><td>Active</td></tr>)}</tbody>
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
                                    <div key={team.id} className="enterprise-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: team.color }} />
                                        <div style={{ flex: 1 }}><h4>{team.name}</h4><p style={{margin:0, fontSize: '0.8rem'}}>{team.description}</p></div>
                                        <button onClick={() => { setSelectedTeam(team); setActivePage("TeamDetails"); }}>View</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MODAL MOVED INSIDE TEAMS BLOCK */}
                    {(showCreateTeamModal || showEditTeamModal) && (
                        <div className="modal-overlay" onClick={closeTeamModal}>
                            <div className="enterprise-card" style={{minWidth: '500px'}} onClick={e => e.stopPropagation()}>
                                <h3>{editingTeam ? 'Edit Team' : 'New Team'}</h3>
                                <form onSubmit={handleSaveTeam}>
                                    <input className="enterprise-input" placeholder="Team Name" value={teamFormData.name} onChange={e => handleTeamFieldChange('name', e.target.value)} required />
                                    <input type="color" value={teamFormData.color} onChange={e => handleTeamFieldChange('color', e.target.value)} style={{marginBottom: '1rem'}} />
                                    <select className="enterprise-input" value={teamFormData.leadId} onChange={e => handleTeamFieldChange('leadId', e.target.value)}>
                                        <option value="">Lead</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                    <button type="submit" className="btn-primary">Save Team</button>
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
                        <h3>New Rotation</h3>
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
                            <button type="submit" className="btn-primary">Save Rotation</button>
                        </form>
                    </div>
                    <div className="enterprise-card no-padding">
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Scope</th></tr></thead>
                            <tbody>{rotations.map(r => <tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.teams?.name || r.locations?.name || "N/A"}</td></tr>)}</tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (activePage === "TeamDetails" && selectedTeam) {
            return (
                <div className="enterprise-card" style={{padding: '2rem'}}>
                    <button onClick={() => setActivePage("Teams")}>← Back</button>
                    <h2>{selectedTeam.name}</h2>
                    <p>{selectedTeam.description}</p>
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