
import React, { useState, useEffect } from 'react';
import { Section, StaffMember, Equipment } from '../types';
import { PlusIcon, TrashIcon, BuildingIcon, StethoscopeIcon, UserIcon } from './icons';

interface SetupScreenProps {
    onSetupComplete: (sections: Section[], staff: StaffMember[]) => void;
    initialSections?: Section[];
    initialStaff?: StaffMember[];
    onCancel?: () => void;
}

const defaultRoles = ['General Doctor', 'Surgeon', 'Neuro Surgeon', 'Dentist', 'ENT Specialist', 'Nurse'];

const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete, initialSections, initialStaff, onCancel }) => {
    const [sections, setSections] = useState<Section[]>([]);
    const [staffByRole, setStaffByRole] = useState<Record<string, { id: string; name: string }[]>>({});
    const [customRole, setCustomRole] = useState('');

    const isEditMode = !!onCancel;

    useEffect(() => {
        // This effect synchronizes the component's internal editable state
        // with the "source of truth" props passed from the parent component.

        // --- Sync Sections ---
        const hasInitialSections = initialSections && initialSections.length > 0;
        if (hasInitialSections || isEditMode) {
            // If we have sections from props, or if we are in "edit mode",
            // we trust the props completely, even if it's an empty array.
            setSections(initialSections || []);
        } else {
            // Otherwise, we must be in the initial setup phase with no saved sections,
            // so we should populate the list with helpful defaults.
            setSections([{ id: crypto.randomUUID(), name: 'General Ward', capacity: 10, equipment: [{ id: crypto.randomUUID(), name: 'Oxygen Cylinder', total: 20, available: 20 }] }]);
        }

        // --- Sync Staff ---
        const hasInitialStaff = initialStaff && initialStaff.length > 0;
        if (hasInitialStaff || isEditMode) {
            // Same logic as sections: trust the props if they have data or if we're editing.
            const staffByRoleData: Record<string, { id: string; name: string }[]> = {};
            (initialStaff || []).forEach(member => {
                if (!staffByRoleData[member.role]) {
                    staffByRoleData[member.role] = [];
                }
                staffByRoleData[member.role].push({ id: member.id, name: member.name });
            });
            setStaffByRole(staffByRoleData);
        } else {
            // Otherwise, show default staff for the initial setup.
            setStaffByRole({
                'General Doctor': [{id: crypto.randomUUID(), name: 'Dr. House'}],
                'Nurse': [{id: crypto.randomUUID(), name: 'Florence Nightingale'}],
            });
        }
    }, [initialSections, initialStaff, isEditMode]);


    const addSection = () => {
        setSections([...sections, { id: crypto.randomUUID(), name: '', capacity: 1, equipment: [] }]);
    };

    const removeSection = (id: string) => {
        setSections(sections.filter(s => s.id !== id));
    };

    const updateSection = (id: string, field: keyof Section, value: any) => {
        if (field === 'capacity' && Number(value) < 1 && value !== '') {
            return; // Prevent negative or zero capacity, but allow clearing the input
        }
        setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
    };
    
    const addEquipment = (sectionId: string) => {
        const newEquipment = { id: crypto.randomUUID(), name: '', total: 1, available: 1 };
        setSections(sections.map(s => s.id === sectionId ? { ...s, equipment: [...s.equipment, newEquipment] } : s));
    };

    const removeEquipment = (sectionId: string, equipmentId: string) => {
        setSections(sections.map(s => s.id === sectionId ? { ...s, equipment: s.equipment.filter(e => e.id !== equipmentId) } : s));
    };

    const updateEquipment = (sectionId: string, equipmentId: string, field: keyof Equipment, value: any) => {
        if (field === 'total' && Number(value) < 0 && value !== '') {
            return; // Prevent negative total, but allow clearing the input
        }
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    equipment: s.equipment.map(e => {
                        if (e.id === equipmentId) {
                             const newEquip = { ...e, [field]: value };
                             if(field === 'total') {
                                 newEquip.available = Math.max(0, Number(value)); // Sync available with total, preventing negatives
                             }
                             return newEquip;
                        }
                        return e;
                    })
                };
            }
            return s;
        }));
    };

    const addStaffMember = (role: string) => {
        const newMember = { id: crypto.randomUUID(), name: '' };
        setStaffByRole(prev => ({ ...prev, [role]: [...(prev[role] || []), newMember] }));
    };

    const updateStaffMemberName = (role: string, id: string, name: string) => {
        setStaffByRole(prev => ({
            ...prev,
            [role]: prev[role].map(m => m.id === id ? { ...m, name } : m)
        }));
    };
    
    const removeStaffMember = (role: string, id: string) => {
        setStaffByRole(prev => {
            const updatedRole = prev[role].filter(m => m.id !== id);
            if (updatedRole.length === 0) {
                const newState = { ...prev };
                delete newState[role];
                return newState;
            }
            return { ...prev, [role]: updatedRole };
        });
    };

    const handleAddCustomRole = () => {
        if (customRole && !staffByRole[customRole] && !defaultRoles.includes(customRole)) {
            setStaffByRole(prev => ({ ...prev, [customRole]: [] }));
            setCustomRole('');
        }
    };


    const handleSubmit = () => {
        if (sections.some(s => !s.name || s.capacity <= 0) || sections.length === 0) {
            alert("Please ensure all sections have a name and a capacity greater than 0.");
            return;
        }

        // FIX: Added type assertion for `members` as TypeScript was failing to infer its type from `Object.entries`.
        const staffList: StaffMember[] = Object.entries(staffByRole).flatMap(([role, members]) => 
            (members as { id: string; name: string }[]).map(member => ({...member, role}))
        );

        if (staffList.length === 0 || staffList.filter(s => s.role.toLowerCase() !== 'nurse').length === 0 || staffList.filter(s => s.role.toLowerCase() === 'nurse').length === 0) {
             alert("Please add at least one 'Nurse' and one other medical professional (e.g., Doctor, Surgeon).");
            return;
        }

        if (staffList.some(s => !s.name.trim())) {
             alert("Please ensure every staff member has a name.");
             return;
        }

        onSetupComplete(sections, staffList);
    };

    const allRoles = [...defaultRoles, ...Object.keys(staffByRole).filter(r => !defaultRoles.includes(r))];
    const registrationUrl = `${window.location.origin}${window.location.pathname}?view=register`;

    return (
        <div className="max-w-4xl mx-auto p-6 bg-slate-800 rounded-xl shadow-2xl space-y-8">
            <h1 className="text-4xl font-bold text-center text-cyan-300">{isEditMode ? 'Edit Hospital Setup' : 'Command Center Setup'}</h1>
            
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold flex items-center gap-2 text-slate-200"><BuildingIcon className="w-6 h-6 text-cyan-400"/>Hospital Sections</h2>
                {sections.map((section) => (
                    <div key={section.id} className="p-4 bg-slate-700/50 rounded-lg space-y-3 relative border border-slate-600">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Section Name (e.g., ICU)" value={section.name} onChange={e => updateSection(section.id, 'name', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                            <input type="number" min="1" placeholder="Capacity" value={section.capacity} onChange={e => updateSection(section.id, 'capacity', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                        <h3 className="text-md font-medium text-slate-300 pt-2">Equipment</h3>
                        {section.equipment.map((equip) => (
                             <div key={equip.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                 <input type="text" placeholder="Equipment Name" value={equip.name} onChange={e => updateEquipment(section.id, equip.id, 'name', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                 <input type="number" min="0" placeholder="Total" value={equip.total} onChange={e => updateEquipment(section.id, equip.id, 'total', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                 <button onClick={() => removeEquipment(section.id, equip.id)} className="text-red-400 hover:text-red-300 p-2 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                             </div>
                        ))}
                         <button onClick={() => addEquipment(section.id)} className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 font-semibold"><PlusIcon className="w-4 h-4"/>Add Equipment</button>
                        <button onClick={() => removeSection(section.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-400 p-1 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                ))}
                <button onClick={addSection} className="w-full flex justify-center items-center gap-2 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors">
                    <PlusIcon className="w-5 h-5" /> Add Section
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold flex items-center gap-2 text-slate-200">
                        <StethoscopeIcon className="w-6 h-6 text-cyan-400" />
                        Staff Members
                    </h2>
                    <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 underline font-semibold">
                        Share Registration Link
                    </a>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 space-y-4">
                    {allRoles.map(role => (
                        <div key={role}>
                            <h3 className="font-semibold text-cyan-300">{role}</h3>
                            <div className="pl-4 mt-2 space-y-2">
                                {(staffByRole[role] || []).map(member => (
                                    <div key={member.id} className="flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Staff Member Name" 
                                            value={member.name}
                                            onChange={e => updateStaffMemberName(role, member.id, e.target.value)}
                                            className="bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                        <button onClick={() => removeStaffMember(role, member.id)} className="text-red-400 hover:text-red-300 p-2 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                <button onClick={() => addStaffMember(role)} className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 font-semibold"><PlusIcon className="w-4 h-4"/>Add {role}</button>
                            </div>
                        </div>
                    ))}
                     <div className="pt-4 border-t border-slate-600">
                        <h3 className="font-semibold text-slate-300">Add New Role</h3>
                        <div className="flex gap-2 mt-2">
                            <input 
                                type="text"
                                placeholder="e.g., Cardiologist"
                                value={customRole}
                                onChange={e => setCustomRole(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <button onClick={handleAddCustomRole} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors">Add Role</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                 {isEditMode && onCancel && (
                    <button onClick={onCancel} className="w-full py-3 px-4 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 text-lg">
                        Cancel
                    </button>
                )}
                <button onClick={handleSubmit} className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 text-lg">
                    {isEditMode ? 'Save Changes' : 'Start Command Center'}
                </button>
            </div>

        </div>
    );
};

export default SetupScreen;
