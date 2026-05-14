import { useState, useEffect, useRef } from "react";
import React from "react";
import { Sidebar } from "./Sidebar";
import io from "socket.io-client";
import * as pdfjsLib from "pdfjs-dist";

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000", { transports: ["websocket"] });

export function StudentDashboard({ user, supervisors, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    file: null,
    domain: "",
  });
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentStep, setCurrentStep] = useState("form");
  const [submittedProposal, setSubmittedProposal] = useState(null);
  const [enhancedData, setEnhancedData] = useState(null);
  const [existingProposal, setExistingProposal] = useState(null);
  const [proposalLoading, setProposalLoading] = useState(true);

  const [availableSupervisors, setAvailableSupervisors] = useState([]);
  const [showSupervisors, setShowSupervisors] = useState(false);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(null);
  const [teamMembers, setTeamMembers] = useState({ member1: "", member2: "", member3: "" });

  // NEW: Group-aware state
  const [studentGroup, setStudentGroup] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");

  // NEW: Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState("");
  const chatBottomRef = useRef(null);

  const student = {
    name: user?.name || "Student",
    email: user?.email || "student@gmail.com",
    program: "BS Computer Science",
    semester: "7th Semester",
  };

  // Fetch existing proposal on mount and when user changes
  useEffect(() => {
    if (user?.studentId) {
      fetchMyProposal();
      checkStudentGroup();
    }
  }, [user?.studentId]);

  // Check if student is already in a group
  const checkStudentGroup = async () => {
    if (!user?.studentId) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/groups/student/${user.studentId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setStudentGroup(data[0]);
        }
      }
    } catch (err) { console.log('Group check error:', err); }
  };

  // Fetch available students (not in any group)
  const fetchAvailableStudents = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/students/available`);
      if (res.ok) {
        const data = await res.json();
        // Filter out the current student
        setAvailableStudents(data.filter(s => s.id !== user?.studentId));
      }
    } catch (err) { console.log('Error fetching students:', err); }
  };

  const fetchMyProposal = async () => {
    if (!user?.studentId) {
      console.log('❌ No studentId found on user object:', user);
      return;
    }
    console.log('🔍 Fetching proposal for studentId:', user.studentId);

    try {
      setProposalLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/proposal/student/${user.studentId}`);
      console.log('🔍 Fetch response status:', res.status);
      if (res.ok) {
        // Handle empty response (when no proposal exists)
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          console.log('🔍 Fetched proposal data:', data);
          setExistingProposal(data);
        } else {
          console.log('🔍 No proposal found (empty response)');
          setExistingProposal(null);
        }
      } else {
        console.log('🔍 Fetch failed with status:', res.status);
        setExistingProposal(null);
      }
    } catch (err) {
      console.log('❌ Error fetching proposal:', err);
      setExistingProposal(null);
    } finally {
      setProposalLoading(false);
    }
  };

  const fetchSupervisors = async () => {
    try {
      setSupervisorsLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor/all`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSupervisors(data);
        setShowSupervisors(true);
        // Also fetch available students for the picker
        fetchAvailableStudents();
      } else {
        alert("Failed to load supervisors");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching supervisors");
    } finally {
      setSupervisorsLoading(false);
    }
  };

  const handleSelectSupervisor = async (supervisorId) => {
    if (!existingProposal) return;
    try {
      setLoading(true);

      // Build teamMembers from selectedMembers (reg numbers) for legacy compatibility
      const memberRegs = selectedMembers.map(s => s.regNo);
      const memberIds = selectedMembers.map(s => s.id);

      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor/send-supervisor-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.studentId,
          proposalId: existingProposal.id,
          supervisorId: supervisorId,
          teamMembers: {
            member1: memberRegs[0] || null,
            member2: memberRegs[1] || null,
            member3: memberRegs[2] || null,
          },
          memberStudentIds: memberIds,
        }),
      });

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { }

      if (res.ok) {
        alert(data.message || "Supervisor request sent successfully!");
        setSelectedSupervisorId(null);
        setSelectedMembers([]);
        setTeamMembers({ member1: "", member2: "", member3: "" });
      } else {
        alert((data && data.message) || data.error || "Failed to send request. " + text);
      }
    } catch (err) {
      console.error(err);
      alert("Error sending supervisor request");
    } finally {
      setLoading(false);
    }
  };

  const formatGeminiText = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^#+\s*(.+)$/gm, '<h4>$1</h4>')
      .replace(/^-\s+(.+)$/gm, '• $1')
      .replace(/\n/g, '<br/>');
  };

  // ── PDF text extraction ─────────────────────────────────────────────
  const extractPdfText = async (file) => {
    setExtracting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        let lastY = null;
        let pageText = "";

        for (const item of content.items) {
          // pdfjs transform array: [scaleX, skewY, skewX, scaleY, translateX, translateY]
          const currentY = item.transform[5];

          if (lastY !== null && Math.abs(lastY - currentY) > 4) {
            const diff = Math.abs(lastY - currentY);
            // If Y diff is large, it's a new paragraph or heading
            if (diff > 16) {
              pageText += "\n\n";
            } else {
              pageText += "\n";
            }
          } else if (lastY !== null && pageText.length > 0 && !pageText.endsWith(" ") && !pageText.endsWith("\n") && item.str.trim().length > 0) {
            // Add space between consecutive items on same line if needed
            pageText += " ";
          }
          pageText += item.str;
          lastY = currentY;
        }
        fullText += pageText + "\n\n";
      }
      return formatExtractedText(fullText);
    } catch (err) {
      console.error("PDF extraction error:", err);
      return "";
    } finally {
      setExtracting(false);
    }
  };

  const formatExtractedText = (raw) => {
    if (!raw) return "";
    // Clean up excessive whitespace while preserving intended paragraph breaks
    let text = raw
      .replace(/[ \t]{2,}/g, " ")       // Multiple spaces to single
      .replace(/\n{3,}/g, "\n\n")       // Max 2 newlines
      .trim();

    // Emphasize obvious headings (ALL CAPS lines)
    text = text.replace(/^([A-Z][A-Z\s\d\p{Punct}]{3,})$/gm, "\n$1\n");

    return text.trim();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        alert("Only PDF files are allowed");
        return;
      }
      setFormData((prev) => ({ ...prev, file }));
      setFileName(file.name);
      // Auto-extract and fill description
      const extracted = await extractPdfText(file);
      if (extracted) {
        setFormData((prev) => ({ ...prev, file, description: extracted }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.file || !formData.domain) {
      alert("Please fill all fields and select a file!");
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("domain", formData.domain);
    data.append("file", formData.file);
    data.append("studentId", String(user?.studentId || ""));

    try {
      // Call check-similarity endpoint - does NOT save to DB
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/proposal/check-similarity`, {
        method: "POST",
        body: data,
      });

      const result = await res.json();
      console.log("Backend Response:", result);

      // Check for error response (from Flask validation or other errors)
      if (result.success === false || result.error) {
        const errorMessage = result.error || "Failed to process document";
        alert("❌ Document Error:\n\n" + errorMessage);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error("Failed to check similarity");

      const sortedSimilar = (result.similarProjects || []).sort(
        (a, b) => (b.similarities?.weightedSimilarity || 0) - (a.similarities?.weightedSimilarity || 0)
      );

      // Store proposal data from backend (NOT saved to DB yet)
      const newProposal = {
        // proposalData contains everything needed to save later
        proposalData: result.proposalData,
        title: result.original.title,
        description: result.proposalData.description,
        scope: result.original.scope,
        modules: result.original.modules,
        fileName: formData.file.name,
        domain: result.proposalData.domain,
        similarProjects: sortedSimilar,
        highestSimilarity: result.highestSimilarity,
      };

      setSubmittedProposal(newProposal);
      setCurrentStep("results");
      setFormData({ title: "", description: "", file: null, domain: "" });
      setFileName("");
    } catch (error) {
      console.error(error);
      alert("❌ Similarity check failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!submittedProposal) return;
    setLoading(true);

    try {
      // Send the text data from AI server (5000) to Gemini for enhancement
      // This text was stored in submittedProposal after similarity check
      console.log('Sending to Gemini:', {
        title: submittedProposal.title,
        scope: submittedProposal.scope,
        modules: submittedProposal.modules,
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/proposal/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: submittedProposal.title,
          description: submittedProposal.description,
          // Pass the scope and modules text from AI server (5000)
          scope: submittedProposal.scope,
          modules: submittedProposal.modules,
        }),
      });

      if (!res.ok) {
        // Try to get error details from response
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.message || '';

        // Check for quota/rate limit errors
        if (errorMsg.includes('QUOTA_EXCEEDED') || errorMsg.includes('429') || errorMsg.includes('quota')) {
          alert("⏰ AI Enhancement Temporarily Unavailable\n\nThe AI service is experiencing high demand. Please wait a few minutes and try again.\n\nAlternatively, you can:\n• Discard this proposal and revise it manually\n• Wait for the quota to reset and try again");
          return;
        }

        // Check for model unavailable
        if (errorMsg.includes('MODEL_UNAVAILABLE') || errorMsg.includes('404')) {
          alert("🔧 AI Service Unavailable\n\nThe AI enhancement model is currently unavailable. Please try again later.");
          return;
        }

        throw new Error("Enhancement failed");
      }

      const result = await res.json();
      setEnhancedData(result);
      setCurrentStep("enhancement");

      // Text is now used - will be discarded when user takes next action
    } catch (error) {
      console.error(error);
      alert("❌ Enhancement failed. Please try again or proceed with your current proposal.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToCommittee = async () => {
    if (!submittedProposal?.proposalData) return;
    setLoading(true);

    try {
      // Send full proposal data to submit-to-pec endpoint - THIS saves to DB
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/pec/submit-to-pec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submittedProposal.proposalData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit to PEC");
      }

      alert("✅ Proposal sent to Proposal Evaluation Committee!");
      setCurrentStep("form");
      setSubmittedProposal(null);
      setEnhancedData(null);
      fetchMyProposal(); // Refresh to show the submitted proposal
    } catch (error) {
      console.error(error);
      alert("❌ Failed to submit: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setCurrentStep("form");
    setSubmittedProposal(null);
    setEnhancedData(null);
  };

  const highestSimilarity = submittedProposal?.similarProjects?.[0]?.similarities?.weightedSimilarity || 0;
  const isHighSimilarity = highestSimilarity > 60;

  // Check if student can submit new proposal
  const canSubmitProposal = () => {
    if (studentGroup) return false; // In a group = no more submissions
    if (!existingProposal) return true;
    if (existingProposal.status === 'rejected') return true;
    return false;
  };

  const isInGroup = !!studentGroup;

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: '#6b7280', bg: '#f3f4f6', label: 'Draft' },
      submitted: { color: '#d97706', bg: '#fef3c7', label: 'Under Review' },
      approved: { color: '#059669', bg: '#d1fae5', label: 'Approved' },
      rejected: { color: '#dc2626', bg: '#fee2e2', label: 'Rejected' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span style={{
        background: config.bg,
        color: config.color,
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
      }}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          if (view === "submit") {
            setCurrentStep("form");
            setSubmittedProposal(null);
            setEnhancedData(null);
          }
        }}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        role="student"
        navItems={[
          { id: "dashboard", label: "Dashboard" },
          ...(!isInGroup ? [
            { id: "submit", label: "Submit Proposal" },
            { id: "browse-projects", label: "Browse Projects" },
          ] : []),
          { id: "status", label: "Check Status" },
          ...(isInGroup ? [
            { id: "chat", label: "Group Chat" },
          ] : []),
          { id: "templates", label: "Templates" },
        ]}
      />

      <main className="main-content">
        {/* Dashboard View */}
        {activeView === "dashboard" && (
          <div className="dashboard-home">
            {/* Welcome Banner */}
            <div className="welcome-banner">
              <h1>Welcome back, {student.name}</h1>
              <p>Track your FYP progress and manage your proposals.</p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">P</div>
                <div className="stat-info">
                  <p className="stat-label">Proposal Status</p>
                  <p className="stat-value">
                    {existingProposal ? getStatusBadge(existingProposal.status) : 'Not Submitted'}
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">%</div>
                <div className="stat-info">
                  <p className="stat-label">Proposal Title</p>
                  <p className="stat-value" style={{ fontSize: existingProposal?.title ? 13 : undefined, lineHeight: 1.3 }}>
                    {existingProposal?.title || 'Not Submitted'}
                  </p>
                  {existingProposal?.highestSimilarity != null && (
                    <span style={{ fontSize: 11, color: existingProposal.highestSimilarity > 60 ? '#ef4444' : '#22c55e', fontWeight: 700, marginTop: 4, display: 'inline-block' }}>
                      Similarity: {existingProposal.highestSimilarity}%
                    </span>
                  )}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">S</div>
                <div className="stat-info">
                  <p className="stat-label">Supervisor</p>
                  <p className="stat-value">
                    {studentGroup?.supervisor?.user?.name
                      ? studentGroup.supervisor.user.name
                      : (existingProposal?.status === 'approved' ? 'Select Now' : 'N/A')}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="section-card">
              <h3 className="section-title">Quick Actions</h3>
              <div className="action-buttons">
                <button
                  className="action-btn-new primary"
                  onClick={() => setActiveView("submit")}
                  disabled={!canSubmitProposal()}
                >
                  <span>Submit Proposal</span>
                </button>
                <button
                  className="action-btn-new"
                  onClick={() => setActiveView("status")}
                >
                  <span>Check Status</span>
                </button>
                <button
                  className="action-btn-new"
                  onClick={() => setActiveView("templates")}
                >
                  <span>Download Templates</span>
                </button>
              </div>
            </div>

            {/* Student Info */}
            <div className="section-card">
              <h3 className="section-title">Your Profile</h3>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="profile-label">Name</span>
                  <span className="profile-value">{student.name}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Email</span>
                  <span className="profile-value">{student.email}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Program</span>
                  <span className="profile-value">{student.program}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Semester</span>
                  <span className="profile-value">{student.semester}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Proposal View */}
        {activeView === "submit" && (
          <div className="proposal-container">
            {/* Check if can submit */}
            {!canSubmitProposal() && existingProposal && (
              <div className="blocked-notice">
                <div className="blocked-icon">!</div>
                <h3>Proposal Already Submitted</h3>
                <p>
                  You have already submitted a proposal titled "<strong>{existingProposal.title}</strong>".
                  {existingProposal.status === 'submitted' && " It is currently under review by the PEC."}
                  {existingProposal.status === 'approved' && " It has been approved! Please proceed to select a supervisor."}
                </p>
                <button
                  className="action-btn-new primary"
                  onClick={() => setActiveView("status")}
                >
                  View Status
                </button>
              </div>
            )}

            {/* Proposal Form */}
            {canSubmitProposal() && currentStep === "form" && (
              <div className="proposal-form-card">
                <div className="form-header-new">
                  <h2>Submit New Proposal</h2>
                  <p>Upload your FYP proposal for similarity analysis</p>
                </div>

                <div className="form-body">
                  <div className="form-group">
                    <label className="form-label">Proposal Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your proposal title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label" style={{ margin: 0 }}>Description</label>
                      {extracting && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4a7dff', fontWeight: 600 }}>
                          <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                          Extracting from PDF...
                        </span>
                      )}
                      {formData.description && !extracting && (
                        <button
                          type="button"
                          onClick={() => setShowPreview(true)}
                          style={{ fontSize: 12, background: 'linear-gradient(135deg,#4a7dff,#6c5ce7)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Preview Description
                        </button>
                      )}
                    </div>
                    <textarea
                      className="form-input"
                      placeholder={extracting ? 'Extracting formatted text from PDF...' : 'Description will be auto-filled from your uploaded PDF document...'}
                      rows={6}
                      value={formData.description}
                      onChange={(e) => { }}
                      readOnly={true}
                      style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Domain</label>
                      <select
                        className="form-input"
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      >
                        <option value="">Select Domain</option>
                        <option value="AI">Artificial Intelligence</option>
                        <option value="Web">Web Development</option>
                        <option value="Mobile">Mobile Development</option>
                        <option value="Cyber">Cybersecurity</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">PDF Document</label>
                      <div className="file-upload-box">
                        <input type="file" accept=".pdf" onChange={handleFileChange} disabled={extracting} />
                        {fileName ? (
                          <span className="file-name">{fileName}</span>
                        ) : (
                          <span className="file-placeholder">Choose PDF file (auto-fills description)</span>
                        )}
                      </div>
                      {extracting && (
                        <p style={{ fontSize: 12, color: '#4a7dff', marginTop: 6, fontStyle: 'italic' }}>
                          Reading PDF... description will be auto-filled.
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    className="submit-btn-new"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Analyzing...
                      </>
                    ) : (
                      <>Submit & Check Similarity</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Similarity Results */}
            {currentStep === "results" && submittedProposal && (
              <div className="results-container">
                <div className="results-header">
                  <div className="results-title">
                    <h2>Similarity Analysis Complete</h2>
                    <p>Your proposal: <strong>{submittedProposal.title}</strong></p>
                  </div>

                  {isHighSimilarity ? (
                    <div className="similarity-alert high">
                      <span className="alert-icon">!</span>
                      <div className="alert-text">
                        <strong>High Similarity Detected</strong>
                        <p>Highest match: {highestSimilarity}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="similarity-alert low">
                      <span className="alert-icon">✓</span>
                      <div className="alert-text">
                        <strong>Low Similarity</strong>
                        <p>Your proposal appears to be unique</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="similar-projects">
                  <h3>Similar Existing Projects</h3>
                  {submittedProposal.similarProjects.length === 0 ? (
                    <div className="no-matches">
                      <p>No similar projects found in the database.</p>
                    </div>
                  ) : (
                    <div className="projects-list">
                      {submittedProposal.similarProjects.slice(0, 5).map((project, index) => {
                        const similarity = project.similarities?.weightedSimilarity || 0;
                        const isTop = index === 0;
                        return (
                          <div
                            key={project.id || index}
                            className={`project-card ${isTop && similarity > 60 ? 'highlight' : ''}`}
                          >
                            <div className="project-rank">#{index + 1}</div>
                            <div className="project-info">
                              <h4>{project.title}</h4>
                              <p className="project-domain">{project.projectType}</p>
                            </div>
                            <div className="project-similarity">
                              <div className={`similarity-score ${similarity > 60 ? 'high' : 'low'}`}>
                                {similarity}%
                              </div>
                              <div className="similarity-breakdown">
                                <span>Title: {project.similarities?.titleSimilarity || 0}%</span>
                                <span>Scope: {project.similarities?.scopeSimilarity || 0}%</span>
                                <span>Modules: {project.similarities?.modulesSimilarity || 0}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="results-actions">
                  {isHighSimilarity ? (
                    <>
                      <div className="blocked-warning">
                        <strong>Similarity Too High ({highestSimilarity}%)</strong>
                        <p>You cannot submit this proposal to the committee. Please use AI Enhancement to make your proposal more unique, or discard and submit a different proposal.</p>
                      </div>
                      <button
                        className="action-btn-new enhance"
                        onClick={handleEnhance}
                        disabled={loading}
                      >
                        {loading ? "Enhancing..." : "Enhance with AI"}
                      </button>
                      <button className="back-btn danger" onClick={handleBackToForm}>
                        Discard & Start Over
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="action-btn-new primary"
                        onClick={handleSendToCommittee}
                        disabled={loading}
                      >
                        {loading ? "Submitting..." : "Send to Evaluation Committee"}
                      </button>
                      {submittedProposal?.description && (
                        <button
                          type="button"
                          onClick={() => setShowPreview(true)}
                          style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                        >
                          Preview Full Proposal
                        </button>
                      )}
                      <p className="action-hint">
                        Your proposal has acceptable similarity. You can proceed to submit for evaluation.
                      </p>
                      <button className="back-btn" onClick={handleBackToForm}>
                        ← Discard & Submit Another
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Enhancement Result */}
            {currentStep === "enhancement" && enhancedData && (
              <div className="enhancement-container">
                <div className="enhancement-header">
                  <div className="success-badge">AI Enhancement Complete</div>
                  <h2>Your Enhanced Proposal</h2>
                  <p>Review the AI-improved version of your proposal below</p>
                </div>

                <div className="enhancement-content">
                  <div className="enhancement-section">
                    <div className="section-label">Enhanced Title</div>
                    <h3 className="enhanced-title">{enhancedData.title}</h3>
                  </div>

                  <div className="enhancement-section">
                    <div className="section-label">Enhanced Scope</div>
                    <div
                      className="enhanced-scope"
                      dangerouslySetInnerHTML={{ __html: formatGeminiText(enhancedData.scope) }}
                    />
                  </div>

                  {enhancedData.modules && enhancedData.modules.length > 0 && (
                    <div className="enhancement-section">
                      <div className="section-label">Suggested Modules</div>
                      <div className="modules-list">
                        {enhancedData.modules.map((module, index) => {
                          const moduleName = typeof module === "string" ? module : module.name || `Module ${index + 1}`;
                          const cleanName = moduleName.replace(/\*\*/g, '').replace(/\*/g, '');
                          return (
                            <div key={index} className="module-tag">
                              <span className="module-number">{index + 1}</span>
                              <span className="module-name">{cleanName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="enhancement-actions">
                  <div className="info-notice">
                    <span className="info-icon">i</span>
                    <p>This enhancement is for your reference only. Please use these suggestions to revise and resubmit your proposal.</p>
                  </div>
                  <button className="back-btn" onClick={handleBackToForm}>
                    ← Submit a Revised Proposal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Check Status View */}
        {activeView === "status" && (
          <div className="status-container">
            <div className="section-card">
              <h2 className="section-title">Proposal Status</h2>

              {proposalLoading ? (
                <div className="loading-state">
                  <span className="spinner"></span>
                  <p>Loading proposal status...</p>
                </div>
              ) : existingProposal ? (
                <div className="status-details">
                  <div className="status-header">
                    <h3>{existingProposal.title}</h3>
                    {getStatusBadge(existingProposal.status)}
                  </div>

                  <div className="status-grid">
                    <div className="status-item">
                      <span className="status-label">Domain</span>
                      <span className="status-value">{existingProposal.domain || 'N/A'}</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Similarity Score</span>
                      <span className="status-value">{existingProposal.highestSimilarity || 0}%</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Submitted On</span>
                      <span className="status-value">
                        {existingProposal.createdAt
                          ? new Date(existingProposal.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {existingProposal.description && (
                    <div className="status-section">
                      <h4>Description</h4>
                      <p>{existingProposal.description}</p>
                    </div>
                  )}

                  {existingProposal.pecFeedback && (
                    <div className={`feedback-box ${existingProposal.status}`}>
                      <h4>PEC Feedback</h4>
                      <p>{existingProposal.pecFeedback}</p>
                    </div>
                  )}

                  {existingProposal.status === 'approved' && !isInGroup && (
                    <div className="supervisor-selection">
                      <h4>Congratulations! Your proposal has been approved.</h4>
                      <p>Please select a supervisor from the available options below:</p>

                      {!showSupervisors ? (
                        <button
                          className="action-btn-new primary"
                          onClick={fetchSupervisors}
                          disabled={supervisorsLoading}
                        >
                          {supervisorsLoading ? "Loading Supervisors..." : "Show Available Supervisors"}
                        </button>
                      ) : (
                        <div>
                          {availableSupervisors.length === 0 ? (
                            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No supervisors found.</p>
                          ) : (() => {
                            // ── Domain-based filtering ──────────────────────────────
                            const proposalDomain = (existingProposal?.domain || '').toLowerCase().trim();
                            const isRecommended = (sup) => {
                              if (!proposalDomain || !Array.isArray(sup.expertise) || sup.expertise.length === 0) return false;
                              return sup.expertise.some(exp => {
                                const e = (exp || '').toLowerCase();
                                return e.includes(proposalDomain) || proposalDomain.includes(e);
                              });
                            };
                            const recommended = availableSupervisors.filter(isRecommended);
                            const others = availableSupervisors.filter(s => !isRecommended(s));

                            // ── Reusable card renderer ─────────────────────────────
                            const renderCard = (sup) => {
                              const isFull = sup.groupCount >= (sup.maxGroups || 3);
                              return (
                                <div key={sup.id} className="supervisor-card" style={isFull ? { opacity: 0.6 } : {}}>
                                  <h5>{sup.name}</h5>
                                  <p className="sup-domain">{sup.designation || 'Supervisor'}</p>
                                  <p className="sup-expertise">
                                    {Array.isArray(sup.expertise) ? sup.expertise.join(', ') : sup.expertise || 'No specific expertise listed'}
                                  </p>
                                  <p style={{ fontSize: '0.75rem', color: isFull ? '#dc2626' : '#059669', fontWeight: 600, marginTop: 4 }}>
                                    Groups: {sup.groupCount || 0}/{sup.maxGroups || 3} {isFull ? '(Full)' : ''}
                                  </p>

                                  {isFull ? (
                                    <p style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 8, fontWeight: 600 }}>Supervisor is at capacity</p>
                                  ) : selectedSupervisorId === sup.id ? (
                                    <div style={{ marginTop: '10px' }}>
                                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                                        Select your group members (you + up to 2 others):
                                      </p>

                                      {/* Lead student — always locked */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: '#f0fdf4', padding: '6px 10px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                                        <span style={{ fontSize: 11, background: '#15803d', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>YOU</span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>{user?.name || 'You'}</span>
                                        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{user?.regNo || ''}</span>
                                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>Lead</span>
                                      </div>

                                      {/* Additional selected members (max 2) */}
                                      {selectedMembers.map((m) => (
                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, background: '#eff6ff', padding: '6px 10px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>{m.name}</span>
                                          <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{m.regNo}</span>
                                          <button onClick={() => setSelectedMembers(prev => prev.filter(s => s.id !== m.id))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                                        </div>
                                      ))}

                                      {/* Student search/picker — only if < 2 additional picked */}
                                      {selectedMembers.length < 2 && (
                                        <div style={{ position: 'relative', marginBottom: 8 }}>
                                          <input
                                            type="text"
                                            className="form-input"
                                            placeholder={`Search student to add (${2 - selectedMembers.length} slot${2 - selectedMembers.length !== 1 ? 's' : ''} left)...`}
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                          />
                                          {studentSearch && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 160, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                              {availableStudents
                                                .filter(s => !selectedMembers.find(m => m.id === s.id))
                                                .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.regNo.toLowerCase().includes(studentSearch.toLowerCase()))
                                                .slice(0, 8)
                                                .map(s => (
                                                  <div key={s.id} onClick={() => { setSelectedMembers(prev => [...prev, s]); setStudentSearch(''); }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                                                    <strong>{s.name}</strong> <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>{s.regNo}</span>
                                                  </div>
                                                ))}
                                              {availableStudents.filter(s => !selectedMembers.find(m => m.id === s.id)).filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.regNo.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 13 }}>No available students found</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                                        Group: {1 + selectedMembers.length} student{selectedMembers.length > 0 ? 's' : ''} (you{selectedMembers.length > 0 ? ` + ${selectedMembers.length} other${selectedMembers.length > 1 ? 's' : ''}` : ''})
                                      </p>

                                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                        <button className="select-btn" onClick={() => handleSelectSupervisor(sup.id)} disabled={loading}>
                                          {loading ? '...' : 'Send Request'}
                                        </button>
                                        {existingProposal?.description && (
                                          <button type="button" onClick={() => setShowPreview(true)} style={{ fontSize: '0.78rem', padding: '6px 12px', background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                                            Preview Proposal
                                          </button>
                                        )}
                                        <button className="back-btn" style={{ fontSize: '0.78rem', padding: '6px 12px' }} onClick={() => { setSelectedSupervisorId(null); setSelectedMembers([]); setStudentSearch(''); }}>
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button className="select-btn" onClick={() => setSelectedSupervisorId(sup.id)}>
                                      Select
                                    </button>
                                  )}
                                </div>
                              );
                            };

                            return (
                              <>
                                {/* ── Recommended Section ── */}
                                {recommended.length > 0 && (
                                  <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '4px 12px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                        Recommended
                                      </span>
                                      <span style={{ fontSize: 12, color: '#64748b' }}>
                                        Matching your "{existingProposal?.domain}" domain
                                      </span>
                                    </div>
                                    <div className="supervisor-grid">
                                      {recommended.map(renderCard)}
                                    </div>
                                  </div>
                                )}

                                {/* ── Other Supervisors Section ── */}
                                {others.length > 0 && (
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: `${recommended.length > 0 ? '4px' : '0'} 0 12px` }}>
                                      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                        Other Supervisors
                                      </span>
                                      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                    </div>
                                    <div className="supervisor-grid" style={{ opacity: 0.85 }}>
                                      {others.map(renderCard)}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {existingProposal.status === 'approved' && isInGroup && (
                    <div className="section-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', marginTop: 16 }}>
                      <h4 style={{ color: '#15803d', marginBottom: 8 }}>You are assigned to a group!</h4>
                      <p style={{ color: '#166534', fontSize: 14 }}>
                        Proposal: <strong>{studentGroup?.proposal?.title || existingProposal?.title || 'Untitled Proposal'}</strong>
                      </p>
                      <p style={{ color: '#15803d', fontSize: 13, marginTop: 4 }}>
                        Supervised by: <strong>{studentGroup?.supervisor?.user?.name || `Supervisor #${studentGroup.supervisorId}`}</strong>
                      </p>
                      <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>Use the Chat tab in the sidebar to communicate with your group and supervisor.</p>
                      {/* Committee Info */}
                      {studentGroup.committeeId && (
                        <CommitteeInfoBanner groupId={studentGroup.id} />
                      )}
                    </div>
                  )}

                  {existingProposal.status === 'rejected' && (
                    <div className="resubmit-notice">
                      <p>Your proposal was rejected. You can submit a revised proposal.</p>
                      <button
                        className="action-btn-new primary"
                        onClick={() => setActiveView("submit")}
                      >
                        Submit New Proposal
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">—</div>
                  <h3>No Proposal Submitted</h3>
                  <p>You haven't submitted any proposal yet.</p>
                  <button
                    className="action-btn-new primary"
                    onClick={() => setActiveView("submit")}
                  >
                    Submit Your First Proposal
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Browse Projects View */}
        {activeView === "browse-projects" && (
          <BrowseProjectsTab user={user} existingProposal={existingProposal} />
        )}

        {/* Templates View */}
        {activeView === "templates" && (
          <div className="templates-container">
            <div className="section-card">
              <h2 className="section-title">Download Official Templates</h2>
              <p className="section-subtitle">Download the required templates for your FYP proposal submission</p>

              <div className="template-list">
                <div className="template-item-new">
                  <div className="template-icon-new">PDF</div>
                  <div className="template-info">
                    <h4>Proposal Template</h4>
                    <p>Official FYP proposal submission template. Use this format to submit your project proposal.</p>
                    <span className="template-meta">PDF Document</span>
                  </div>
                  <a
                    href="/TITLE.pdf"
                    download="Proposal_Template.pdf"
                    className="download-btn-new"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat View (only when in a group) */}
        {activeView === "chat" && isInGroup && (
          <StudentChatView user={user} studentGroup={studentGroup} socket={socket} />
        )}
      </main>

      {/* Preview Modal */}
      {showPreview && (
        <ProposalPreviewModal
          description={submittedProposal?.description || existingProposal?.description || formData.description || ''}
          title={submittedProposal?.title || existingProposal?.title || formData.title || ''}
          domain={submittedProposal?.domain || existingProposal?.domain || formData.domain || ''}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// ─── STUDENT CHAT COMPONENT ──────────────────────────────────────────
function StudentChatView({ user, studentGroup, socket }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const bottomRef = useRef(null);
  const roomId = `group-${studentGroup.id}`;

  useEffect(() => {
    socket.emit("joinRoom", roomId);

    // Load chat history
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/chat/${roomId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(() => { });

    const handleMessage = (data) => {
      if (data.roomId === roomId) {
        setMessages(prev => [...prev, data]);
      }
    };
    socket.on("receiveMessage", handleMessage);
    return () => socket.off("receiveMessage", handleMessage);
  }, [roomId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;
    const data = {
      roomId,
      senderId: user?.studentId || user?.id || 0,
      senderName: user?.regNo || user?.name || "Student",
      senderRole: "student",
      message,
    };
    socket.emit("sendMessage", data);
    setMessages(prev => [...prev, { ...data, _local: true }]);
    setMessage("");
  };

  return (
    <div className="proposals-container">
      <div className="section-card">
        <h2 className="section-title">💬 Group #{studentGroup.id} Chat</h2>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>Chat with your group members and supervisor</p>
        <div style={{ height: 400, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, background: "#f8fafc", display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {messages.length === 0 && <p style={{ color: "#94a3b8", textAlign: "center", marginTop: 160 }}>No messages yet. Start the conversation!</p>}
          {messages.map((msg, i) => {
            const isMine = msg._local || (msg.senderRole === "student" && String(msg.senderId) === String(user?.studentId));
            const displayName = msg.senderRole === "supervisor" ? (msg.senderName || "Supervisor") : (msg.senderName || "Student");
            return (
              <div key={i} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "70%", background: isMine ? "#4a7dff" : msg.senderRole === "supervisor" ? "#f0fdf4" : "#fff", color: isMine ? "#fff" : "#1e293b", padding: "10px 14px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: isMine ? "none" : msg.senderRole === "supervisor" ? "1px solid #bbf7d0" : "1px solid #e2e8f0" }}>
                {!isMine && <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginBottom: 2, color: msg.senderRole === "supervisor" ? "#15803d" : "#64748b" }}>{displayName} {msg.senderRole === "supervisor" ? "(Supervisor)" : ""}</p>}
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
    </div>
  );
}

// ─── COMMITTEE INFO BANNER (shown in student status view) ─────────────────────
function CommitteeInfoBanner({ groupId }) {
  const [committee, setCommittee] = React.useState(null);

  React.useEffect(() => {
    if (!groupId) return;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/committee/by-group/${groupId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setCommittee(data))
      .catch(() => { });
  }, [groupId]);

  if (!committee) return null;

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #bbf7d0' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 8 }}>
        Evaluation Committee Assigned
      </p>
      <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px' }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#15803d', margin: '0 0 10px' }}>{committee.name}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(committee.members || []).map((m, i) => (
            <div key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px' }}>
              <p style={{ fontWeight: 600, fontSize: 12, color: '#166534', margin: 0 }}>{m.name}</p>
              <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{m.designation || 'Supervisor'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PROPOSAL PREVIEW MODAL ──────────────────────────────────────────
function ProposalPreviewModal({ description, title, domain, onClose }) {
  const lines = (description || "").split("\n");

  const isHeading = (line) => {
    const t = line.trim();
    if (!t) return false;
    return (
      /^[A-Z][A-Z\s]{3,}:?$/.test(t) ||
      /^(Abstract|Introduction|Scope|Objectives|Methodology|Modules|References|Conclusion|Background|Problem Statement|Literature Review|Tools|Technologies|Timeline|Budget|Deliverables)/i.test(t)
    );
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '24px 28px 20px', borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg,#4a7dff,#6c5ce7)',
          borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Proposal Preview</p>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '6px 0 0' }}>{title || 'Untitled Proposal'}</h2>
            {domain && (
              <span style={{ display: 'inline-block', marginTop: 8, fontSize: 12, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '2px 10px', fontWeight: 600 }}>{domain}</span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: '#fff', flexShrink: 0, marginLeft: 16 }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '28px', flex: 1 }}>
          {!description ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>No description content to preview.</p>
          ) : (
            <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 14, color: '#1e293b', lineHeight: 1.8 }}>
              {lines.map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} style={{ height: 10 }} />;
                if (isHeading(trimmed)) {
                  return (
                    <h3 key={i} style={{
                      fontSize: 13, fontWeight: 800, color: '#4a7dff',
                      textTransform: 'uppercase', letterSpacing: 0.8,
                      margin: '24px 0 8px', paddingBottom: 6,
                      borderBottom: '2px solid #e0e7ff',
                    }}>
                      {trimmed}
                    </h3>
                  );
                }
                return <p key={i} style={{ margin: '0 0 10px', color: '#334155' }}>{trimmed}</p>;
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4a7dff,#6c5ce7)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BROWSE PROJECTS TAB ───────────────────────────────────────────────
function BrowseProjectsTab({ user, existingProposal }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [description, setDescription] = useState("");
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myRequest, setMyRequest] = useState(null);

  useEffect(() => {
    fetchProjects();
    fetchAvailableStudents();
    fetchMyRequest();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/supervisor-proposal/approved`);
      if (res.ok) setProjects(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchAvailableStudents = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/students/available`);
      if (res.ok) {
        const data = await res.json();
        setAvailableStudents(data.filter(s => s.id !== user?.studentId));
      }
    } catch (e) { console.error(e); }
  };

  const fetchMyRequest = async () => {
    if (!user?.studentId) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/project-request/student/${user.studentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === "pending") setMyRequest(data);
      }
    } catch (e) { console.error(e); }
  };

  const handleApply = async () => {
    if (!description.trim()) { alert("Please provide a description of why you are a good fit."); return; }

    setSubmitting(true);
    try {
      const memberRegs = selectedMembers.map(s => s.regNo);
      const memberIds = selectedMembers.map(s => s.id);

      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/project-request/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.studentId,
          supervisorProposalId: selectedProject.id,
          supervisorId: selectedProject.supervisorId,
          description,
          teamMembers: { member1: memberRegs[0] || null, member2: memberRegs[1] || null, member3: memberRegs[2] || null },
          memberStudentIds: memberIds,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert("Application sent successfully!");
        setSelectedProject(null);
        setDescription("");
        setSelectedMembers([]);
        fetchMyRequest();
      } else {
        alert(data.message || "Failed to send application.");
      }
    } catch (e) { alert("Server error"); }
    finally { setSubmitting(false); }
  };

  if (myRequest) {
    return (
      <div className="proposals-container">
        <div className="section-card">
          <h2 className="section-title">Pending Application</h2>
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: 16 }}>
            <p style={{ color: '#b45309', margin: 0, fontWeight: 600 }}>You already have a pending application for Project #{myRequest.supervisorProposalId}.</p>
            <p style={{ color: '#d97706', fontSize: 13, marginTop: 6 }}>Please wait for the supervisor to respond before applying to another project.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="proposals-container">
      <div className="section-card">
        <h2 className="section-title">Browse Supervisor Projects</h2>
        <p className="section-subtitle">Apply to project ideas posted by faculty members.</p>
      </div>

      {loading ? (
        <div className="loading-state"><span className="spinner" /><p>Loading projects...</p></div>
      ) : projects.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">—</div><h3>No Projects Available</h3><p>Check back later.</p></div>
      ) : (
        <div className="proposals-list">
          {projects.map(p => (
            <div key={p.id} className="proposal-review-card" style={{ marginBottom: 20, opacity: p.taken ? 0.75 : 1, border: p.taken ? '1px solid #fca5a5' : undefined }}>
              <div className="proposal-header">
                <div className="proposal-info">
                  <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{p.title}</h3>
                  <div className="proposal-meta" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="meta-badge domain">{p.domain || "N/A"}</span>
                    <span style={{ fontSize: 12, color: '#475569' }}>Supervisor: <strong>{p.supervisorName}</strong></span>
                    {p.taken && (
                      <span style={{ fontSize: 11, fontWeight: 800, background: '#fee2e2', color: '#dc2626', padding: '3px 12px', borderRadius: 20, border: '1px solid #fca5a5', letterSpacing: 0.5 }}>
                        TAKEN
                      </span>
                    )}
                    {!p.taken && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#d1fae5', color: '#059669', padding: '3px 12px', borderRadius: 20, border: '1px solid #6ee7b7' }}>
                        Available
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Scope / Description:</p>
                <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: 0 }}>{p.scope}</p>
              </div>
              {p.modules && p.modules.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.modules.map((m, i) => <span key={i} style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4 }}>{m}</span>)}
                </div>
              )}

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                {selectedProject?.id === p.id ? (
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Apply for this Project</h4>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Why should you be selected? *</label>
                      <textarea className="form-input" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your skills and why you are a good fit..." />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Add Team Members (Optional)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        {selectedMembers.map(m => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', padding: '4px 8px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>{m.name}</span>
                            <span style={{ fontSize: 10, color: '#64748b' }}>{m.regNo}</span>
                            <button onClick={() => setSelectedMembers(prev => prev.filter(s => s.id !== m.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>✕</button>
                          </div>
                        ))}
                      </div>

                      {selectedMembers.length < 2 && (
                        <div style={{ position: 'relative' }}>
                          <input type="text" className="form-input" placeholder="Search students..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                          {studentSearch && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 160, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                              {availableStudents
                                .filter(s => !selectedMembers.find(m => m.id === s.id) && (s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.regNo.toLowerCase().includes(studentSearch.toLowerCase())))
                                .slice(0, 8).map(s => (
                                  <div key={s.id} onClick={() => { setSelectedMembers(prev => [...prev, s]); setStudentSearch(''); }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                                    <strong>{s.name}</strong> <span style={{ color: '#94a3b8', fontSize: 11 }}>{s.regNo}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                      <button onClick={handleApply} className="action-btn-new primary" disabled={submitting}>
                        {submitting ? "Sending..." : "Submit Application"}
                      </button>
                      <button onClick={() => { setSelectedProject(null); setSelectedMembers([]); setDescription(""); setStudentSearch(""); }} className="back-btn" disabled={submitting}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : p.taken ? (
                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: '#dc2626', fontWeight: 700, fontSize: 14 }}>This project has already been taken by another team.</p>
                    <p style={{ margin: '4px 0 0', color: '#ef4444', fontSize: 12 }}>No further applications can be submitted for this project.</p>
                  </div>
                ) : (
                  <button onClick={() => setSelectedProject(p)} className="action-btn-new primary">
                    Apply for this Project
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
