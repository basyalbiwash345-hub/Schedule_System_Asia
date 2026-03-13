import React, { useState } from "react";
import {
    Box, Card, CardContent, TextField, Button,
    Typography, Alert, Divider, InputAdornment, IconButton
} from '@mui/material';
import {
    Visibility, VisibilityOff,
    LockOutlined as LockIcon
} from '@mui/icons-material';

const Login = ({ onLogin }) => {
    const [mode, setMode] = useState("login");
    const isRegister = mode === "register";
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");
        const result = onLogin({ identifier, password });
        if (result && !result.ok) setError(result.error || "Login failed.");
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

                    {/* Error */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
                            {error}
                        </Alert>
                    )}

                    {/* Form */}
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Email or username"
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            placeholder="you@cgi.com"
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
                            {isRegister ? "Create Account" : "Sign In"}
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