import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import './styles/Dashboard.css';

function App() {
    const [users, setUsers] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });

    useEffect(() => {
        if (isLoggedIn) fetchUsers();
    }, [isLoggedIn]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            setUsers(data);
        } catch (err) { console.error("Fetch failed", err); }
    };

    const handleAdminLogin = ({ identifier, password }) => {
        if (identifier === "admin@cgi.com" && password === "AdminAdmin902") {
            setIsLoggedIn(true);
            return { ok: true };
        }
        return { ok: false, error: "Access Denied: Admin Credentials Required." };
    };

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
                alert("✅ Success: PostgreSQL Synchronized.");
            }
        } catch (err) { console.error("Database Error:", err); }
    };

    if (!isLoggedIn) {
        return <Login onLogin={handleAdminLogin} onRegister={() => ({ ok: false, error: "Access Restricted." })} />;
    }

    return (
        <div className="dashboard-wrapper">
            <aside className="sidebar">
                <div className="brand-logo">CGI <span>Schedule</span></div>
                <nav className="nav-menu">
                    <div className="nav-item active">User Directory</div>
                    <div className="nav-item">Team Rotations</div>
                    <div className="nav-item">System Logs</div>
                </nav>
                <button className="nav-item" onClick={() => setIsLoggedIn(false)} style={{background: 'none', border: 'none', textAlign: 'left', width: '100%'}}>
                    Sign Out
                </button>
            </aside>

            <main className="main-content">
                <header className="page-header">
                    <h1>Identity Management</h1>
                    <p>Synchronize employee records with the primary PostgreSQL database.</p>
                </header>

                <div className="grid-container">
                    <div className="enterprise-card">
                        <h3>Provision New Account</h3>
                        <form onSubmit={handleCreateUser}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input className="enterprise-input" placeholder="Alex Johnson" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Corporate Email</label>
                                <input className="enterprise-input" type="email" placeholder="alex.j@cgi.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Initial Password</label>
                                <input className="enterprise-input" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                            </div>
                            <button type="submit" className="btn-primary">Sync Record</button>
                        </form>
                    </div>

                    <div className="enterprise-card">
                        <h3>Active Directory Sync</h3>
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Email</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td><strong>{u.name}</strong></td>
                                    <td>{u.email}</td>
                                    <td><span className="status-badge">Synchronized</span></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;