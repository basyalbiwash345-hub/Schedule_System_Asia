import React, { useState } from 'react';
import {
    AppBar, Toolbar, Box, Button, InputBase,
    Avatar, Typography, Menu, MenuItem, Divider,
    Dialog, DialogContent, TextField, Alert, InputAdornment, IconButton
} from '@mui/material';
import {
    Search as SearchIcon,
    Dashboard as DashboardIcon,
    Group as GroupIcon,
    Person as PersonIcon,
    RotateRight as RotateIcon,
    AdminPanelSettings as RolesIcon,
    GridOn as GridOnIcon,
    Logout as LogoutIcon,
    KeyboardArrowDown as ArrowDownIcon,
    Key as KeyIcon,
    Visibility, VisibilityOff, Close as CloseIcon
} from '@mui/icons-material';

const NAV_ITEMS = [
    { label: 'Overview',  page: 'Overview', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Matrix',    page: 'Matrix',   icon: <GridOnIcon fontSize="small" /> },
    { label: 'Teams',     page: 'Teams',    icon: <GroupIcon fontSize="small" /> },
];

const ADMIN_NAV_ITEMS = [
    { label: 'Users',     page: 'Users',     icon: <PersonIcon fontSize="small" /> },
    { label: 'Rotations', page: 'Rotations', icon: <RotateIcon fontSize="small" /> },
    { label: 'Roles',     page: 'Roles',     icon: <RolesIcon fontSize="small" /> },
];

const Header = ({ user, onLogout, activePage, onNavigate, allowedPages = [] }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const allNavItems = [...NAV_ITEMS, ...ADMIN_NAV_ITEMS].filter(({ page }) => allowedPages.includes(page));
    const defaultPage = allowedPages.includes('Overview') ? 'Overview' : allowedPages[0] || 'Matrix';

    // ── NEW: CHANGE PASSWORD STATE ───────────────────────────────────────────
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const closePasswordModal = () => {
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        setPasswordSuccess('');
        setShowPassword(false);
    };

    const handlePasswordChangeSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) return setPasswordError('New passwords do not match.');
        if (newPassword === currentPassword) return setPasswordError('New password must be different from the current one.');

        setIsUpdating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to change password');

            setPasswordSuccess('Password successfully updated!');
            setTimeout(closePasswordModal, 2000); // Auto-close after 2 seconds
        } catch (err) {
            setPasswordError(err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const endAdornment = (
        <InputAdornment position="end">
            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
        </InputAdornment>
    );

    const textFieldStyles = {
        '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: '#e31937' } },
        '& .MuiInputLabel-root.Mui-focused': { color: '#e31937' }
    };

    return (
        <AppBar position="sticky" elevation={0} sx={{
            backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', color: '#111827',
        }}>
            <Toolbar sx={{ gap: 2, minHeight: '64px !important' }}>

                {/* Logo */}
                <Box onClick={() => onNavigate(defaultPage)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', mr: 2, flexShrink: 0 }}>
                    <Box sx={{ backgroundColor: '#e31937', color: 'white', px: 1, py: 0.5, fontWeight: 800, borderRadius: '4px', fontSize: '0.95rem', letterSpacing: '0.05em' }}>CGI</Box>
                    <Box>
                        <Typography variant="body2" fontWeight={700} lineHeight={1.2} color="#111827">Scheduling</Typography>
                        <Typography variant="caption" color="#6b7280" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>Enterprise System</Typography>
                    </Box>
                </Box>

                {/* Nav Items */}
                <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 0 }}>
                    {allNavItems.map(({ label, page, icon }) => (
                        <Button
                            key={page} startIcon={icon} onClick={() => onNavigate(page)} size="small"
                            sx={{
                                color: activePage === page ? '#e31937' : '#6b7280',
                                backgroundColor: activePage === page ? '#fef2f2' : 'transparent',
                                borderBottom: activePage === page ? '2px solid #e31937' : '2px solid transparent',
                                borderRadius: '4px 4px 0 0', px: 1.5, py: 1,
                                fontWeight: activePage === page ? 600 : 400, fontSize: '0.85rem', textTransform: 'none',
                                '&:hover': { backgroundColor: '#fef2f2', color: '#e31937' },
                            }}
                        >
                            {label}
                        </Button>
                    ))}
                </Box>

                {/*/!* Search *!/*/}
                {/*<Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', px: 2 }}>*/}
                {/*    <Box sx={{*/}
                {/*        display: 'flex', alignItems: 'center', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb',*/}
                {/*        borderRadius: '8px', px: 2, py: 0.5, width: '100%', maxWidth: 400,*/}
                {/*        '&:focus-within': { borderColor: '#e31937', backgroundColor: '#fff' },*/}
                {/*    }}>*/}
                {/*        <SearchIcon sx={{ color: '#9ca3af', fontSize: '1.1rem', mr: 1 }} />*/}
                {/*        <InputBase placeholder="Search employees or schedules..." sx={{ fontSize: '0.875rem', width: '100%', color: '#111827' }} />*/}
                {/*    </Box>*/}
                {/*</Box>*/}

                {/* User Pill */}
                <Box sx={{ flexGrow: 1 }} />

                {/* 3. User Pill (Moves Right) */}
                <Box onClick={(e) => setAnchorEl(e.currentTarget)} sx={{
                    display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                    border: '1px solid #e5e7eb', borderRadius: '8px', px: 1.5, py: 0.75, flexShrink: 0,
                    '&:hover': { backgroundColor: '#f9fafb' },
                }}>
                    <Avatar sx={{ width: 28, height: 28, backgroundColor: '#e31937', fontSize: '0.75rem' }}>{user?.name?.charAt(0) || 'U'}</Avatar>
                    <Box>
                        <Typography variant="body2" fontWeight={600} lineHeight={1.2} fontSize="0.8rem">{user?.name || 'User'}</Typography>
                        <Typography variant="caption" color="#6b7280" fontSize="0.7rem">{user?.primary_role || user?.role || 'Scheduler'}</Typography>
                    </Box>
                    <ArrowDownIcon sx={{ fontSize: '1rem', color: '#9ca3af' }} />
                </Box>

                <Menu
                    anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                    PaperProps={{ sx: { mt: 1, minWidth: 160, borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } }}
                >
                    <Box sx={{ px: 2, py: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{user?.name}</Typography>
                        <Typography variant="caption" color="#6b7280">{user?.email}</Typography>
                    </Box>
                    <Divider />
                    <MenuItem onClick={() => { setAnchorEl(null); setIsPasswordModalOpen(true); }} sx={{ gap: 1, fontSize: '0.875rem' }}>
                        <KeyIcon fontSize="small" sx={{ color: '#6b7280' }} />
                        Change Password
                    </MenuItem>
                    <MenuItem onClick={() => { setAnchorEl(null); onLogout(); }} sx={{ color: '#e31937', gap: 1, fontSize: '0.875rem' }}>
                        <LogoutIcon fontSize="small" />
                        Log out
                    </MenuItem>
                </Menu>
            </Toolbar>

            {/* VOLUNTARY PASSWORD CHANGE MODAL */}
            <Dialog
                open={isPasswordModalOpen}
                onClose={closePasswordModal}
                PaperProps={{ sx: { borderRadius: '16px', width: '100%', maxWidth: 420, border: '1px solid #e5e7eb' } }}
            >
                <DialogContent sx={{ p: 4, position: 'relative' }}>
                    <IconButton onClick={closePasswordModal} sx={{ position: 'absolute', top: 12, right: 12 }}>
                        <CloseIcon />
                    </IconButton>

                    <Typography variant="h6" fontWeight={700} color="#111827" mb={1}>
                        Change Password
                    </Typography>
                    <Typography variant="body2" color="#6b7280" mb={3}>
                        Update your account password securely.
                    </Typography>

                    {passwordError && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>{passwordError}</Alert>}
                    {passwordSuccess && <Alert severity="success" sx={{ mb: 3, borderRadius: '8px' }}>{passwordSuccess}</Alert>}

                    <Box component="form" onSubmit={handlePasswordChangeSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField
                            label="Current Password"
                            type={showPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            required fullWidth size="small"
                            InputProps={{ endAdornment }} sx={textFieldStyles}
                        />

                        <TextField
                            label="New Password"
                            placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 special"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required fullWidth size="small"
                            InputProps={{ endAdornment }} sx={textFieldStyles}
                        />

                        <TextField
                            label="Confirm New Password"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required fullWidth size="small"
                            InputProps={{ endAdornment }} sx={textFieldStyles}
                        />

                        <Box sx={{ mt: 1, display: 'flex', gap: 1.5 }}>
                            <Button
                                type="button"
                                onClick={closePasswordModal}
                                variant="outlined"
                                fullWidth
                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, borderColor: '#d1d5db', color: '#374151' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={isUpdating}
                                sx={{ backgroundColor: '#e31937', borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#c41230' } }}
                            >
                                {isUpdating ? 'Saving...' : 'Save Password'}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>
        </AppBar>
    );
};

export default Header;