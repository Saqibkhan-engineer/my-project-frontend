import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";

// ─── COMMITTEES TAB ────────────────────────────────────────────────────────────
function CommitteesTab() {
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editModal, setEditModal] = useState(null); // { committee, mode: 'members'|'groups' }
  const [unassignedSups, setUnassignedSups] = useState([]);
  const [unassignedGroups, setUnassignedGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [emailLoading, setEmailLoading] = useState(null);

  const fetchCommittees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/all`);
      if (res.ok) setCommittees(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchUnassigned = async () => {
    const [s, g, ag] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/admin/unassigned-supervisors`).then(r => r.ok ? r.json() : []),
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/admin/unassigned-groups`).then(r => r.ok ? r.json() : []),
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/groups/my-groups/0`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]);
    setUnassignedSups(Array.isArray(s) ? s : []);
    setUnassignedGroups(Array.isArray(g) ? g : []);
    // fetch all groups for reassignment
    const allRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/groups/my-groups/0`).catch(() => null);
    const allG = [];
    for (const c of committees) {
      for (const g2 of c.groups || []) allG.push(g2);
    }
    for (const g2 of (Array.isArray(g) ? g : [])) allG.push(g2);
    setAllGroups(allG);
  };

  useEffect(() => { fetchCommittees(); }, []);

  const handleAutoGenerate = async (reassign = false) => {
    if (!confirm(reassign ? "Reassign ALL groups to new committees?" : "Auto-generate new committees from unassigned supervisors?")) return;
    setGenerating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/auto-generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassignGroups: reassign }),
      });
      const d = await res.json();
      alert(d.message || "Done!");
      fetchCommittees();
    } catch (e) { alert("Error: " + e.message); }
    finally { setGenerating(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? All group assignments will be cleared.`)) return;
    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/${id}`, { method: "DELETE" });
    const d = await res.json();
    alert(d.message);
    fetchCommittees();
  };

  const handleSendEmail = async (id) => {
    setEmailLoading(id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/send-emails`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ committeeId: id }),
      });
      const d = await res.json();
      alert(d.message);
    } catch (e) { alert("Email error: " + e.message); }
    finally { setEmailLoading(null); }
  };

  const openEdit = async (committee, mode) => {
    await fetchUnassigned();
    setEditModal({ committee, mode, memberIds: [...committee.memberIds], groupIds: [...committee.groupIds] });
  };

  const handleSaveMembers = async () => {
    const { committee, memberIds } = editModal;
    if (memberIds.length < 3 || memberIds.length > 4) { alert("Need 3-4 members."); return; }
    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/${committee.id}/edit-members`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds }),
    });
    const d = await res.json();
    if (!res.ok) { alert(d.message); return; }
    alert("Members updated!");
    setEditModal(null);
    fetchCommittees();
  };

  const handleSaveGroups = async () => {
    const { committee, groupIds } = editModal;
    if (groupIds.length < 3 || groupIds.length > 6) { alert("Need 3-6 groups."); return; }
    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/${committee.id}/assign-groups`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupIds }),
    });
    const d = await res.json();
    if (!res.ok) { alert(d.message); return; }
    alert("Groups updated!");
    setEditModal(null);
    fetchCommittees();
  };

  const toggleId = (arr, id) => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  if (loading) return <div className="loading-state"><span className="spinner" /><p>Loading committees...</p></div>;

  return (
    <div>
      {/* Actions */}
      <div className="section-card" style={{ marginBottom: 20 }}>
        <h3 className="section-title">Committee Management</h3>
        <div className="action-buttons" style={{ flexWrap: "wrap", gap: 10 }}>
          <button className="action-btn-new primary" onClick={() => handleAutoGenerate(false)} disabled={generating}>
            {generating ? "Generating..." : "Auto Generate Committees"}
          </button>
          <button className="action-btn-new" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff" }}
            onClick={() => handleAutoGenerate(true)} disabled={generating}>
            Regenerate + Reassign Groups
          </button>
          <button className="action-btn-new" style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)", color: "#fff" }}
            onClick={async () => {
              if (!confirm("Send emails to ALL committee members and students?")) return;
              const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/send-emails`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
              const d = await res.json(); alert(d.message);
            }}>
            Send All Emails
          </button>
        </div>
      </div>

      {committees.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">—</div><h3>No Committees Yet</h3><p>Click "Auto Generate Committees" to get started.</p></div>
      ) : (
        <div className="proposals-list">
          {committees.map(c => (
            <div key={c.id} className="proposal-review-card">
              {/* Header */}
              <div className="proposal-header">
                <div className="proposal-info">
                  <h3>{c.name}</h3>
                  <div className="proposal-meta">
                    <span className="meta-badge domain">{c.members?.length || 0} Members</span>
                    <span className="meta-badge" style={{ background: "#dbeafe", color: "#2563eb" }}>{c.groups?.length || 0} Groups</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => openEdit(c, "members")} className="action-btn-new" style={{ fontSize: 12, padding: "6px 12px", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "#fff" }}>Edit Members</button>
                  <button onClick={() => openEdit(c, "groups")} className="action-btn-new" style={{ fontSize: 12, padding: "6px 12px", background: "linear-gradient(135deg,#0ea5e9,#0284c7)", color: "#fff" }}>Reassign Groups</button>
                  <button onClick={() => handleSendEmail(c.id)} className="action-btn-new" style={{ fontSize: 12, padding: "6px 12px", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff" }} disabled={emailLoading === c.id}>
                    {emailLoading === c.id ? "Sending..." : "Send Emails"}
                  </button>
                  <button onClick={() => handleDelete(c.id, c.name)} className="action-btn-new danger" style={{ fontSize: 12, padding: "6px 12px" }}>Delete</button>
                </div>
              </div>

              {/* Members */}
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Committee Members</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(c.members || []).map((m, i) => (
                    <div key={i} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", minWidth: 160 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", margin: 0 }}>{m.name}</p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0" }}>{m.designation || "Supervisor"}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {(m.expertise || []).map((e, j) => (
                          <span key={j} style={{ fontSize: 10, background: "#e0e7ff", color: "#4338ca", borderRadius: 4, padding: "1px 6px" }}>{e}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Groups */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Assigned Groups ({c.groups?.length || 0})</p>
                {(c.groups || []).length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No groups assigned yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(c.groups || []).map((g, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#4a7dff" }}>Group #{g.id}</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{g.studentRegs?.join(", ") || "—"}</span>
                        <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>Supervisor: {g.supervisorName || "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: 16, color: "#1e293b" }}>
              {editModal.mode === "members" ? `Edit Members — ${editModal.committee.name}` : `Reassign Groups — ${editModal.committee.name}`}
            </h3>

            {editModal.mode === "members" ? (
              <>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Select 3-4 supervisors. Currently selected: {editModal.memberIds.length}</p>
                {/* Current members */}
                {[...editModal.committee.members, ...unassignedSups].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i).map(s => (
                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}>
                    <input type="checkbox" checked={editModal.memberIds.includes(s.id)}
                      onChange={() => setEditModal(p => ({ ...p, memberIds: toggleId(p.memberIds, s.id) }))} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{s.name}</p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{s.designation} — {(s.expertise || []).join(", ")}</p>
                    </div>
                  </label>
                ))}
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="action-btn-new primary" onClick={handleSaveMembers}>Save Members</button>
                  <button className="action-btn-new" onClick={() => setEditModal(null)} style={{ background: "#f1f5f9", color: "#64748b" }}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Select 3-6 groups. Currently selected: {editModal.groupIds.length}</p>
                {[...editModal.committee.groups, ...unassignedGroups].filter((g, i, arr) => arr.findIndex(x => x.id === g.id) === i).map(g => (
                  <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}>
                    <input type="checkbox" checked={editModal.groupIds.includes(g.id)}
                      onChange={() => setEditModal(p => ({ ...p, groupIds: toggleId(p.groupIds, g.id) }))} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Group #{g.id}</p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{g.studentRegs?.join(", ")} — Supervisor: {g.supervisorName}</p>
                    </div>
                  </label>
                ))}
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="action-btn-new primary" onClick={handleSaveGroups}>Save Groups</button>
                  <button className="action-btn-new" onClick={() => setEditModal(null)} style={{ background: "#f1f5f9", color: "#64748b" }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminDashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", type: "home" },
    { id: "committees", label: "Committees", type: "users" },
    { id: "users", label: "User Management", type: "settings" },
  ];

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        role="admin"
        navItems={navItems}
      />

      <main className="main-content">
        {activeView === "dashboard" && (
          <div className="dashboard-home">
            <div className="welcome-banner" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)" }}>
              <div className="welcome-content">
                <h1>FYP Office Administration 🏢</h1>
                <p>Manage committees, users, and oversee the FYP process.</p>
              </div>
            </div>
            {/* We will add stats and quick actions here */}
             <div className="section-card">
              <h3 className="section-title">Admin Controls</h3>
              <p>Welcome to the new Admin Dashboard. Modules will be migrated here shortly.</p>
            </div>
          </div>
        )}

        {activeView === "committees" && (
          <div className="proposals-container">
             <div className="section-card">
              <div className="section-header">
                <h2 className="section-title">⚖️ Evaluation Committees</h2>
                <p className="section-subtitle">Manage FYP evaluation panels and group assignments</p>
              </div>
              <CommitteesTab />
            </div>
          </div>
        )}
        
        {activeView === "users" && (
          <div className="proposals-container">
             <div className="section-card">
              <div className="section-header">
                <h2 className="section-title">👥 User Management</h2>
                <p className="section-subtitle">Manage system users and access</p>
              </div>
              <p>User management module coming soon.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
