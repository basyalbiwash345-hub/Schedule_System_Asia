import React, { useState } from "react";
import '../styles/Login.css'; // This MUST be here

const Login = ({ onLogin, onRegister }) => {
    const [mode, setMode] = useState("login");
    const isRegister = mode === "register";
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    // ... other states (name, confirm, etc.)

    const handleSubmit = e => {
        e.preventDefault();
        onLogin({ identifier, password });
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="logo-placeholder">CGI</div>
                <h2>{isRegister ? "Create Account" : "Welcome Back"}</h2>
                <p>Sign in to manage your enterprise schedule</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email or username</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            placeholder="you@cgi.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
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
                            className="link-btn"
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