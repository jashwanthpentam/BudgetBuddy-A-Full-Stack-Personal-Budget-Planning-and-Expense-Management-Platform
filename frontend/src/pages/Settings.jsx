import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../services/api";
import "../Settings.css";
import { toast, confirmAction } from "./toast";

export default function Settings() {

    /* =====================================================
       PROFILE
    ===================================================== */

    const [profile, setProfile] = useState({
        username: "",
        email: "",
        phone: "",
        date_of_birth: "",
        profile_picture: null,
        monthly_income: "",
        preferred_currency: "INR",
        budget_alert_threshold: 80,
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    /* =====================================================
       FRONTEND PREFERENCES
    ===================================================== */

    const [currency, setCurrency] = useState(
        localStorage.getItem("currency") || "INR"
    );

    const [defaultView, setDefaultView] = useState(
        localStorage.getItem("defaultView") || "dashboard"
    );

    /*
    * Dark is the default theme.
    * If the user has already selected a theme,
    * use the saved value.
    */

    const [theme, setTheme] = useState(
        localStorage.getItem("theme") || "dark"
    );

    /* =====================================================
       BACKEND NOTIFICATION PREFERENCES
    ===================================================== */

    const [notifications, setNotifications] = useState({
        budgetAlerts: true,
        expenseAlerts: true,
        savingsAlerts: true,
        weeklySummary: true,
    });

    const [notificationsLoading, setNotificationsLoading] =
        useState(true);

    const [notificationsSaving, setNotificationsSaving] =
        useState(false);

    /* =====================================================
       PASSWORD
    ===================================================== */

    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);

    /* =====================================================
       APPLY THEME
    ===================================================== */

    const applyTheme = (selectedTheme) => {

        document.documentElement.setAttribute(
            "data-theme",
            selectedTheme
        );

        document.body.setAttribute(
            "data-theme",
            selectedTheme
        );

        localStorage.setItem(
            "theme",
            selectedTheme
        );

    };

    /* =====================================================
       LOAD PROFILE + NOTIFICATION PREFERENCES
    ===================================================== */

    useEffect(() => {

        fetchProfile();

        fetchNotificationPreferences();

    }, []);

    /* =====================================================
       APPLY THEME WHENEVER THEME CHANGES
    ===================================================== */

    useEffect(() => {

        applyTheme(theme);

    }, [theme]);

    /* =====================================================
       PROFILE API
    ===================================================== */

    const fetchProfile = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await API.get(
                "/users/profile/"
            );

            setProfile({
                username:
                    response.data.username || "",

                email:
                    response.data.email || "",

                phone:
                    response.data.phone || "",

                date_of_birth:
                    response.data.date_of_birth || "",

                profile_picture:
                    response.data.profile_picture || null,

                monthly_income:
                    response.data.monthly_income || "",

                preferred_currency:
                    response.data.preferred_currency || "INR",

                budget_alert_threshold:
                    response.data.budget_alert_threshold || 80,
            });

        }

        catch (err) {

            console.log(
                "Profile loading error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                "Unable to load your profile."
            );

        }

        finally {

            setLoading(false);

        }

    };

    /* =====================================================
       NOTIFICATION PREFERENCES API
    ===================================================== */

    const fetchNotificationPreferences = async () => {

        try {

            setNotificationsLoading(true);

            const response = await API.get(
                "/notifications/preferences/"
            );

            setNotifications({
                budgetAlerts:
                    response.data.budget_alerts ?? true,

                expenseAlerts:
                    response.data.expense_alerts ?? true,

                savingsAlerts:
                    response.data.savings_alerts ?? true,

                weeklySummary:
                    response.data.weekly_summary ?? true,
            });

        }

        catch (err) {

            console.log(
                "Notification preferences loading error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                "Unable to load notification preferences."
            );

        }

        finally {

            setNotificationsLoading(false);

        }

    };

    /* =====================================================
       PROFILE INPUT
    ===================================================== */

    const handleProfileChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setProfile(previous => ({
            ...previous,
            [name]: value,
        }));

    };

    /* =====================================================
       SAVE PROFILE
    ===================================================== */

    const saveProfile = async () => {

        try {

            setSaving(true);
            setMessage("");
            setError("");

            const response = await API.patch(
                "/users/profile/",
                {
                    username:
                        profile.username,

                    email:
                        profile.email,

                    phone:
                        profile.phone,

                    date_of_birth:
                        profile.date_of_birth || null,

                    monthly_income:
                        profile.monthly_income || 0,

                    preferred_currency:
                        profile.preferred_currency || currency,

                    budget_alert_threshold:
                        Number(profile.budget_alert_threshold || 80),
                }
            );

            setProfile(previous => ({
                ...previous,
                ...response.data,
            }));

            localStorage.setItem(
                "username",
                response.data.username
            );

            localStorage.setItem(
                "email",
                response.data.email
            );

            setMessage(
                "Profile updated successfully."
            );

        }

        catch (err) {

            console.log(
                "Profile update error:",
                err
            );

            const data =
                err.response?.data;

            if (data) {

                const firstError =
                    Object.values(data)
                        .flat()
                        .find(Boolean);

                setError(
                    firstError ||
                    "Unable to update profile."
                );

            }

            else {

                setError(
                    "Unable to update profile."
                );

            }

        }

        finally {

            setSaving(false);

        }

    };

    /* =====================================================
       PASSWORD INPUT
    ===================================================== */

    const handlePasswordChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setPasswordForm(previous => ({
            ...previous,
            [name]: value,
        }));

    };

    /* =====================================================
       CHANGE PASSWORD
    ===================================================== */

    const changePassword = async () => {

        if (
            !passwordForm.current_password ||
            !passwordForm.new_password ||
            !passwordForm.confirm_password
        ) {

            setError(
                "Please fill all password fields."
            );

            return;

        }

        if (
            passwordForm.new_password !==
            passwordForm.confirm_password
        ) {

            setError(
                "New password and confirmation password do not match."
            );

            return;

        }

        try {

            setPasswordSaving(true);
            setMessage("");
            setError("");

            await API.post(
                "/users/change-password/",
                passwordForm
            );

            setPasswordForm({
                current_password: "",
                new_password: "",
                confirm_password: "",
            });

            setMessage(
                "Password changed successfully."
            );

        }

        catch (err) {

            console.log(
                "Password change error:",
                err
            );

            const data =
                err.response?.data;

            if (data) {

                const firstError =
                    Object.values(data)
                        .flat()
                        .find(Boolean);

                setError(
                    firstError ||
                    "Unable to change password."
                );

            }

            else {

                setError(
                    "Unable to change password."
                );

            }

        }

        finally {

            setPasswordSaving(false);

        }

    };

    /* =====================================================
       FRONTEND PREFERENCES
    ===================================================== */

    const saveFrontendPreferences = () => {

        localStorage.setItem(
            "currency",
            currency
        );

        localStorage.setItem(
            "defaultView",
            defaultView
        );

        /*
         * Theme is already saved by applyTheme().
         */

        applyTheme(theme);

        setMessage(
            "Preferences saved successfully."
        );

        setError("");

    };

    /* =====================================================
       THEME
    ===================================================== */

    const handleThemeChange = (newTheme) => {

        setTheme(newTheme);

        /*
         * Apply immediately.
         * User should not have to press Save.
         */

        applyTheme(newTheme);

        setMessage(
            `${newTheme === "dark" ? "Dark" : "Light"} mode enabled.`
        );

        setError("");

    };

    /* =====================================================
       NOTIFICATION TOGGLE
    ===================================================== */

    const toggleNotification = (key) => {

        setNotifications(previous => ({
            ...previous,
            [key]: !previous[key],
        }));

    };

    /* =====================================================
       SAVE NOTIFICATION PREFERENCES
    ===================================================== */

    const saveNotificationPreferences = async () => {

        try {

            setNotificationsSaving(true);
            setMessage("");
            setError("");

            const response = await API.patch(
                "/notifications/preferences/",
                {
                    budget_alerts:
                        notifications.budgetAlerts,

                    expense_alerts:
                        notifications.expenseAlerts,

                    savings_alerts:
                        notifications.savingsAlerts,

                    weekly_summary:
                        notifications.weeklySummary,
                }
            );

            setNotifications({
                budgetAlerts:
                    response.data.budget_alerts ?? false,

                expenseAlerts:
                    response.data.expense_alerts ?? false,

                savingsAlerts:
                    response.data.savings_alerts ?? false,

                weeklySummary:
                    response.data.weekly_summary ?? false,
            });

            setMessage(
                "Notification preferences saved successfully."
            );

        }

        catch (err) {

            console.log(
                "Notification preference update error:",
                err
            );

            const data =
                err.response?.data;

            if (data) {

                const firstError =
                    Object.values(data)
                        .flat()
                        .find(Boolean);

                setError(
                    firstError ||
                    "Unable to save notification preferences."
                );

            }

            else {

                setError(
                    "Unable to save notification preferences."
                );

            }

        }

        finally {

            setNotificationsSaving(false);

        }

    };

    /* =====================================================
       RESET PREFERENCES
    ===================================================== */

    const resetPreferences = async () => {

        const confirmed = await confirmAction(
            "Reset your application and notification preferences?",
            "Reset preferences"
        );

        if (!confirmed) return;

        try {

            setMessage("");
            setError("");

            /* ---------------------------------------------
               Reset frontend preferences
            --------------------------------------------- */

            localStorage.removeItem("currency");
            localStorage.removeItem("defaultView");

            setCurrency("INR");
            setDefaultView("dashboard");

            /*
             * Reset theme to light.
             */

            setTheme("light");
            applyTheme("light");

            /* ---------------------------------------------
               Reset notification preferences
            --------------------------------------------- */

            const response = await API.patch(
                "/notifications/preferences/",
                {
                    budget_alerts: true,
                    expense_alerts: true,
                    savings_alerts: true,
                    weekly_summary: true,
                }
            );

            setNotifications({
                budgetAlerts:
                    response.data.budget_alerts ?? true,

                expenseAlerts:
                    response.data.expense_alerts ?? true,

                savingsAlerts:
                    response.data.savings_alerts ?? true,

                weeklySummary:
                    response.data.weekly_summary ?? true,
            });

            setMessage(
                "All preferences have been reset successfully."
            );

        }

        catch (err) {

            console.log(
                "Reset preferences error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                "Unable to reset preferences."
            );

        }

    };

    /* =====================================================
       LOADING
    ===================================================== */

    if (loading || notificationsLoading) {

        return (

            <MainLayout title="Settings">

                <div className="dashboard-loading">

                    <div className="loading-circle">
                        ⚙
                    </div>

                    <h2>
                        Loading settings
                    </h2>

                    <p>
                        Retrieving your account information...
                    </p>

                </div>

            </MainLayout>

        );

    }

    /* =====================================================
       MAIN UI
    ===================================================== */

    return (

        <MainLayout title="Settings">

            <div className="settings-page">

                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="settings-header">

                    <div>

                        <div className="settings-breadcrumb">
                            Account / Settings
                        </div>

                        <h1>
                            Settings
                        </h1>

                        <p>
                            Manage your account,
                            preferences and notifications.
                        </p>

                    </div>

                    <div className="settings-user-badge">

                        <div className="settings-avatar">

                            {profile.username
                                ?.charAt(0)
                                .toUpperCase() || "U"}

                        </div>

                        <div>

                            <strong>
                                {profile.username || "User"}
                            </strong>

                            <span>
                                Personal Account
                            </span>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    SUCCESS MESSAGE
                ================================================= */}

                {message && (

                    <div className="settings-success">

                        <span>✓</span>

                        {message}

                    </div>

                )}

                {/* =================================================
                    ERROR MESSAGE
                ================================================= */}

                {error && (

                    <div className="settings-error">

                        <span>!</span>

                        {error}

                    </div>

                )}

                <div className="settings-layout">

                    {/* =================================================
                        SIDEBAR
                    ================================================= */}

                    <aside className="settings-sidebar">

                        <div className="settings-nav-title">
                            SETTINGS
                        </div>

                        <a
                            href="#profile"
                            className="settings-nav-item active"
                        >
                            <span>👤</span>
                            Profile
                        </a>

                        <a
                            href="#appearance"
                            className="settings-nav-item"
                        >
                            <span>◐</span>
                            Appearance
                        </a>

                        <a
                            href="#finance"
                            className="settings-nav-item"
                        >
                            <span>₹</span>
                            Financial Preferences
                        </a>

                        <a
                            href="#notifications"
                            className="settings-nav-item"
                        >
                            <span>🔔</span>
                            Notifications
                        </a>

                        <a
                            href="#security"
                            className="settings-nav-item"
                        >
                            <span>🔒</span>
                            Security
                        </a>

                        <a
                            href="#data"
                            className="settings-nav-item"
                        >
                            <span>◫</span>
                            Data & Account
                        </a>

                    </aside>

                    {/* =================================================
                        CONTENT
                    ================================================= */}

                    <main className="settings-content">

                        {/* =================================================
                            PROFILE
                        ================================================= */}

                        <section
                            id="profile"
                            className="settings-card"
                        >

                            <div className="settings-card-header">

                                <div>

                                    <h2>
                                        Profile
                                    </h2>

                                    <p>
                                        Manage your account
                                        information.
                                    </p>

                                </div>

                                <div className="section-icon">
                                    👤
                                </div>

                            </div>

                            <div className="profile-preview">

                                <div className="large-avatar">

                                    {profile.username
                                        ?.charAt(0)
                                        .toUpperCase() || "U"}

                                </div>

                                <div>

                                    <h3>
                                        {profile.username}
                                    </h3>

                                    <p>
                                        {profile.email}
                                    </p>

                                </div>

                            </div>

                            <div className="settings-form-grid">

                                <div className="settings-field">

                                    <label>
                                        Display Name
                                    </label>

                                    <input
                                        name="username"
                                        value={
                                            profile.username
                                        }
                                        onChange={
                                            handleProfileChange
                                        }
                                        placeholder="Your name"
                                    />

                                </div>

                                <div className="settings-field">

                                    <label>
                                        Email Address
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        value={
                                            profile.email
                                        }
                                        onChange={
                                            handleProfileChange
                                        }
                                        placeholder="you@example.com"
                                    />

                                </div>

                                <div className="settings-field">

                                    <label>
                                        Phone Number
                                    </label>

                                    <input
                                        name="phone"
                                        value={
                                            profile.phone
                                        }
                                        onChange={
                                            handleProfileChange
                                        }
                                        placeholder="Phone number"
                                    />

                                </div>

                                <div className="settings-field">

                                    <label>
                                        Date of Birth
                                    </label>

                                    <input
                                        type="date"
                                        name="date_of_birth"
                                        value={
                                            profile.date_of_birth
                                        }
                                        onChange={
                                            handleProfileChange
                                        }
                                    />

                                </div>

                                <div className="settings-field">
                                    <label>Monthly Income</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="monthly_income"
                                        value={profile.monthly_income}
                                        onChange={handleProfileChange}
                                        placeholder="50000"
                                    />
                                </div>

                                <div className="settings-field">
                                    <label>Preferred Currency</label>
                                    <select
                                        name="preferred_currency"
                                        value={profile.preferred_currency}
                                        onChange={handleProfileChange}
                                    >
                                        <option value="INR">INR — ₹</option>
                                        <option value="USD">USD — $</option>
                                        <option value="EUR">EUR — €</option>
                                        <option value="GBP">GBP — £</option>
                                    </select>
                                </div>

                                <div className="settings-field">
                                    <label>Budget Alert Threshold (%)</label>
                                    <input
                                        type="number"
                                        min="50"
                                        max="100"
                                        name="budget_alert_threshold"
                                        value={profile.budget_alert_threshold}
                                        onChange={handleProfileChange}
                                    />
                                </div>

                            </div>

                            <div className="settings-inline-actions">

                                <button
                                    className="save-settings-btn"
                                    onClick={saveProfile}
                                    disabled={saving}
                                >

                                    {saving
                                        ? "Saving..."
                                        : "Save Profile"}

                                </button>

                            </div>

                        </section>

                        {/* =================================================
                            APPEARANCE
                        ================================================= */}

                        <section
                            id="appearance"
                            className="settings-card"
                        >

                            <div className="settings-card-header">

                                <div>

                                    <h2>
                                        Appearance
                                    </h2>

                                    <p>
                                        Choose how BudgetBuddy
                                        looks.
                                    </p>

                                </div>

                                <div className="section-icon">
                                    ◐
                                </div>

                            </div>

                            <div className="theme-options">

                                <button
                                    type="button"
                                    className={
                                        `theme-option ${
                                            theme === "dark"
                                                ? "selected"
                                                : ""
                                        }`
                                    }
                                    onClick={() =>
                                        handleThemeChange("dark")
                                    }
                                >

                                    <div className="theme-preview dark-preview">

                                        <div />
                                        <div />
                                        <div />

                                    </div>

                                    <div className="theme-option-info">

                                        <strong>
                                            Dark
                                        </strong>

                                        <span>
                                            Dark interface
                                        </span>

                                    </div>

                                    {theme === "dark" && (
                                        <b>✓</b>
                                    )}

                                </button>

                                <button
                                    type="button"
                                    className={
                                        `theme-option ${
                                            theme === "light"
                                                ? "selected"
                                                : ""
                                        }`
                                    }
                                    onClick={() =>
                                        handleThemeChange("light")
                                    }
                                >

                                    <div className="theme-preview light-preview">

                                        <div />
                                        <div />
                                        <div />

                                    </div>

                                    <div className="theme-option-info">

                                        <strong>
                                            Light
                                        </strong>

                                        <span>
                                            Bright interface
                                        </span>

                                    </div>

                                    {theme === "light" && (
                                        <b>✓</b>
                                    )}

                                </button>

                            </div>

                            <div className="settings-inline-actions">

                                <button
                                    type="button"
                                    className="save-settings-btn"
                                    onClick={
                                        saveFrontendPreferences
                                    }
                                >
                                    Save Appearance
                                </button>

                            </div>

                        </section>

                        {/* =================================================
                            FINANCIAL PREFERENCES
                        ================================================= */}

                        <section
                            id="finance"
                            className="settings-card"
                        >

                            <div className="settings-card-header">

                                <div>

                                    <h2>
                                        Financial Preferences
                                    </h2>

                                    <p>
                                        Configure financial
                                        display preferences.
                                    </p>

                                </div>

                                <div className="section-icon">
                                    ₹
                                </div>

                            </div>

                            <div className="settings-form-grid">

                                <div className="settings-field">

                                    <label>
                                        Currency
                                    </label>

                                    <select
                                        value={currency}
                                        onChange={(e) =>
                                            setCurrency(
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option value="INR">
                                            ₹ Indian Rupee
                                        </option>

                                        <option value="USD">
                                            $ US Dollar
                                        </option>

                                        <option value="EUR">
                                            € Euro
                                        </option>

                                        <option value="GBP">
                                            £ British Pound
                                        </option>

                                    </select>

                                </div>

                                <div className="settings-field">

                                    <label>
                                        Default Landing Page
                                    </label>

                                    <select
                                        value={defaultView}
                                        onChange={(e) =>
                                            setDefaultView(
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option value="dashboard">
                                            Dashboard
                                        </option>

                                        <option value="analytics">
                                            Analytics
                                        </option>

                                        <option value="income">
                                            Income
                                        </option>

                                        <option value="expenses">
                                            Expenses
                                        </option>

                                    </select>

                                </div>

                            </div>

                            <div className="settings-inline-actions">

                                <button
                                    type="button"
                                    className="save-settings-btn"
                                    onClick={
                                        saveFrontendPreferences
                                    }
                                >
                                    Save Preferences
                                </button>

                            </div>

                        </section>

                        {/* =================================================
                            NOTIFICATIONS
                        ================================================= */}

                        <section
                            id="notifications"
                            className="settings-card"
                        >

                            <div className="settings-card-header">

                                <div>

                                    <h2>
                                        Notifications
                                    </h2>

                                    <p>
                                        Choose which financial
                                        alerts you receive.
                                    </p>

                                </div>

                                <div className="section-icon">
                                    🔔
                                </div>

                            </div>

                            {[
                                [
                                    "budgetAlerts",
                                    "Budget Alerts",
                                    "Notify me when I approach my budget."
                                ],

                                [
                                    "expenseAlerts",
                                    "Expense Alerts",
                                    "Notify me about important spending activity."
                                ],

                                [
                                    "savingsAlerts",
                                    "Savings Goal Alerts",
                                    "Keep me updated on savings progress."
                                ],

                                [
                                    "weeklySummary",
                                    "Weekly Summary",
                                    "Receive a weekly overview of my finances."
                                ],

                            ].map(
                                ([key, title, description]) => (

                                    <div
                                        className="notification-row"
                                        key={key}
                                    >

                                        <div>

                                            <strong>
                                                {title}
                                            </strong>

                                            <p>
                                                {description}
                                            </p>

                                        </div>

                                        <button
                                            type="button"
                                            className={
                                                `toggle ${
                                                    notifications[key]
                                                        ? "on"
                                                        : ""
                                                }`
                                            }
                                            onClick={() =>
                                                toggleNotification(
                                                    key
                                                )
                                            }
                                            disabled={
                                                notificationsSaving
                                            }
                                            aria-label={
                                                `Toggle ${title}`
                                            }
                                        >

                                            <span />

                                        </button>

                                    </div>

                                )
                            )}

                            <div className="settings-inline-actions">

                                <button
                                    type="button"
                                    className="save-settings-btn"
                                    onClick={
                                        saveNotificationPreferences
                                    }
                                    disabled={
                                        notificationsSaving
                                    }
                                >

                                    {notificationsSaving
                                        ? "Saving..."
                                        : "Save Notifications"}

                                </button>

                            </div>

                        </section>

                        {/* =================================================
                            SECURITY
                        ================================================= */}

                        <section
                            id="security"
                            className="settings-card"
                        >

                            <div className="settings-card-header">

                                <div>

                                    <h2>
                                        Security
                                    </h2>

                                    <p>
                                        Manage your account
                                        password.
                                    </p>

                                </div>

                                <div className="section-icon">
                                    🔒
                                </div>

                            </div>

                            <div className="security-row">

                                <div>

                                    <strong>
                                        Password
                                    </strong>

                                    <p>
                                        Change your account
                                        password securely.
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    className="secondary-settings-btn"
                                    onClick={() =>
                                        setShowPassword(
                                            !showPassword
                                        )
                                    }
                                >

                                    {showPassword
                                        ? "Hide"
                                        : "Change Password"}

                                </button>

                            </div>

                            {showPassword && (

                                <div className="password-box">

                                    <div className="settings-field">

                                        <label>
                                            Current Password
                                        </label>

                                        <input
                                            type="password"
                                            name="current_password"
                                            value={
                                                passwordForm.current_password
                                            }
                                            onChange={
                                                handlePasswordChange
                                            }
                                        />

                                    </div>

                                    <div className="settings-field">

                                        <label>
                                            New Password
                                        </label>

                                        <input
                                            type="password"
                                            name="new_password"
                                            value={
                                                passwordForm.new_password
                                            }
                                            onChange={
                                                handlePasswordChange
                                            }
                                        />

                                    </div>

                                    <div className="settings-field">

                                        <label>
                                            Confirm Password
                                        </label>

                                        <input
                                            type="password"
                                            name="confirm_password"
                                            value={
                                                passwordForm.confirm_password
                                            }
                                            onChange={
                                                handlePasswordChange
                                            }
                                        />

                                    </div>

                                    <button
                                        type="button"
                                        className="save-settings-btn"
                                        onClick={
                                            changePassword
                                        }
                                        disabled={
                                            passwordSaving
                                        }
                                    >

                                        {passwordSaving
                                            ? "Changing..."
                                            : "Update Password"}

                                    </button>

                                </div>

                            )}

                        </section>

                        {/* =================================================
                            DATA & ACCOUNT
                        ================================================= */}

                        <section
                            id="data"
                            className="settings-card"
                        >

                            <div className="settings-card-header">

                                <div>

                                    <h2>
                                        Data & Account
                                    </h2>

                                    <p>
                                        Manage your application
                                        preferences.
                                    </p>

                                </div>

                                <div className="section-icon">
                                    ◫
                                </div>

                            </div>

                            <div className="data-actions">

                                <button
                                    type="button"
                                    className="secondary-settings-btn"
                                    onClick={() =>
                                        toast.info("Export will be connected to the Reports module.")
                                    }
                                >
                                    Export Financial Data
                                </button>

                                <button
                                    type="button"
                                    className="danger-outline-btn"
                                    onClick={
                                        resetPreferences
                                    }
                                >
                                    Reset Preferences
                                </button>

                            </div>

                        </section>

                    </main>

                </div>

            </div>

        </MainLayout>

    );

}