import React, { useEffect, useState } from 'react';

const INTERVAL_PRESET_OPTIONS = [
    { value: 'daily',    label: 'Daily',     unit: 'day',    count: 1 },
    { value: 'weekly',   label: 'Weekly',    unit: 'week',   count: 1 },
    { value: 'biweekly', label: 'Bi-Weekly', unit: 'biweek', count: 1 },
    { value: 'custom',   label: 'Custom' }
];

const INTERVAL_UNIT_OPTIONS = [
    { value: 'day',    label: 'Day(s)'     },
    { value: 'week',   label: 'Week(s)'    },
    { value: 'biweek', label: 'Bi-Week(s)' },
    { value: 'month',  label: 'Month(s)'   }
];

const getTodayDate = () => new Date().toISOString().split('T')[0];

const buildDefaultRotationForm = () => {
    const today = getTodayDate();
    return {
        rotation_type_id: '', name: '', team_id: '', location_id: '', start_date: today, end_date: today,
        interval_unit: 'week', interval_count: 1, status: 'active', assigned_member_ids: [],
        notes: '', allow_double_booking: false, escalation_tiers: ''
    };
};

const DEFAULT_ROTATION_DELETE_CONFIRM = { open: false, rotationId: null, rotationName: '' };
const DEFAULT_ROTATION_POPUP = { open: false, type: 'success', title: '', message: '' };

const Rotations = ({ rotations, teams, users, isRotationAdmin, fetchRotations, showNotification, userLookup, userIdLookup }) => {
    // ── LOCAL STATE ──────────────────────────────────────────────────────────
    const [rotationFormData, setRotationFormData] = useState(buildDefaultRotationForm());
    const [rotationTypes, setRotationTypes] = useState([]);
    const [rotationTypesLoading, setRotationTypesLoading] = useState(false);
    const [rotationTypesError, setRotationTypesError] = useState('');
    const [showCreateRotationModal, setShowCreateRotationModal] = useState(false);
    const [editingRotation, setEditingRotation] = useState(null);
    const [intervalPreset, setIntervalPreset] = useState('weekly');
    const [showRotationMemberDropdown, setShowRotationMemberDropdown] = useState(false);
    const [rotationMemberSearch, setRotationMemberSearch] = useState('');
    const [viewingRotation, setViewingRotation] = useState(null);
    const [showViewRotationModal, setShowViewRotationModal] = useState(false);
    const [rotationDeleteConfirm, setRotationDeleteConfirm] = useState(DEFAULT_ROTATION_DELETE_CONFIRM);
    const [rotationPopup, setRotationPopup] = useState(DEFAULT_ROTATION_POPUP);

    // Filters
    const [rotationSearchTerm, setRotationSearchTerm] = useState('');
    const [rotationTeamFilter, setRotationTeamFilter] = useState([]);
    const [rotationIntervalFilter, setRotationIntervalFilter] = useState('');
    const [showRotationTeamDropdown, setShowRotationTeamDropdown] = useState(false);
    const [rotationTeamFilterSearch, setRotationTeamFilterSearch] = useState('');

    useEffect(() => {
        let ignore = false;

        const fetchRotationTypes = async () => {
            setRotationTypesLoading(true);

            try {
                const token = localStorage.getItem('token');
                const endpoints = ['/api/rotation-types', '/api/rotations/types', '/api/rotations/meta/types'];
                let loadedTypes = null;
                let lastError = new Error('Unable to load rotation types.');

                for (const endpoint of endpoints) {
                    try {
                        const response = await fetch(endpoint, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await response.json().catch(() => ([]));

                        if (!response.ok) {
                            lastError = new Error(data.error || 'Unable to load rotation types.');
                            continue;
                        }

                        loadedTypes = Array.isArray(data) ? data : [];
                        break;
                    } catch (err) {
                        lastError = err;
                    }
                }

                if (!loadedTypes) {
                    throw lastError;
                }

                if (ignore) return;

                setRotationTypes(loadedTypes);
                setRotationTypesError('');
            } catch (err) {
                if (ignore) return;
                setRotationTypes([]);
                setRotationTypesError(err.message || 'Unable to load rotation types.');
            } finally {
                if (!ignore) setRotationTypesLoading(false);
            }
        };

        fetchRotationTypes();

        return () => {
            ignore = true;
        };
    }, []);

    // ── FORMATTERS & HELPERS ──────────────────────────────────────────────────
    const inferIntervalPreset = (unit, count) => {
        if (unit === 'day'    && count === 1) return 'daily';
        if (unit === 'week'   && count === 1) return 'weekly';
        if (unit === 'biweek' && count === 1) return 'biweekly';
        return 'custom';
    };

    const formatIntervalLabel = (unit, count) => {
        const b = { day: 'Daily', week: 'Weekly', biweek: 'Bi-Weekly', month: 'Monthly' }[unit] || unit;
        if (!count || count === 1) return b;
        return `Every ${count} ${unit === 'biweek' ? 'bi-week' : unit}${count > 1 ? 's' : ''}`;
    };

    const formatCoverageLabel = (rotation) => {
        const ids = Array.isArray(rotation.assigned_member_ids) ? rotation.assigned_member_ids : [];
        if (!ids.length) return '—';
        const names = ids.map(id => userLookup[id]?.name).filter(Boolean);
        if (!names.length) return `${ids.length} member${ids.length > 1 ? 's' : ''}`;
        if (names.length <= 3) return names.join(', ');
        return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
    };

    const formatRotationTeamName = (rotation) => rotation?.teams?.name || 'N/A';
    const formatRotationTypeName = (rotation) =>
        rotation?.rotation_types?.name ||
        rotationTypes.find(type => String(type.id) === String(rotation?.rotation_type_id))?.name ||
        '—';

    const getRotationAvailableMembers = (teamId, assignedIds = []) => {
        const assignedSet = new Set((assignedIds || []).map(id => String(id)));
        return users.filter(user => {
            const isAssigned = assignedSet.has(String(user.id));
            const isOnSelectedTeam = user.team_memberships?.some(t => String(t.id) === String(teamId));
            return isAssigned || isOnSelectedTeam;
        });
    };

    const getRotationMemberNames = (rotation) => {
        const ids = Array.isArray(rotation?.assigned_member_ids) ? rotation.assigned_member_ids : [];
        return ids.map(id => userLookup[id]?.name).filter(Boolean);
    };

    const formatDateValue = (value) => value ? String(value).split('T')[0] : '-';

    const formatEscalationTiersLabel = (value) => {
        if (!value) return 'None';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'string') return value;
        return JSON.stringify(value);
    };

    // ── HANDLERS ──────────────────────────────────────────────────────────────
    const resetRotationForm = () => {
        setRotationFormData(buildDefaultRotationForm());
        setEditingRotation(null);
        setIntervalPreset('weekly');
        setShowRotationMemberDropdown(false);
        setRotationMemberSearch('');
    };

    const closeRotationPopup = () => setRotationPopup(DEFAULT_ROTATION_POPUP);
    const showRotationPopupModal = (type, title, message) => setRotationPopup({ open: true, type, title, message });

    const openCreateRotation = () => {
        if (!isRotationAdmin) {
            showRotationPopupModal('error', 'Access denied', 'You do not have permission to create rotations.');
            return;
        }
        closeViewRotation();
        closeRotationPopup();
        setRotationDeleteConfirm(DEFAULT_ROTATION_DELETE_CONFIRM);
        resetRotationForm();
        setShowCreateRotationModal(true);
    };

    const closeEditRotation = () => {
        setShowCreateRotationModal(false);
        resetRotationForm();
        closeRotationPopup();
    };

    const closeViewRotation = () => {
        setViewingRotation(null);
        setShowViewRotationModal(false);
    };

    const handleSaveRotation = async (e) => {
        e.preventDefault();
        closeRotationPopup();
        const isEditing = Boolean(editingRotation);
        const errorTitle = isEditing ? 'Unable to update rotation' : 'Unable to create rotation';

        if (!rotationFormData.rotation_type_id) return showRotationPopupModal('error', errorTitle, 'Rotation type is required.');
        if (!rotationFormData.name.trim()) return showRotationPopupModal('error', errorTitle, 'Rotation name is required.');
        if (!rotationFormData.team_id) return showRotationPopupModal('error', errorTitle, 'Assigned team is required.');
        if (!rotationFormData.start_date) return showRotationPopupModal('error', errorTitle, 'Start date is required.');
        if (!rotationFormData.end_date) return showRotationPopupModal('error', errorTitle, 'End date is required.');
        if (rotationFormData.end_date < rotationFormData.start_date) return showRotationPopupModal('error', errorTitle, 'End date must be on or after the start date.');

        const assignedMembers = (rotationFormData.assigned_member_ids || []).map(id => String(id)).filter(Boolean);
        if (!assignedMembers.length) return showRotationPopupModal('error', errorTitle, 'Assign at least one member.');

        const rotationTypeId = Number.parseInt(rotationFormData.rotation_type_id, 10);
        const intervalCount = Number.parseInt(rotationFormData.interval_count, 10);
        if (Number.isNaN(rotationTypeId)) return showRotationPopupModal('error', errorTitle, 'Rotation type is invalid.');
        if (Number.isNaN(intervalCount) || intervalCount < 1) return showRotationPopupModal('error', errorTitle, 'Rotation interval must be at least 1.');

        const payload = {
            ...rotationFormData,
            name: rotationFormData.name.trim(),
            rotation_type_id: rotationTypeId,
            team_id: rotationFormData.team_id,
            location_id: null,
            assigned_member_ids: assignedMembers.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id)),
            interval_count: intervalCount
        };

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `/api/rotations/${editingRotation.id}` : '/api/rotations';
        const token = localStorage.getItem('token');

        try {
            const r = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            const data = await r.json().catch(() => ({}));
            if (!r.ok) return showRotationPopupModal('error', errorTitle, Array.isArray(data.errors) ? data.errors.join(' ') : data.error || 'An error occurred while saving.');

            await fetchRotations();
            resetRotationForm();
            setShowCreateRotationModal(false);
            showRotationPopupModal('success', isEditing ? 'Rotation updated' : 'Rotation created', isEditing ? 'Rotation updated successfully.' : 'Rotation created successfully.');
        } catch { showRotationPopupModal('error', errorTitle, 'Network error. Please try again.'); }
    };

    const handleDeleteRotation = (rotation) => {
        closeRotationPopup();
        setRotationDeleteConfirm({ open: true, rotationId: rotation.id, rotationName: rotation.name || 'this rotation' });
    };

    const handleConfirmDeleteRotation = async () => {
        const { rotationId, rotationName } = rotationDeleteConfirm;
        setRotationDeleteConfirm(DEFAULT_ROTATION_DELETE_CONFIRM);
        if (!rotationId) return;

        try {
            const token = localStorage.getItem('token');
            const r = await fetch(`/api/rotations/${rotationId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            const data = await r.json().catch(() => ({}));

            if (!r.ok) return showRotationPopupModal('error', 'Unable to delete rotation', data.error || 'An error occurred.');

            await fetchRotations();
            if (editingRotation?.id === rotationId) resetRotationForm();
            if (viewingRotation?.id === rotationId) closeViewRotation();
            showRotationPopupModal('success', 'Rotation deleted', `Rotation "${rotationName}" deleted successfully.`);
        } catch { showRotationPopupModal('error', 'Unable to delete rotation', 'Network error. Please try again.'); }
    };

    const openViewRotation = (rotation) => {
        setViewingRotation(rotation); setShowViewRotationModal(true);
        closeRotationPopup(); setRotationDeleteConfirm(DEFAULT_ROTATION_DELETE_CONFIRM);
    };

    const openEditRotation = (rotation) => {
        const assignedMemberIds = Array.isArray(rotation.assigned_member_ids) ? rotation.assigned_member_ids.map(id => String(id)) : [];
        const existingAssignedMemberIds = assignedMemberIds.filter(id => userIdLookup[id]);
        const removedMemberCount = assignedMemberIds.length - existingAssignedMemberIds.length;

        setShowCreateRotationModal(false);
        setEditingRotation(rotation);
        setIntervalPreset(inferIntervalPreset(rotation.interval_unit, rotation.interval_count || 1));
        setShowRotationMemberDropdown(false);
        setRotationMemberSearch('');
        closeViewRotation();
        closeRotationPopup();
        setRotationDeleteConfirm(DEFAULT_ROTATION_DELETE_CONFIRM);

        setRotationFormData({
            rotation_type_id: rotation.rotation_type_id ? String(rotation.rotation_type_id) : '',
            name: rotation.name || '', team_id: rotation.team_id || '', location_id: '',
            start_date: rotation.start_date?.split('T')[0] || getTodayDate(),
            end_date: rotation.end_date?.split('T')[0] || rotation.start_date?.split('T')[0] || getTodayDate(),
            interval_unit: rotation.interval_unit || 'week', interval_count: rotation.interval_count || 1,
            status: rotation.status || 'active', assigned_member_ids: existingAssignedMemberIds,
            notes: rotation.notes || '', allow_double_booking: Boolean(rotation.allow_double_booking),
            escalation_tiers: Array.isArray(rotation.escalation_tiers) ? rotation.escalation_tiers.join(', ') : rotation.escalation_tiers ? JSON.stringify(rotation.escalation_tiers) : ''
        });

        if (removedMemberCount > 0) showNotification('Some previously assigned members no longer exist. Please review members.', 'error');
    };

    // ── RENDER HELPERS ────────────────────────────────────────────────────────
    const availableMembers = getRotationAvailableMembers(rotationFormData.team_id, rotationFormData.assigned_member_ids);
    const filteredAvailableMembers = availableMembers.filter(u => {
        const query = rotationMemberSearch.trim().toLowerCase();
        if (!query) return true;
        return ((u.name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query) || (u.username || '').toLowerCase().includes(query));
    });

    const filteredRotations = rotations.filter(r => {
        const query = rotationSearchTerm.toLowerCase();
        const teamName = (r.teams?.name || '').toLowerCase();
        const rotationTypeName = formatRotationTypeName(r).toLowerCase();
        const matchesSearch = (r.name || '').toLowerCase().includes(query) || teamName.includes(query) || rotationTypeName.includes(query);
        const matchesTeam = rotationTeamFilter.length === 0 || rotationTeamFilter.includes(String(r.team_id));
        const matchesInterval = !rotationIntervalFilter || r.interval_unit === rotationIntervalFilter;
        return matchesSearch && matchesTeam && matchesInterval;
    });

    const RotationPopupModalComponent = () => !rotationPopup.open ? null : (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeRotationPopup}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', maxWidth: '420px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: rotationPopup.type === 'success' ? '#ecfdf5' : '#fee2e2', color: rotationPopup.type === 'success' ? '#065f46' : '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>
                        {rotationPopup.type === 'success' ? 'OK' : '!'}
                    </div>
                    <div><h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>{rotationPopup.title}</h3><p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>{rotationPopup.message}</p></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={closeRotationPopup} style={{ minWidth: '120px', padding: '0.7rem 1rem', borderRadius: '6px', border: 'none', background: rotationPopup.type === 'success' ? '#065f46' : '#e31937', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Close</button>
                </div>
            </div>
        </div>
    );

    const RotationDeleteConfirmModalComponent = () => !rotationDeleteConfirm.open ? null : (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', maxWidth: '420px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, flexShrink: 0 }}>!</div>
                    <div><h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>Delete Rotation</h3><p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Are you sure you want to delete <strong>{rotationDeleteConfirm.rotationName || 'this rotation'}</strong>?</p></div>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', background: '#f9fafb', borderRadius: '6px', padding: '0.75rem', margin: '0 0 1.5rem' }}>This action cannot be undone. The rotation schedule and its configuration will be permanently removed.</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setRotationDeleteConfirm(DEFAULT_ROTATION_DELETE_CONFIRM)} style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                    <button onClick={handleConfirmDeleteRotation} style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: 'none', background: '#e31937', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Delete Rotation</button>
                </div>
            </div>
        </div>
    );

    return (
        <div>
            <RotationPopupModalComponent />
            <RotationDeleteConfirmModalComponent />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#111827' }}>Rotation Management</h2>
                {isRotationAdmin ? (
                    <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={openCreateRotation}>+ Create Rotation</button>
                ) : null}
            </div>

            <div className="enterprise-card no-padding">
                <div style={{ display: 'flex', gap: '1rem', padding: '1rem', alignItems: 'center', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                    <div style={{ flex: 2, minWidth: '180px' }}>
                        <input type="text" placeholder="Search rotation name, type, or team..." value={rotationSearchTerm} onChange={e => setRotationSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                        <button type="button" onClick={() => setShowRotationTeamDropdown(!showRotationTeamDropdown)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {rotationTeamFilter.length === 0 ? 'All Teams' : `${rotationTeamFilter.length} Selected`}<span>{showRotationTeamDropdown ? '▲' : '▼'}</span>
                        </button>
                        {showRotationTeamDropdown && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                                <input type="text" placeholder="Search..." value={rotationTeamFilterSearch} onChange={e => setRotationTeamFilterSearch(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '8px', boxSizing: 'border-box' }} />
                                {teams.filter(t => t.name.toLowerCase().includes(rotationTeamFilterSearch.toLowerCase())).map(t => (
                                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                                        <input type="checkbox" checked={rotationTeamFilter.includes(String(t.id))} onChange={() => { const id = String(t.id); setRotationTeamFilter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }} />
                                        {t.name}
                                    </label>
                                ))}
                                {rotationTeamFilter.length > 0 && <button onClick={() => setRotationTeamFilter([])} style={{ width: '100%', marginTop: '5px', fontSize: '0.7rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>✕ Clear All</button>}
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: '130px' }}>
                        <select value={rotationIntervalFilter} onChange={e => setRotationIntervalFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', background: '#fff', cursor: 'pointer' }}>
                            <option value="">All Intervals</option>
                            <option value="day">Daily</option>
                            <option value="week">Weekly</option>
                            <option value="biweek">Bi-Weekly</option>
                            <option value="month">Monthly</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    {(rotationSearchTerm || rotationTeamFilter.length > 0 || rotationIntervalFilter) && (
                        <button onClick={() => { setRotationSearchTerm(''); setRotationTeamFilter([]); setRotationIntervalFilter(''); }} style={{ fontSize: '0.75rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>✕ Clear Filters</button>
                    )}
                </div>
                <table className="data-table">
                    <thead><tr><th>Rotation Name</th><th>Type</th><th>Team</th><th>Coverage</th><th>Interval</th><th>Start Date</th><th>End Date</th><th>Actions</th></tr></thead>
                    <tbody>
                    {filteredRotations.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No rotations match these filters.</td></tr> : filteredRotations.map(r => (
                        <tr key={r.id}>
                            <td><strong>{r.name || '-'}</strong></td>
                            <td>{formatRotationTypeName(r)}</td>
                            <td>{r.teams?.name || 'N/A'}</td>
                            <td>{formatCoverageLabel(r)}</td>
                            <td>{formatIntervalLabel(r.interval_unit, r.interval_count || 1)}</td>
                            <td>{r.start_date ? r.start_date.split('T')[0] : '—'}</td>
                            <td>{formatDateValue(r.end_date)}</td>
                            <td>
                                <button onClick={() => openViewRotation(r)} style={{ marginRight: '0.5rem', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>View</button>
                                {isRotationAdmin && <button onClick={() => openEditRotation(r)} style={{ marginRight: '0.5rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Edit</button>}
                                {isRotationAdmin && <button onClick={() => handleDeleteRotation(r)} style={{ background: '#fef2f2', color: '#e31937', border: '1px solid #fecaca', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Delete</button>}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Rotation Modal */}
            {(showCreateRotationModal || editingRotation) && (
                <div className="modal-overlay" onClick={closeEditRotation}>
                    <div className="enterprise-card" style={{ width: 'min(680px, calc(100vw - 2rem))', minWidth: 0, maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{margin: 0}}>{editingRotation ? 'Edit Rotation' : 'Create Rotation'}</h2>
                            <button onClick={closeEditRotation} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
                        </div>
                        <form onSubmit={handleSaveRotation}>
                            <div className="form-group">
                                <label>Rotation Type <span style={{ color: '#e31937' }}>*</span></label>
                                <select className="enterprise-input" value={rotationFormData.rotation_type_id} onChange={e => setRotationFormData(prev => ({ ...prev, rotation_type_id: e.target.value }))} required>
                                    <option value="">
                                        {rotationTypesLoading ? 'Loading rotation types...' : rotationTypes.length === 0 ? 'No rotation types available' : 'Select rotation type'}
                                    </option>
                                    {rotationTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                                </select>
                                {rotationTypesError && <p style={{ margin: '0.35rem 0 0', color: '#e31937', fontSize: '0.75rem' }}>{rotationTypesError}</p>}
                            </div>
                            <div className="form-group">
                                <label>Rotation Name <span style={{ color: '#e31937' }}>*</span></label>
                                <input className="enterprise-input" placeholder="Enter a custom rotation name" value={rotationFormData.name} onChange={e => setRotationFormData({ ...rotationFormData, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Assigned Team <span style={{ color: '#e31937' }}>*</span></label>
                                <select className="enterprise-input" value={rotationFormData.team_id} onChange={e => { setRotationFormData({ ...rotationFormData, team_id: e.target.value, assigned_member_ids: [] }); setShowRotationMemberDropdown(false); setRotationMemberSearch(''); }} required>
                                    <option value="">Select team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Assigned Members <span style={{ color: '#e31937' }}>*</span></label>
                                {availableMembers.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{rotationFormData.team_id ? 'No members are currently available for this team.' : 'Select a team to load members.'}</p> : (
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <button type="button" onClick={() => setShowRotationMemberDropdown(!showRotationMemberDropdown)} style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', boxSizing: 'border-box', textAlign: 'left' }}>
                                            {rotationFormData.assigned_member_ids.length === 0 ? 'Select members' : `${rotationFormData.assigned_member_ids.length} member(s) selected`}<span>{showRotationMemberDropdown ? '▲' : '▼'}</span>
                                        </button>
                                        {rotationFormData.assigned_member_ids.length > 0 && (
                                            <div style={{ marginTop: '0.55rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.55rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', boxSizing: 'border-box' }}>
                                                {availableMembers.filter(u => rotationFormData.assigned_member_ids.includes(String(u.id))).map(u => (
                                                    <span key={`rotation-member-${u.id}`} style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '999px', padding: '0.22rem 0.6rem', fontSize: '0.76rem', color: '#4b5563', lineHeight: 1.4 }}>{u.name}</span>
                                                ))}
                                            </div>
                                        )}
                                        {showRotationMemberDropdown && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', maxHeight: '300px', overflowY: 'auto', boxSizing: 'border-box' }}>
                                                <input type="text" placeholder="Search members or users..." value={rotationMemberSearch} onChange={e => setRotationMemberSearch(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '8px', boxSizing: 'border-box' }} />
                                                <div style={{ paddingBottom: '8px', borderBottom: '1px solid #f3f4f6', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <button type="button" onClick={() => setRotationFormData({ ...rotationFormData, assigned_member_ids: [] })} style={{ fontSize: '0.75rem', color: '#e31937', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>✕ Clear All</button>
                                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{rotationFormData.assigned_member_ids.length} selected</span>
                                                </div>
                                                {filteredAvailableMembers.length === 0 ? (
                                                    <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.8rem' }}>No members match this search.</p>
                                                ) : filteredAvailableMembers.map(u => {
                                                    const isSelected = rotationFormData.assigned_member_ids.includes(String(u.id));
                                                    return (
                                                        <label key={u.id} style={{ display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr)', alignItems: 'center', columnGap: '0.6rem', padding: '0.5rem 0.4rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', borderRadius: '6px', background: isSelected ? '#fef2f2' : 'transparent' }}>
                                                            <input type="checkbox" checked={isSelected} onChange={() => { const id = String(u.id); setRotationFormData(prev => ({ ...prev, assigned_member_ids: prev.assigned_member_ids.includes(id) ? prev.assigned_member_ids.filter(memberId => memberId !== id) : [...prev.assigned_member_ids, id] })); }} style={{ margin: 0, width: '16px', height: '16px', justifySelf: 'center' }} />
                                                            <span style={{ display: 'block', minWidth: 0, lineHeight: 1.35, color: '#374151' }}>{u.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Rotation Interval <span style={{ color: '#e31937' }}>*</span></label>
                                <select className="enterprise-input" value={intervalPreset} onChange={e => { const v = e.target.value; setIntervalPreset(v); const p = INTERVAL_PRESET_OPTIONS.find(o => o.value === v); if (p?.unit) setRotationFormData(prev => ({ ...prev, interval_unit: p.unit, interval_count: p.count })); }} required>
                                    {INTERVAL_PRESET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                {intervalPreset === 'custom' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '0.6rem' }}>
                                        <input className="enterprise-input" type="number" min="1" value={rotationFormData.interval_count} onChange={e => setRotationFormData({ ...rotationFormData, interval_count: e.target.value })} />
                                        <select className="enterprise-input" value={rotationFormData.interval_unit} onChange={e => setRotationFormData({ ...rotationFormData, interval_unit: e.target.value })}>
                                            {INTERVAL_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Start Date <span style={{ color: '#e31937' }}>*</span></label>
                                    <input className="enterprise-input" type="date" value={rotationFormData.start_date} onChange={e => { const nextStartDate = e.target.value; setRotationFormData(prev => ({ ...prev, start_date: nextStartDate, end_date: !prev.end_date || prev.end_date < nextStartDate ? nextStartDate : prev.end_date })); }} required />
                                </div>
                                <div className="form-group">
                                    <label>End Date <span style={{ color: '#e31937' }}>*</span></label>
                                    <input className="enterprise-input" type="date" min={rotationFormData.start_date || undefined} value={rotationFormData.end_date} onChange={e => setRotationFormData({ ...rotationFormData, end_date: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-group"><label>Notes / Description</label><textarea className="enterprise-input" rows="3" value={rotationFormData.notes} onChange={e => setRotationFormData({ ...rotationFormData, notes: e.target.value })} /></div>
                            <div className="form-group"><label>Escalation Tiers (optional)</label><textarea className="enterprise-input" rows="2" placeholder="Tier 1, Tier 2 or JSON" value={rotationFormData.escalation_tiers} onChange={e => setRotationFormData({ ...rotationFormData, escalation_tiers: e.target.value })} /><p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.35rem' }}>Comma-separated list or JSON array.</p></div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="checkbox" checked={rotationFormData.allow_double_booking} onChange={e => setRotationFormData({ ...rotationFormData, allow_double_booking: e.target.checked })} />
                                <span style={{ fontSize: '0.85rem', color: '#374151' }}>Allow double-booking (optional)</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingRotation ? 'Update Rotation' : 'Create Rotation'}</button>
                                <button type="button" onClick={closeEditRotation} className="btn-cancel" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Rotation Modal */}
            {showViewRotationModal && viewingRotation && (
                <div className="modal-overlay" onClick={closeViewRotation}>
                    <div className="modal-content" style={{ minWidth: '560px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Rotation Details</h2>
                            <button onClick={closeViewRotation} className="close-modal-btn">×</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="info-box"><label>Rotation Type</label><p>{formatRotationTypeName(viewingRotation)}</p></div>
                            <div className="info-box"><label>Rotation Name</label><p>{viewingRotation.name || '—'}</p></div>
                            <div className="info-box"><label>Team</label><p>{formatRotationTeamName(viewingRotation)}</p></div>
                            <div className="info-box"><label>Interval</label><p>{formatIntervalLabel(viewingRotation.interval_unit, viewingRotation.interval_count || 1)}</p></div>
                            <div className="info-box"><label>Start Date</label><p>{viewingRotation.start_date ? viewingRotation.start_date.split('T')[0] : '—'}</p></div>
                            <div className="info-box"><label>Status</label><p>{viewingRotation.status || 'active'}</p></div>
                            <div className="info-box"><label>End Date</label><p>{formatDateValue(viewingRotation.end_date)}</p></div>
                            <div className="info-box"><label>Double Booking</label><p>{viewingRotation.allow_double_booking ? 'Allowed' : 'Not allowed'}</p></div>
                            <div className="info-box" style={{ gridColumn: 'span 2' }}><label>Coverage</label><p>{formatCoverageLabel(viewingRotation)}</p></div>
                            <div className="info-box" style={{ gridColumn: 'span 2' }}>
                                <label>Assigned Members</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.6rem' }}>
                                    {getRotationMemberNames(viewingRotation).length > 0 ? getRotationMemberNames(viewingRotation).map((name, index) => <span key={`${viewingRotation.id}-${name}-${index}`} style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#4b5563', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 500 }}>{name}</span>) : <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No members assigned.</span>}
                                </div>
                            </div>
                            <div className="info-box" style={{ gridColumn: 'span 2' }}><label>Escalation Tiers</label><p>{formatEscalationTiersLabel(viewingRotation.escalation_tiers)}</p></div>
                            <div className="info-box" style={{ gridColumn: 'span 2' }}><label>Notes</label><p>{viewingRotation.notes || 'No notes provided.'}</p></div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            {isRotationAdmin && (
                                <button onClick={() => openEditRotation(viewingRotation)} className="btn-primary" style={{ flex: 1 }}>Edit Rotation</button>
                            )}
                            <button onClick={closeViewRotation} className="btn-cancel" style={{ flex: 1 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Rotations;
