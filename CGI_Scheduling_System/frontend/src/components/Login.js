import React, { useState } from "react";
import { useNavigate } from 'react-router-dom'; // Add this for redirection
import {
    Box, Card, CardContent, TextField, Button,
    Typography, Alert, Divider, InputAdornment, IconButton
} from '@mui/material';
import {
    Visibility, VisibilityOff,
    LockOutlined as LockIcon
} from '@mui/icons-material';

const Login = ({ onLoginSuccess }) => {// Removed onLogin prop as we handle it here now
    const navigate = useNavigate();
    const [mode, setMode] = useState("login");
    const isRegister = mode === "register";
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: identifier, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // 1. Store the JWT token and User Info
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // 2. Notify App.js that login was successful
                if (onLoginSuccess) {
                    onLoginSuccess(data.user);
                }

                // 3. Redirect to Dashboard
                navigate('/dashboard');
            } else {
                setError(data.error || "Invalid username or password.");
            }
        } catch (err) {
            setError("Cannot connect to server. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            backgroundColor: '#f9fafb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
        }}>
            <Card elevation={0} sx={{
                width: '100%',
                maxWidth: 420,
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                overflow: 'visible'
            }}>
                <CardContent sx={{ p: 4 }}>

                    {/* Logo */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
                        <Box sx={{
                            backgroundColor: '#e31937',
                            color: 'white',
                            px: 2,
                            py: 1,
                            fontWeight: 800,
                            borderRadius: '8px',
                            fontSize: '1.5rem',
                            letterSpacing: '0.05em',
                            mb: 2
                        }}>
                            CGI
                        </Box>
                        <Typography variant="h5" fontWeight={700} color="#111827">
                            {isRegister ? "Create Account" : "Welcome Back"}
                        </Typography>
                        <Typography variant="body2" color="#6b7280" mt={0.5}>
                            Sign in to manage your enterprise schedule
                        </Typography>
                    </Box>

                    {/* Error Display */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
                            {error}
                        </Alert>
                    )}

                    {/* Form */}
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Username"
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            placeholder="e.g. jdoe12"
                            required
                            fullWidth
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    '&.Mui-focused fieldset': { borderColor: '#e31937' }
                                },
                                '& .MuiInputLabel-root.Mui-focused': { color: '#e31937' }
                            }}
                        />
                        <TextField
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            fullWidth
                            size="small"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    '&.Mui-focused fieldset': { borderColor: '#e31937' }
                                },
                                '& .MuiInputLabel-root.Mui-focused': { color: '#e31937' }
                            }}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            size="large"
                            startIcon={<LockIcon />}
                            sx={{
                                backgroundColor: '#e31937',
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                mt: 1,
                                '&:hover': { backgroundColor: '#c41230' }
                            }}
                        >
                            {loading ? "Authenticating..." : (isRegister ? "Create Account" : "Sign In")}
                        </Button>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Footer */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="#6b7280">
                            {isRegister ? "Already have an account?" : "Don't have an account?"}
                            {' '}
                            <Typography
                                component="span"
                                variant="body2"
                                color="#e31937"
                                fontWeight={600}
                                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                onClick={() => setMode(isRegister ? "login" : "register")}
                            >
                                {isRegister ? "Sign In" : "Create Account"}
                            </Typography>
                        </Typography>
                    </Box>

                </CardContent>
            </Card>
        </Box>
    );
};

export default Login;