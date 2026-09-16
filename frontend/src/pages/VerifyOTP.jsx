import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import "./AuthRecovery.css";

export default function VerifyOTP() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryUsername = new URLSearchParams(location.search).get("username") || "";
    const [username, setUsername] = useState(
        queryUsername || sessionStorage.getItem("passwordResetUsername") || "",
    );
    const [otp, setOtp] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        const cleanUsername = username.trim();
        const cleanOtp = otp.trim();

        if (!cleanUsername) {
            setError("Enter your username.");
            return;
        }

        if (!/^\d{6}$/.test(cleanOtp)) {
            setError("Enter the 6-digit verification code.");
            return;
        }

        try {
            setLoading(true);
            const response = await API.post(
                "/users/password-reset/verify-otp/",
                { username: cleanUsername, otp: cleanOtp },
            );

            sessionStorage.setItem("passwordResetUsername", response.data.username || cleanUsername);
            sessionStorage.setItem("passwordResetVerificationToken", response.data.verification_token);
            setMessage(response.data.message);

            navigate("/reset-password");
        } catch (requestError) {
            setError(
                requestError?.response?.data?.error ||
                "Unable to verify the code right now.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="recovery-page">
            <section className="recovery-card">
                <div className="recovery-brand">
                    <img src="/budgetbuddy-mark.png" alt="BudgetBuddy" />
                    <div>
                        <strong>BudgetBuddy</strong>
                        <span>Personal Finance</span>
                    </div>
                </div>

                <h1>Verify your code</h1>
                <p>
                    Enter the 6-digit verification code sent to the registered
                    email address. Your password will not be changed until the
                    code is successfully verified.
                </p>

                <form className="recovery-form" onSubmit={submit}>
                    <label htmlFor="otp-username">Username</label>
                    <input
                        id="otp-username"
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        placeholder="Enter your username"
                    />

                    <label htmlFor="recovery-otp">Verification code</label>
                    <input
                        id="recovery-otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                        autoComplete="one-time-code"
                        placeholder="Enter 6-digit code"
                    />

                    <button
                        className="recovery-submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Verifying..." : "Verify Code"}
                    </button>
                </form>

                {message && <div className="recovery-message">{message}</div>}
                {error && <div className="recovery-error">{error}</div>}

                <Link className="recovery-back" to="/forgot-password">
                    ← Back to Forgot Password
                </Link>
            </section>
        </main>
    );
}
