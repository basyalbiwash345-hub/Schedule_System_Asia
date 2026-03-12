import React from 'react';

const Header = ({ user, onLogout, activePage, onNavigate }) => {
    const isAdmin = user?.role === "Administrators" || user?.role === "Admin";

    return (
        <header className="app-header">
            <div className="header-left">
                <button
                    type="button"
                    className="logo-button"
                    onClick={() => onNavigate("Overview")}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                    <div style={{ backgroundColor: '#e31937', color: 'white', padding: '4px 8px', fontWeight: '800', borderRadius: '4px' }}>CGI</div>
                    <span className="logo-lockup" style={{ textAlign: 'left' }}>
                        <span className="logo-title" style={{ display: 'block', fontWeight: '700', fontSize: '1rem', color: '#111827' }}>Scheduling</span>
                        <span className="logo-subtitle" style={{ display: 'block', fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Enterprise System</span>
                    </span>
                </button>
                <nav className="header-nav" style={{ marginLeft: '20px' }}>
                    <button
                        type="button"
                        className={`nav-btn ${activePage === "Overview" ? "active" : ""}`}
                        onClick={() => onNavigate("Overview")}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        className={`nav-btn ${activePage === "Teams" ? "active" : ""}`}
                        onClick={() => onNavigate("Teams")}
                    >
                        Teams
                    </button>
                    {isAdmin && (
                        <>
                            <button
                                type="button"
                                className={`nav-btn ${activePage === "Users" ? "active" : ""}`}
                                onClick={() => onNavigate("Users")}
                            >
                                Users
                            </button>
                            <button
                                type="button"
                                className={`nav-btn ${activePage === "Rotations" ? "active" : ""}`}
                                onClick={() => onNavigate("Rotations")}
                            >
                                Rotations
                            </button>
                            <button
                                type="button"
                                className={`nav-btn ${activePage === "Roles" ? "active" : ""}`}
                                onClick={() => onNavigate("Roles")}
                            >
                                Roles
                            </button>
                        </>
                    )}
                </nav>
            </div>

            <div className="header-center">
                <input
                    className="search-input"
                    type="search"
                    placeholder="Search employees or schedules..."
                />
            </div>

            <div className="header-right">
                <div className="user-pill">
                    <span className={`status-dot ${isAdmin ? "status-admin" : "status-member"}`} />
                    <div style={{ textAlign: 'left', marginRight: '10px' }}>
                        <div className="user-name">{user?.name || "User"}</div>
                        <div className="user-role">{user?.role || "Scheduler"}</div>
                    </div>
                    <button type="button" className="link-btn" onClick={onLogout} style={{ borderLeft: '1px solid #ddd', paddingLeft: '10px', marginLeft: '5px' }}>
                        Log out
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
