import { useState, useEffect, useRef } from "react";
import React from "react";
import { Sidebar } from "./Sidebar";
import io from "socket.io-client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";


const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000", { transports: ["websocket"] });

// ─── MY PROJECTS TAB (Supervisor posts ideas) ──────────────────────────────
function MyProjectsTab({ supervisorId }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', scope: '', modules: '', domain: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [projectRequests, setProjectRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [reqActing, setReqActing] = useState(null);

  const DOMAINS = ['AI', 'Web', 'Mobile', 'Cyber'];

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor-proposal/my/${supervisorId}`);
      if (res.ok) setProposals(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchProjectRequests = async () => {
    try {
      setReqLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/project-request/supervisor/${supervisorId}`);
      if (res.ok) setProjectRequests(await res.json());
    } catch (e) { console.error(e); }
    finally { setReqLoading(false); }
  };

  useEffect(() => { if (supervisorId) { fetchProposals(); fetchProjectRequests(); } }, [supervisorId]);

  const handleSubmit = async () => {
    if (!form.title || !form.domain) { alert('Title and Domain are required'); return; }
    setSubmitting(true);
    try {
      const modulesArr = form.modules ? form.modules.split(',').map(m => m.trim()).filter(Boolean) : [];
      let url = '/api/supervisor-proposal/submit';
      let method = 'POST';
      let body = { supervisorId: Number(supervisorId), ...form, modules: modulesArr };

      if (editingId) {
        url = `/api/supervisor-proposal/resubmit/${editingId}`;
        method = 'PATCH';
        body = { supervisorId: Number(supervisorId), ...form, modules: modulesArr };
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        alert(editingId ? 'Resubmitted successfully!' : 'Project idea submitted to PEC!');
        setForm({ title: '', scope: '', modules: '', domain: '' });
        setShowForm(false);
        setEditingId(null);
        fetchProposals();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.message || 'Submission failed');
      }
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSubmitting(false); }
  };

  const startEdit = (p) => {
    setForm({ title: p.title, scope: p.scope || '', modules: (p.modules || []).join(', '), domain: p.domain || '' });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleAcceptReq = async (reqId) => {
    setReqActing(reqId);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/project-request/accept/${reqId}`, { method: 'PATCH' });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { alert(d.message || 'Accepted! Group created.'); fetchProjectRequests(); }
      else alert(d.message || 'Failed to accept');
    } catch { alert('Server error'); }
    finally { setReqActing(null); }
  };

  const handleRejectReq = async (reqId) => {
    setReqActing(reqId);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/project-request/reject/${reqId}`, { method: 'PATCH' });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { alert('Request rejected.'); fetchProjectRequests(); }
      else alert(d.message || 'Failed');
    } catch { alert('Server error'); }
    finally { setReqActing(null); }
  };

  const statusColor = { submitted: '#d97706', approved: '#059669', revision: '#dc2626' };
  const statusBg   = { submitted: '#fef3c7', approved: '#d1fae5', revision: '#fee2e2' };
  const statusLabel = { submitted: 'Under Review', approved: 'Approved', revision: 'Needs Revision' };

  return (
    <div>
      {/* ── Submit / Edit Form ─────────────────────────────────────────── */}
      {showForm ? (
        <div className="section-card">
          <h3 className="section-title">{editingId ? 'Resubmit Revised Idea' : 'Post a New Project Idea'}</h3>
          <div className="form-group">
            <label className="form-label">Project Title *</label>
            <input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter project title" />
          </div>
          <div className="form-group">
            <label className="form-label">Domain *</label>
            <select className="form-input" value={form.domain} onChange={e => setForm(p => ({ ...p, domain: e.target.value }))}>
              <option value="">Select Domain</option>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Scope / Description</label>
            <textarea className="form-input" rows={4} value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} placeholder="Describe the project scope..." />
          </div>
          <div className="form-group">
            <label className="form-label">Modules (comma-separated)</label>
            <input className="form-input" value={form.modules} onChange={e => setForm(p => ({ ...p, modules: e.target.value }))} placeholder="e.g. Authentication, Dashboard, API" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="action-btn-new primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : editingId ? 'Resubmit to PEC' : 'Submit to PEC'}
            </button>
            <button className="back-btn" onClick={() => { setShowForm(false); setEditingId(null); setForm({ title: '', scope: '', modules: '', domain: '' }); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <button className="action-btn-new primary" onClick={() => setShowForm(true)}>+ Post New Project Idea</button>
        </div>
      )}

      {/* ── My Submitted Ideas ─────────────────────────────────────────── */}
      <div className="section-card">
        <h3 className="section-title">My Project Ideas</h3>
        {loading ? (
          <div className="loading-state"><span className="spinner" /><p>Loading...</p></div>
        ) : proposals.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">—</div><h3>No Ideas Yet</h3><p>Post your first project idea above.</p></div>
        ) : (
          <div className="proposals-list">
            {proposals.map(p => (
              <div key={p.id} className="proposal-review-card">
                <div className="proposal-header">
                  <div className="proposal-info">
                    <h3>{p.title}</h3>
                    <div className="proposal-meta">
                      {p.domain && <span className="meta-badge domain">{p.domain}</span>}
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[p.status] || '#64748b', background: statusBg[p.status] || '#f1f5f9', padding: '2px 10px', borderRadius: 20 }}>
                        {statusLabel[p.status] || p.status}
                      </span>
                    </div>
                  </div>
                </div>
                {p.scope && <p style={{ fontSize: 13, color: '#64748b', margin: '8px 0' }}>{p.scope.substring(0, 150)}{p.scope.length > 150 ? '...' : ''}</p>}
                {p.modules?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {p.modules.map((m, i) => <span key={i} style={{ fontSize: 11, background: '#e0e7ff', color: '#3730a3', borderRadius: 6, padding: '2px 8px' }}>{m}</span>)}
                  </div>
                )}
                {p.status === 'revision' && p.pecFeedback && (
                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>PEC Feedback (Revision Required):</p>
                    <p style={{ fontSize: 13, color: '#7f1d1d', margin: 0 }}>{p.pecFeedback}</p>
                  </div>
                )}
                {p.status === 'revision' && (
                  <button className="action-btn-new primary" onClick={() => startEdit(p)} style={{ fontSize: 13 }}>Edit & Resubmit</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Student Requests for My Projects ───────────────────────────── */}
      <div className="section-card" style={{ marginTop: 20 }}>
        <h3 className="section-title">Student Applications for My Projects</h3>
        {reqLoading ? (
          <div className="loading-state"><span className="spinner" /><p>Loading...</p></div>
        ) : projectRequests.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">—</div><h3>No Applications</h3><p>No students have applied to your projects yet.</p></div>
        ) : (
          <div className="proposals-list">
            {projectRequests.map(r => (
              <div key={r.id} className="proposal-review-card">
                <div className="proposal-header">
                  <div className="proposal-info">
                    <h3>Application #{r.id}</h3>
                    <div className="proposal-meta">
                      <span className="meta-badge domain">Project #{r.supervisorProposalId}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 10px', borderRadius: 20 }}>Pending</span>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>
                  <strong>Lead:</strong> {r.leadStudentName || `Student #${r.studentId}`} ({r.leadStudentReg})
                </p>
                {r.description && (
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 10, border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Why accept this request:</p>
                    <p style={{ fontSize: 13, color: '#334155', margin: 0 }}>{r.description}</p>
                  </div>
                )}
                {r.teamMembers && Object.values(r.teamMembers).filter(Boolean).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Team Members</p>
                    {Object.values(r.teamMembers).filter(Boolean).map((reg, i) => (
                      <span key={i} style={{ display: 'inline-block', marginRight: 8, fontSize: 12, fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>{reg}</span>
                    ))}
                  </div>
                )}
                <div className="action-buttons-row">
                  <button onClick={() => handleAcceptReq(r.id)} className="action-btn-new success" disabled={reqActing === r.id}>
                    {reqActing === r.id ? 'Processing...' : 'Accept & Create Group'}
                  </button>
                  <button onClick={() => handleRejectReq(r.id)} className="action-btn-new danger" disabled={reqActing === r.id}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestsTab({ supervisorId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [previewRequest, setPreviewRequest] = useState(null);

  useEffect(() => {
    if (!supervisorId) { setError("Supervisor not logged in."); setLoading(false); return; }
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor/requests/${supervisorId}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.message || "Failed")))
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(err => setError(typeof err === "string" ? err : "Cannot reach server."))
      .finally(() => setLoading(false));
  }, [supervisorId]);

  const handleAccept = async (requestId) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor/accept-request/${requestId}`, { method: "PATCH" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        alert(d.message || "Request accepted! Group created.");
      } else {
        alert(d.message || "Failed to accept.");
      }
    } catch { alert("Server error."); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (requestId) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor/cancel-request/${requestId}`, { method: "PATCH" });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        alert("Request declined.");
      } else {
        alert("Failed to cancel.");
      }
    } catch { alert("Server error."); }
    finally { setActionLoading(null); }
  };

  if (loading) return <div className="loading-state"><span className="spinner"></span><p>Loading requests…</p></div>;
  if (error) return <div className="empty-state"><div className="empty-icon">⚠️</div><h3>Failed to load</h3><p>{error}</p></div>;
  if (requests.length === 0) return <div className="empty-state"><div className="empty-icon">📋</div><h3>No Pending Requests</h3><p>You don't have any supervision requests at the moment.</p></div>;

  return (
    <div className="section-card">
      <div className="section-header">
        <h2 className="section-title">👨‍🎓 Student Supervision Requests</h2>
        <p className="section-subtitle">{requests.length} pending request{requests.length > 1 ? "s" : ""}</p>
      </div>
      <div className="proposals-list">
        {requests.map((r) => {
          const title = r.projectTitle || r.title || r.proposal?.title || "Untitled Project";
          const domain = r.domain || r.proposal?.domain || "";
          const description = r.description || r.proposal?.description || "";
          const teamMembers = r.teamMembers ? Object.values(r.teamMembers).filter(Boolean) : [];
          const isActing = actionLoading === r.id;

          return (
            <div key={r.id} className="proposal-review-card">
              <div className="proposal-header">
                <div className="proposal-info">
                  <h3>{title}</h3>
                  <div className="proposal-meta">
                    {domain && <span className="meta-badge domain">{domain}</span>}
                    <span className="meta-badge" style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>⏳ Pending</span>
                  </div>
                </div>
              </div>
              {description && <p className="proposal-description">{description}</p>}
              {teamMembers.length > 0 && (
                <div style={{ margin: "10px 0", padding: "10px", background: "#f8fafc", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Team Members (Reg Numbers)</p>
                  {teamMembers.map((reg, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4a7dff", display: "inline-block" }} />
                      <span style={{ fontSize: 13, color: "#334155", fontFamily: "monospace" }}>{reg}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="action-buttons-row" style={{ marginTop: 14 }}>
                {description && (
                  <button
                    onClick={() => setPreviewRequest(r)}
                    style={{ fontSize: 12, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Preview Proposal
                  </button>
                )}
                <button onClick={() => handleAccept(r.id)} className="action-btn-new success" disabled={isActing} style={{ opacity: isActing ? 0.6 : 1 }}>
                  {isActing ? "Processing…" : "✓ Accept"}
                </button>
                <button onClick={() => handleCancel(r.id)} className="action-btn-new danger" disabled={isActing}>
                  ✗ Decline
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {previewRequest && <SupPreviewModal request={previewRequest} onClose={() => setPreviewRequest(null)} />}
    </div>
  );
}

// ─── SUPERVISOR PROPOSAL PREVIEW MODAL ──────────────────────────────
function SupPreviewModal({ request, onClose }) {
  if (!request) return null;
  const title = request.projectTitle || request.title || request.proposal?.title || 'Untitled';
  const domain = request.domain || request.proposal?.domain || '';
  const description = request.description || request.proposal?.description || '';
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

// ─── CONTRIBUTOR COMMITS MODAL ─────────────────────────────────────────
function ContributorCommitsModal({ login, commits, allTimeStats, color, onClose }) {
  if (!login) return null;
  const stats = allTimeStats?.[login] || {};
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(15,23,42,0.8)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div style={{ background:'#fff',borderRadius:16,width:'100%',maxWidth:720,maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 30px 80px rgba(0,0,0,0.35)' }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${color},${color}cc)`,borderRadius:'16px 16px 0 0',padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <p style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:1,margin:0 }}>Contributor Details</p>
            <h2 style={{ color:'#fff',fontSize:20,fontWeight:800,margin:'4px 0 0',fontFamily:'monospace' }}>@{login}</h2>
          </div>
          <div style={{ display:'flex',gap:16,alignItems:'center' }}>
            {stats.total && <div style={{ textAlign:'center' }}><p style={{ fontSize:10,color:'rgba(255,255,255,0.7)',margin:0,textTransform:'uppercase' }}>All-Time</p><p style={{ fontSize:22,fontWeight:900,color:'#fff',margin:0 }}>{stats.total}</p></div>}
            {stats.additions !== undefined && <div style={{ textAlign:'center' }}><p style={{ fontSize:10,color:'rgba(255,255,255,0.7)',margin:0,textTransform:'uppercase' }}>+Lines</p><p style={{ fontSize:16,fontWeight:800,color:'#6ee7b7',margin:0 }}>+{stats.additions?.toLocaleString()}</p></div>}
            {stats.deletions !== undefined && <div style={{ textAlign:'center' }}><p style={{ fontSize:10,color:'rgba(255,255,255,0.7)',margin:0,textTransform:'uppercase' }}>-Lines</p><p style={{ fontSize:16,fontWeight:800,color:'#fca5a5',margin:0 }}>-{stats.deletions?.toLocaleString()}</p></div>}
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,width:36,height:36,cursor:'pointer',fontSize:18,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
          </div>
        </div>
        {/* Commits List */}
        <div style={{ overflowY:'auto',flex:1,padding:'16px 24px' }}>
          <p style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:0.8,marginBottom:12 }}>
            Recent Commits ({commits?.length || 0} in last 4 weeks)
          </p>
          {!commits?.length ? (
            <p style={{ color:'#94a3b8',textAlign:'center',padding:40 }}>No commits found in the last 4 weeks.</p>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {commits.map((c, i) => (
                <div key={i} style={{ background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'12px 16px',display:'flex',gap:12,alignItems:'flex-start' }}>
                  <div style={{ width:8,height:8,borderRadius:'50%',background:color,marginTop:5,flexShrink:0 }} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'#1e293b',margin:'0 0 4px',lineHeight:1.4 }}>
                      {c.message?.split('\n')[0] || '(no message)'}
                    </p>
                    {c.message?.includes('\n') && (
                      <p style={{ fontSize:11,color:'#64748b',margin:'0 0 6px',whiteSpace:'pre-wrap' }}>
                        {c.message.split('\n').slice(1).join('\n').trim()}
                      </p>
                    )}
                    <div style={{ display:'flex',flexWrap:'wrap',gap:8,alignItems:'center' }}>
                      <span style={{ fontSize:11,fontFamily:'monospace',background:'#e0e7ff',color:'#3730a3',borderRadius:4,padding:'1px 7px' }}>{c.shortSha}</span>
                      <span style={{ fontSize:11,color:'#64748b' }}>{c.date ? new Date(c.date).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</span>
                      {c.author && <span style={{ fontSize:11,color:'#94a3b8' }}>by {c.author}</span>}
                      {c.url && <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize:11,color:'#3b82f6',textDecoration:'none',fontWeight:600 }}>View on GitHub ↗</a>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding:'12px 24px',borderTop:'1px solid #e2e8f0',display:'flex',justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 22px',borderRadius:8,border:'none',background:`linear-gradient(135deg,${color},${color}cc)`,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── GITHUB ANALYTICS PANEL ────────────────────────────────────────────
const CHART_COLORS = ['#4a7dff','#6c5ce7','#00b894','#fd79a8','#e17055','#fdcb6e'];

// ─── CONTRIBUTOR TABLE WITH MODAL ────────────────────────────────────────
function ContributorTableWithModal({ perf, commitData }) {
    const [selected, setSelected] = useState(null);
    return (
      <>
        <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg,#4a7dff18,#6c5ce718)' }}>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#4a7dff', textTransform: 'uppercase' }}>Contributor</th>
                <th style={{ padding: '9px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#4a7dff', textTransform: 'uppercase' }}>4-Week Commits</th>
                <th style={{ padding: '9px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#4a7dff', textTransform: 'uppercase' }}>Last Week</th>
              </tr>
            </thead>
            <tbody>
              {[...commitData].sort((a,b) => b.commits - a.commits).map((row, i) => {
                const weeklyArr = perf.contributorWeeklyData?.[row.name] || [];
                const lastWeek = weeklyArr[weeklyArr.length - 1] || 0;
                const color = CHART_COLORS[i % CHART_COLORS.length];
                return (
                  <tr key={i} onClick={() => setSelected(row.name)} style={{ borderTop: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{row.name}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                      <span style={{ background: color + '22', color: color, borderRadius: 6, padding: '2px 10px', fontWeight: 800 }}>{row.commits}</span>
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{lastWeek}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selected && (
          <ContributorCommitsModal
            login={selected}
            commits={perf.recentCommits?.[selected] || []}
            allTimeStats={perf.allTimeStats || {}}
            color={CHART_COLORS[commitData.findIndex(d => d.name === selected) % CHART_COLORS.length]}
            onClose={() => setSelected(null)}
          />
        )}
      </>
    );
}

function GitHubAnalyticsPanel({ perf }) {
  const commitData = Object.entries(perf.individualCommits || {}).map(([name, commits]) => ({ name, commits }));
  const contributors = Object.keys(perf.contributorWeeklyData || perf.individualCommits || {});
  const weekLabels = perf.weekLabels || ['Wk 1','Wk 2','Wk 3','Wk 4'];

  const weeklyData = weekLabels.map((label, i) => {
    const entry = { week: label };
    Object.entries(perf.contributorWeeklyData || {}).forEach(([user, weeks]) => {
      entry[user] = weeks[i] || 0;
    });
    return entry;
  });

  const lastCommit = perf.lastCommitDate
    ? new Date(perf.lastCommitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';

  return (
    <div style={{ marginTop: 16 }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 18 }}>
        <div style={{ background: 'linear-gradient(135deg,#4a7dff,#6c5ce7)', borderRadius: 12, padding: '12px 14px', color: '#fff' }}>
          <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', margin: 0 }}>Total Commits</p>
          <p style={{ fontSize: 26, fontWeight: 900, margin: '2px 0 0' }}>{perf.totalCommits || 0}</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#00b894,#00cec9)', borderRadius: 12, padding: '12px 14px', color: '#fff' }}>
          <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', margin: 0 }}>Most Active</p>
          <p style={{ fontSize: 13, fontWeight: 800, margin: '4px 0 0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{perf.mostActive || '—'}</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#fd79a8,#e17055)', borderRadius: 12, padding: '12px 14px', color: '#fff' }}>
          <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', margin: 0 }}>Last Commit</p>
          <p style={{ fontSize: 12, fontWeight: 800, margin: '4px 0 0' }}>{lastCommit}</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#fdcb6e,#e17055)', borderRadius: 12, padding: '12px 14px', color: '#fff' }}>
          <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', margin: 0 }}>Contributors</p>
          <p style={{ fontSize: 26, fontWeight: 900, margin: '2px 0 0' }}>{commitData.length}</p>
        </div>
        {perf.repoInfo?.stars !== undefined && (
          <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: 12, padding: '12px 14px', color: '#fff' }}>
            <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', margin: 0 }}>Stars</p>
            <p style={{ fontSize: 26, fontWeight: 900, margin: '2px 0 0' }}>{perf.repoInfo.stars}</p>
          </div>
        )}
        {perf.repoInfo?.forks !== undefined && (
          <div style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', borderRadius: 12, padding: '12px 14px', color: '#fff' }}>
            <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', margin: 0 }}>Forks</p>
            <p style={{ fontSize: 26, fontWeight: 900, margin: '2px 0 0' }}>{perf.repoInfo.forks}</p>
          </div>
        )}
      </div>

      {/* Repo Metadata */}
      {perf.repoInfo && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Repository Info</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8 }}>
            {perf.repoInfo.description && <div><span style={{ fontSize:10,color:'#94a3b8',textTransform:'uppercase',display:'block' }}>Description</span><span style={{ fontSize:12,color:'#334155' }}>{perf.repoInfo.description}</span></div>}
            {perf.repoInfo.language && <div><span style={{ fontSize:10,color:'#94a3b8',textTransform:'uppercase',display:'block' }}>Language</span><span style={{ fontSize:12,color:'#334155',fontWeight:700 }}>{perf.repoInfo.language}</span></div>}
            {perf.repoInfo.defaultBranch && <div><span style={{ fontSize:10,color:'#94a3b8',textTransform:'uppercase',display:'block' }}>Default Branch</span><span style={{ fontSize:12,fontFamily:'monospace',color:'#4a7dff' }}>{perf.repoInfo.defaultBranch}</span></div>}
            {perf.repoInfo.openIssues !== undefined && <div><span style={{ fontSize:10,color:'#94a3b8',textTransform:'uppercase',display:'block' }}>Open Issues</span><span style={{ fontSize:12,color:'#dc2626',fontWeight:700 }}>{perf.repoInfo.openIssues}</span></div>}
            {perf.repoInfo.visibility && <div><span style={{ fontSize:10,color:'#94a3b8',textTransform:'uppercase',display:'block' }}>Visibility</span><span style={{ fontSize:12,color:'#059669',fontWeight:700,textTransform:'capitalize' }}>{perf.repoInfo.visibility}</span></div>}
            {perf.repoInfo.license && <div><span style={{ fontSize:10,color:'#94a3b8',textTransform:'uppercase',display:'block' }}>License</span><span style={{ fontSize:12,color:'#334155' }}>{perf.repoInfo.license}</span></div>}
            {perf.repoInfo.pushedAt && <div><span style={{ fontSize:10,color:'#94a3b8',textTransform:'uppercase',display:'block' }}>Last Pushed</span><span style={{ fontSize:12,color:'#334155' }}>{new Date(perf.repoInfo.pushedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span></div>}
            {perf.repoInfo.size !== undefined && <div><span style={{ fontSize:10,color:'#94a3b8',textTransform:'uppercase',display:'block' }}>Repo Size</span><span style={{ fontSize:12,color:'#334155' }}>{(perf.repoInfo.size/1024).toFixed(1)} MB</span></div>}
          </div>
          {perf.repoInfo.topics?.length > 0 && (
            <div style={{ marginTop:10,display:'flex',flexWrap:'wrap',gap:6 }}>
              {perf.repoInfo.topics.map((t,i) => <span key={i} style={{ fontSize:10,background:'#dbeafe',color:'#2563eb',borderRadius:20,padding:'2px 9px',fontWeight:600 }}>{t}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Commits per Contributor Chart */}
      {commitData.length > 0 && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Commits per Contributor (Last 4 Weeks)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={commitData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [v, 'Commits']} />
              <Bar dataKey="commits" radius={[5,5,0,0]}>
                {commitData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly Activity Stacked Bar Chart */}
      {weeklyData.length > 0 && contributors.length > 0 && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Weekly Activity (Last 4 Weeks)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
              {contributors.map((u, i) => (
                <Bar key={u} dataKey={u} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={i === contributors.length - 1 ? [4,4,0,0] : [0,0,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Contributor Table — click a row to see commit details */}
      {commitData.length > 0 && (
        <ContributorTableWithModal perf={perf} commitData={commitData} />
      )}
    </div>
  );
}

// ─── GROUPS TAB ────────────────────────────────────────────────────────
function GroupsTab({ supervisorId, onOpenChat }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingRepoFor, setAddingRepoFor] = useState(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [checkingPerf, setCheckingPerf] = useState({});
  const [performanceData, setPerformanceData] = useState({});

  const fetchGroups = async () => {
    if (!supervisorId) { setError('Supervisor ID not found.'); setLoading(false); return; }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/groups/my-groups/${supervisorId}`);
      const data = await res.json();
      if (res.ok) setGroups(Array.isArray(data) ? data : []);
      else setError(data.message || 'Failed to fetch groups.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGroups(); }, [supervisorId]);

  const handleUpdateRepo = async (groupId) => {
    if (!repoUrl.trim()) { alert('Please enter a GitHub repository URL.'); return; }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/groups/update-repo/${groupId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      if (res.ok) {
        setAddingRepoFor(null);
        setRepoUrl('');
        fetchGroups();
        setTimeout(() => handleCheckPerformance(groupId), 600);
      } else { const d = await res.json(); alert(d.message || 'Failed.'); }
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleCheckPerformance = async (groupId) => {
    setCheckingPerf(prev => ({ ...prev, [groupId]: true }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/groups/performance/${groupId}`);
      const data = await res.json();
      if (res.ok) setPerformanceData(prev => ({ ...prev, [groupId]: data }));
      else alert(data.message || 'GitHub API error.');
    } catch (err) { alert('Error: ' + err.message); }
    finally { setCheckingPerf(prev => ({ ...prev, [groupId]: false })); }
  };

  if (loading) return <div className="loading-state"><span className="spinner" /><p>Loading groups…</p></div>;
  if (error) return <div className="empty-state"><div className="empty-icon">⚠️</div><h3>Error</h3><p>{error}</p></div>;
  if (groups.length === 0) return <div className="empty-state"><div className="empty-icon">👥</div><h3>No Groups Yet</h3><p>Accept requests to create groups.</p></div>;

  return (
    <div className="proposals-list">
      {groups.map((g, i) => {
        const isAdding = addingRepoFor === g.id;
        const perf = performanceData[g.id];
        return (
          <div key={g.id || i} className="proposal-review-card">
            <div className="proposal-header">
              <div className="proposal-info">
                <h3>{g.proposal?.title || g.supervisorProposalTitle || `Group #${g.id || i + 1}`}</h3>
                <div className="proposal-meta">
                  {g.proposalId && <span className="meta-badge domain">Proposal #{g.proposalId}</span>}
                  {g.supervisorProposalId && !g.proposalId && <span className="meta-badge domain">Supervisor Idea</span>}
                  <span className="meta-badge" style={{ background: '#dbeafe', color: '#2563eb' }}>Active</span>
                </div>
              </div>
              <button onClick={() => onOpenChat(g.id)} className="action-btn-new primary" style={{ fontSize: 12, padding: '6px 14px' }}>💬 Chat</button>
            </div>

            {(g.studentDetails || g.studentRegs) && (g.studentDetails?.length > 0 || g.studentRegs?.length > 0) && (
              <div style={{ margin: '10px 0' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Students</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(g.studentDetails || g.studentRegs.map(reg => ({ name: 'Student', regNo: reg }))).map((student, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span>👤</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{student.name}</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b' }}>({student.regNo})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GitHub Section */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>💻 GitHub Analytics</h4>
                {g.repoUrl && !isAdding && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <a href={g.repoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>View Repo ↗</a>
                    <button onClick={() => { setAddingRepoFor(g.id); setRepoUrl(g.repoUrl); }} style={{ fontSize: 11, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>Edit</button>
                  </div>
                )}
              </div>

              {!g.repoUrl && !isAdding && (
                <button onClick={() => setAddingRepoFor(g.id)} style={{ border: '1.5px dashed #cbd5e1', color: '#64748b', background: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, width: '100%' }}>
                  + Connect GitHub Repository
                </button>
              )}

              {isAdding && (
                <div style={{ background: '#eff6ff', padding: 14, borderRadius: 10, border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: 11, color: '#2563eb', marginBottom: 10, fontWeight: 600 }}>
                    Just paste your GitHub repo URL — contributors are fetched automatically.
                  </p>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Repository URL</label>
                    <input type="text" className="form-input" placeholder="https://github.com/owner/repo"
                      value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => handleUpdateRepo(g.id)} className="action-btn-new primary" style={{ fontSize: 12 }}>Save & Load Analytics</button>
                    <button onClick={() => { setAddingRepoFor(null); setRepoUrl(''); }} style={{ fontSize: 12, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}

              {g.repoUrl && !isAdding && (
                <>
                  <button
                    onClick={() => handleCheckPerformance(g.id)}
                    disabled={checkingPerf[g.id]}
                    style={{
                      background: checkingPerf[g.id] ? '#e2e8f0' : 'linear-gradient(135deg,#4a7dff,#6c5ce7)',
                      color: checkingPerf[g.id] ? '#94a3b8' : '#fff',
                      border: 'none', borderRadius: 8, padding: '10px 20px',
                      cursor: checkingPerf[g.id] ? 'not-allowed' : 'pointer',
                      fontWeight: 700, fontSize: 13, width: '100%', marginBottom: 4,
                    }}
                  >
                    {checkingPerf[g.id] ? 'Fetching GitHub data…' : perf ? '↻ Refresh Analytics' : 'Load GitHub Analytics'}
                  </button>
                  {perf && <GitHubAnalyticsPanel perf={perf} />}
                </>
              )}
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
              <span>Lead ID: <strong style={{ color: '#475569' }}>{g.leadStudentId}</strong></span>
              <span>{g.createdAt ? new Date(g.createdAt).toLocaleDateString() : ''}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CHAT TAB (per-group) ──────────────────────────────────────────────
function ChatTab({ user, supervisorId, activeGroupId }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(activeGroupId || null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  // Fetch groups on mount
  useEffect(() => {
    if (!supervisorId) return;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/groups/my-groups/${supervisorId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [supervisorId]);

  // Update selected group if activeGroupId changes
  useEffect(() => {
    if (activeGroupId) setSelectedGroupId(activeGroupId);
  }, [activeGroupId]);

  // Join room + load history when group selected
  useEffect(() => {
    if (!selectedGroupId) return;
    const roomId = `group-${selectedGroupId}`;
    socket.emit("joinRoom", roomId);

    // Load chat history
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/chat/${roomId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {});

    const handleMessage = (data) => {
      if (data.roomId === roomId) {
        setMessages(prev => [...prev, data]);
      }
    };
    socket.on("receiveMessage", handleMessage);
    return () => socket.off("receiveMessage", handleMessage);
  }, [selectedGroupId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = () => {
    if (!message.trim() || !selectedGroupId) return;
    const roomId = `group-${selectedGroupId}`;
    const data = {
      roomId,
      senderId: user?.supervisorId || user?.id || 0,
      senderName: user?.name || "Supervisor",
      senderRole: "supervisor",
      message,
    };
    socket.emit("sendMessage", data);
    setMessages(prev => [...prev, { ...data, _local: true }]);
    setMessage("");
  };

  // Group list sidebar
  if (!selectedGroupId) {
    return (
      <div className="section-card">
        <h2 className="section-title">💬 Select a Group to Chat</h2>
        {groups.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No groups yet.</p>
        ) : (
          <div className="proposals-list">
            {groups.map(g => (
              <div key={g.id} className="proposal-review-card" style={{ cursor: "pointer" }} onClick={() => setSelectedGroupId(g.id)}>
                <h3>Group #{g.id}</h3>
                <p style={{ fontSize: 13, color: "#64748b" }}>Proposal #{g.proposalId} · {g.studentRegs?.length || 0} students</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="section-card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => { setSelectedGroupId(null); setMessages([]); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#64748b" }}>← </button>
        <h2 className="section-title" style={{ margin: 0 }}>💬 Group #{selectedGroupId} Chat</h2>
      </div>
      <div style={{ height: 400, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, background: "#f8fafc", display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {messages.length === 0 && <p style={{ color: "#94a3b8", textAlign: "center", marginTop: 160 }}>No messages yet.</p>}
        {messages.map((msg, i) => {
          const isMine = msg._local || msg.senderRole === "supervisor";
          const displayName = msg.senderRole === "supervisor" ? (msg.senderName || "Supervisor") : (msg.senderName || "Student");
          return (
            <div key={i} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "70%", background: isMine ? "#4a7dff" : "#fff", color: isMine ? "#fff" : "#1e293b", padding: "10px 14px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: isMine ? "none" : "1px solid #e2e8f0" }}>
              {!isMine && <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, marginBottom: 2 }}>{displayName}</p>}
              <p style={{ fontSize: 14, margin: 0 }}>{msg.message}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input className="form-input" style={{ flex: 1 }} value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Type a message…" />
        <button onClick={sendMessage} className="action-btn-new primary" style={{ padding: "10px 20px" }}>Send</button>
      </div>
    </div>
  );
}

// ─── COMMITTEE TAB ────────────────────────────────────────────────────────
function CommitteeTab({ supervisorId }) {
  const [committee, setCommittee] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!supervisorId) { setLoading(false); return; }
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/by-supervisor/${supervisorId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setCommittee(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [supervisorId]);

  if (loading) return <div className="loading-state"><span className="spinner" /><p>Loading committee...</p></div>;

  if (!committee) return (
    <div className="empty-state">
      <div className="empty-icon">—</div>
      <h3>No Committee Assigned</h3>
      <p>You have not been assigned to any evaluation committee yet.</p>
    </div>
  );

  return (
    <div className="section-card">
      <div className="section-header">
        <h2 className="section-title">{committee.name}</h2>
        <p className="section-subtitle">Your FYP Evaluation Committee</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>Committee Members</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {(committee.members || []).map((m, i) => (
            <div key={i} style={{ background: m.id === supervisorId ? "linear-gradient(135deg,#4a7dff,#6c5ce7)" : "#f1f5f9", color: m.id === supervisorId ? "#fff" : "#1e293b", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", minWidth: 160 }}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{m.name}{m.id === supervisorId ? " (You)" : ""}</p>
              <p style={{ fontSize: 11, opacity: 0.8, margin: "3px 0 0" }}>{m.designation || "Supervisor"}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {(m.expertise || []).map((e, j) => (
                  <span key={j} style={{ fontSize: 10, background: "rgba(255,255,255,0.25)", borderRadius: 4, padding: "1px 6px" }}>{e}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>Groups to Evaluate ({committee.groups?.length || 0})</p>
        {(committee.groups || []).length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>No groups assigned to this committee yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(committee.groups || []).map((g, i) => (
              <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#4a7dff" }}>Group #{g.id}</span>
                  <span style={{ fontSize: 11, background: "#dbeafe", color: "#2563eb", borderRadius: 4, padding: "1px 8px" }}>Proposal #{g.proposalId}</span>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Students: {g.studentRegs?.join(", ") || "—"}</p>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "3px 0 0" }}>Supervisor: {g.supervisorName || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN SUPERVISOR DASHBOARD ─────────────────────────────────────────
export function SupervisorDashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [chatGroupId, setChatGroupId] = useState(null);

  const supervisorId = user?.supervisorId;

  useEffect(() => {
    if (!supervisorId) return;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor/requests/${supervisorId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/groups/my-groups/${supervisorId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [supervisorId]);

  const openGroupChat = (groupId) => {
    setChatGroupId(groupId);
    setActiveView("chat");
  };

  const navItems = [
    { id: "dashboard",   label: "Dashboard",   icon: "🏠" },
    { id: "requests",    label: "Requests",    icon: "📋" },
    { id: "my-projects", label: "My Projects", icon: "💡" },
    { id: "groups",      label: "Groups",      icon: "👥" },
    { id: "chat",        label: "Chat",        icon: "💬" },
    { id: "committee",   label: "Committee",   icon: "🏛" },
  ];

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} setActiveView={(v) => { setActiveView(v); if (v !== "chat") setChatGroupId(null); }} onLogout={onLogout} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} role="supervisor" navItems={navItems} />

      <main className="main-content">
        {activeView === "dashboard" && (
          <div className="dashboard-home">
            <div className="welcome-banner" style={{ background: "linear-gradient(135deg, #4a7dff, #6c5ce7)" }}>
              <div className="welcome-content">
                <h1>Welcome back, {user?.name || "Supervisor"}! 👋</h1>
                <p>Manage your supervision requests and student projects.</p>
              </div>
              <div className="welcome-illustration">👨‍🏫</div>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>⏳</div>
                <div className="stat-info"><p className="stat-label">Pending</p><p className="stat-value">{requests.length}</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>✓</div>
                <div className="stat-info"><p className="stat-label">Groups</p><p className="stat-value">{groups.length}</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>⊘</div>
                <div className="stat-info"><p className="stat-label">Capacity</p><p className="stat-value">{groups.length}/3</p></div>
              </div>
            </div>
            <div className="section-card">
              <h3 className="section-title">Quick Actions</h3>
              <div className="action-buttons">
                <button className="action-btn-new primary" onClick={() => setActiveView("requests")}>📋 View Requests</button>
                <button className="action-btn-new" style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", color: "#fff" }} onClick={() => setActiveView("groups")}>👥 View Groups</button>
                <button className="action-btn-new" style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)", color: "#fff" }} onClick={() => setActiveView("chat")}>💬 Open Chat</button>
              </div>
            </div>
            <div className="section-card">
              <h3 className="section-title">Your Profile</h3>
              <div className="profile-grid">
                <div className="profile-item"><span className="profile-label">Name</span><span className="profile-value">{user?.name || "—"}</span></div>
                <div className="profile-item"><span className="profile-label">Email</span><span className="profile-value">{user?.email || "—"}</span></div>
                <div className="profile-item"><span className="profile-label">Role</span><span className="profile-value">Supervisor</span></div>
                <div className="profile-item"><span className="profile-label">ID</span><span className="profile-value">#{supervisorId || "—"}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeView === "requests" && (
          <div className="proposals-container"><RequestsTab supervisorId={supervisorId} /></div>
        )}

        {activeView === "groups" && (
          <div className="proposals-container">
            <div className="section-card">
              <div className="section-header">
                <h2 className="section-title">👥 My Groups</h2>
                <p className="section-subtitle">Groups formed after accepting supervision requests</p>
              </div>
              <GroupsTab supervisorId={supervisorId} onOpenChat={openGroupChat} />
            </div>
          </div>
        )}

        {activeView === "chat" && (
          <div className="proposals-container">
            <ChatTab user={user} supervisorId={supervisorId} activeGroupId={chatGroupId} />
          </div>
        )}

        {activeView === "my-projects" && (
          <div className="proposals-container">
            <div className="section-card">
              <div className="section-header">
                <h2 className="section-title">💡 My Project Ideas</h2>
                <p className="section-subtitle">Post your own project ideas for students — reviewed and approved by PEC Committee</p>
              </div>
            </div>
            <MyProjectsTab supervisorId={supervisorId} />
          </div>
        )}

        {activeView === "committee" && (
          <div className="proposals-container">
            <CommitteeTab supervisorId={supervisorId} />
          </div>
        )}
      </main>
    </div>
  );
}