import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import "./AuthRecovery.css";

export default function ResetPassword() {
    const { uid, token } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const legacyTokenFlow = Boolean(uid && token);

    const query = new URLSearchParams(location.search);
    const username = query.get("username") || sessionStorage.getItem("passwordResetUsername") || "";
    const verificationToken = sessionStorage.getItem("passwordResetVerificationToken") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        if (!legacyTokenFlow && !verificationToken) {
            setError("Your verification session is missing or expired. Verify a new code first.");
            return;
        }

        if (!password || !confirmPassword) {
            setError("Enter and confirm your new password.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);
            const payload = legacyTokenFlow
                ? { uid, token, password }
                : {
                    username,
                    verification_token: verificationToken,
                    password,
                };

            const endpoint = legacyTokenFlow
                ? "/users/password-reset/confirm/"
                : "/users/password-reset/confirm-otp/";

            const response = await API.post(endpoint, payload);
            setMessage(response.data.message);

            sessionStorage.removeItem("passwordResetUsername");
            sessionStorage.removeItem("passwordResetVerificationToken");
            setTimeout(() => navigate("/"), 900);
        } catch (requestError) {
            setError(
                requestError?.response?.data?.error ||
                "Unable to reset your password right now.",
            );
        } finally {
            setLoading(false);
        }
    };

    if (!legacyTokenFlow && !verificationToken) {
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
                    <h1>Verification required</h1>
                    <p>Verify the code sent to your registered email before creating a new password.</p>
                    <Link className="recovery-submit recovery-next-link" to="/verify-otp">
                        Verify Code
                    </Link>
                    <Link className="recovery-back" to="/">
                        ← Back to Sign In
                    </Link>
                </section>
            </main>
        );
    }

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

                <h1>Create a new password</h1>
                <p>
                    Your verification code has been accepted. Choose a new
                    password that satisfies the security requirements.
                </p>

                <form className="recovery-form" onSubmit={submit}>
                    <label htmlFor="new-password">New password</label>
                    <input
                        id="new-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Enter new password"
                    />

                    <label htmlFor="confirm-password">Confirm new password</label>
                    <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Confirm new password"
                    />

                    <button
                        className="recovery-submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>

                {message && <div className="recovery-message">{message}</div>}
                {error && <div className="recovery-error">{error}</div>}

                <Link className="recovery-back" to="/">
                    ← Back to Sign In
                </Link>
            </section>
        </main>
    );
}
