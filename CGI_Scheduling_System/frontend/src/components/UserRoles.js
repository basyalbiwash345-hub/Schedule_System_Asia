import { useState } from "react";

const formatDate = value => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
};

const getFullName = user =>
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "-";

const buildEmptyUserForm = fallbackRole => ({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    location: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: fallbackRole
});

const buildEditUserForm = (user, fallbackRole) => ({
    username: user.username || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    location: user.location || "",
    phone: user.phone || "",
    password: "",
    confirmPassword: "",
    role: user.role || fallbackRole
});

const UserRoles = ({
                       users,
                       userRoles,
                       onCreateUser,
                       onUpdateUser,
                       onDeleteUser
                   }) => {
    const fallbackRole = userRoles[0] || "Employee";
    const [message, setMessage] = useState("");
    const [pageError, setPageError] = useState("");
    const [createError, setCreateError] = useState("");
    const [showUserForm, setShowUserForm] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [userForm, setUserForm] = useState(buildEmptyUserForm(fallbackRole));

    const handleUserFieldChange = (field, value) => {
        setUserForm(prev => ({ ...prev, [field]: value }));
    };

    const openCreateForm = () => {
        setMessage("");
        setPageError("");
        setCreateError("");
        setEditingUserId(null);
        setUserForm(buildEmptyUserForm(fallbackRole));
        setShowUserForm(true);
    };

    const openEditForm = user => {
        setMessage("");
        setPageError("");
        setCreateError("");
        setEditingUserId(user.id);
        setUserForm(buildEditUserForm(user, fallbackRole));
        setShowUserForm(true);
    };

    const closeUserForm = () => {
        setCreateError("");
        setShowUserForm(false);
        setEditingUserId(null);
        setUserForm(buildEmptyUserForm(fallbackRole));
    };

    const handleUserSubmit = e => {
        e.preventDefault();
        setMessage("");
        setPageError("");
        setCreateError("");

        if (userForm.password !== userForm.confirmPassword) {
            setCreateError("Passwords do not match.");
            return;
        }

        const payload = {
            ...userForm,
            role: userForm.role || fallbackRole
        };

        const result = editingUserId
            ? onUpdateUser(editingUserId, payload)
            : onCreateUser(payload);

        if (!result.ok) {
            setCreateError(result.error);
            return;
        }

        closeUserForm();
        setMessage(
            editingUserId
                ? `Updated ${result.user.username}.`
                : `Created ${result.user.username}. They can sign in with their username or email.`
        );
    };

    const handleDelete = user => {
        setMessage("");
        setPageError("");
        setCreateError("");

        const confirmed = window.confirm(`Delete user ${user.username || user.email}?`);
        if (!confirmed) {
            return;
        }

        const result = onDeleteUser(user.id);
        if (!result.ok) {
            setPageError(result.error);
            return;
        }

        setMessage(`Deleted ${user.username || user.email}.`);
    };

    return (
        <section className="page user-roles">
            <div className="page-header">
                <div>
                    <h2>Users</h2>
                    <p>Manage access, roles, and sign-in accounts across the scheduling system.</p>
                </div>
                <div className="page-header-actions">
                    <button
                        type="button"
                        className="primary-btn compact"
                        onClick={openCreateForm}
                    >
                        Add User
                    </button>
                </div>
            </div>

            {message && <div className="form-success">{message}</div>}
            {pageError && <div className="form-error">{pageError}</div>}

            <section className="user-directory">
                <div className="users-section-header">
                    <div>
                        <p>{users.length} account{users.length === 1 ? "" : "s"} in the system.</p>
                    </div>
                </div>

                <div className="user-list-table">
                    <div className="user-list-row user-list-head">
                        <span>ID</span>
                        <span>User</span>
                        <span>Role</span>
                        <span>Contact</span>
                        <span>Actions</span>
                    </div>

                    {users.map((user, index) => {
                        const statusValue = user.status || "active";
                        return (
                            <div className="user-list-row" key={`directory-${user.id}`}>
                                <span className="user-list-id">{index + 1}</span>
                                <span className="user-list-user">
                                    <strong>{getFullName(user)}</strong>
                                    <small>@{user.username || "-"}</small>
                                    <small>{user.email}</small>
                                </span>
                                <span className="user-list-role">
                                    <span className="tag">{user.role}</span>
                                    <span
                                        className={`status-pill ${
                                            statusValue === "active"
                                                ? "active"
                                                : "inactive"
                                        }`}
                                    >
                                        {statusValue}
                                    </span>
                                </span>
                                <span className="user-list-contact">
                                    <small>{user.location || "No location"}</small>
                                    <small>{user.phone || "No phone"}</small>
                                    <small>{formatDate(user.createdAt || user.created_at)}</small>
                                </span>
                                <span className="user-list-actions">
                                    <button
                                        type="button"
                                        className="chip"
                                        onClick={() => openEditForm(user)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="chip danger"
                                        onClick={() => handleDelete(user)}
                                    >
                                        Delete
                                    </button>
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>

            {showUserForm && (
                <div className="modal-overlay user-create-overlay" onClick={closeUserForm}>
                    <div
                        className="modal user-create-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="modal-close-btn"
                            aria-label="Close user dialog"
                            onClick={closeUserForm}
                        >
                            &times;
                        </button>

                        <div className="user-create-modal-header">
                            <h3>{editingUserId ? "Edit user" : "Add a new user"}</h3>
                            <p>
                                {editingUserId
                                    ? "Update the user details, then save the changes."
                                    : "Fill out the user details, then create the account."}
                            </p>
                        </div>

                        <form
                            className="role-form user-create-form user-create-form-modal"
                            onSubmit={handleUserSubmit}
                            autoComplete="off"
                        >
                            <div className="user-create-form-grid">
                                <label>
                                    Username
                                    <input
                                        type="text"
                                        value={userForm.username}
                                        autoComplete="off"
                                        onChange={e =>
                                            handleUserFieldChange("username", e.target.value)
                                        }
                                        placeholder="alexj"
                                        required
                                    />
                                </label>

                                <label>
                                    First name
                                    <input
                                        type="text"
                                        value={userForm.firstName}
                                        autoComplete="off"
                                        onChange={e =>
                                            handleUserFieldChange("firstName", e.target.value)
                                        }
                                        placeholder="Alex"
                                        required
                                    />
                                </label>

                                <label>
                                    Last name
                                    <input
                                        type="text"
                                        value={userForm.lastName}
                                        autoComplete="off"
                                        onChange={e =>
                                            handleUserFieldChange("lastName", e.target.value)
                                        }
                                        placeholder="Johnson"
                                        required
                                    />
                                </label>

                                <label>
                                    Email
                                    <input
                                        type="email"
                                        value={userForm.email}
                                        autoComplete="off"
                                        onChange={e =>
                                            handleUserFieldChange("email", e.target.value)
                                        }
                                        placeholder="alex@company.com"
                                        required
                                    />
                                </label>

                                <label>
                                    Location
                                    <input
                                        type="text"
                                        value={userForm.location}
                                        autoComplete="off"
                                        onChange={e =>
                                            handleUserFieldChange("location", e.target.value)
                                        }
                                        placeholder="New York"
                                    />
                                </label>

                                <label>
                                    Phone
                                    <input
                                        type="tel"
                                        value={userForm.phone}
                                        autoComplete="off"
                                        onChange={e =>
                                            handleUserFieldChange("phone", e.target.value)
                                        }
                                        placeholder="(555) 123-4567"
                                    />
                                </label>

                                <label>
                                    Password
                                    <input
                                        type="password"
                                        value={userForm.password}
                                        autoComplete="new-password"
                                        onChange={e =>
                                            handleUserFieldChange("password", e.target.value)
                                        }
                                        placeholder={
                                            editingUserId
                                                ? "Leave blank to keep current password"
                                                : "Create a password"
                                        }
                                        required={!editingUserId}
                                    />
                                </label>

                                <label>
                                    Confirm password
                                    <input
                                        type="password"
                                        value={userForm.confirmPassword}
                                        autoComplete="new-password"
                                        onChange={e =>
                                            handleUserFieldChange("confirmPassword", e.target.value)
                                        }
                                        placeholder={
                                            editingUserId
                                                ? "Repeat the new password if changing it"
                                                : "Re-enter the password"
                                        }
                                        required={!editingUserId || Boolean(userForm.password)}
                                    />
                                </label>

                                <label>
                                    Role
                                    <select
                                        value={userForm.role}
                                        onChange={e =>
                                            handleUserFieldChange("role", e.target.value)
                                        }
                                    >
                                        {userRoles.map(role => (
                                            <option key={role} value={role}>
                                                {role}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            {createError && <div className="form-error">{createError}</div>}

                            <div className="role-form-actions">
                                <button type="submit" className="primary-btn compact">
                                    {editingUserId ? "Save changes" : "Create user"}
                                </button>
                                <button
                                    type="button"
                                    className="chip"
                                    onClick={closeUserForm}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default UserRoles;
