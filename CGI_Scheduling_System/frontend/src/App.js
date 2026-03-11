import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import './styles/Dashboard.css';

const DEFAULT_ROTATION_FORM = {
    name: '',
    rotation_type_id: '',
    team_id: '',
    location_id: '',
    start_date: '',
    interval_unit: 'week',
    interval_count: 1,
    status: 'active'
};

function App() {
    const [users, setUsers] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [activePage, setActivePage] = useState("Users");
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [rotations, setRotations] = useState([]);
    const [rotationTypes, setRotationTypes] = useState([]);
    const [teams, setTeams] = useState([]);
    const [locations, setLocations] = useState([]);
    const [rotationScope, setRotationScope] = useState('team');
    const [editingRotationId, setEditingRotationId] = useState(null);
    const [rotationFormData, setRotationFormData] = useState(DEFAULT_ROTATION_FORM);

    // 1. Fetch data from Database
    useEffect(() => {
        if (!isLoggedIn) return;

        if (activePage === "Users") {
            fetchUsers();
        }

        if (activePage === "Rotations") {
            fetchRotations();
            fetchRotationMetadata();
        }
    }, [isLoggedIn, activePage]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error("Fetch Error:", err);
        }
    };

    const fetchRotations = async () => {
        try {
            const response = await fetch('/api/rotations');
            const data = await response.json();
            setRotations(data);
        } catch (err) {
            console.error("Rotation Fetch Error:", err);
        }
    };

    const fetchRotationMetadata = async () => {
        try {
            const [typesRes, teamsRes, locationsRes] = await Promise.all([
                fetch('/api/rotation-types'),
                fetch('/api/teams'),
                fetch('/api/locations')
            ]);
            const [typesData, teamsData, locationsData] = await Promise.all([
                typesRes.json(),
                teamsRes.json(),
                locationsRes.json()
            ]);
            setRotationTypes(typesData);
            setTeams(teamsData);
            setLocations(locationsData);
        } catch (err) {
            console.error("Rotation Metadata Error:", err);
        }
    };

    const formatDateInput = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().slice(0, 10);
    };

    const formatDateDisplay = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString();
    };

    const resetRotationForm = () => {
        setRotationScope('team');
        setEditingRotationId(null);
        setRotationFormData(DEFAULT_ROTATION_FORM);
    };

    // 2. Admin Login Logic (Creates the user object for the Header)
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

    // 3. Create User & Save to PostgreSQL
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
                alert("Success: Employee synchronized with PostgreSQL.");
            }
        } catch (err) {
            console.error("Database Error:", err);
        }
    };

    const handleSaveRotation = async (e) => {
        e.preventDefault();
        const payload = {
            ...rotationFormData,
            team_id: rotationScope === 'team' ? rotationFormData.team_id : null,
            location_id: rotationScope === 'location' ? rotationFormData.location_id : null
        };

        try {
            const response = await fetch(
                editingRotationId ? `/api/rotations/${editingRotationId}` : '/api/rotations',
                {
                    method: editingRotationId ? 'PUT' : 'POST',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }
            );

            if (response.ok) {
                await fetchRotations();
                resetRotationForm();
                alert(editingRotationId ? "Rotation updated successfully." : "Rotation created successfully.");
            } else {
                const errorData = await response.json();
                alert(errorData.error || "Unable to save rotation.");
            }
        } catch (err) {
            console.error("Rotation Save Error:", err);
        }
    };

    const handleEditRotation = (rotation) => {
        setEditingRotationId(rotation.id);
        const scope = rotation.team_id ? 'team' : 'location';
        setRotationScope(scope);
        setRotationFormData({
            name: rotation.name || '',
            rotation_type_id: rotation.rotation_type_id ? String(rotation.rotation_type_id) : '',
            team_id: rotation.team_id ? String(rotation.team_id) : '',
            location_id: rotation.location_id ? String(rotation.location_id) : '',
            start_date: formatDateInput(rotation.start_date),
            interval_unit: rotation.interval_unit || 'week',
            interval_count: rotation.interval_count || 1,
            status: rotation.status || 'active'
        });
    };

    const handleDeleteRotation = async (rotationId) => {
        const confirmed = window.confirm("Delete this rotation? This cannot be undone.");
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/rotations/${rotationId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setRotations((prev) => prev.filter((rotation) => rotation.id !== rotationId));
            }
        } catch (err) {
            console.error("Rotation Delete Error:", err);
        }
    };

    // 4. Page Content Switcher
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
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                            <input
                                className="enterprise-input"
                                type="email"
                                placeholder="Corporate Email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                            <input
                                className="enterprise-input"
                                type="password"
                                placeholder="Initial Password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                                    <td><span style={{ fontWeight: 600 }}>{u.name}</span></td>
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
        if (activePage === "Rotations") {
            return (
                <div className="grid-container">
                    <div className="enterprise-card">
                        <h3>{editingRotationId ? "Edit Rotation" : "Create Rotation"}</h3>
                        <form onSubmit={handleSaveRotation}>
                            <input
                                className="enterprise-input"
                                placeholder="Rotation Name"
                                value={rotationFormData.name}
                                onChange={(e) => setRotationFormData({ ...rotationFormData, name: e.target.value })}
                                required
                            />
                            <select
                                className="enterprise-input"
                                value={rotationFormData.rotation_type_id}
                                onChange={(e) => setRotationFormData({ ...rotationFormData, rotation_type_id: e.target.value })}
                                required
                            >
                                <option value="">Select Rotation Type</option>
                                {rotationTypes.map((type) => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                            <select
                                className="enterprise-input"
                                value={rotationScope}
                                onChange={(e) => {
                                    const nextScope = e.target.value;
                                    setRotationScope(nextScope);
                                    setRotationFormData((prev) => ({
                                        ...prev,
                                        team_id: nextScope === 'team' ? prev.team_id : '',
                                        location_id: nextScope === 'location' ? prev.location_id : ''
                                    }));
                                }}
                            >
                                <option value="team">Team Scoped</option>
                                <option value="location">Location Scoped</option>
                            </select>
                            {rotationScope === 'team' ? (
                                <select
                                    className="enterprise-input"
                                    value={rotationFormData.team_id}
                                    onChange={(e) => setRotationFormData({ ...rotationFormData, team_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Team</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <select
                                    className="enterprise-input"
                                    value={rotationFormData.location_id}
                                    onChange={(e) => setRotationFormData({ ...rotationFormData, location_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Location</option>
                                    {locations.map((location) => (
                                        <option key={location.id} value={location.id}>{location.name}</option>
                                    ))}
                                </select>
                            )}
                            <input
                                className="enterprise-input"
                                type="date"
                                value={rotationFormData.start_date}
                                onChange={(e) => setRotationFormData({ ...rotationFormData, start_date: e.target.value })}
                                required
                            />
                            <select
                                className="enterprise-input"
                                value={rotationFormData.interval_unit}
                                onChange={(e) => setRotationFormData({ ...rotationFormData, interval_unit: e.target.value })}
                                required
                            >
                                <option value="day">Daily</option>
                                <option value="week">Weekly</option>
                                <option value="biweek">Bi-weekly</option>
                                <option value="month">Monthly</option>
                            </select>
                            <input
                                className="enterprise-input"
                                type="number"
                                min="1"
                                value={rotationFormData.interval_count}
                                onChange={(e) => setRotationFormData({ ...rotationFormData, interval_count: e.target.value })}
                                required
                            />
                            <select
                                className="enterprise-input"
                                value={rotationFormData.status}
                                onChange={(e) => setRotationFormData({ ...rotationFormData, status: e.target.value })}
                                required
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <button type="submit" className="btn-primary">
                                {editingRotationId ? "Update Rotation" : "Sync to Database"}
                            </button>
                            {editingRotationId && (
                                <button type="button" className="btn-secondary" onClick={resetRotationForm}>
                                    Cancel Edit
                                </button>
                            )}
                        </form>
                    </div>

                    <div className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>Rotation</th>
                                <th>Type</th>
                                <th>Scope</th>
                                <th>Interval</th>
                                <th>Start Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rotations.map(rotation => (
                                <tr key={rotation.id}>
                                    <td><span style={{ fontWeight: 600 }}>{rotation.name}</span></td>
                                    <td>{rotation.rotation_types?.name || "Unassigned"}</td>
                                    <td>
                                        {rotation.teams?.name ? `Team: ${rotation.teams.name}` : ""}
                                        {rotation.locations?.name ? `Location: ${rotation.locations.name}` : ""}
                                    </td>
                                    <td>{rotation.interval_count} {rotation.interval_unit}</td>
                                    <td>{formatDateDisplay(rotation.start_date)}</td>
                                    <td>
                                        <span className={`status-badge ${rotation.status === 'inactive' ? 'status-muted' : ''}`}>
                                            {rotation.status || 'active'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            <button type="button" className="btn-secondary" onClick={() => handleEditRotation(rotation)}>Edit</button>
                                            <button type="button" className="btn-danger" onClick={() => handleDeleteRotation(rotation.id)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!rotations.length && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                        No rotations created yet.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
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
                <header className="page-header">
                    <h1>{activePage} Management</h1>
                    <p>Enterprise system control for PostgreSQL (Instance: asia1)</p>
                </header>
                {renderPageContent()}
            </main>
        </div>
    );
}

export default App;
