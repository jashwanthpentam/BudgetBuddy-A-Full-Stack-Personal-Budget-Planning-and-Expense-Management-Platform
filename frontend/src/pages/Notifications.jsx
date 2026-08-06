import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout";

import {
    getNotifications,
    markAsRead,
    deleteNotification,
} from "../services/notificationService";

export default function Notifications() {

    const [notifications, setNotifications] = useState([]);

    const [loading, setLoading] = useState(true);
    
    const loadNotifications = async () => {

    try {

        setLoading(true);

        const data = await getNotifications();

        setNotifications(data);

    }

    catch (error) {

        console.error(error);

        alert("Failed to load notifications.");

    }

    finally {

        setLoading(false);

    }

};

useEffect(() => {

    loadNotifications();

}, []);

    return (

        <MainLayout title="Notifications">

            <h2>Notifications</h2>

            {
                loading ? (

                    <p>Loading...</p>

                ) : notifications.length === 0 ? (

                    <p>No notifications available.</p>

                ) : (

                    notifications.map((notification) => (

                        <div
                            key={notification.id}
                            className="notification-card"
                            style={{
                                backgroundColor: notification.is_read
                                    ? "#ffffff"
                                    : "#f5f9ff",
                            }}
                        >

                            <h3>{notification.title}</h3>

                            <p>{notification.message}</p>

                            <p>
                                <strong>Type:</strong>{" "}
                                {notification.notification_type}
                            </p>

                            <p>
                                <strong>Status:</strong>{" "}
                                {notification.is_read
                                    ? "Read"
                                    : "Unread"}
                            </p>

                            <p>
                                <strong>Created:</strong>{" "}
                                {new Date(
                                    notification.created_at
                                ).toLocaleString()}
                            </p>

                            <div
                                style={{
                                    display: "flex",
                                    gap: "10px",
                                    marginTop: "10px",
                                }}
                            >

                                {
                                    !notification.is_read && (

                                        <button
                                            onClick={async () => {

                                                try {

                                                    await markAsRead(
                                                        notification.id
                                                    );

                                                    await loadNotifications();

                                                }

                                                catch (error) {

                                                    console.error(error);

                                                    alert(
                                                        "Failed to mark notification as read."
                                                    );

                                                }

                                            }}
                                        >

                                            Mark as Read

                                        </button>

                                    )
                                }

                                <button
                                    onClick={async () => {

                                        if (
                                            !window.confirm(
                                                "Delete this notification?"
                                            )
                                        ) {
                                            return;
                                        }

                                        try {

                                            await deleteNotification(
                                                notification.id
                                            );

                                            await loadNotifications();

                                        }

                                        catch (error) {

                                            console.error(error);

                                            alert(
                                                "Failed to delete notification."
                                            );

                                        }

                                    }}
                                >

                                    Delete

                                </button>

                            </div>

                        </div>

                    ))

                )
            }

        </MainLayout>

    );

}