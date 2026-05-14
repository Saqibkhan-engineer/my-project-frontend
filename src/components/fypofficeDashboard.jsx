import { useState, useEffect } from "react";
import React from "react";
import { Sidebar } from "./Sidebar";

// ─── SUPERVISOR PROPOSALS TAB (PEC reviews supervisor ideas) ───────────────────
function SupervisorProjectsTab() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackInputs, setFeedbackInputs] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor-proposal/submitted`);
      if (res.ok) setProposals(await res.json());
      else setProposals([]);
    } catch (e) { console.error(e); setProposals([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProposals(); }, []);

  const handleApprove = async (id) => {
    const feedback = feedbackInputs[id] || "Approved by PEC.";
    setActionLoading(prev => ({ ...prev, [id]: "approve" }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor-proposal/approve/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (res.ok) { alert("Supervisor proposal approved!"); fetchProposals(); }
      else { const d = await res.json().catch(() => ({})); alert(d.message || "Failed to approve."); }
    } catch { alert("Server error."); }
    finally { setActionLoading(prev => ({ ...prev, [id]: null })); }
  };

  const handleRevise = async (id) => {
    const feedback = feedbackInputs[id];
    if (!feedback?.trim()) { alert("Please write feedback before requesting revision!"); return; }
    setActionLoading(prev => ({ ...prev, [id]: "revise" }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor-proposal/revise/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (res.ok) { alert("Revision requested. Supervisor will be notified."); fetchProposals(); }
      else { const d = await res.json().catch(() => ({})); alert(d.message || "Failed."); }
    } catch { alert("Server error."); }
    finally { setActionLoading(prev => ({ ...prev, [id]: null })); }
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <h2 className="section-title">Supervisor Project Ideas</h2>
        <p className="section-subtitle">
          {loading ? "Loading..." : `${proposals.length} proposal${proposals.length !== 1 ? "s" : ""} awaiting review`}
        </p>
      </div>

      {loading ? (
        <div className="loading-state"><span className="spinner" /><p>Loading supervisor proposals...</p></div>
      ) : proposals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">—</div>
          <h3>No Supervisor Proposals</h3>
          <p>No supervisor project ideas are pending review right now.</p>
        </div>
      ) : (
        <div className="proposals-list">
          {proposals.map(p => (
            <div key={p.id} className="proposal-review-card">
              <div className="proposal-header">
                <div className="proposal-info">
                  <h3>{p.title}</h3>
                  <div className="proposal-meta">
                    {p.domain && <span className="meta-badge domain">{p.domain}</span>}
                    <span className="meta-badge" style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>Under Review</span>
                  </div>
                </div>
              </div>

              {/* Supervisor Info */}
              <div className="student-info" style={{ marginBottom: 10 }}>
                <span>Supervisor: <strong>{p.supervisorName || `ID #${p.supervisorId}`}</strong></span>
                {p.supervisorEmail && <span>Email: {p.supervisorEmail}</span>}
              </div>

              {/* Scope */}
              {p.scope && (
                <p style={{ fontSize: 13, color: "#475569", margin: "6px 0 10px", lineHeight: 1.6 }}>
                  {p.scope}
                </p>
              )}

              {/* Modules */}
              {p.modules?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {p.modules.map((m, i) => (
                    <span key={i} style={{ fontSize: 11, background: "#e0e7ff", color: "#3730a3", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{m}</span>
                  ))}
                </div>
              )}

              {/* Feedback + Actions */}
              <div className="feedback-section">
                <label>Your Feedback / Comments</label>
                <textarea
                  placeholder="Write feedback for the supervisor..."
                  className="form-input"
                  rows="3"
                  value={feedbackInputs[p.id] || ""}
                  onChange={e => setFeedbackInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                />
                <div className="action-buttons-row">
                  <button
                    onClick={() => handleApprove(p.id)}
                    className="action-btn-new success"
                    disabled={!!actionLoading[p.id]}
                  >
                    {actionLoading[p.id] === "approve" ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleRevise(p.id)}
                    className="action-btn-new danger"
                    disabled={!!actionLoading[p.id]}
                  >
                    {actionLoading[p.id] === "revise" ? "Sending..." : "Request Revision"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export function OfficeDashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackInputs, setFeedbackInputs] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [previewProposal, setPreviewProposal] = useState(null);

  useEffect(() => { fetchSubmittedProposals(); }, []);

  const fetchSubmittedProposals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/pec/submitted`);
      if (res.ok) setProposals(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const pendingProposals = proposals.filter(p => p.status === "submitted");
  const approvedCount = proposals.filter(p => p.status === "approved").length;
  const rejectedCount = proposals.filter(p => p.status === "rejected").length;

  const handleApprove = async (id) => {
    const feedback = feedbackInputs[id] || "Proposal approved. Proceed to supervisor selection.";
    setActionLoading({ ...actionLoading, [id]: "approve" });
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/pec/approve/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      alert("Proposal Approved!");
      setFeedbackInputs({ ...feedbackInputs, [id]: "" });
      fetchSubmittedProposals();
    } catch (err) { alert("Failed to approve proposal"); }
    finally { setActionLoading({ ...actionLoading, [id]: null }); }
  };

  const handleReject = async (id) => {
    const feedback = feedbackInputs[id];
    if (!feedback) { alert("Please provide feedback before rejecting!"); return; }
    setActionLoading({ ...actionLoading, [id]: "reject" });
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/pec/reject/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      alert("Proposal rejected.");
      setFeedbackInputs({ ...feedbackInputs, [id]: "" });
      fetchSubmittedProposals();
    } catch (err) { alert("Failed to reject proposal"); }
    finally { setActionLoading({ ...actionLoading, [id]: null }); }
  };

  const navItems = [
    { id: "dashboard",           label: "Dashboard" },
    { id: "proposals",           label: "Student Proposals" },
    { id: "supervisor-projects", label: "Supervisor Ideas" },
  ];

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} setActiveView={setActiveView} onLogout={onLogout}
        isOpen={sidebarOpen} setIsOpen={setSidebarOpen} role="office" navItems={navItems} />

      <main className="main-content">
        {activeView === "dashboard" && (
          <div className="dashboard-home">
            <div className="welcome-banner">
              <h1>Welcome back, {user?.name || "PEC Admin"}</h1>
              <p>Review proposals and manage evaluation committees.</p>
            </div>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-icon">P</div>
                <div className="stat-info"><p className="stat-label">Pending Review</p><p className="stat-value">{pendingProposals.length}</p></div>
              </div>
              <div className="stat-card"><div className="stat-icon">✓</div>
                <div className="stat-info"><p className="stat-label">Approved</p><p className="stat-value">{approvedCount}</p></div>
              </div>
              <div className="stat-card"><div className="stat-icon">✗</div>
                <div className="stat-info"><p className="stat-label">Rejected</p><p className="stat-value">{rejectedCount}</p></div>
              </div>
            </div>
            <div className="section-card">
              <h3 className="section-title">Quick Actions</h3>
              <div className="action-buttons">
                <button className="action-btn-new primary" onClick={() => setActiveView("proposals")}>
                  Review Pending Proposals ({pendingProposals.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === "proposals" && (
          <div className="proposals-container">
            <div className="section-card">
              <div className="section-header">
                <h2 className="section-title">Review Proposals</h2>
                <p className="section-subtitle">Proposals awaiting your approval</p>
              </div>
              {loading ? (
                <div className="loading-state"><span className="spinner" /><p>Loading proposals...</p></div>
              ) : pendingProposals.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">—</div><h3>All Caught Up!</h3><p>No proposals pending review.</p></div>
              ) : (
                <div className="proposals-list">
                  {pendingProposals.map(p => (
                    <div key={p.id} className="proposal-review-card">
                      <div className="proposal-header">
                        <div className="proposal-info">
                          <h3>{p.title}</h3>
                          <div className="proposal-meta">
                            <span className="meta-badge domain">{p.domain || "N/A"}</span>
                            <span className={`meta-badge similarity ${p.highestSimilarity > 60 ? "high" : "low"}`}>
                              Similarity: {p.highestSimilarity || 0}%
                            </span>
                          </div>
                        </div>
                        {p.fileUrl && <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="download-btn-new">Download PDF</a>}
                      </div>
                      {p.description && (
                        <div style={{ marginBottom: 14 }}>
                          <button
                            onClick={() => setPreviewProposal(p)}
                            style={{ fontSize: 12, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Preview Full Proposal
                          </button>
                        </div>
                      )}
                      <div className="student-info">
                        <span>Student: {p.student?.user?.name || "Unknown"}</span>
                        <span>Email: {p.student?.user?.email || "N/A"}</span>
                        <span>Reg#: {p.student?.regNo || "N/A"}</span>
                      </div>
                      <div className="feedback-section">
                        <label>Your Feedback</label>
                        <textarea placeholder="Write feedback..." className="form-input" rows="3"
                          value={feedbackInputs[p.id] || ""}
                          onChange={e => setFeedbackInputs({ ...feedbackInputs, [p.id]: e.target.value })} />
                        <div className="action-buttons-row">
                          <button onClick={() => handleApprove(p.id)} className="action-btn-new success" disabled={actionLoading[p.id]}>
                            {actionLoading[p.id] === "approve" ? "Approving..." : "Approve"}
                          </button>
                          <button onClick={() => handleReject(p.id)} className="action-btn-new danger" disabled={actionLoading[p.id]}>
                            {actionLoading[p.id] === "reject" ? "Rejecting..." : "Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === "supervisor-projects" && (
          <div className="proposals-container">
            <SupervisorProjectsTab />
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {previewProposal && (
        <OfficePreviewModal proposal={previewProposal} onClose={() => setPreviewProposal(null)} />
      )}
    </div>
  );
}

// ─── OFFICE PROPOSAL PREVIEW MODAL ──────────────────────────────
function OfficePreviewModal({ proposal, onClose }) {
  if (!proposal) return null;
  const title = proposal.title || 'Untitled';
  const domain = proposal.domain || '';
  const description = proposal.description || '';
  const lines = description.split('\n');
  const isHeading = (t) => /^[A-Z][A-Z\s]{3,}:?$/.test(t) || /^(Abstract|Introduction|Scope|Objectives|Methodology|Modules|References|Conclusion|Background|Problem Statement|Tools|Technologies)/i.test(t);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: 'linear-gradient(135deg,#4a7dff,#6c5ce7)', borderRadius: '16px 16px 0 0', padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Proposal Preview</p>
            <h2 style={{ color: '#fff', fontSize: 19, fontWeight: 800, margin: '6px 0 0' }}>{title}</h2>
            {domain && <span style={{ display: 'inline-block', marginTop: 8, fontSize: 12, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '2px 10px', fontWeight: 600 }}>{domain}</span>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 28, flex: 1 }}>
          {!description ? <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>No description.</p> : (
            <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 14, color: '#1e293b', lineHeight: 1.8 }}>
              {lines.map((line, i) => {
                const t = line.trim();
                if (!t) return <div key={i} style={{ height: 10 }} />;
                if (isHeading(t)) return <h3 key={i} style={{ fontSize: 13, fontWeight: 800, color: '#4a7dff', textTransform: 'uppercase', letterSpacing: 0.8, margin: '22px 0 8px', paddingBottom: 6, borderBottom: '2px solid #e0e7ff' }}>{t}</h3>;
                return <p key={i} style={{ margin: '0 0 10px', color: '#334155' }}>{t}</p>;
              })}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4a7dff,#6c5ce7)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Close Preview</button>
        </div>
      </div>
    </div>
  );
}
