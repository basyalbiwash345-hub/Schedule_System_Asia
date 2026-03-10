import React, { useState } from "react";
import Login from "./components/Login";
import UserRoles from "./components/UserRoles";
import "./App.css";

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Mock Data for Demo
    const [users, setUsers] = useState([
        { id: 1, username: "admin", firstName: "System", lastName: "Admin", email: "admin@cgi.com", role: "Administrator", status: "active", location: "Montreal", phone: "555-0101", created_at: new Date() },
        { id: 2, username: "jdoe", firstName: "John", lastName: "Doe", email: "john.doe@cgi.com", role: "Employee", status: "active", location: "Toronto", phone: "555-0102", created_at: new Date() }
    ]);

    const userRoles = ["Administrator", "Manager", "Employee"];

    // Handlers
    const handleLogin = (creds) => {
        setIsLoggedIn(true);
        return { ok: true };
    };

    const handleCreateUser = (newUser) => {
        const userWithId = { ...newUser, id: Date.now(), created_at: new Date() };
        setUsers([...users, userWithId]);
        return { ok: true, user: userWithId };
    };

    const handleUpdateUser = (id, updatedData) => {
        setUsers(users.map(u => u.id === id ? { ...u, ...updatedData } : u));
        return { ok: true, user: { ...updatedData, id } };
    };

    const handleDeleteUser = (id) => {
        setUsers(users.filter(u => u.id !== id));
        return { ok: true };
    };

    return (
        <div className="App">
            {!isLoggedIn ? (
                <Login onLogin={handleLogin} onRegister={() => ({ ok: true })} />
            ) : (
                <UserRoles
                    users={users}
                    userRoles={userRoles}
                    onCreateUser={handleCreateUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                />
            )}
        </div>
    );
}

export default App;