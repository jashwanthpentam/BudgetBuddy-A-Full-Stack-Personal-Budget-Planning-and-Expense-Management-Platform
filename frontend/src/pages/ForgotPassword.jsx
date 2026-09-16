import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import "./AuthRecovery.css";

export default function ForgotPassword() {
    const [identifier, setIdentifier] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        if (!identifier.trim()) {
            setError("Enter your username or registered email address.");
            return;
        }

        try {
            setLoading(true);
            const response = await API.post(
                "/users/password-reset/request/",
                { identifier: identifier.trim() },
            );
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
                    Enter your username or registered email and we&apos;ll
                    send password-reset instructions if the account can be
                    recovered by email.
                </p>

                <form className="recovery-form" onSubmit={submit}>
                    <label htmlFor="recovery-identifier">
                        Username or email
                    </label>
                    <input
                        id="recovery-identifier"
                        type="text"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                        autoComplete="username"
                        placeholder="Enter username or email"
                    />
                    <button
                        className="recovery-submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
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
