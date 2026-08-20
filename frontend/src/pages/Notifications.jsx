import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../services/api";
import "./Notifications.css";
import { confirmAction } from "./toast";


function Notifications() {

    const [notifications, setNotifications] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [activeFilter, setActiveFilter] = useState("all");


    /* ============================= */
    /* LOAD NOTIFICATIONS */
    /* ============================= */

    const fetchNotifications = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await API.get(
                "/notifications/"
            );

            const data = response.data;

            /*
             * Supports both:
             * [
             *   {...}
             * ]
             *
             * and DRF pagination:
             * {
             *   results: [...]
             * }
             */

            if (Array.isArray(data)) {

                setNotifications(data);

            }

            else if (Array.isArray(data.results)) {

                setNotifications(data.results);

            }

            else {

                setNotifications([]);

            }

        }

        catch (error) {

            console.error(
                "Failed to load notifications:",
                error
            );

            setError(
                "Unable to load notifications."
            );

        }

        finally {

            setLoading(false);

        }

    };


    useEffect(() => {

        fetchNotifications();

    }, []);


    /* ============================= */
    /* COUNTS */
    /* ============================= */

    const unreadCount = useMemo(() => {

        return notifications.filter(
            notification =>
                !notification.is_read
        ).length;

    }, [notifications]);


    const budgetCount = useMemo(() => {

        return notifications.filter(
            notification =>
                notification.notification_type === "budget"
        ).length;

    }, [notifications]);


    const savingCount = useMemo(() => {

        return notifications.filter(
            notification =>
                notification.notification_type === "saving"
        ).length;

    }, [notifications]);


    /* ============================= */
    /* FILTER */
    /* ============================= */

    const filteredNotifications = useMemo(() => {

        switch (activeFilter) {

            case "unread":

                return notifications.filter(
                    notification =>
                        !notification.is_read
                );


            case "budget":

                return notifications.filter(
                    notification =>
                        notification.notification_type === "budget"
                );


            case "saving":

                return notifications.filter(
                    notification =>
                        notification.notification_type === "saving"
                );


            case "reminder":

                return notifications.filter(
                    notification =>
                        notification.notification_type === "reminder"
                );


            case "report":

                return notifications.filter(
                    notification =>
                        notification.notification_type === "report"
                );


            default:

                return notifications;

        }

    }, [notifications, activeFilter]);


    /* ============================= */
    /* MARK AS READ */
    /* ============================= */

    const handleMarkAsRead = async (
        notificationId
    ) => {

        try {

            await API.put(
                `/notifications/${notificationId}/read/`
            );


            setNotifications(
                previous =>
                    previous.map(
                        notification =>
                            notification.id === notificationId
                                ? {
                                    ...notification,
                                    is_read: true
                                }
                                : notification
                    )
            );

        }

        catch (error) {

            console.error(
                "Failed to mark notification as read:",
                error
            );

        }

    };


    /* ============================= */
    /* MARK ALL AS READ */
    /* ============================= */

    const handleMarkAllAsRead = async () => {

        const unreadNotifications =
            notifications.filter(
                notification =>
                    !notification.is_read
            );


        if (
            unreadNotifications.length === 0
        ) {

            return;

        }


        try {

            await Promise.all(
                unreadNotifications.map(
                    notification =>
                        API.put(
                            `/notifications/${notification.id}/read/`
                        )
                )
            );


            setNotifications(
                previous =>
                    previous.map(
                        notification => ({
                            ...notification,
                            is_read: true
                        })
                    )
            );

        }

        catch (error) {

            console.error(
                "Failed to mark all notifications as read:",
                error
            );

        }

    };


    /* ============================= */
    /* DELETE */
    /* ============================= */

    const handleDelete = async (
        notificationId
    ) => {

        const confirmed =
            await confirmAction("Delete this notification?", "Delete notification");


        if (!confirmed) {

            return;

        }


        try {

            await API.delete(
                `/notifications/${notificationId}/`
            );


            setNotifications(
                previous =>
                    previous.filter(
                        notification =>
                            notification.id !== notificationId
                    )
            );

        }

        catch (error) {

            console.error(
                "Failed to delete notification:",
                error
            );

        }

    };


    /* ============================= */
    /* TYPE INFORMATION */
    /* ============================= */

    const getNotificationType = (
        type
    ) => {

        switch (type) {

            case "budget":

                return {
                    label: "Budget",
                    icon: "💰"
                };


            case "saving":

                return {
                    label: "Savings",
                    icon: "🎯"
                };


            case "reminder":

                return {
                    label: "Reminder",
                    icon: "🔔"
                };


            case "report":

                return {
                    label: "Report",
                    icon: "📊"
                };


            default:

                return {
                    label: "Notification",
                    icon: "🔔"
                };

        }

    };


    /* ============================= */
    /* DATE FORMAT */
    /* ============================= */

    const formatDate = (
        dateString
    ) => {

        if (!dateString) {

            return "";

        }


        const date =
            new Date(dateString);


        return date.toLocaleString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit"
            }
        );

    };


    /* ============================= */
    /* RENDER */
    /* ============================= */

    return (

        <MainLayout title="Notifications">

            <div className="notifications-page">


                {/* PAGE HEADER */}

                <div className="notifications-page-header">

                    <div>

                        <h1>
                            Notifications
                        </h1>

                        <p>
                            Stay updated with your
                            financial activity.
                        </p>

                    </div>


                    <div className="notification-header-actions">

                        <div className="unread-counter">

                            🔔

                            <span>
                                {unreadCount}
                            </span>

                            unread

                        </div>


                        {
                            unreadCount > 0 && (

                                <button
                                    className="mark-all-btn"
                                    onClick={
                                        handleMarkAllAsRead
                                    }
                                >

                                    ✓ Mark all as read

                                </button>

                            )
                        }

                    </div>

                </div>


                {/* STATISTICS */}

                <div className="notification-stats">


                    <button
                        className={
                            `notification-stat ${
                                activeFilter === "all"
                                    ? "selected"
                                    : ""
                            }`
                        }
                        onClick={() =>
                            setActiveFilter("all")
                        }
                    >

                        <span>
                            All
                        </span>

                        <strong>
                            {notifications.length}
                        </strong>

                    </button>


                    <button
                        className={
                            `notification-stat ${
                                activeFilter === "unread"
                                    ? "selected"
                                    : ""
                            }`
                        }
                        onClick={() =>
                            setActiveFilter("unread")
                        }
                    >

                        <span>
                            Unread
                        </span>

                        <strong>
                            {unreadCount}
                        </strong>

                    </button>


                    <button
                        className={
                            `notification-stat ${
                                activeFilter === "budget"
                                    ? "selected"
                                    : ""
                            }`
                        }
                        onClick={() =>
                            setActiveFilter("budget")
                        }
                    >

                        <span>
                            Budget
                        </span>

                        <strong>
                            {budgetCount}
                        </strong>

                    </button>


                    <button
                        className={
                            `notification-stat ${
                                activeFilter === "saving"
                                    ? "selected"
                                    : ""
                            }`
                        }
                        onClick={() =>
                            setActiveFilter("saving")
                        }
                    >

                        <span>
                            Savings
                        </span>

                        <strong>
                            {savingCount}
                        </strong>

                    </button>

                </div>


                {/* FILTER BUTTONS */}

                <div className="notification-filters">


                    <button
                        className={
                            activeFilter === "all"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveFilter("all")
                        }
                    >
                        All
                    </button>


                    <button
                        className={
                            activeFilter === "unread"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveFilter("unread")
                        }
                    >
                        Unread
                    </button>


                    <button
                        className={
                            activeFilter === "budget"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveFilter("budget")
                        }
                    >
                        Budget
                    </button>


                    <button
                        className={
                            activeFilter === "saving"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveFilter("saving")
                        }
                    >
                        Savings
                    </button>


                    <button
                        className={
                            activeFilter === "reminder"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveFilter("reminder")
                        }
                    >
                        Reminders
                    </button>


                    <button
                        className={
                            activeFilter === "report"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveFilter("report")
                        }
                    >
                        Reports
                    </button>

                </div>


                {/* LOADING */}

                {
                    loading && (

                        <div className="notification-message">

                            <div className="loading-spinner"></div>

                            <p>
                                Loading notifications...
                            </p>

                        </div>

                    )
                }


                {/* ERROR */}

                {
                    !loading &&
                    error && (

                        <div className="notification-message error">

                            <div>
                                ⚠️
                            </div>

                            <p>
                                {error}
                            </p>

                            <button
                                onClick={
                                    fetchNotifications
                                }
                            >
                                Retry
                            </button>

                        </div>

                    )
                }


                {/* EMPTY */}

                {
                    !loading &&
                    !error &&
                    filteredNotifications.length === 0 && (

                        <div className="notification-message">

                            <div className="empty-notification-icon">
                                🔔
                            </div>

                            <h2>
                                No notifications
                            </h2>

                            <p>
                                You're all caught up.
                            </p>

                        </div>

                    )
                }


                {/* NOTIFICATION LIST */}

                {
                    !loading &&
                    !error &&
                    filteredNotifications.length > 0 && (

                        <div className="notification-list">

                            {
                                filteredNotifications.map(
                                    notification => {

                                        const type =
                                            getNotificationType(
                                                notification.notification_type
                                            );


                                        return (

                                            <div
                                                key={
                                                    notification.id
                                                }
                                                className={
                                                    `notification-card ${
                                                        notification.is_read
                                                            ? "read"
                                                            : "unread"
                                                    } ${
                                                        notification.notification_type
                                                    }`
                                                }
                                            >


                                                {/* APP BRAND MARK */}

                                                <div
                                                    className="notification-brand-mark"
                                                    title="BudgetBuddy"
                                                >
                                                    <img
                                                        src="/budgetbuddy-mark.png"
                                                        alt="BudgetBuddy"
                                                    />
                                                </div>


                                                {/* MAIN CONTENT */}

                                                <div className="notification-body">


                                                    <div className="notification-title-row">

                                                        <div>

                                                            <h2>
                                                                {
                                                                    notification.title
                                                                }
                                                            </h2>

                                                            <span className="notification-type-label">

                                                                <span
                                                                    className="notification-type-icon"
                                                                    aria-hidden="true"
                                                                >
                                                                    {type.icon}
                                                                </span>

                                                                {
                                                                    type.label
                                                                }

                                                            </span>

                                                        </div>


                                                        {
                                                            !notification.is_read && (

                                                                <span className="new-badge">

                                                                    NEW

                                                                </span>

                                                            )
                                                        }

                                                    </div>


                                                    <p className="notification-description">

                                                        {
                                                            notification.message
                                                        }

                                                    </p>


                                                    <div className="notification-meta">

                                                        <span>

                                                            🕒

                                                            {" "}

                                                            {
                                                                formatDate(
                                                                    notification.created_at
                                                                )
                                                            }

                                                        </span>

                                                    </div>


                                                    <div className="notification-actions">


                                                        {
                                                            !notification.is_read && (

                                                                <button
                                                                    className="read-btn"
                                                                    onClick={() =>
                                                                        handleMarkAsRead(
                                                                            notification.id
                                                                        )
                                                                    }
                                                                >

                                                                    ✓ Mark as Read

                                                                </button>

                                                            )
                                                        }


                                                        <button
                                                            className="delete-btn"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    notification.id
                                                                )
                                                            }
                                                        >

                                                            🗑 Delete

                                                        </button>

                                                    </div>

                                                </div>


                                                {/* STATUS */}

                                                <div className="notification-status">

                                                    <span
                                                        className={
                                                            notification.is_read
                                                                ? "status-read"
                                                                : "status-unread"
                                                        }
                                                    >

                                                        {
                                                            notification.is_read
                                                                ? "Read"
                                                                : "Unread"
                                                        }

                                                    </span>

                                                </div>

                                            </div>

                                        );

                                    }
                                )
                            }

                        </div>

                    )
                }

            </div>

        </MainLayout>

    );

}


export default Notifications;