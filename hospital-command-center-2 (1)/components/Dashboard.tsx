import React, { useMemo } from 'react';
import { Section, StaffMember, Patient } from '../types';
import { StethoscopeIcon, UserIcon, BedIcon, UsersIcon } from './icons';

interface DashboardProps {
    sections: Section[];
    staff: StaffMember[];
    admittedPatients: Patient[];
    onDischarge: (patientId: string) => void;
}

const SeriousnessIndicator: React.FC<{ level: number }> = ({ level }) => {
    const color = level > 7 ? 'bg-red-500' : level > 4 ? 'bg-yellow-500' : 'bg-green-500';
    return <div className={`w-4 h-4 rounded-full ${color}`} title={`Seriousness: ${level}/10`}></div>;
};


const PatientCard: React.FC<{ patient: Patient; sectionName: string; staff: StaffMember[]; onDischarge: (id: string) => void; }> = ({ patient, sectionName, staff, onDischarge }) => {
    const assignedDoctor = staff.find(s => s.id === patient.assignedDoctorId);
    const assignedNurse = staff.find(s => s.id === patient.assignedNurseId);

    return (
        <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-lg text-cyan-300">{patient.name}, {patient.age}</h4>
                    <p className="text-sm text-slate-400">ID: {patient.id}</p>
                </div>
                <SeriousnessIndicator level={patient.seriousness} />
            </div>
            <p className="text-sm text-slate-300 italic">"{patient.symptoms}"</p>
            <div className="text-xs text-slate-400 pt-2 border-t border-slate-700 space-y-1">
                <p><strong className="font-medium text-slate-300">Section:</strong> {sectionName}</p>
                <p><strong className="font-medium text-slate-300">Doctor:</strong> {assignedDoctor?.name || 'N/A'} ({assignedDoctor?.role || 'Unknown'})</p>
                <p><strong className="font-medium text-slate-300">Nurse:</strong> {assignedNurse?.name || 'N/A'}</p>
            </div>
            <button
                onClick={() => onDischarge(patient.id)}
                className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
                Discharge Patient
            </button>
        </div>
    );
};

const StaffList: React.FC<{ staff: StaffMember[]; assignedStaffIds: Set<string> }> = ({ staff, assignedStaffIds }) => {
    const doctors = staff.filter(s => s.role.toLowerCase() !== 'nurse');
    const nurses = staff.filter(s => s.role.toLowerCase() === 'nurse');

    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-200">On-Duty Staff Roster</h2>
            <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700 space-y-4 mt-4">
                {doctors.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-md text-cyan-300 flex items-center gap-2 mb-2">
                            <StethoscopeIcon className="w-5 h-5" />
                            Doctors & Specialists
                        </h3>
                        <ul className="space-y-1">
                            {doctors.map(member => {
                                const isAssigned = assignedStaffIds.has(member.id);
                                return (
                                <li key={member.id} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2.5 h-2.5 rounded-full ${isAssigned ? 'bg-yellow-400' : 'bg-green-400'}`} title={isAssigned ? 'Assigned' : 'Available'}></span>
                                        <span className="text-slate-200 font-medium">{member.name}</span>
                                    </div>
                                    <span className="text-slate-400 text-xs font-mono bg-slate-700 px-2 py-1 rounded">{member.role}</span>
                                </li>
                            )})}
                        </ul>
                    </div>
                )}
                {nurses.length > 0 && (
                     <div className={doctors.length > 0 ? "pt-4 border-t border-slate-700" : ""}>
                        <h3 className="font-semibold text-md text-cyan-300 flex items-center gap-2 mb-2">
                            <UserIcon className="w-5 h-5" />
                            Nurses
                        </h3>
                        <ul className="space-y-1">
                            {nurses.map(member => {
                                 const isAssigned = assignedStaffIds.has(member.id);
                                 return (
                                <li key={member.id} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-slate-700/50">
                                     <div className="flex items-center gap-3">
                                        <span className={`w-2.5 h-2.5 rounded-full ${isAssigned ? 'bg-yellow-400' : 'bg-green-400'}`} title={isAssigned ? 'Assigned' : 'Available'}></span>
                                        <span className="text-slate-200 font-medium">{member.name}</span>
                                    </div>
                                    <span className="text-slate-400 text-xs font-mono bg-slate-700 px-2 py-1 rounded">{member.role}</span>
                                </li>
                            )})}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ sections, staff, admittedPatients, onDischarge }) => {
    const totalCapacity = sections.reduce((acc, s) => acc + Number(s.capacity), 0);
    const occupancyPercentage = totalCapacity > 0 ? (admittedPatients.length / totalCapacity) * 100 : 0;

    const { assignedStaffIds, totalDoctors, totalNurses, availableDoctors, availableNurses } = useMemo(() => {
        const assignedIds = new Set<string>();
        admittedPatients.forEach(p => {
            assignedIds.add(p.assignedDoctorId);
            assignedIds.add(p.assignedNurseId);
        });
        
        const doctors = staff.filter(s => s.role.toLowerCase() !== 'nurse');
        const nurses = staff.filter(s => s.role.toLowerCase() === 'nurse');

        return {
            assignedStaffIds: assignedIds,
            totalDoctors: doctors.length,
            totalNurses: nurses.length,
            availableDoctors: doctors.filter(d => !assignedIds.has(d.id)).length,
            availableNurses: nurses.filter(n => !assignedIds.has(n.id)).length,
        };
    }, [staff, admittedPatients]);

    const patientsBySection = useMemo(() => {
        const map = new Map<string, Patient[]>();
        admittedPatients.forEach(patient => {
            const sectionId = patient.assignedSectionId;
            if (!map.has(sectionId)) {
                map.set(sectionId, []);
            }
            map.get(sectionId)!.push(patient);
        });
        return map;
    }, [admittedPatients]);

    return (
        <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-4">
                    <BedIcon className="w-10 h-10 text-cyan-400"/>
                    <div>
                        <p className="text-slate-400 text-sm">Occupancy</p>
                        <p className="text-2xl font-bold">{admittedPatients.length} / {totalCapacity}</p>
                         <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2">
                            <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${occupancyPercentage}%` }}></div>
                        </div>
                    </div>
                </div>
                 <div className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-4">
                    <StethoscopeIcon className="w-10 h-10 text-green-400"/>
                    <div>
                        <p className="text-slate-400 text-sm">Available Doctors</p>
                        <p className="text-2xl font-bold">{availableDoctors} <span className="text-lg text-slate-400">/ {totalDoctors}</span></p>
                    </div>
                </div>
                 <div className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-4">
                    <UserIcon className="w-10 h-10 text-yellow-400"/>
                    <div>
                        <p className="text-slate-400 text-sm">Available Nurses</p>
                        <p className="text-2xl font-bold">{availableNurses} <span className="text-lg text-slate-400">/ {totalNurses}</span></p>
                    </div>
                </div>
                 <div className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-4">
                    <UsersIcon className="w-10 h-10 text-red-400"/>
                    <div>
                        <p className="text-slate-400 text-sm">Admitted Patients</p>
                        <p className="text-2xl font-bold">{admittedPatients.length}</p>
                    </div>
                </div>
            </div>

            {/* Sections and Patients */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold text-slate-200">Admitted Patients</h2>
                    {admittedPatients.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {admittedPatients.map(p => (
                                <PatientCard 
                                    key={p.id} 
                                    patient={p}
                                    sectionName={sections.find(s => s.id === p.assignedSectionId)?.name || 'Unknown'}
                                    onDischarge={onDischarge}
                                    staff={staff}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-slate-800 rounded-lg border-2 border-dashed border-slate-700">
                            <p className="text-slate-400">No patients currently admitted.</p>
                        </div>
                    )}
                </div>
                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-200">Hospital Sections</h2>
                        <div className="space-y-4 mt-4">
                            {sections.map(section => {
                                 const patientsInSection = patientsBySection.get(section.id) || [];
                                 const sectionOccupancy = section.capacity > 0 ? (patientsInSection.length / section.capacity) * 100 : 0;
                                 return (
                                    <div key={section.id} className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-lg text-cyan-300">{section.name}</h3>
                                            <span className="text-sm font-semibold text-slate-300">{patientsInSection.length} / {section.capacity}</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2 my-2">
                                            <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${sectionOccupancy}%` }}></div>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-3">
                                            <h4 className="font-semibold text-slate-300 mb-1">Equipment Status:</h4>
                                            <ul className="list-disc list-inside space-y-1">
                                                {section.equipment.length > 0 ? section.equipment.map(eq => (
                                                    <li key={eq.id}>{eq.name}: {eq.available}/{eq.total}</li>
                                                )) : <li className="list-none italic text-slate-500">No equipment</li>}
                                            </ul>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-700">
                                            <h4 className="font-semibold text-slate-300 mb-2">Patients in Section:</h4>
                                            {patientsInSection.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {patientsInSection.map(patient => (
                                                        <li key={patient.id} className="flex items-center justify-between text-sm">
                                                            <span className="text-slate-200">{patient.name}</span>
                                                            <SeriousnessIndicator level={patient.seriousness} />
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-slate-500 italic text-sm">No patients assigned.</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <StaffList staff={staff} assignedStaffIds={assignedStaffIds} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;