 import React from "react";

export function EnhancementModal({ enhancedProposal, onClose, onSendToPEC }) {
    if (!enhancedProposal) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0 }}>✨ AI Enhanced Proposal</h3>
                        <button
                            onClick={onClose}
                            style={{
                                background: "rgba(255,255,255,0.2)",
                                border: "none",
                                color: "white",
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                cursor: "pointer",
                                fontSize: "1rem",
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="modal-body">
                    <div className="success-banner">
                        <p>✅ Your proposal has been enhanced successfully!</p>
                    </div>

                    <div className="enhancement-content">
                        {/* Enhanced Title */}
                        <div className="enhancement-section">
                            <h4>Enhanced Title</h4>
                            <h3>{enhancedProposal.title}</h3>
                        </div>

                        {/* Enhanced Scope */}
                        <div className="enhancement-section">
                            <h4>Enhanced Scope</h4>
                            <p style={{ color: "var(--text-dark)", lineHeight: 1.7 }}>
                                {enhancedProposal.scope}
                            </p>
                        </div>

                        {/* Enhanced Modules */}
                        {enhancedProposal.modules && enhancedProposal.modules.length > 0 && (
                            <div className="enhancement-section">
                                <h4>Suggested Modules</h4>
                                <div className="modules-grid">
                                    {enhancedProposal.modules.map((module, index) => (
                                        <div key={index} className="module-item">
                                            {typeof module === "string" ? module : module.name || `Module ${index + 1}`}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                        <button
                            className="btn btn-success"
                            onClick={onSendToPEC}
                            style={{ flex: 1 }}
                        >
                            📤 Send to PEC
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={onClose}
                            style={{ flex: 1 }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
