import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import './styles/Dashboard.css';
import MatrixView from './components/MatrixView';
import './App.css'
import { Box, Card, CardContent, TextField, Button, Typography, Alert, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import ForcePasswordChange from './components/ForcePasswordChange';
import Overview from './pages/Overview';
import Users from './pages/Users';
import Teams from './pages/Teams';
import Rotations from './pages/Rotations';


const ROLE_PRIORITY = ['Administrator', 'Team Lead / Supervisor', 'Employee'];
const PAGE_ACCESS_BY_ROLE = {
    'Administrator': ['Overview', 'Matrix', 'Teams', 'Users', 'Rotations', 'Roles'],
    'Team Lead / Supervisor': ['Overview', 'Matrix', 'Teams', 'Rotations'],
    'Employee': ['Overview', 'Matrix', 'Teams', 'Users', 'Rotations'],
};
const PAGE_ACCESS_ALIASES = {
    TeamDetails: 'Teams',
};

const getPrimaryRole = (roles = []) =>
    ROLE_PRIORITY.find(role => roles.includes(role)) || roles[0] || 'Employee';

const getAllowedPages = (roles = []) => {
    const allowedPages = new Set();

    roles.forEach(role => {
        (PAGE_ACCESS_BY_ROLE[role] || []).forEach(page => allowedPages.add(page));
    });

    if (allowedPages.size === 0) {
        allowedPages.add('Matrix');
    }

    return Array.from(allowedPages);
};

const normalizePageForAccess = (page) => PAGE_ACCESS_ALIASES[page] || page;

const canAccessPage = (user, page) =>
    getAllowedPages(user?.roles || []).includes(normalizePageForAccess(page));

const getDefaultPageForUser = (user) => {
    const allowedPages = getAllowedPages(user?.roles || []);
    return allowedPages.includes('Matrix') ? 'Matrix' : allowedPages[0] || 'Matrix';
};


function App() {
    const [users,      setUsers]      = useState([]);
    const [teams,      setTeams]      = useState([]);
    const [roles,      setRoles]      = useState([]);
    const [locations,  setLocations]  = useState([]);
    const [rotations,  setRotations]  = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser,setCurrentUser]= useState(null);
    const [activePage, setActivePage] = useState('Matrix');
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [matrixRefreshKey, setMatrixRefreshKey] = useState(0);
    const triggerMatrixRefresh = () => setMatrixRefreshKey(k => k + 1);



    // ── NOTIFICATIONS & CONFIRMS ──────────────────────────────────────────────
    const [notification,   setNotification]   = useState({ show: false, message: '', type: 'success' });
    const allowedPages = getAllowedPages(currentUser?.roles || []);
    const isTeamAdmin = currentUser?.roles?.some(role => ['Administrator', 'Team Lead / Supervisor'].includes(role)) || false;
    const isUserAdmin = currentUser?.roles?.some(role => ['Administrator'].includes(role)) || false;
    const isRotationAdmin = currentUser?.roles?.some(role => ['Administrator'].includes(role)) || false;
    const shouldLoadUsers = allowedPages.some(page => ['Users', 'Teams', 'Rotations', 'Roles'].includes(page));
    const shouldLoadTeams = allowedPages.some(page => ['Teams', 'Rotations'].includes(page));
    const shouldLoadRoles = allowedPages.some(page => ['Users', 'Roles'].includes(page));
    const shouldLoadLocations = allowedPages.includes('Users');
    const shouldLoadRotations = allowedPages.includes('Rotations');


    useEffect(() => {
        if (!isLoggedIn || !currentUser) return;

        if (shouldLoadUsers) fetchUsers();
        else setUsers([]);

        if (shouldLoadTeams) fetchTeams();
        else setTeams([]);

        if (shouldLoadRoles) fetchRoles();
        else setRoles([]);

        if (shouldLoadLocations) fetchLocations();
        else setLocations([]);

        if (shouldLoadRotations) fetchRotations();
        else setRotations([]);
    }, [isLoggedIn, currentUser, shouldLoadUsers, shouldLoadTeams, shouldLoadRoles, shouldLoadLocations, shouldLoadRotations]);

    useEffect(() => {
        if (!isLoggedIn || !currentUser) return;
        if (canAccessPage(currentUser, activePage)) return;

        setSelectedTeam(null);
        setActivePage(getDefaultPageForUser(currentUser));
    }, [isLoggedIn, currentUser, activePage]);

    // Re-fetch rotations every time the user navigates to the Rotations page so
    // any changes made in the Matrix view (which creates rotations server-side)
    // are reflected immediately without requiring a full page refresh.
    useEffect(() => {
        if (activePage === 'Rotations' && isLoggedIn && shouldLoadRotations) {
            fetchRotations();
        }
    }, [activePage]);

    const fetchUsers = async () => {
        try {
            // ADD THIS LINE: Get the token
            const token = localStorage.getItem('token');

            const r = await fetch('/api/users', {
                // ADD THIS HEADERS OBJECT
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const d = await r.json();
            setUsers(Array.isArray(d) ? d : []);
        } catch {
            setUsers([]);
        }
    };
    const fetchTeams     = async () => {
        const token = localStorage.getItem('token');
        try { const r = await fetch('/api/teams', { headers: { 'Authorization': `Bearer ${token}` } }); const d = await r.json(); setTeams(Array.isArray(d) ? d : []); } catch { setTeams([]); }
    };
    const fetchRoles = async () => {
        const token = localStorage.getItem('token');
        try {
            const r = await fetch('/api/roles', { headers: { 'Authorization': `Bearer ${token}` } });
            const d = await r.json();
            setRoles(Array.isArray(d) ? d : []);
        } catch {
            setRoles([]);
        }
    };
    const fetchLocations = async () => {
        const token = localStorage.getItem('token');
        try {
            const r = await fetch('/api/locations', { headers: { 'Authorization': `Bearer ${token}` } });
            const d = await r.json();
            setLocations(Array.isArray(d) ? d : []);
        } catch {
            setLocations([]);
        }
    };
    const fetchRotations = async () => {
        const token = localStorage.getItem('token');
        try { const r = await fetch('/api/rotations', { headers: { 'Authorization': `Bearer ${token}` } }); const d = await r.json(); setRotations(Array.isArray(d) ? d : []); } catch { setRotations([]); }
    };


    const handleLogin = async ({ identifier, password }) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            });
            const data = await response.json();

            if (!response.ok) {
                return { ok: false, error: data.error || 'Access denied.' };
            }

            // --- THIS IS THE MISSING STEP 3 ---
            // You must save the token here so localStorage.getItem('token') works later
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            localStorage.setItem('user', JSON.stringify(data.user));
            // ---------------------------------

            const authenticatedUser = {
                ...data.user,
                role: data.user.primary_role || getPrimaryRole(data.user.roles || []),
            };

            setCurrentUser(authenticatedUser);
            setIsLoggedIn(true);
            setActivePage(getDefaultPageForUser(authenticatedUser));
            return { ok: true };
        } catch {
            return { ok: false, error: 'Unable to reach the server.' };
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setActivePage('Matrix');
        setSelectedTeam(null);
        setUsers([]);
        setTeams([]);
        setRoles([]);
        setLocations([]);
        setRotations([]);
    };

    const handlePasswordChanged = (updatedUser) => {
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        showNotification('Password updated successfully!');
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
    };



    // ── STYLE HELPERS ─────────────────────────────────────────────────────────
    const inputStyle = () => ({ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' });
    const labelStyle  = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' };
    const errorStyle  = { color: '#e31937', fontSize: '0.78rem', margin: '4px 0 0' };
    const fieldWrap   = { marginBottom: '1rem' };

    const userLookup = users.reduce((acc, user) => { acc[user.id] = user; return acc; }, {});
    const userIdLookup = users.reduce((acc, user) => { acc[String(user.id)] = user; return acc; }, {});

    // ── RENDER ────────────────────────────────────────────────────────────────
    const renderPageContent = () => {
        if (!canAccessPage(currentUser, activePage)) {
            return (
                <div className="enterprise-card">
                    <h2 style={{ marginTop: 0, color: '#111827' }}>Access Restricted</h2>
                    <p style={{ marginBottom: 0, color: '#6b7280' }}>
                        Your role does not have permission to open this section.
                    </p>
                </div>
            );
        }

        // --- RELATIONAL APPROACH: Calculate members dynamically ---
        const getTeamDisplayMembers = (team) => {
            // 1. Filter the global users list for anyone who has this team in their memberships array
            const memberIds = users
                .filter(u => u.team_memberships?.some(tm => String(tm.id) === String(team.id)))
                .map(u => String(u.id));

            // 2. Ensure the Team Lead is included at the front of the list
            if (team.lead_id && !memberIds.includes(String(team.lead_id))) {
                return [String(team.lead_id), ...memberIds];
            }

            return memberIds;
        };

        // ── USERS ─────────────────────────────────────────────────────────────
        if (activePage === 'Users') {
            return (
                <Users
                    users={users}
                    teams={teams}
                    roles={roles}
                    locations={locations}
                    isUserAdmin={isUserAdmin}
                    fetchUsers={fetchUsers}
                    showNotification={showNotification}
                    onTeamMutated={triggerMatrixRefresh}
                />
            );
        }

        // ── TEAMS ─────────────────────────────────────────────────────────────
        if (activePage === 'Teams') {
            return (
                <Teams
                    teams={teams}
                    users={users}
                    isTeamAdmin={isTeamAdmin}
                    currentUser={currentUser}
                    fetchTeams={fetchTeams}
                    fetchUsers={fetchUsers}
                    showNotification={showNotification}
                    getTeamDisplayMembers={getTeamDisplayMembers}
                    userLookup={userLookup}
                    onTeamMutated={triggerMatrixRefresh}
                />
            );
        }

        // ── ROTATIONS ─────────────────────────────────────────────────────────
        if (activePage === 'Rotations') {
            return (
                <Rotations
                    rotations={rotations}
                    teams={teams}
                    users={users}
                    isRotationAdmin={isRotationAdmin}
                    fetchRotations={fetchRotations}
                    showNotification={showNotification}
                    userLookup={userLookup}
                    userIdLookup={userIdLookup}
                    onRotationMutated={triggerMatrixRefresh}
                />
            );
        }


        if (activePage === 'Matrix') return <MatrixView refreshKey={matrixRefreshKey} />;

        if (activePage === 'Roles') {
            const rolePermissions = {
                'Administrator':          ['Full system access', 'Manage users & roles', 'Manage teams & rotations', 'View all schedules', 'Approve leave requests', 'Access audit logs'],
                'Team Lead / Supervisor': ['Manage team members', 'Approve leave requests', 'View team schedules', 'Assign rotations'],
                'Employee':               ['View personal schedule', 'Submit leave requests', 'View team calendar', 'View teams', 'View rotations'],
            };
            return (
                <div>
                    <div style={{ marginBottom: '1.5rem' }}><h2 style={{ margin: 0, color: '#111827' }}>Roles and Permissions</h2><p style={{ margin: '0.4rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>System-defined roles assigned to users. Permissions are fixed per role.</p></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        {roles.length === 0 ? <div className="enterprise-card"><p style={{ color: '#9ca3af' }}>Loading roles...</p></div> : roles.map(role => {
                            const perms      = rolePermissions[role.name] || [];
                            const userCount  = users.filter(u => u.user_roles?.some(ur => ur.role_id === role.id)).length;
                            const badgeColor = role.name === 'Administrator' ? '#e31937' : role.name === 'Team Lead / Supervisor' ? '#2563eb' : '#059669';                            return (
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

        // ── OVERVIEW ──────────────────────────────────────────────────────────
        if (activePage === 'Overview') {
            return (
                <Overview
                    currentUser={currentUser}
                    teams={teams}
                    rotations={rotations}
                    users={users}
                    isUserAdmin={isUserAdmin}
                    getTeamDisplayMembers={getTeamDisplayMembers}
                />
            );
        }

        return <div className="enterprise-card"><h2>{activePage} Management</h2><p>Development in progress.</p></div>;
    };

    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    if (isLoggedIn && currentUser?.must_change_password) {
        return <ForcePasswordChange
            user={currentUser}
            onPasswordChanged={handlePasswordChanged}
            onLogout={handleLogout}
        />;
    }

    const NotificationBanner = () => notification.show ? (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, background: notification.type === 'success' ? '#ecfdf5' : '#fee2e2', color: notification.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`, borderRadius: '8px', padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '360px' }}>
            <span>{notification.type === 'success' ? '✓' : '✕'}</span>{notification.message}
        </div>
    ) : null;


    return (
        <div className="dashboard-root">
            <NotificationBanner />
            <Header
                user={currentUser}
                activePage={activePage}
                allowedPages={allowedPages}
                onNavigate={setActivePage}
                onLogout={handleLogout}
            />
            <main className="main-content">
                <header className="page-header"><h1>{activePage} Management</h1></header>
                {renderPageContent()}
            </main>
        </div>
    );
}

export default App;
