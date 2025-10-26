import React, { useState, useEffect, useCallback } from 'react';
import { Notification, StaffMember } from '../types';
import { Toaster, toast } from './Toaster';

interface StaffDashboardProps {
    staffId: string;
}

const SimpleHeader = () => (
     <header className="bg-slate-800/50 backdrop-blur-sm shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
                <div className="flex items-center">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                        Hospital Staff Portal
                    </h1>
                </div>
            </div>
        </div>
    </header>
);

const StaffDashboard: React.FC<StaffDashboardProps> = ({ staffId }) => {
    const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const notificationKey = `hospital_notifications_${staffId}`;

    const loadInitialData = useCallback(() => {
        try {
            const configStr = localStorage.getItem('hospital_config');
            if (configStr) {
                const config = JSON.parse(configStr);
                const member = config.staff.find((s: StaffMember) => s.id === staffId);
                setStaffMember(member || null);
            }

            const notificationsStr = localStorage.getItem(notificationKey);
            if (notificationsStr) {
                const existingNotifications: Notification[] = JSON.parse(notificationsStr);
                setNotifications(existingNotifications);
            }
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        }
    }, [staffId, notificationKey]);

    useEffect(() => {
        loadInitialData();

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === notificationKey && event.newValue) {
                try {
                    const newNotifications: Notification[] = JSON.parse(event.newValue);
                    if (newNotifications.length > notifications.length) {
                        const lastNotification = newNotifications[newNotifications.length - 1];
                        if (lastNotification) {
                            toast.info(`New Assignment: ${lastNotification.patientName}`);
                        }
                    }
                    setNotifications(newNotifications);
                } catch (error) {
                    console.error("Error processing storage update:", error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [loadInitialData, notificationKey, notifications.length]);

    if (!staffMember) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
                <SimpleHeader />
                <main className="flex-grow flex items-center justify-center p-4">
                     <div className="text-center">
                        <h1 className="text-3xl font-bold text-red-400">Access Denied</h1>
                        <p className="text-slate-300 mt-2">Staff member not found. Please check the URL or register first.</p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <>
            <Toaster />
            <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
                <SimpleHeader />
                <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
                    <h1 className="text-3xl font-bold text-slate-100">Welcome, {staffMember.name}</h1>
                    <p className="text-lg text-cyan-400">{staffMember.role}</p>
                    
                    <div className="mt-8">
                        <h2 className="text-2xl font-semibold text-slate-200 mb-4">Patient Assignment Notifications</h2>
                        {notifications.length > 0 ? (
                            <div className="space-y-4">
                                {notifications.slice().reverse().map(notif => (
                                    <div key={notif.id} className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
                                        <p className="font-bold text-cyan-300">{notif.message}</p>
                                        <p className="text-sm text-slate-300">Patient: {notif.patientName}</p>
                                        <p className="text-sm text-slate-300">Symptoms: "{notif.patientSymptoms}"</p>
                                        <p className="text-xs text-slate-500 mt-2">{new Date(notif.timestamp).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-12 bg-slate-800 rounded-lg border-2 border-dashed border-slate-700">
                                <p className="text-slate-400 text-lg">You have no patient assignments yet.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
};

export default StaffDashboard;
