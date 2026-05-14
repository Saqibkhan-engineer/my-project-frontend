import React from "react";

export function DashboardHome({ student }) {
    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="dashboard-home">
            {/* Welcome Banner with Student Info */}
            <div className="welcome-card">
                <div className="welcome-header">
                    <p className="welcome-date">{today}</p>
                    <h1>Welcome back, {student.name.split(" ")[0]}!</h1>
                    <p className="welcome-subtitle">Always stay updated in your student portal</p>
                </div>

                <div className="student-info-bar">
                    <div className="info-item">
                        <span className="info-label">Full Name</span>
                        <span className="info-value">{student.name}</span>
                    </div>
                    <div className="info-divider"></div>
                    <div className="info-item">
                        <span className="info-label">Email Address</span>
                        <span className="info-value">{student.email}</span>
                    </div>
                    <div className="info-divider"></div>
                    <div className="info-item">
                        <span className="info-label">Program</span>
                        <span className="info-value">{student.program}</span>
                    </div>
                    <div className="info-divider"></div>
                    <div className="info-item">
                        <span className="info-label">Semester</span>
                        <span className="info-value">{student.semester}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
