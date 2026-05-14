import { useState } from "react";
import React from "react";

export function ProposalSubmit({ onSubmit, loading }) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        domain: "",
        file: null,
    });
    const [fileName, setFileName] = useState("");
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = "Title is required";
        if (!formData.description.trim()) newErrors.description = "Description is required";
        if (!formData.domain) newErrors.domain = "Please select a domain";
        if (!formData.file) newErrors.file = "Please upload a PDF file";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== "application/pdf") {
                setErrors({ ...errors, file: "Only PDF files are allowed" });
                return;
            }
            setFormData({ ...formData, file });
            setFileName(file.name);
            setErrors({ ...errors, file: null });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    return (
        <div className="proposal-form-container">
            <h2>Submit Proposal</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                Upload your FYP proposal for similarity checking
            </p>

            <div className="form-card">
                <form onSubmit={handleSubmit}>
                    {/* Title */}
                    <div className="form-group">
                        <label className="form-label">
                            Proposal Title <span style={{ color: "var(--error)" }}>*</span>
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter your proposal title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            style={errors.title ? { borderColor: "var(--error)" } : {}}
                        />
                        {errors.title && (
                            <p style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                                {errors.title}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label className="form-label">
                            Description <span style={{ color: "var(--error)" }}>*</span>
                        </label>
                        <textarea
                            className="form-input"
                            placeholder="Describe your project idea in detail..."
                            rows={5}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            style={errors.description ? { borderColor: "var(--error)" } : {}}
                        />
                        {errors.description && (
                            <p style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                                {errors.description}
                            </p>
                        )}
                    </div>

                    {/* Domain */}
                    <div className="form-group">
                        <label className="form-label">
                            Domain <span style={{ color: "var(--error)" }}>*</span>
                        </label>
                        <select
                            className="form-input"
                            value={formData.domain}
                            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                            style={errors.domain ? { borderColor: "var(--error)" } : {}}
                        >
                            <option value="">Select a domain</option>
                            <option value="AI">Artificial Intelligence</option>
                            <option value="Web">Web Development</option>
                            <option value="Mobile">Mobile Development</option>
                            <option value="Cyber">Cybersecurity</option>
                        </select>
                        {errors.domain && (
                            <p style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                                {errors.domain}
                            </p>
                        )}
                    </div>

                    {/* File Upload */}
                    <div className="form-group">
                        <label className="form-label">
                            Upload Proposal (PDF only) <span style={{ color: "var(--error)" }}>*</span>
                        </label>
                        <div
                            className="file-input-wrapper"
                            style={errors.file ? { borderColor: "var(--error)" } : {}}
                        >
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                            />
                            {fileName ? (
                                <div>
                                    <p style={{ fontWeight: 600, color: "var(--text-dark)" }}>📄 {fileName}</p>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                        Click to change file
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p style={{ fontWeight: 500, color: "var(--text-dark)" }}>
                                        Click or drag to upload
                                    </p>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                        PDF files only (max 10MB)
                                    </p>
                                </div>
                            )}
                        </div>
                        {errors.file && (
                            <p style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                                {errors.file}
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                        style={{ marginTop: "1rem" }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Processing...
                            </>
                        ) : (
                            "Submit & Check Similarity"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
