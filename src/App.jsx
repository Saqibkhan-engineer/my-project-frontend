import { useState, useEffect } from "react";
import "./App.css";
import React from "react";
import { Login } from "./components/login";
import { StudentDashboard } from "./components/StudentDashboard";
import { OfficeDashboard } from "./components/fypofficeDashboard";
import { SupervisorDashboard } from "./components/supervisorDashboard";
import { AdminDashboard } from "./components/AdminDashboard";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const savedUser = sessionStorage.getItem('user');

    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const roleMap = {
          'student': 'student',
          'pec': 'office',
          'supervisor': 'supervisor',
          'admin': 'admin'
        };
        setCurrentUser(roleMap[user.role] || 'student');
        setUserData(user);
      } catch (e) {
        console.error('Failed to parse saved user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
    }
  }, []);

  const supervisors = [
    { id: 1, name: "Dr. Muhammad Asif", domain: "AI", expertise: "Machine Learning, Deep Learning" },
    { id: 2, name: "Dr. Sarah Ahmed", domain: "AI", expertise: "Computer Vision, NLP" },
    { id: 3, name: "Dr. Ali Raza", domain: "Web", expertise: "Full Stack, Cloud Computing" },
    { id: 4, name: "Dr. Fatima Khan", domain: "Web", expertise: "React, Node.js, APIs" },
    { id: 5, name: "Dr. Hassan Malik", domain: "Mobile", expertise: "iOS, Android, React Native" },
    { id: 6, name: "Dr. Ayesha Noor", domain: "Mobile", expertise: "Flutter, Mobile UX" },
    { id: 7, name: "Dr. Usman Tariq", domain: "Cyber", expertise: "Network Security, Ethical Hacking" },
    { id: 8, name: "Dr. Zainab Abbas", domain: "Cyber", expertise: "Cryptography, Penetration Testing" },
  ];

  const handleLogin = (userType, user) => {
    setCurrentUser(userType);
    setUserData(user);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setCurrentUser(null);
    setUserData(null);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentUser === "student") {
    return (
      <StudentDashboard
        user={userData}
        supervisors={supervisors}
        onLogout={handleLogout}
      />
    );
  }

  if (currentUser === "office") {
    return (
      <OfficeDashboard
        user={userData}
        onLogout={handleLogout}
      />
    );
  }

  if (currentUser === "supervisor") {
    return (
      <SupervisorDashboard
        user={userData}
        supervisors={supervisors}
        onLogout={handleLogout}
      />
    );
  }

  if (currentUser === "admin") {
    return (
      <AdminDashboard
        user={userData}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}

export default App;
