import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import './styles/Dashboard.css';

function App() {
    const [users, setUsers] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [activePage, setActivePage] = useState("Users");
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });

    // 1. Fetch Users from Database
    useEffect(() => {
        if (isLoggedIn && activePage === "Users") {
            fetchUsers();
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
                alert("✅ Success: Employee synchronized with PostgreSQL.");
            }
        } catch (err) {
            console.error("Database Error:", err);
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