import React, { useState } from 'react';
import {
    AppBar, Toolbar, Box, Button, InputBase,
    Avatar, Typography, Menu, MenuItem, Divider
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

    return (
        <AppBar position="sticky" elevation={0} sx={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            color: '#111827',
        }}>
            <Toolbar sx={{ gap: 2, minHeight: '64px !important' }}>

                {/* Logo */}
                <Box
                    onClick={() => onNavigate(defaultPage)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', mr: 2, flexShrink: 0 }}
                >
                    <Box sx={{
                        backgroundColor: '#e31937', color: 'white',
                        px: 1, py: 0.5, fontWeight: 800, borderRadius: '4px',
                        fontSize: '0.95rem', letterSpacing: '0.05em',
                    }}>
                        CGI
                    </Box>
                    <Box>
                        <Typography variant="body2" fontWeight={700} lineHeight={1.2} color="#111827">
                            Scheduling
                        </Typography>
                        <Typography variant="caption" color="#6b7280"
                                    sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>
                            Enterprise System
                        </Typography>
                    </Box>
                </Box>

                {/* Nav Items */}
                <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 0 }}>
                    {allNavItems.map(({ label, page, icon }) => (
                        <Button
                            key={page}
                            startIcon={icon}
                            onClick={() => onNavigate(page)}
                            size="small"
                            sx={{
                                color: activePage === page ? '#e31937' : '#6b7280',
                                backgroundColor: activePage === page ? '#fef2f2' : 'transparent',
                                borderBottom: activePage === page ? '2px solid #e31937' : '2px solid transparent',
                                borderRadius: '4px 4px 0 0',
                                px: 1.5, py: 1,
                                fontWeight: activePage === page ? 600 : 400,
                                fontSize: '0.85rem',
                                textTransform: 'none',
                                '&:hover': { backgroundColor: '#fef2f2', color: '#e31937' },
                            }}
                        >
                            {label}
                        </Button>
                    ))}
                </Box>

                {/* Search */}
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', px: 2 }}>
                    <Box sx={{
                        display: 'flex', alignItems: 'center',
                        backgroundColor: '#f9fafb', border: '1px solid #e5e7eb',
                        borderRadius: '8px', px: 2, py: 0.5,
                        width: '100%', maxWidth: 400,
                        '&:focus-within': { borderColor: '#e31937', backgroundColor: '#fff' },
                    }}>
                        <SearchIcon sx={{ color: '#9ca3af', fontSize: '1.1rem', mr: 1 }} />
                        <InputBase
                            placeholder="Search employees or schedules..."
                            sx={{ fontSize: '0.875rem', width: '100%', color: '#111827' }}
                        />
                    </Box>
                </Box>

                {/* User Pill */}
                <Box
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{
                        display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                        border: '1px solid #e5e7eb', borderRadius: '8px',
                        px: 1.5, py: 0.75, flexShrink: 0,
                        '&:hover': { backgroundColor: '#f9fafb' },
                    }}
                >
                    <Avatar sx={{ width: 28, height: 28, backgroundColor: '#e31937', fontSize: '0.75rem' }}>
                        {user?.name?.charAt(0) || 'U'}
                    </Avatar>
                    <Box>
                        <Typography variant="body2" fontWeight={600} lineHeight={1.2} fontSize="0.8rem">
                            {user?.name || 'User'}
                        </Typography>
                        <Typography variant="caption" color="#6b7280" fontSize="0.7rem">
                            {user?.primary_role || user?.role || 'Scheduler'}
                        </Typography>
                    </Box>
                    <ArrowDownIcon sx={{ fontSize: '1rem', color: '#9ca3af' }} />
                </Box>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    PaperProps={{
                        sx: {
                            mt: 1, minWidth: 160, borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        },
                    }}
                >
                    <Box sx={{ px: 2, py: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{user?.name}</Typography>
                        <Typography variant="caption" color="#6b7280">{user?.email}</Typography>
                    </Box>
                    <Divider />
                    <MenuItem
                        onClick={() => { setAnchorEl(null); onLogout(); }}
                        sx={{ color: '#e31937', gap: 1, fontSize: '0.875rem' }}
                    >
                        <LogoutIcon fontSize="small" />
                        Log out
                    </MenuItem>
                </Menu>

            </Toolbar>
        </AppBar>
    );
};

export default Header;
