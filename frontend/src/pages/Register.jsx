import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [theme, setTheme] = useState(
        document.documentElement.getAttribute("data-theme") || "dark"
    );

    const navigate = useNavigate();

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setTheme(
                document.documentElement.getAttribute("data-theme") || "dark"
            );
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        return () => observer.disconnect();
    }, []);

    const passwordScore = useMemo(() => {
        if (!password) return 0;

        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    }, [password]);

    const strength =
        passwordScore <= 1
            ? { label: "Weak", className: "weak" }
            : passwordScore === 2
                ? { label: "Fair", className: "fair" }
                : passwordScore === 3
                    ? { label: "Good", className: "good" }
                    : { label: "Strong", className: "strong" };

    const register = async (e) => {
        e.preventDefault();

        if (!username.trim() || !email.trim() || !password) {
            setIsError(true);
            setMessage("Complete all fields to create your account.");
            return;
        }

        if (password.length < 8) {
            setIsError(true);
            setMessage("Your password needs at least 8 characters.");
            return;
        }

        setLoading(true);
        setMessage("");
        setIsError(false);

        try {
            await API.post("/users/register/", {
                username: username.trim(),
                email: email.trim(),
                password,
            });

            setIsError(false);
            setMessage("Account created. Taking you to sign in...");

            setTimeout(() => navigate("/"), 900);
        } catch (error) {
            const data = error?.response?.data;
            let errorMessage = "Registration failed. Please try again.";

            if (typeof data === "string") {
                errorMessage = data;
            } else if (data?.detail) {
                errorMessage = data.detail;
            } else if (data && typeof data === "object") {
                const firstError = Object.values(data).flat?.()[0];
                if (firstError) errorMessage = String(firstError);
            }

            setIsError(true);
            setMessage(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                * { box-sizing: border-box; }

                .bb-auth {
                    --green: #16c866;
                    --green-dark: #0f9f51;
                    min-height: 100vh;
                    width: 100%;
                    padding: 28px;
                    display: grid;
                    place-items: center;
                    position: relative;
                    overflow: hidden;
                    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    color: var(--bb-text);
                    background:
                        radial-gradient(circle at 4% 5%, rgba(22,200,102,.13), transparent 25%),
                        radial-gradient(circle at 96% 94%, rgba(47,128,237,.13), transparent 27%),
                        var(--bb-bg);
                }

                .bb-auth.dark {
                    --bb-bg: #07111f;
                    --bb-panel: #101d31;
                    --bb-panel-2: #14243a;
                    --bb-card: rgba(255,255,255,.045);
                    --bb-text: #f8fafc;
                    --bb-muted: #91a1b8;
                    --bb-border: rgba(148,163,184,.16);
                    --bb-input: #0e1a2b;
                    --bb-shadow: 0 35px 100px rgba(0,0,0,.45);
                }

                .bb-auth.light {
                    --bb-bg: #eef4f8;
                    --bb-panel: #ffffff;
                    --bb-panel-2: #f6f9fc;
                    --bb-card: rgba(15,23,42,.045);
                    --bb-text: #172033;
                    --bb-muted: #65748a;
                    --bb-border: #dce5ee;
                    --bb-input: #f8fafc;
                    --bb-shadow: 0 30px 90px rgba(30,41,59,.15);
                }

                .bb-grid {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    opacity: .42;
                    background-image:
                        linear-gradient(rgba(148,163,184,.045) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(148,163,184,.045) 1px, transparent 1px);
                    background-size: 56px 56px;
                    mask-image: radial-gradient(circle at center, black, transparent 82%);
                }

                .bb-orb {
                    position: absolute;
                    border-radius: 50%;
                    pointer-events: none;
                }

                .bb-orb-a {
                    width: 390px;
                    height: 390px;
                    top: -230px;
                    left: -170px;
                    background: rgba(22,200,102,.12);
                }

                .bb-orb-b {
                    width: 430px;
                    height: 430px;
                    right: -220px;
                    bottom: -260px;
                    background: rgba(47,128,237,.10);
                }

                .bb-shell {
                    width: min(1120px, 100%);
                    min-height: 680px;
                    display: grid;
                    grid-template-columns: 1.02fr .98fr;
                    border: 1px solid var(--bb-border);
                    border-radius: 32px;
                    overflow: hidden;
                    position: relative;
                    z-index: 2;
                    background: var(--bb-panel);
                    box-shadow: var(--bb-shadow);
                    animation: bbEnter .7s cubic-bezier(.2,.8,.2,1);
                }

                .bb-showcase {
                    position: relative;
                    padding: 48px;
                    overflow: hidden;
                    color: white;
                    background:
                        radial-gradient(circle at 76% 13%, rgba(255,255,255,.18), transparent 18%),
                        linear-gradient(145deg, #13a858 0%, #0e8654 45%, #0c6658 100%);
                }

                .bb-showcase::before {
                    content: "";
                    position: absolute;
                    width: 470px;
                    height: 470px;
                    border: 1px solid rgba(255,255,255,.12);
                    border-radius: 50%;
                    right: -270px;
                    bottom: -280px;
                }

                .bb-showcase::after {
                    content: "";
                    position: absolute;
                    width: 260px;
                    height: 260px;
                    border: 1px solid rgba(255,255,255,.10);
                    border-radius: 50%;
                    left: -190px;
                    top: -165px;
                }

                .bb-brand-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    position: relative;
                    z-index: 2;
                }

                .bb-brand-mark {
                    width: 46px;
                    height: 46px;
                    display: grid;
                    place-items: center;
                    border-radius: 14px;
                    background: rgba(255,255,255,.14);
                    border: 1px solid rgba(255,255,255,.15);
                    font-size: 25px;
                    box-shadow: 0 10px 25px rgba(0,0,0,.10);
                }

                .bb-brand {
                    font-size: 20px;
                    font-weight: 550;
                    letter-spacing: -.6px;
                }

                .bb-eyebrow {
                    margin-top: 58px;
                    color: rgba(255,255,255,.68);
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: .14em;
                    text-transform: uppercase;
                }

                .bb-hero {
                    margin: 10px 0 0;
                    max-width: 490px;
                    font-size: clamp(34px, 3.7vw, 48px);
                    line-height: .99;
                    letter-spacing: -1.3px;
                    font-weight: 600;
                }

                .bb-hero span { color: #a7f3c8; }

                .bb-copy {
                    max-width: 455px;
                    margin: 20px 0 0;
                    color: rgba(255,255,255,.76);
                    line-height: 1.7;
                    font-size: 14px;
                }

                .bb-steps {
                    margin-top: 34px;
                    display: grid;
                    gap: 10px;
                    position: relative;
                    z-index: 2;
                }

                .bb-step {
                    display: grid;
                    grid-template-columns: 34px 1fr auto;
                    align-items: center;
                    gap: 11px;
                    padding: 11px 12px;
                    border: 1px solid rgba(255,255,255,.10);
                    border-radius: 14px;
                    background: rgba(255,255,255,.055);
                    transition: transform .2s, background .2s;
                }

                .bb-step:hover {
                    transform: translateX(5px);
                    background: rgba(255,255,255,.09);
                }

                .bb-step-number {
                    width: 30px;
                    height: 30px;
                    display: grid;
                    place-items: center;
                    border-radius: 10px;
                    color: #0c6b4f;
                    background: #d5ffe7;
                    font-size: 11px;
                    font-weight: 600;
                }

                .bb-step strong {
                    display: block;
                    font-size: 12px;
                }

                .bb-step small {
                    display: block;
                    margin-top: 3px;
                    color: rgba(255,255,255,.52);
                    font-size: 9px;
                }

                .bb-step-arrow {
                    color: rgba(255,255,255,.42);
                }

                .bb-goal-card {
                    width: min(410px, 100%);
                    margin-top: 18px;
                    padding: 16px;
                    border: 1px solid rgba(255,255,255,.13);
                    border-radius: 18px;
                    background: rgba(3,35,27,.22);
                    backdrop-filter: blur(12px);
                    position: relative;
                    z-index: 2;
                }

                .bb-goal-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    color: rgba(255,255,255,.68);
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: .08em;
                }

                .bb-goal-value {
                    display: flex;
                    justify-content: space-between;
                    align-items: end;
                    margin-top: 8px;
                }

                .bb-goal-value strong {
                    font-size: 24px;
                }

                .bb-goal-value span {
                    color: #b9f8d2;
                    font-size: 10px;
                    font-weight: 600;
                }

                .bb-progress {
                    height: 7px;
                    margin-top: 12px;
                    overflow: hidden;
                    border-radius: 99px;
                    background: rgba(255,255,255,.10);
                }

                .bb-progress span {
                    display: block;
                    width: 72%;
                    height: 100%;
                    border-radius: inherit;
                    background: linear-gradient(90deg, #b8ffd2, #23d56e);
                    animation: bbProgress 2s ease-out both;
                }

                .bb-goal-foot {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 8px;
                    color: rgba(255,255,255,.50);
                    font-size: 8px;
                }

                .bb-showcase-footer {
                    position: absolute;
                    left: 48px;
                    bottom: 34px;
                    color: rgba(255,255,255,.52);
                    font-size: 10px;
                    z-index: 2;
                }

                .bb-form-side {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 52px 58px;
                    background:
                        linear-gradient(180deg, var(--bb-panel), var(--bb-panel-2));
                }

                .bb-form {
                    width: min(420px, 100%);
                    animation: bbForm .75s .08s both cubic-bezier(.2,.8,.2,1);
                }

                .bb-form-kicker {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    margin-bottom: 12px;
                    color: var(--green);
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: .14em;
                    text-transform: uppercase;
                }

                .bb-kicker-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--green);
                    box-shadow: 0 0 0 5px rgba(22,200,102,.10);
                }

                .bb-title {
                    margin: 0;
                    color: var(--bb-text);
                    font-size: clamp(32px, 4vw, 43px);
                    line-height: 1.02;
                    letter-spacing: -1.5px;
                    font-weight: 600;
                }

                .bb-subtitle {
                    max-width: 410px;
                    margin: 13px 0 28px;
                    color: var(--bb-muted);
                    font-size: 13px;
                    line-height: 1.65;
                }

                .bb-field {
                    margin-bottom: 15px;
                }

                .bb-label {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    color: var(--bb-text);
                    font-size: 12px;
                    font-weight: 600;
                }

                .bb-input-wrap { position: relative; }

                .bb-input {
                    width: 100%;
                    height: 55px;
                    border: 1px solid var(--bb-border);
                    border-radius: 14px;
                    outline: none;
                    padding: 0 15px;
                    color: var(--bb-text);
                    background: var(--bb-input);
                    font: inherit;
                    font-size: 13px;
                    transition: border-color .2s, box-shadow .2s, transform .2s, background .2s;
                }

                .bb-input.password { padding-right: 52px; }

                .bb-input::placeholder {
                    color: var(--bb-muted);
                    opacity: .8;
                }

                .bb-input:focus {
                    border-color: rgba(22,200,102,.72);
                    box-shadow: 0 0 0 4px rgba(22,200,102,.10);
                    transform: translateY(-1px);
                    background: var(--bb-panel);
                }

                .bb-eye {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    width: 38px;
                    height: 38px;
                    transform: translateY(-50%);
                    border: 0;
                    border-radius: 10px;
                    color: var(--bb-muted);
                    background: transparent;
                    cursor: pointer;
                    font-size: 16px;
                }

                .bb-eye:hover {
                    color: var(--bb-text);
                    background: var(--bb-card);
                }

                .bb-strength {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    margin: 7px 1px 0;
                }

                .bb-strength-bars {
                    display: flex;
                    flex: 1;
                    gap: 4px;
                }

                .bb-strength-bar {
                    height: 4px;
                    flex: 1;
                    border-radius: 99px;
                    background: var(--bb-border);
                    transition: background .2s;
                }

                .bb-strength.weak .bb-strength-bar:nth-child(1) { background: #ef4444; }
                .bb-strength.fair .bb-strength-bar:nth-child(-n+2) { background: #f59e0b; }
                .bb-strength.good .bb-strength-bar:nth-child(-n+3) { background: #22c55e; }
                .bb-strength.strong .bb-strength-bar { background: #16c866; }

                .bb-strength-label {
                    min-width: 40px;
                    color: var(--bb-muted);
                    font-size: 9px;
                    text-align: right;
                }

                .bb-requirements {
                    margin: 8px 0 18px;
                    color: var(--bb-muted);
                    font-size: 9px;
                    line-height: 1.6;
                }

                .bb-submit {
                    width: 100%;
                    height: 55px;
                    border: 0;
                    border-radius: 14px;
                    color: white;
                    background: linear-gradient(135deg, #18c96a, #11aa55);
                    box-shadow: 0 12px 26px rgba(22,200,102,.20);
                    font: inherit;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    transition: transform .2s, box-shadow .2s, filter .2s;
                }

                .bb-submit::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: -110%;
                    width: 60%;
                    transform: skewX(-22deg);
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,.24), transparent);
                    transition: left .7s ease;
                }

                .bb-submit:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 16px 34px rgba(22,200,102,.28);
                }

                .bb-submit:hover:not(:disabled)::before { left: 145%; }

                .bb-submit:disabled {
                    opacity: .68;
                    cursor: not-allowed;
                }

                .bb-status {
                    display: flex;
                    align-items: flex-start;
                    gap: 9px;
                    margin-top: 14px;
                    padding: 11px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    line-height: 1.5;
                }

                .bb-status.error {
                    color: #ef4444;
                    border: 1px solid rgba(239,68,68,.18);
                    background: rgba(239,68,68,.07);
                }

                .bb-status.success {
                    color: #16a34a;
                    border: 1px solid rgba(22,163,74,.18);
                    background: rgba(22,163,74,.07);
                }

                .bb-divider {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin: 23px 0 18px;
                    color: var(--bb-muted);
                    font-size: 9px;
                    font-weight: 600;
                    letter-spacing: .08em;
                    text-transform: uppercase;
                }

                .bb-divider::before,
                .bb-divider::after {
                    content: "";
                    height: 1px;
                    flex: 1;
                    background: var(--bb-border);
                }

                .bb-create {
                    text-align: center;
                    color: var(--bb-muted);
                    font-size: 12px;
                }

                .bb-create a {
                    color: var(--green);
                    font-weight: 600;
                    text-decoration: none;
                }

                .bb-create a:hover { text-decoration: underline; }

                .bb-trust {
                    display: flex;
                    justify-content: center;
                    gap: 18px;
                    margin-top: 20px;
                    color: var(--bb-muted);
                    font-size: 9px;
                }

                @keyframes bbEnter {
                    from { opacity: 0; transform: translateY(22px) scale(.985); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                @keyframes bbForm {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                @keyframes bbProgress {
                    from { width: 0; }
                    to { width: 72%; }
                }

                @media (max-width: 900px) {
                    .bb-auth { padding: 16px; }
                    .bb-shell {
                        grid-template-columns: 1fr;
                        min-height: auto;
                        max-width: 620px;
                    }
                    .bb-showcase { min-height: 430px; }
                    .bb-showcase-footer { display: none; }
                    .bb-form-side { padding: 42px 30px 48px; }
                }

                @media (max-width: 520px) {
                    .bb-auth { padding: 8px; }
                    .bb-shell { border-radius: 22px; }
                    .bb-showcase { padding: 30px 24px; min-height: 400px; }
                    .bb-eyebrow { margin-top: 35px; }
                    .bb-hero { font-size: 34px; letter-spacing: -1px; }
                    .bb-form-side { padding: 34px 22px 38px; }
                    .bb-title { font-size: 31px; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .bb-shell, .bb-form, .bb-progress span {
                        animation: none !important;
                    }
                }

                /* BudgetBuddy compact premium refresh */
                .bb-auth {
                    --green: #d4b98a;
                    --green-dark: #b99b69;
                    --blue: #7aa2c7;
                    padding: 24px;
                    background:
                        radial-gradient(circle at 0% 0%, rgba(212,185,138,.10), transparent 24%),
                        radial-gradient(circle at 100% 100%, rgba(86,126,164,.11), transparent 25%),
                        var(--bb-bg);
                }

                .bb-auth.dark {
                    --bb-bg: #070d14;
                    --bb-panel: #101a28;
                    --bb-panel-2: #0c1521;
                    --bb-card: rgba(255,255,255,.035);
                    --bb-text: #f5f3ee;
                    --bb-muted: #91a0b3;
                    --bb-border: rgba(214,226,238,.14);
                    --bb-input: #0b1420;
                    --bb-shadow: 0 24px 70px rgba(0,0,0,.42);
                }

                .bb-auth.light {
                    --bb-bg: #f2f1ed;
                    --bb-panel: #ffffff;
                    --bb-panel-2: #f8f7f4;
                    --bb-card: rgba(15,23,42,.035);
                    --bb-text: #14202b;
                    --bb-muted: #687687;
                    --bb-border: #dfe2e4;
                    --bb-input: #f8f8f6;
                    --bb-shadow: 0 22px 65px rgba(30,41,59,.14);
                }

                .bb-shell {
                    width: min(980px, 100%);
                    min-height: 590px;
                    max-height: calc(100vh - 48px);
                    grid-template-columns: .96fr 1.04fr;
                    border-radius: 26px;
                    box-shadow: var(--bb-shadow);
                }

                .bb-showcase {
                    padding: 34px;
                    background:
                        radial-gradient(circle at 78% 12%, rgba(212,185,138,.16), transparent 19%),
                        linear-gradient(145deg, #162b38 0%, #10232d 54%, #0d1b25 100%);
                }

                .bb-showcase::before {
                    width: 380px;
                    height: 380px;
                    right: -245px;
                    bottom: -255px;
                    border-color: rgba(212,185,138,.12);
                }

                .bb-showcase::after {
                    width: 210px;
                    height: 210px;
                    left: -155px;
                    top: -135px;
                    border-color: rgba(255,255,255,.07);
                }

                .bb-brand-row { gap: 10px; }
                .bb-brand-mark {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    background: #f7f4ed;
                    border: 1px solid rgba(212,185,138,.45);
                    box-shadow: 0 8px 20px rgba(0,0,0,.18);
                    padding: 6px;
                    overflow: hidden;
                }
                .bb-brand-mark img {
                    width: 100%;
                    height: 100%;
                    display: block;
                    object-fit: cover;
                    border-radius: 7px;
                }
                .bb-brand { font-size: 17px; letter-spacing: -.35px; }

                .bb-eyebrow {
                    margin-top: 38px;
                    color: #d7b77d;
                    font-size: 10px;
                }

                .bb-hero {
                    max-width: 430px;
                    font-size: clamp(34px, 4vw, 49px);
                    letter-spacing: -2px;
                }

                .bb-hero span { color: #e5d4b2; }

                .bb-copy {
                    max-width: 410px;
                    margin-top: 15px;
                    color: rgba(245,243,238,.68);
                    font-size: 12px;
                    line-height: 1.55;
                }

                .bb-steps { margin-top: 24px; gap: 8px; }
                .bb-step { padding: 9px 10px; border-radius: 12px; }
                .bb-step-number { width: 28px; height: 28px; border-radius: 9px; }
                .bb-goal-card { margin-top: 13px; padding: 13px; }
                .bb-goal-value strong { font-size: 21px; }
                .bb-preview {
                    width: min(405px, 100%);
                    margin-top: 24px;
                    padding: 14px;
                    border-radius: 17px;
                    border-color: rgba(212,185,138,.18);
                    background: rgba(5,17,25,.34);
                }

                .bb-balance-value { font-size: 25px; }
                .bb-chart { height: 62px; margin-top: 12px; }
                .bb-mini { padding: 8px; }
                .bb-mini strong { font-size: 11px; }
                .bb-points { margin-top: 14px; gap: 6px; }
                .bb-pill { padding: 6px 9px; font-size: 9px; }
                .bb-showcase-footer { left: 34px; bottom: 24px; }

                .bb-form-side {
                    padding: 38px 46px;
                    background: linear-gradient(180deg, var(--bb-panel), var(--bb-panel-2));
                }

                .bb-form { width: min(390px, 100%); }
                .bb-form-kicker { color: #d4b98a; font-size: 10px; }
                .bb-kicker-dot {
                    background: #d4b98a;
                    box-shadow: 0 0 0 5px rgba(212,185,138,.10);
                }
                .bb-title {
                    font-size: clamp(30px, 3.4vw, 39px);
                    letter-spacing: -1.3px;
                }
                .bb-subtitle {
                    margin: 11px 0 24px;
                    font-size: 12px;
                    line-height: 1.55;
                }
                .bb-field { margin-bottom: 13px; }
                .bb-label { margin-bottom: 7px; font-size: 11px; }
                .bb-input {
                    height: 50px;
                    border-radius: 12px;
                    font-size: 12px;
                }
                .bb-input:focus {
                    border-color: rgba(212,185,138,.70);
                    box-shadow: 0 0 0 4px rgba(212,185,138,.09);
                }
                .bb-eye { width: 36px; height: 36px; }
                .bb-options { margin: 1px 0 18px; }
                .bb-check, .bb-secure { font-size: 10px; }
                .bb-submit {
                    height: 50px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #e0c18b, #b89a67);
                    box-shadow: 0 10px 24px rgba(184,154,103,.18);
                    color: #111a22;
                    font-size: 12px;
                }
                .bb-submit:hover:not(:disabled) {
                    box-shadow: 0 14px 30px rgba(184,154,103,.25);
                }
                .bb-divider { margin: 20px 0 16px; }
                .bb-create { font-size: 11px; }
                .bb-create a { color: #d4b98a; }
                .bb-trust { margin-top: 16px; font-size: 8px; }

                @media (max-height: 760px) and (min-width: 901px) {
                    .bb-auth { padding: 14px; }
                    .bb-shell { min-height: 540px; max-height: calc(100vh - 28px); }
                    .bb-showcase { padding: 28px; }
                    .bb-eyebrow { margin-top: 32px; }
                    .bb-steps { margin-top: 24px; gap: 8px; }
                .bb-step { padding: 9px 10px; border-radius: 12px; }
                .bb-step-number { width: 28px; height: 28px; border-radius: 9px; }
                .bb-goal-card { margin-top: 13px; padding: 13px; }
                .bb-goal-value strong { font-size: 21px; }
                .bb-preview { margin-top: 18px; }
                    .bb-showcase-footer { left: 28px; bottom: 18px; }
                    .bb-form-side { padding: 28px 38px; }
                }

            `}</style>

            <main className={`bb-auth ${theme}`}>
                <div className="bb-grid" />
                <div className="bb-orb bb-orb-a" />
                <div className="bb-orb bb-orb-b" />

                <section className="bb-shell">
                    <div className="bb-showcase">
                        <div>
                            <div className="bb-brand-row">
                                <div className="bb-brand-mark"><img src="/budgetbuddy-mark.png" alt="BudgetBuddy" /></div>
                                <div className="bb-brand">BudgetBuddy</div>
                            </div>

                            <div className="bb-eyebrow">Start with one simple habit</div>

                            <h1 className="bb-hero">
                                Build better <span>money habits.</span>
                            </h1>

                            <p className="bb-copy">
                                Set up your finance workspace and keep everything in one place.
                            </p>

                            <div className="bb-steps">
                                <div className="bb-step">
                                    <div className="bb-step-number">01</div>
                                    <div>
                                        <strong>Create your profile</strong>
                                        <small>One account for your whole workspace</small>
                                    </div>
                                    <div className="bb-step-arrow">→</div>
                                </div>

                                <div className="bb-step">
                                    <div className="bb-step-number">02</div>
                                    <div>
                                        <strong>Track your money</strong>
                                        <small>Income, expenses and budgets in one view</small>
                                    </div>
                                    <div className="bb-step-arrow">→</div>
                                </div>

                                <div className="bb-step">
                                    <div className="bb-step-number">03</div>
                                    <div>
                                        <strong>Grow your savings</strong>
                                        <small>Turn goals into visible progress</small>
                                    </div>
                                    <div className="bb-step-arrow">✓</div>
                                </div>
                            </div>

                            <div className="bb-goal-card">
                                <div className="bb-goal-head">
                                    <span>Example savings goal</span>
                                    <span>72% complete</span>
                                </div>

                                <div className="bb-goal-value">
                                    <strong>₹36,000</strong>
                                    <span>of ₹50,000</span>
                                </div>

                                <div className="bb-progress">
                                    <span />
                                </div>

                                <div className="bb-goal-foot">
                                    <span>Emergency Fund</span>
                                    <span>₹14,000 remaining</span>
                                </div>
                            </div>
                        </div>

                        <div className="bb-showcase-footer">
                            Start small. Stay consistent. See the difference.
                        </div>
                    </div>

                    <div className="bb-form-side">
                        <form className="bb-form" onSubmit={register}>
                            <div className="bb-form-kicker">
                                <span className="bb-kicker-dot" />
                                Get started
                            </div>

                            <h2 className="bb-title">Create your account</h2>

                            <p className="bb-subtitle">
                                Your personal finance workspace starts here. No clutter,
                                just a clearer view of your money.
                            </p>

                            <div className="bb-field">
                                <label className="bb-label" htmlFor="register-username">
                                    Username
                                </label>
                                <input
                                    id="register-username"
                                    className="bb-input"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Choose a username"
                                    autoComplete="username"
                                />
                            </div>

                            <div className="bb-field">
                                <label className="bb-label" htmlFor="register-email">
                                    Email address
                                </label>
                                <input
                                    id="register-email"
                                    className="bb-input"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                            </div>

                            <div className="bb-field">
                                <label className="bb-label" htmlFor="register-password">
                                    Password
                                </label>

                                <div className="bb-input-wrap">
                                    <input
                                        id="register-password"
                                        className="bb-input password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Create a secure password"
                                        autoComplete="new-password"
                                    />

                                    <button
                                        type="button"
                                        className="bb-eye"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? "🙈" : "👁️"}
                                    </button>
                                </div>

                                {password && (
                                    <div className={`bb-strength ${strength.className}`}>
                                        <div className="bb-strength-bars">
                                            <span className="bb-strength-bar" />
                                            <span className="bb-strength-bar" />
                                            <span className="bb-strength-bar" />
                                            <span className="bb-strength-bar" />
                                        </div>
                                        <span className="bb-strength-label">
                                            {strength.label}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="bb-requirements">
                                Use at least 8 characters. A mix of upper/lowercase,
                                numbers and symbols makes your password stronger.
                            </div>

                            <button className="bb-submit" type="submit" disabled={loading}>
                                {loading ? "Creating your account..." : "Create Account →"}
                            </button>

                            {message && (
                                <div className={`bb-status ${isError ? "error" : "success"}`}>
                                    <span>{isError ? "⚠️" : "✓"}</span>
                                    <span>{message}</span>
                                </div>
                            )}

                            <div className="bb-divider">Already have an account?</div>

                            <div className="bb-create">
                                Return to <Link to="/">Sign In</Link>
                            </div>

                            <div className="bb-trust">
                                <span>🔒 Private</span>
                                <span>⚡ Fast</span>
                                <span>📱 Responsive</span>
                            </div>
                        </form>
                    </div>
                </section>
            </main>
        </>
    );
}

export default Register;