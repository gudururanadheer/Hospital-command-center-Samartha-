
import React from 'react';
import { HospitalIcon, UserPlusIcon, SettingsIcon } from './icons';

interface HeaderProps {
    onNavigate: (view: 'dashboard' | 'discharged' | 'edit_setup') => void;
    isSetupComplete: boolean;
    onAdmitPatientClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, isSetupComplete, onAdmitPatientClick }) => {
    return (
        <header className="bg-slate-800/50 backdrop-blur-sm shadow-lg sticky top-0 z-40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center">
                        <HospitalIcon className="h-10 w-10 text-cyan-400" />
                        <h1 className="ml-3 text-2xl font-bold tracking-tight text-slate-100">
                            Hospital Command Center
                        </h1>
                    </div>
                    
                    {isSetupComplete && (
                        <div className="flex items-center space-x-4">
                             <nav className="flex space-x-2">
                                <button 
                                    onClick={() => onNavigate('dashboard')}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors"
                                >
                                    Dashboard
                                </button>
                                <button 
                                    onClick={() => onNavigate('discharged')}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors"
                                >
                                    Discharged
                                </button>
                            </nav>
                             <div className="h-6 w-px bg-slate-600"></div>
                             <button 
                                onClick={() => onNavigate('edit_setup')}
                                title="Edit Hospital Setup"
                                className="p-2 text-slate-300 hover:bg-slate-700 hover:text-white rounded-full transition-colors"
                            >
                                <SettingsIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onAdmitPatientClick}
                                className="flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
                            >
                                <UserPlusIcon className="h-5 w-5 mr-2" />
                                Admit Patient
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
