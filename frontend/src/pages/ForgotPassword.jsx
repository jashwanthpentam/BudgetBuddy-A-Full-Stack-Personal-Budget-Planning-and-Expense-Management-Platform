import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import "./AuthRecovery.css";

export default function ForgotPassword() {
    const [username, setUsername] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        if (!username.trim()) {
            setError("Enter your username.");
            return;
        }

        try {
            setLoading(true);
            const response = await API.post(
                "/users/password-reset/request-otp/",
                { username: username.trim() },
            );
            sessionStorage.setItem("passwordResetUsername", username.trim());
            setMessage(response.data.message);
        } catch (requestError) {
            setError(
                requestError?.response?.data?.error ||
                "Unable to send reset instructions right now.",
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

                <h1>Forgot your password?</h1>
                <p>
                    Enter your username and we&apos;ll send a one-time
                    verification code to the email registered with your
                    BudgetBuddy account.
                </p>

                <form className="recovery-form" onSubmit={submit}>
                    <label htmlFor="recovery-username">
                        Username
                    </label>
                    <input
                        id="recovery-username"
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        placeholder="Enter your username"
                    />
                    <button
                        className="recovery-submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Sending..." : "Send Verification Code"}
                    </button>
                </form>

                {message && (
                    <>
                        <div className="recovery-message">{message}</div>
                        <Link className="recovery-submit recovery-next-link" to="/reset-password">
                            Enter Verification Code
                        </Link>
                    </>
                )}
                {error && <div className="recovery-error">{error}</div>}

                <Link className="recovery-back" to="/">
                    ← Back to Sign In
                </Link>
            </section>
        </main>
    );
}
