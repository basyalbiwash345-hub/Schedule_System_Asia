import React, { useState } from "react";

const Login = ({ onLogin, onRegister }) => {
    const [mode, setMode] = useState("login");
    const isRegister = mode === "register";
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [name, setName] = useState("");
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");

    const handleSubmit = e => {
        e.preventDefault();
        setError("");

        if (isRegister && password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        const result = isRegister
            ? onRegister({ name, email: identifier, password, remember })
            : onLogin({ identifier, password, remember });

        if (!result.ok) {
            setError(result.error);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">
                    {/* Professional CSS Placeholder Logo */}
                    <div className="logo-placeholder">CGI</div>
                    <h2>{isRegister ? "Create Account" : "Welcome Back"}</h2>
                    <p>Sign in to manage your events</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {isRegister && (
                        <div className="form-group">
                            <label>Full name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Alex Johnson"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>{isRegister ? "Email" : "Email or username"}</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            placeholder={isRegister ? "you@company.com" : "you@company.com or alexj"}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="********"
                            required
                        />
                    </div>

                    {isRegister && (
                        <div className="form-group">
                            <label>Confirm password</label>
                            <input
                                type="password"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="********"
                                required
                            />
                        </div>
                    )}

                    {error && <div className="form-error">{error}</div>}

                    <div className="login-row">
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={e => setRemember(e.target.checked)}
                            />
                            <span>Remember me</span>
                        </label>
                        {!isRegister && (
                            <button type="button" className="link-btn">
                                Forgot password?
                            </button>
                        )}
                    </div>

                    <button type="submit" className="primary-btn">
                        {isRegister ? "Create Account" : "Sign In"}
                    </button>
                </form>

                <div className="login-footer">
                    <p>
                        {isRegister ? "Already have an account?" : "Don't have an account?"}
                        <button
                            type="button"
                            className="link-btn toggle-link"
                            onClick={() => setMode(isRegister ? "login" : "register")}
                        >
                            {isRegister ? " Sign In" : " Create Account"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;