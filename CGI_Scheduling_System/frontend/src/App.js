import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import './styles/Dashboard.css';

function App() {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]); 
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [activePage, setActivePage] = useState("Users");
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [showEditTeamModal, setShowEditTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamFormData, setTeamFormData] = useState({
        name: '',
        color: '#e31937',
        leadId: '',
        members: '',
        role: 'Member',
        description: ''
    });

    // 1. Fetch Users from Database
    useEffect(() => {
        if (isLoggedIn) {
            fetchUsers();
        }
    }, [isLoggedIn]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error("Fetch Error:", err);
            // Fallback static users for demo
            setUsers([
                { id: 1, name: 'Faran', username: 'faran', email: 'faran@company.com' },
                { id: 2, name: 'Bikas', username: 'bikas', email: 'bikas@company.com' }
            ]);
        }
    };

    // 2. Admin Login Logic
    const handleAdminLogin = ({ identifier, password }) => {
        if (identifier === "admin@cgi.com" && password === "AdminAdmin902") {
            const adminData = {
                name: "CGI Administrator",
                role: "Admin",
                email: identifier
            };
            setCurrentUser(adminData);
            setIsLoggedIn(true);
            return { ok: true };
        }
        return { ok: false, error: "Access Denied: Use Admin Credentials." };
    };

    // 3. Create User 
    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const savedUser = await response.json();
                setUsers((prev) => [...prev, savedUser]);
                setFormData({ username: '', email: '', password: '' });
                alert("✅ Success: Employee synchronized with PostgreSQL.");
            }
        } catch (err) {
            console.error("Database Error:", err);
        }
    };

    // Team Modal Handlers
    const handleTeamFieldChange = (field, value) => {
        setTeamFormData(prev => ({ ...prev, [field]: value }));
    };

    const openCreateTeam = () => {
        setTeamFormData({
            name: '',
            color: '#e31937',
            leadId: '',
            members: '',
            role: 'Member',
            description: ''
        });
        setShowCreateTeamModal(true);
        setShowEditTeamModal(false);
    };



    const openEditTeam = (team) => {
        setTeamFormData({
            name: team.name,
            color: team.color,
            leadId: team.leadId,
            members: team.members,
            role: team.role,
            description: team.description
        });
        setEditingTeam(team);
        setShowEditTeamModal(true);
        setShowCreateTeamModal(false);
    };

    const openTeamDetails = (team) => {
        setSelectedTeam(team);
        setActivePage("TeamDetails");
    };

    const handleSaveTeam = async (e) => {
        e.preventDefault();
        const teamData = {
            id: editingTeam ? editingTeam.id : Date.now(),
            ...teamFormData,
            leadName: users.find(u => u.id == teamFormData.leadId)?.name || 'Unknown',
            membersList: teamFormData.members.split(',').map(m => m.trim()).filter(Boolean)
        };
        if (editingTeam) {
            setTeams(prev => prev.map(t => t.id === editingTeam.id ? teamData : t));
        } else {
            setTeams(prev => [teamData, ...prev]);
        }
        setShowCreateTeamModal(false);
        setShowEditTeamModal(false);
        setEditingTeam(null);
        setTeamFormData({
            name: '',
            color: '#e31937',
            leadId: '',
            members: '',
            role: 'Member',
            description: ''
        });
    };

    const handleDeleteTeam = (teamId) => {
        if (window.confirm('Delete this team?')) {
            setTeams(prev => prev.filter(t => t.id !== teamId));
        }
    };

    const closeTeamModal = () => {
        setShowCreateTeamModal(false);
        setShowEditTeamModal(false);
        setEditingTeam(null);
        setTeamFormData({
            name: '',
            color: '#e31937',
            leadId: '',
            members: '',
            role: 'Member',
            description: ''
        });
    };

    const renderPageContent = () => {
        if (activePage === "Users") {
            return (
                <div className="grid-container">
                    <div className="enterprise-card">
                        <h3>Provision New Identity</h3>
                        <form onSubmit={handleCreateUser}>
                            <input
                                className="enterprise-input"
                                placeholder="Full Legal Name"
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                required
                            />
                            <input
                                className="enterprise-input"
                                type="email"
                                placeholder="Corporate Email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                required
                            />
                            <input
                                className="enterprise-input"
                                type="password"
                                placeholder="Initial Password"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                required
                            />
                            <button type="submit" className="btn-primary">Sync to Database</button>
                        </form>
                    </div>

                    <div className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>Identity</th>
                                <th>System Email</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td><span style={{fontWeight: 600}}>{u.name}</span></td>
                                    <td>{u.email}</td>
                                    <td><span className="status-badge">Active</span></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
        if (activePage === "Teams") {
            return (
                <div className="enterprise-card" style={{ padding: 0 }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                        <h3>Teams ({teams.length})</h3>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                        {teams.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#6b7280', margin: '2rem 0' }}>
                                No teams created yet. Click "Create Team" to get started.
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {teams.map((team) => (
                                    <div key={team.id} className="enterprise-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                        <div 
                                            style={{ 
                                                width: '40px', 
                                                height: '40px', 
                                                borderRadius: '8px', 
                                                backgroundColor: team.color, 
                                                flexShrink: 0 
                                            }} 
                                        />
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{team.name}</h4>
                                            <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280' }}>{team.description || 'No description'}</p>
                                            <div style={{ fontSize: '0.85rem', color: '#374151' }}>
                                                <strong>Lead:</strong> {team.leadName} | <strong>Members:</strong> {team.membersList.join(', ')} | <strong>Role:</strong> {team.role}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                                            <button
                                                type="button"
                                                style={{
                                                    padding: '0.25rem 0.75rem',
                                                    fontSize: '0.8rem',
                                                    backgroundColor: 'transparent',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                        onClick={() => openEditTeam(team)}
                                            >
                                                ✏️ Edit
                                            </button>

                                            <button
                                                type="button"
                                                style={{
                                                    padding: '0.25rem 0.75rem',
                                                    fontSize: '0.8rem',
                                                    backgroundColor: '#fee2e2',
                                                    border: '1px solid #f87171',
                                                    borderRadius: '4px',
                                                    color: '#dc2626',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => handleDeleteTeam(team.id)}
                                            >
                                                🗑 Delete
                                            </button>
                                            <button
                                                type="button"
                                                style={{
                                                    padding: '0.25rem 0.75rem',
                                                    fontSize: '0.8rem',
                                                    backgroundColor: '#dbeafe',
                                                    border: '1px solid #3b82f6',
                                                    borderRadius: '4px',
                                                    color: '#1d4ed8',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => openTeamDetails(team)}
                                            >
                                                👁 View
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        if (activePage === "TeamDetails") {
            const team = selectedTeam;
            if (!team) {
                return (
                    <div className="enterprise-card" style={{ textAlign: 'center', padding: '100px' }}>
                        <p>Loading team details...</p>
                    </div>
                );
            }

            const leadUser = users.find(u => u.id == team.leadId);

            return (
                <div className="enterprise-card" style={{ padding: '3rem' }}>
                    <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>{team.name}</h1>
                        <p style={{ color: '#6b7280', fontSize: '1.2rem', margin: 0 }}>{team.role} Team</p>
                    </header>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '16px', backgroundColor: team.color, margin: '0 auto' }} />
                            <h3 style={{ marginTop: '1rem', fontSize: '1.2rem' }}>Team Color</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Team Lead</h3>
                            <p style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>{leadUser ? leadUser.name : 'Unknown'}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Members</h3>
                            <p style={{ margin: 0 }}>{team.membersList ? team.membersList.join(', ') : 'No members'}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Description</h3>
                            <p style={{ margin: 0 }}>{team.description || 'No description available.'}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                        <button
                            className="btn-primary"
                            style={{ width: 'auto', padding: '0.75rem 2rem', fontSize: '1rem' }}
                            onClick={() => {
                                setSelectedTeam(null);
                                setActivePage('Teams');
                            }}
                        >
                            ← Back to Teams
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="enterprise-card" style={{ textAlign: 'center', padding: '100px' }}>
                <h2>{activePage} Module</h2>
                <p>This module is currently under development for Iteration 2.</p>
            </div>
        );
    };

    if (!isLoggedIn) return <Login onLogin={handleAdminLogin} />;

    return (
        <div className="dashboard-root">
            <Header
                user={currentUser}
                activePage={activePage}
                onNavigate={setActivePage}
                onLogout={() => {
                    setIsLoggedIn(false);
                    setCurrentUser(null);
                }}
            />
            <main className="main-content">
                {activePage === "Teams" ? (
                  <header className="page-header">
                    <div>
                      <h1>Teams Management</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{
                          width: "auto",
                          padding: "0.5rem 1.5rem"
                        }}
                        onClick={openCreateTeam}
                      >
                        Create Team
                      </button>
                    </div>
                  </header>
                ) : (
                  <header className="page-header">
                    <h1>{activePage} Management</h1>
                    <p>Enterprise system control for PostgreSQL (Instance: asia1)</p>
                  </header>
                )}
                {renderPageContent()}
                {(showCreateTeamModal || showEditTeamModal) && (
                  <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={closeTeamModal}>
                    <div 
                      className="enterprise-card" 
                      style={{ 
                        minWidth: '500px', 
                        maxWidth: '600px', 
                        maxHeight: '90vh', 
                        overflowY: 'auto',
                        position: 'relative',
                        margin: '0 auto'
                      }} 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          background: 'none',
                          border: 'none',
                          fontSize: '1.5rem',
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                        onClick={closeTeamModal}
                      >
                        ×
                      </button>
                      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ margin: 0, color: '#111827', fontSize: '1.8rem' }}>
                          {editingTeam ? 'Edit team' : 'Add a new team'}
                        </h2>
                        <p style={{ color: '#6b7280', margin: '0.5rem 0 0 0' }}>
                          {editingTeam ? 'Update team details.' : 'Create a team and assign a lead from the user list.'}
                        </p>
                      </div>
                      <form onSubmit={handleSaveTeam}>
                        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
                          <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                            Team name
                            <input
                              className="enterprise-input"
                              placeholder="e.g. Product Ops"
                              value={teamFormData.name}
                              onChange={(e) => handleTeamFieldChange('name', e.target.value)}
                              required
                            />
                          </label>
                          <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                            Team color
                            <input
                              type="color"
                              value={teamFormData.color}
                              onChange={(e) => handleTeamFieldChange('color', e.target.value)}
                              style={{ height: '40px', width: '60px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
                            />
                          </label>
                          <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                            Team lead
                            <select
                              className="enterprise-input"
                              value={teamFormData.leadId}
                              onChange={(e) => handleTeamFieldChange('leadId', e.target.value)}
                              required
                            >
                              <option value="">Select a lead</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name || user.username}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                            Assign team members (comma-separated usernames)
                            <input
                              className="enterprise-input"
                              placeholder="john, jane, bob"
                              value={teamFormData.members}
                              onChange={(e) => handleTeamFieldChange('members', e.target.value)}
                            />
                          </label>
                          <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                            Role
                            <select
                              className="enterprise-input"
                              value={teamFormData.role}
                              onChange={(e) => handleTeamFieldChange('role', e.target.value)}
                            >
                              <option value="Lead">Lead</option>
                              <option value="Member">Member</option>
                            </select>
                          </label>
                          <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                            Description
                            <textarea
                              className="enterprise-input"
                              rows="4"
                              placeholder="Team description..."
                              value={teamFormData.description}
                              onChange={(e) => handleTeamFieldChange('description', e.target.value)}
                              style={{ resize: 'vertical' }}
                            />
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            style={{
                              padding: '0.75rem 1.5rem',
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                            onClick={closeTeamModal}
                          >
                            Cancel
                          </button>
                          <button type="submit" className="btn-primary">
                            {editingTeam ? 'Update Team' : 'Create Team'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
            </main>
        </div>
    );
}

export default App;
