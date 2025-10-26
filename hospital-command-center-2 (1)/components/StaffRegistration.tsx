import React, { useState } from 'react';
import { StaffMember } from '../types';
import { Toaster, toast } from './Toaster';

const defaultRoles = ['General Doctor', 'Surgeon', 'Neuro Surgeon', 'Dentist', 'ENT Specialist', 'Nurse'];

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

const StaffRegistration: React.FC = () => {
    const [name, setName] = useState('');
    const [role, setRole] = useState(defaultRoles[0]);
    const [registeredId, setRegisteredId] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !role) {
            toast.error("Please enter your name and select a role.");
            return;
        }

        try {
            const configStr = localStorage.getItem('hospital_config');
            const config = configStr ? JSON.parse(configStr) : { sections: [], staff: [] };
            
            const newStaffMember: StaffMember = {
                id: `staff_${crypto.randomUUID()}`,
                name: name.trim(),
                role: role
            };

            config.staff.push(newStaffMember);
            localStorage.setItem('hospital_config', JSON.stringify(config));
            
            setRegisteredId(newStaffMember.id);
            toast.success("Registration successful!");
        } catch (error) {
            console.error("Failed to register staff:", error);
            toast.error("Registration failed. Please try again.");
        }
    };
    
    const dashboardUrl = registeredId ? `${window.location.origin}${window.location.pathname}?view=staff_dashboard&id=${registeredId}` : '';

    return (
         <>
            <Toaster />
            <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
                <SimpleHeader />
                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-md mx-auto p-8 bg-slate-800 rounded-xl shadow-2xl space-y-6">
                        {!registeredId ? (
                            <>
                                <h1 className="text-3xl font-bold text-center text-cyan-300">Staff Registration</h1>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-slate-300">Full Name</label>
                                        <input type="text" name="name" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                    </div>
                                    <div>
                                        <label htmlFor="role" className="block text-sm font-medium text-slate-300">Role</label>
                                        <select name="role" id="role" value={role} onChange={e => setRole(e.target.value)} required className="mt-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                            {defaultRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 text-lg">
                                        Register
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center space-y-4">
                                <h1 className="text-3xl font-bold text-green-400">Registration Complete!</h1>
                                <p className="text-slate-300">Your Staff ID is: <strong className="font-mono bg-slate-700 px-2 py-1 rounded">{registeredId}</strong></p>
                                <p className="text-slate-300">You can view your patient assignments at your personal dashboard:</p>
                                <a href={dashboardUrl} target="_blank" rel="noopener noreferrer" className="block break-all text-cyan-400 hover:text-cyan-300 underline font-semibold">
                                    {dashboardUrl}
                                </a>
                                <p className="text-sm text-slate-400 pt-4">Please bookmark this link. This is where you will receive notifications for new patient assignments.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
};

export default StaffRegistration;