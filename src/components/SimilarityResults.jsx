import React from "react";

export function SimilarityResults({
    proposal,
    similarProjects,
    onEnhance,
    onSendToPEC,
    loading,
}) {
    // Check if any project has similarity > 60%
    const hasHighSimilarity = similarProjects.some(
        (p) => p.similarities?.weightedSimilarity > 60
    );

    // Get the highest similarity score
    const maxSimilarity = Math.max(
        ...similarProjects.map((p) => p.similarities?.weightedSimilarity || 0)
    );

    return (
        <div className="similarity-results">
            <div className="results-header">
                <div>
                    <h3>Similarity Results</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                        Found {similarProjects.length} projects to compare
                    </p>
                </div>
                {hasHighSimilarity ? (
                    <span className="badge badge-warning">High Similarity Detected</span>
                ) : (
                    <span className="badge badge-success">Low Similarity</span>
                )}
            </div>

            {/* Result Cards */}
            <div style={{ marginTop: "1rem" }}>
                {similarProjects.slice(0, 5).map((project, index) => {
                    const similarity = project.similarities?.weightedSimilarity || 0;
                    const isHigh = similarity > 60;

                    return (
                        <div
                            key={project.id || index}
                            className={`result-card ${isHigh ? "high-similarity" : ""}`}
                        >
                            <div className="result-header">
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <span
                                            style={{
                                                background: "var(--primary-blue)",
                                                color: "white",
                                                padding: "0.25rem 0.5rem",
                                                borderRadius: "0.25rem",
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                            }}
                                        >
                                            #{index + 1}
                                        </span>
                                        <h4 className="result-title">{project.title}</h4>
                                    </div>
                                    <p className="result-domain">Domain: {project.domain}</p>
                                </div>

                                <div className="similarity-score">
                                    <div className={`score-circle ${isHigh ? "score-high" : "score-low"}`}>
                                        {similarity}%
                                    </div>
                                    <p className="score-label">Match</p>
                                </div>
                            </div>

                            {project.description && (
                                <p className="result-description">
                                    {project.description.length > 150
                                        ? project.description.substring(0, 150) + "..."
                                        : project.description}
                                </p>
                            )}

                            <div className="similarity-breakdown">
                                <div className="breakdown-item">
                                    <p className="breakdown-label">Title</p>
                                    <p className="breakdown-value">
                                        {project.similarities?.titleSimilarity || 0}%
                                    </p>
                                </div>
                                <div className="breakdown-item">
                                    <p className="breakdown-label">Scope</p>
                                    <p className="breakdown-value">
                                        {project.similarities?.scopeSimilarity || 0}%
                                    </p>
                                </div>
                                <div className="breakdown-item">
                                    <p className="breakdown-label">Modules</p>
                                    <p className="breakdown-value">
                                        {project.similarities?.modulesSimilarity || 0}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
                {hasHighSimilarity ? (
                    <>
                        <button
                            className="btn btn-primary"
                            onClick={onEnhance}
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Enhancing...
                                </>
                            ) : (
                                "✨ Enhance with AI"
                            )}
                        </button>
                        <p
                            style={{
                                width: "100%",
                                textAlign: "center",
                                fontSize: "0.875rem",
                                color: "var(--text-muted)",
                            }}
                        >
                            Your proposal has {maxSimilarity}% similarity. Consider enhancing it to
                            make it more unique.
                        </p>
                    </>
                ) : (
                    <>
                        <button
                            className="btn btn-success"
                            onClick={onSendToPEC}
                            style={{ flex: 1 }}
                        >
                            📤 Send to Proposal Evaluation Committee
                        </button>
                        <p
                            style={{
                                width: "100%",
                                textAlign: "center",
                                fontSize: "0.875rem",
                                color: "var(--text-muted)",
                            }}
                        >
                            Your proposal has low similarity. You can proceed to submit it for
                            evaluation.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
