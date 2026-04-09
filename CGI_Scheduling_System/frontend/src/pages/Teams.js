import React, { useState } from 'react';

const DEFAULT_TEAM_FORM = { name: '', color: '#e31937', leadId: '', members: [], description: '' };

const Teams = ({ teams, users, isTeamAdmin, currentUser, fetchTeams, fetchUsers, showNotification, getTeamDisplayMembers, userLookup }) => {
    // Determine if current user is a Team Lead
    const isTeamLead = currentUser?.roles?.includes('Team Lead / Supervisor') || false;
    const isAdministrator = currentUser?.roles?.includes('Administrator') || false;
    
    // Check if current user is the lead of a specific team
    const isTeamOwner = (teamLeadId) => currentUser && String(currentUser.id) === String(teamLeadId);
    // ── LOCAL STATE ──────────────────────────────────────────────────────────
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [showEditTeamModal, setShowEditTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamFormData, setTeamFormData] = useState(DEFAULT_TEAM_FORM);
    const [viewingTeam, setViewingTeam] = useState(null);
    const [showViewTeamModal, setShowViewTeamModal] = useState(false);
    const [teamDeleteConfirm, setTeamDeleteConfirm] = useState({ open: false, teamId: null, teamName: '' });

    // Filters & Dropdowns
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [leadFilter, setLeadFilter] = useState([]);
    const [memberFilter, setMemberFilter] = useState([]);
    const [showLeadDropdown, setShowLeadDropdown] = useState(false);
    const [showMemberDropdown, setShowMemberDropdown] = useState(false);
    const [teamLeadFilterSearch, setTeamLeadFilterSearch] = useState('');
    const [teamMemberFilterSearch, setTeamMemberFilterSearch] = useState('');

    // Modal Dropdowns
    const [showModalLeadDropdown, setShowModalLeadDropdown] = useState(false);
    const [showModalMemberDropdown, setShowModalMemberDropdown] = useState(false);
    const [modalLeadSearch, setModalLeadSearch] = useState('');
    const [modalMemberSearch, setModalMemberSearch] = useState('');

    // ── STYLE HELPERS ─────────────────────────────────────────────────────────
    const inputStyle = () => ({ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' });
    const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' };
    const fieldWrap = { marginBottom: '1rem' };

    // ── HANDLERS ──────────────────────────────────────────────────────────────
    const closeTeamModal = () => { setShowCreateTeamModal(false); setShowEditTeamModal(false); setEditingTeam(null); setShowModalMemberDropdown(false); };

    const openCreateTeam = () => {
        if (!isTeamAdmin) { showNotification('Employees cannot create teams. Contact an administrator.', 'error'); return; }
        if (isTeamLead && !isAdministrator) { showNotification('Team Leads cannot create teams. Contact an administrator.', 'error'); return; }
        setTeamFormData(DEFAULT_TEAM_FORM); setShowCreateTeamModal(true);
    };

    const openViewTeam = (team) => { setViewingTeam(team); setShowViewTeamModal(true); };

    const openEditTeam = (team) => {
        if (!isTeamAdmin) { showNotification('Employees cannot edit teams. Contact an administrator.', 'error'); return; }
        if (isTeamLead && !isAdministrator && !isTeamOwner(team.lead_id)) { showNotification('Access Denied: You can only edit your own team.', 'error'); return; }

        // NEW: Dynamically calculate current members based on the relational database
        // We filter out the lead_id so they don't accidentally appear in the standard members checkbox list
        const allCurrentMembers = getTeamDisplayMembers(team);
        const standardMembers = allCurrentMembers.filter(id => String(id) !== String(team.lead_id));

        setTeamFormData({
            name: team.name,
            color: team.color || '#e31937',
            leadId: team.lead_id || '',
            members: standardMembers, // Load the dynamically calculated members here!
            description: team.description || ''
        });

        setEditingTeam(team);
        setShowEditTeamModal(true);
    };

    const handleTeamFieldChange = (field, value) => {
        setTeamFormData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'leadId') { newData.members = newData.members.filter(m => m !== String(value)); }
            return newData;
        });
    };

    const handleSaveTeam = async (e) => {
        e.preventDefault();
        const method = editingTeam ? 'PUT' : 'POST';
        const url = editingTeam ? `/api/teams/${editingTeam.id}` : '/api/teams';
        const token = localStorage.getItem('token');

        try {
            const r = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(teamFormData)
            });

            if (r.ok) {
                await fetchTeams();
                await fetchUsers();
                closeTeamModal();
                showNotification('Team and member assignments updated successfully.');
            } else {
                const errorData = await r.json();
                showNotification(errorData.error || 'Failed to save team. Please try again.', 'error');
            }
        } catch (error) {
            showNotification('Network error. Please try again.', 'error');
        }
    };

    const handleDeleteTeam = (id) => {
        const team = teams.find(t => t.id === id);
        setTeamDeleteConfirm({ open: true, teamId: id, teamName: team ? team.name : '' });
    };

    const handleConfirmDeleteTeam = async () => {
        const { teamId } = teamDeleteConfirm;
        const token = localStorage.getItem('token');
        setTeamDeleteConfirm({ open: false, teamId: null, teamName: '' });
        try {
            const r = await fetch(`/api/teams/${teamId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (r.ok) { fetchTeams(); showNotification('Team deleted successfully.'); }
            else { const data = await r.json(); showNotification(data.error || 'Failed to delete team.', 'error'); }
        } catch { showNotification('Network error. Please try again.', 'error'); }
    };

    // ── RENDER HELPERS ────────────────────────────────────────────────────────
    const filteredTeams = teams.filter(t => {
        const leadName = t.lead?.name?.toLowerCase() || '';
        const teamMemberIds = getTeamDisplayMembers(t);
        const memberNames = teamMemberIds.map(id => userLookup[id]?.name || '').join(' ').toLowerCase();
        const matchesSearch = t.name.toLowerCase().includes(teamSearchTerm.toLowerCase()) || leadName.includes(teamSearchTerm.toLowerCase()) || memberNames.includes(teamSearchTerm.toLowerCase());
        const matchesLead = leadFilter.length === 0 || leadFilter.includes(String(t.lead_id));
        const matchesMembers = memberFilter.length === 0 || memberFilter.some(id => teamMemberIds.includes(id));
        return matchesSearch && matchesLead && matchesMembers;
    });

    const TeamDeleteConfirmModal = () => !teamDeleteConfirm.open ? null : (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', maxWidth: '420px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>⚠</div>
                    <div><h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>Delete Team</h3><p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Are you sure you want to delete <strong>{teamDeleteConfirm.teamName}</strong>?</p></div>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', background: '#f9fafb', borderRadius: '6px', padding: '0.75rem', margin: '0 0 1.5rem' }}>This will permanently remove the team. Members assigned to this team will become unassigned.</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setTeamDeleteConfirm({ open: false, teamId: null, teamName: '' })} style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                    <button onClick={handleConfirmDeleteTeam} style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: 'none', background: '#e31937', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Delete Team</button>
                </div>
            </div>
        </div>
    );

    return (
        <div>
            <TeamDeleteConfirmModal />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#111827' }}>Team Management</h2>
                {isTeamAdmin && !isTeamLead ? (
                    <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={openCreateTeam}>+ Create Team</button>
                ) : null}
            </div>

            {/* Team Search & Filter */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ flex: 2 }}>
                    <input type="text" placeholder="Search team name, lead, or members..." value={teamSearchTerm} onChange={e => setTeamSearchTerm(e.target.value)} style={{ ...inputStyle(), marginBottom: 0 }} />
                </div>
                {/* Lead Dropdown */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <button type="button" onClick={() => setShowLeadDropdown(!showLeadDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {leadFilter.length === 0 ? 'All Leads' : `${leadFilter.length} Selected`}<span>{showLeadDropdown ? '▲' : '▼'}</span>
                    </button>
                    {showLeadDropdown && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                            <input type="text" placeholder="Search leads..." value={teamLeadFilterSearch} onChange={e => setTeamLeadFilterSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem', fontSize: '0.75rem' }} />
                            {users.filter(u => u.name.toLowerCase().includes(teamLeadFilterSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={leadFilter.includes(String(u.id))} onChange={() => { const id = String(u.id); setLeadFilter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }} />
                                    {u.name}
                                </label>
                            ))}
                            {leadFilter.length > 0 && <button onClick={() => setLeadFilter([])} style={{ width: '100%', marginTop: '5px', fontSize: '0.7rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>✕ Clear All</button>}
                        </div>
                    )}
                </div>
                {/* Member Dropdown */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <button type="button" onClick={() => setShowMemberDropdown(!showMemberDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {memberFilter.length === 0 ? 'All Members' : `${memberFilter.length} Selected`}<span>{showMemberDropdown ? '▲' : '▼'}</span>
                    </button>
                    {showMemberDropdown && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                            <input type="text" placeholder="Search members..." value={teamMemberFilterSearch} onChange={e => setTeamMemberFilterSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem', fontSize: '0.75rem' }} />
                            {users.filter(u => u.name.toLowerCase().includes(teamMemberFilterSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={memberFilter.includes(String(u.id))} onChange={() => { const id = String(u.id); setMemberFilter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }} />
                                    {u.name}
                                </label>
                            ))}
                            {memberFilter.length > 0 && <button onClick={() => setMemberFilter([])} style={{ width: '100%', marginTop: '5px', fontSize: '0.7rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>✕ Clear All</button>}
                        </div>
                    )}
                </div>
            </div>

            <div className="enterprise-card no-padding">
                <table className="data-table">
                    <thead>
                    <tr><th>Color</th><th>Team Name</th><th>Lead</th><th>Members</th><th>Description</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                    {filteredTeams.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No teams match these filters.</td></tr>
                    ) : filteredTeams.map(team => {
                        const members = getTeamDisplayMembers(team);
                        return (
                            <tr key={team.id}>
                                <td><div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: team.color || '#e31937', border: '1px solid #e5e7eb' }}/></td>
                                <td><strong>{team.name}</strong></td>
                                <td>{team.lead?.name || '—'}</td>
                                <td style={{minWidth: '180px'}}>
                                    <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>{members.length} Members</div>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                                        {members.slice(0, 3).map(id => <span key={id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#6b7280', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{userLookup[id]?.name ? userLookup[id].name.split(' ')[0] : 'User'}</span>)}
                                        {members.length > 3 && <button onClick={() => openViewTeam(team)} style={{ fontSize: '0.7rem', color: '#0369a1', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}>+{members.length - 3} more</button>}
                                    </div>
                                </td>
                                <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{team.description ? (team.description.substring(0, 50) + (team.description.length > 50 ? '...' : '')) : '—'}</td>
                                <td>
                                    <button onClick={() => openViewTeam(team)} style={{ marginRight: '0.5rem', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>View</button>
                                    {isTeamAdmin ? (
                                        <>
                                            {(isAdministrator || isTeamOwner(team.lead_id)) && (
                                                <button onClick={() => openEditTeam(team)} style={{ marginRight: '0.5rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Edit</button>
                                            )}
                                            {isAdministrator && (
                                                <button onClick={() => handleDeleteTeam(team.id)} style={{ background: '#fef2f2', color: '#e31937', border: '1px solid #fecaca', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Delete</button>
                                            )}
                                        </>
                                    ) : null}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Team Modal */}
            {(showCreateTeamModal || showEditTeamModal) && (
                <div className="modal-overlay" onClick={closeTeamModal}>
                    <div className="enterprise-card" style={{minWidth: '550px', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{margin: 0}}>{editingTeam ? 'Edit Team' : 'Create New Team'}</h2>
                            <button onClick={closeTeamModal} className="close-modal-btn">✕</button>
                        </div>
                        <form onSubmit={handleSaveTeam}>
                            <div style={fieldWrap}><label style={labelStyle}>Team Name</label><input style={inputStyle()} value={teamFormData.name} onChange={e => handleTeamFieldChange('name', e.target.value)} required /></div>
                            <div style={fieldWrap}>
                                <label style={labelStyle}>Team Color</label>
                                <input type="color" style={{ display: 'block', marginBottom: '1rem', width: '60px', height: '40px', border: 'none', background: 'none' }} value={teamFormData.color} onChange={e => handleTeamFieldChange('color', e.target.value)} />
                            </div>
                            {/* Team Lead */}
                            <div style={fieldWrap}>
                                <label style={labelStyle}>Team Lead</label>
                                <div style={{ position: 'relative' }}>
                                    <button type="button" onClick={() => setShowModalLeadDropdown(!showModalLeadDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {teamFormData.leadId ? (users.find(u => String(u.id) === String(teamFormData.leadId))?.name) : 'Select a lead'}<span>{showModalLeadDropdown ? '▲' : '▼'}</span>
                                    </button>
                                    {showModalLeadDropdown && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 110, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', maxHeight: '250px', overflowY: 'auto' }}>
                                            <input type="text" placeholder="Search leads..." value={modalLeadSearch} onChange={e => setModalLeadSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem' }} />
                                            {users.filter(u => u.name.toLowerCase().includes(modalLeadSearch.toLowerCase())).map(u => (
                                                <div key={u.id} onClick={() => { handleTeamFieldChange('leadId', u.id); setShowModalLeadDropdown(false); setModalLeadSearch(''); }} style={{ padding: '8px', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', background: String(teamFormData.leadId) === String(u.id) ? '#fef2f2' : 'transparent' }}>{u.name}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Members */}
                            <div style={fieldWrap}>
                                <label style={labelStyle}>Assign Members</label>
                                <div style={{ position: 'relative' }}>
                                    <button type="button" onClick={() => setShowModalMemberDropdown(!showModalMemberDropdown)} style={{ ...inputStyle(), textAlign: 'left', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {teamFormData.members.length === 0 ? 'Select members' : `${teamFormData.members.length} member(s) selected`}<span>{showModalMemberDropdown ? '▲' : '▼'}</span>
                                    </button>
                                    {showModalMemberDropdown && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', maxHeight: '300px', overflowY: 'auto' }}>
                                            <input type="text" placeholder="Search members to add..." value={modalMemberSearch} onChange={e => setModalMemberSearch(e.target.value)} style={{ ...inputStyle(), marginBottom: '8px', padding: '0.4rem' }} />
                                            <div style={{ paddingBottom: '8px', borderBottom: '1px solid #f3f4f6', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                                <button type="button" onClick={() => handleTeamFieldChange('members', [])} style={{ fontSize: '0.75rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>✕ Clear All</button>
                                                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{teamFormData.members.length} selected</span>
                                            </div>
                                            {users
                                                .filter(u => u.name.toLowerCase().includes(modalMemberSearch.toLowerCase()))
                                                .filter(u => String(u.id) !== String(teamFormData.leadId))
                                                // NEW: Sort selected members to the top, then alphabetically
                                                .sort((a, b) => {
                                                    const aSelected = teamFormData.members.includes(String(a.id));
                                                    const bSelected = teamFormData.members.includes(String(b.id));

                                                    if (aSelected && !bSelected) return -1; // Move 'a' up
                                                    if (!aSelected && bSelected) return 1;  // Move 'b' up

                                                    // If both are selected or both are unselected, sort alphabetically by name
                                                    return (a.name || '').localeCompare(b.name || '');
                                                })
                                                .map(u => (
                                                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '6px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                        <input type="checkbox" checked={teamFormData.members.includes(String(u.id))} onChange={() => { const id = String(u.id); handleTeamFieldChange('members', teamFormData.members.includes(id) ? teamFormData.members.filter(m => m !== id) : [...teamFormData.members, id]); }} />
                                                        {u.name}
                                                    </label>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={fieldWrap}><label style={labelStyle}>Description</label><textarea style={inputStyle()} rows="3" value={teamFormData.description} onChange={e => handleTeamFieldChange('description', e.target.value)} /></div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Team</button>
                                <button type="button" onClick={closeTeamModal} className="btn-cancel" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Team Modal */}
            {showViewTeamModal && (
                <div className="modal-overlay" onClick={() => setShowViewTeamModal(false)}>
                    <div className="modal-content" style={{ minWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Team Details</h2>
                            <button onClick={() => setShowViewTeamModal(false)} className="close-modal-btn">✕</button>
                        </div>
                        {viewingTeam && (() => {
                            const vMembers = getTeamDisplayMembers(viewingTeam);
                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: viewingTeam.color }} />
                                        <div><h3 style={{ margin: 0 }}>{viewingTeam.name}</h3><p style={{ margin: 0, color: '#6b7280' }}>ID: {viewingTeam.id}</p></div>
                                    </div>
                                    <div className="info-box"><label>Team Lead</label><p>{viewingTeam.lead?.name || 'No lead assigned'}</p></div>
                                    <div className="info-box">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: '#374151' }}>Team Members ({vMembers.length})</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                                            {vMembers.length > 0 ? vMembers.map(id => <span key={id} style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#4b5563', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 500 }}>{userLookup[id]?.name || 'Unknown User'}</span>) : <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No members assigned.</span>}
                                        </div>
                                    </div>
                                    <div className="info-box"><label>Description</label><p>{viewingTeam.description || 'No description provided.'}</p></div>
                                </div>
                            );
                        })()}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            {isTeamAdmin && (isAdministrator || isTeamOwner(viewingTeam?.lead_id)) && (
                                <button onClick={() => { setShowViewTeamModal(false); openEditTeam(viewingTeam); }} className="btn-primary" style={{ flex: 1 }}>Edit Team</button>
                            )}
                            <button onClick={() => setShowViewTeamModal(false)} className="btn-cancel" style={{ flex: 1 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Teams;