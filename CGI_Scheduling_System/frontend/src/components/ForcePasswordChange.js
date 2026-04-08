import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const ForcePasswordChange = ({ user, onPasswordChanged, onLogout }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) return setError('New passwords do not match.');
        if (newPassword === currentPassword) return setError('New password must be different from the temporary one.');

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to change password');
            onPasswordChanged(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePasswordVisibility = () => setShowPassword(!showPassword);

    const endAdornment = (
        <InputAdornment position="end">
            <IconButton onClick={handleTogglePasswordVisibility} edge="end" size="small">
                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
        </InputAdornment>
    );

    const textFieldStyles = {
        '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '&.Mui-focused fieldset': { borderColor: '#e31937' }
        },
        '& .MuiInputLabel-root.Mui-focused': { color: '#e31937' }
    };

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            <Card elevation={0} sx={{ width: '100%', maxWidth: 420, border: '1px solid #e5e7eb', borderRadius: '16px' }}>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h5" fontWeight={700} color="#111827" mb={1}>
                            Update Password
                        </Typography>
                        <Typography variant="body2" color="#6b7280">
                            Welcome, {user.first_name || user.name.split(' ')[0]}! For security reasons, you must change your temporary password before accessing the system.
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField label="Current / Temporary Password" type={showPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required fullWidth size="small" InputProps={{ endAdornment }} sx={textFieldStyles} />
                        <TextField label="New Password" placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 special" type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} required fullWidth size="small" InputProps={{ endAdornment }} sx={textFieldStyles} />
                        <TextField label="Confirm New Password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required fullWidth size="small" InputProps={{ endAdornment }} sx={textFieldStyles} />

                        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ backgroundColor: '#e31937', borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#c41230' } }}>
                                {loading ? 'Updating...' : 'Update Password'}
                            </Button>
                            <Button type="button" onClick={onLogout} sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600 }}>
                                Cancel & Logout
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ForcePasswordChange;