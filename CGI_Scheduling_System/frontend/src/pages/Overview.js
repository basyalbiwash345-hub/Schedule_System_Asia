import React from 'react';

const Overview = ({ currentUser, teams, rotations, users, isUserAdmin, getTeamDisplayMembers, formatIntervalLabel }) => {
    const myTeams = teams.filter(t => currentUser?.teams?.includes(t.id));
    // Find all rotations the current user is assigned to
    const myRotations = rotations.filter(r => {
        const assigned = Array.isArray(r.assigned_member_ids) ? r.assigned_member_ids : [];
        return assigned.map(String).includes(String(currentUser?.id));
    });

    const totalUsers = users.length;
    const totalTeams = teams.length;
    const totalRotations = rotations.length;

    return (
        <div>
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#111827' }}>
                    Welcome back, {currentUser?.first_name || currentUser?.name?.split(' ')[0]}!
                </h2>
                <p style={{ margin: '0.4rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                    Here is an overview of your current assignments and system status.
                </p>
            </div>

            {/* KPI Cards Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.25rem',
                marginBottom: '1.5rem'
            }}>
                <div className="enterprise-card" style={{borderTop: '3px solid #e31937'}}>
                    <h3 style={{
                        marginTop: 0,
                        fontSize: '0.85rem',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>My Profile</h3>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#111827',
                        marginBottom: '0.5rem'
                    }}>{currentUser?.primary_role}</div>
                    <div style={{fontSize: '0.85rem', color: '#4b5563'}}><strong>Email:</strong> {currentUser?.email}
                    </div>
                    {currentUser?.location &&
                        <div style={{fontSize: '0.85rem', color: '#4b5563', marginTop: '0.25rem'}}>
                            <strong>Location:</strong> {currentUser?.location}</div>}
                </div>

                <div className="enterprise-card" style={{borderTop: '3px solid #2563eb'}}>
                    <h3 style={{
                        marginTop: 0,
                        fontSize: '0.85rem',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>My Teams</h3>
                    {myTeams.length > 0 ? (
                        <>
                            <div style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                color: '#111827',
                                marginBottom: '0.5rem'
                            }}>{myTeams.length} Assigned Teams
                            </div>
                            <div style={{fontSize: '0.85rem', color: '#4b5563'}}>
                                <strong>Primary:</strong> {myTeams[0].name}</div>
                        </>
                    ) : (
                        <div style={{
                            fontSize: '1rem',
                            fontWeight: 500,
                            color: '#9ca3af',
                            marginTop: '1rem'
                        }}>Unassigned</div>
                    )}
                </div>

                <div className="enterprise-card" style={{borderTop: '3px solid #059669'}}>
                    <h3 style={{
                        marginTop: 0,
                        fontSize: '0.85rem',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>Active Rotations</h3>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#111827',
                        marginBottom: '0.25rem'
                    }}>{myRotations.length}</div>
                    <div style={{fontSize: '0.85rem', color: '#4b5563'}}>Rotations requiring your coverage</div>
                </div>

                {isUserAdmin && (
                    <div className="enterprise-card" style={{borderTop: '3px solid #7c3aed', background: '#faf5ff'}}>
                        <h3 style={{
                            marginTop: 0,
                            fontSize: '0.85rem',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>System Overview</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.5rem',
                            marginTop: '0.5rem'
                        }}>
                            <div>
                                <div style={{fontSize: '1.25rem', fontWeight: 700, color: '#111827'}}>{totalUsers}</div>
                                <div style={{fontSize: '0.75rem', color: '#6b7280'}}>Total Users</div>
                            </div>
                            <div>
                                <div style={{fontSize: '1.25rem', fontWeight: 700, color: '#111827'}}>{totalTeams}</div>
                                <div style={{fontSize: '0.75rem', color: '#6b7280'}}>Total Teams</div>
                            </div>
                            <div style={{gridColumn: 'span 2', marginTop: '0.25rem'}}>
                                <div style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    color: '#111827'
                                }}>{totalRotations}</div>
                                <div style={{fontSize: '0.75rem', color: '#6b7280'}}>Total Rotations</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed Sections Row */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem'}}>
                <div className="enterprise-card no-padding">
                    <div style={{
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        borderRadius: '8px 8px 0 0'
                    }}>
                        <h3 style={{margin: 0, fontSize: '1rem', color: '#111827'}}>My Rotation Assignments</h3>
                    </div>
                    {myRotations.length === 0 ? (
                        <div style={{padding: '2rem', textAlign: 'center', color: '#6b7280'}}>You are not currently
                            assigned to any active rotations.</div>
                    ) : (
                        <table className="data-table">
                            <thead>
                            <tr><th>Rotation Name</th><th>Team</th><th>Interval</th><th>Start Date</th></tr>
                            </thead>
                            <tbody>
                            {myRotations.map(r => (
                                <tr key={r.id}>
                                    <td><strong>{r.name}</strong></td>
                                    <td>{r.teams?.name || 'N/A'}</td>
                                    <td>{formatIntervalLabel(r.interval_unit, r.interval_count)}</td>
                                    <td>{r.start_date ? r.start_date.split('T')[0] : '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Overview;