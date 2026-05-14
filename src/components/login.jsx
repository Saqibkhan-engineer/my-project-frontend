import { useState } from "react";
import React from "react";
import "../App.css";

export function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Signup fields
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState("student");

  // Student-specific fields
  const [regNo, setRegNo] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [department, setDepartment] = useState("");

  // Supervisor-specific fields
  const [designation, setDesignation] = useState("");
  const [expertise, setExpertise] = useState([]);

  // Field-level errors for signup
  const [fieldErrors, setFieldErrors] = useState({});

  // Validation functions
  const validateName = (value) => {
    if (!value.trim()) return "Name is required";
    if (value.trim().length < 2) return "Name must be at least 2 characters";
    if (!/^[a-zA-Z\s]+$/.test(value)) return "Name can only contain letters and spaces";
    return "";
  };

  const validatePassword = (value) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(value)) return "Password must contain at least one number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Password must contain at least one special character";
    return "";
  };

  const validateConfirmPassword = (value, pass) => {
    if (!value) return "Please confirm your password";
    if (value !== pass) return "Passwords do not match";
    return "";
  };

  const validateRegNo = (value) => {
    if (!value) return "Registration number is required";
    const regNoPattern = /^[A-Za-z]{2}\d{2}-[A-Za-z]+-\d{1,4}$/;
    if (!regNoPattern.test(value)) {
      return "Format: FA22-BSE-005 or SP25-DPHARM-167";
    }
    return "";
  };

  // Real-time validation for signup fields
  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (isSignup) {
      setFieldErrors(prev => ({ ...prev, name: validateName(value) }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (isSignup) {
      setFieldErrors(prev => ({
        ...prev,
        password: validatePassword(value),
        confirmPassword: confirmPassword ? validateConfirmPassword(confirmPassword, value) : ""
      }));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(value, password) }));
  };

  const handleRegNoChange = (e) => {
    const value = e.target.value.toUpperCase();
    setRegNo(value);
    setFieldErrors(prev => ({ ...prev, regNo: validateRegNo(value) }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data;
      const responseText = await res.text();
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Server error. Please try again later.');
      }

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      sessionStorage.setItem('token', data.accesstoken);
      sessionStorage.setItem('user', JSON.stringify(data.user));

      const roleMap = {
        'student': 'student',
        'pec': 'office',
        'supervisor': 'supervisor',
        'admin': 'admin'
      };

      onLogin(roleMap[data.user.role] || 'student', data.user);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    const errors = {
      name: validateName(name),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword, password),
    };

    if (role === "student") {
      errors.regNo = validateRegNo(regNo);
      if (!department) errors.department = "Please select a department";
    } else if (role === "supervisor") {
      if (!designation.trim()) errors.designation = "Designation is required";
      if (expertise.length === 0) errors.expertise = "Please select at least one expertise";
    }

    setFieldErrors(errors);

    const hasErrors = Object.values(errors).some(err => err !== "");
    if (hasErrors) {
      setError("Please fix the errors below");
      return;
    }

    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);

    try {
      const body = {
        name,
        email,
        password,
        role,
        ...(role === "student" && {
          regNo,
          fatherName,
          department,
        }),
        ...(role === "supervisor" && {
          designation,
          expertise,
        }),
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let data;
      const responseText = await res.text();
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Server error. Please try again later.');
      }

      if (!res.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      alert("Account created successfully! Please login.");
      setIsSignup(false);
      setName("");
      setConfirmPassword("");
      setRegNo("");
      setFatherName("");
      setDepartment("");
      setDesignation("");
      setExpertise([]);
      setRole("student");
      setFieldErrors({});
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Icons as inline SVGs
  const EmailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );

  const LockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );

  const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  const UserIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  return (
    <div className="login-page-new">
      {/* Title Box with thin blue border */}
      <div className="login-title-box">
        <div className="login-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
          </svg>
        </div>
        <h1 className="login-brand">FYP protal</h1>
        <p className="login-tagline">Final Year Project Management System</p>
      </div>

      {/* Form Card */}
      <div className="login-card-new">
        {/* Tabs */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${!isSignup ? 'active' : ''}`}
            onClick={() => { setIsSignup(false); setError(""); setFieldErrors({}); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab ${isSignup ? 'active' : ''}`}
            onClick={() => { setIsSignup(true); setError(""); setFieldErrors({}); }}
          >
            Create Account
          </button>
        </div>

        {/* Form Content */}
        <div className="login-form-content">
          <h2 className="login-welcome">{isSignup ? "Get Started" : "Welcome Back"}</h2>
          <p className="login-instruction">
            {isSignup ? "Create your account to get started" : "Sign in to continue to your portal"}
          </p>

          {error && (
            <div className="login-error-alert">{error}</div>
          )}

          <form onSubmit={isSignup ? handleSignup : handleLogin}>
            {/* Name field (signup only) */}
            {isSignup && (
              <div className="input-group">
                <label className="input-label">
                  <UserIcon /> Full Name
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><UserIcon /></span>
                  <input
                    type="text"
                    className={`input-field ${fieldErrors.name ? 'error' : ''}`}
                    placeholder="Enter your full name"
                    value={name}
                    onChange={handleNameChange}
                  />
                </div>
                {fieldErrors.name && <span className="input-error">{fieldErrors.name}</span>}
              </div>
            )}

            {/* Email field */}
            <div className="input-group">
              <label className="input-label">
                <EmailIcon /> Email Address
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><EmailIcon /></span>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              {!isSignup && (
                <span className="input-hint">Use your university email for faster verification</span>
              )}
            </div>

            {/* Password field */}
            <div className="input-group">
              <label className="input-label">
                <LockIcon /> Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><LockIcon /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input-field ${isSignup && fieldErrors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {isSignup && fieldErrors.password && <span className="input-error">{fieldErrors.password}</span>}
            </div>

            {/* Signup additional fields */}
            {isSignup && (
              <>
                {/* Confirm Password */}
                <div className="input-group">
                  <label className="input-label">
                    <LockIcon /> Confirm Password
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon"><LockIcon /></span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className={`input-field ${fieldErrors.confirmPassword ? 'error' : ''}`}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <span className="input-error">{fieldErrors.confirmPassword}</span>}
                </div>

                {/* Role Selection */}
                <div className="input-group">
                  <label className="input-label">Role</label>
                  <select
                    className="input-field select-field"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="student">Student</option>
                    <option value="pec">PEC Member</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin / FYP Office</option>
                  </select>
                </div>

                {/* Student-specific fields */}
                {role === "student" && (
                  <>
                    <div className="input-group">
                      <label className="input-label">Registration Number</label>
                      <input
                        type="text"
                        className={`input-field ${fieldErrors.regNo ? 'error' : ''}`}
                        placeholder="e.g., FA22-BSE-005"
                        value={regNo}
                        onChange={handleRegNoChange}
                      />
                      {fieldErrors.regNo && <span className="input-error">{fieldErrors.regNo}</span>}
                    </div>

                    <div className="input-group">
                      <label className="input-label">Father's Name</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Enter father's name"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Department</label>
                      <select
                        className={`input-field select-field ${fieldErrors.department ? 'error' : ''}`}
                        value={department}
                        onChange={(e) => {
                          setDepartment(e.target.value);
                          setFieldErrors(prev => ({ ...prev, department: "" }));
                        }}
                      >
                        <option value="">Select Department</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Software Engineering">Software Engineering</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Data Science">Data Science</option>
                      </select>
                      {fieldErrors.department && <span className="input-error">{fieldErrors.department}</span>}
                    </div>
                  </>
                )}

                {/* Supervisor-specific fields */}
                {role === "supervisor" && (
                  <>
                    <div className="input-group">
                      <label className="input-label">Designation</label>
                      <input
                        type="text"
                        className={`input-field ${fieldErrors.designation ? 'error' : ''}`}
                        placeholder="e.g., Assistant Professor"
                        value={designation}
                        onChange={(e) => {
                          setDesignation(e.target.value);
                          setFieldErrors(prev => ({ ...prev, designation: "" }));
                        }}
                      />
                      {fieldErrors.designation && <span className="input-error">{fieldErrors.designation}</span>}
                    </div>

                    <div className="input-group">
                      <label className="input-label">Expertise</label>
                      <div className="checkbox-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                        {['AI', 'Web', 'Mobile', 'Data Science', 'Cybersecurity'].map((item) => (
                          <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                            <input
                              type="checkbox"
                              value={item}
                              checked={expertise.includes(item)}
                              onChange={(e) => {
                                if (e.target.checked) setExpertise([...expertise, item]);
                                else setExpertise(expertise.filter(ex => ex !== item));
                                setFieldErrors(prev => ({ ...prev, expertise: "" }));
                              }}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                      {fieldErrors.expertise && <span className="input-error">{fieldErrors.expertise}</span>}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Remember me / Forgot password (login only) */}
            {!isSignup && (
              <div className="login-options-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? "Please wait..." : (isSignup ? "Create Account" : "Sign In")}
              {!loading && <span className="btn-arrow">→</span>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
