
import React from 'react';
import { Patient } from '../types';

interface DischargedPatientsListProps {
    patients: Patient[];
}

const DischargedPatientsList: React.FC<DischargedPatientsListProps> = ({ patients }) => {
    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-200 mb-6">Discharged Patients Archive</h2>
            {patients.length > 0 ? (
                <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Patient Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Age</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Symptoms</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Seriousness</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Discharge Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700">
                            {patients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-slate-700/40">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">{patient.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{patient.age}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 truncate max-w-xs">{patient.symptoms}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{patient.seriousness}/10</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {patient.dischargeDate ? new Date(patient.dischargeDate).toLocaleString() : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 bg-slate-800 rounded-lg border-2 border-dashed border-slate-700">
                    <p className="text-slate-400 text-lg">No patients have been discharged yet.</p>
                </div>
            )}
        </div>
    );
};

export default DischargedPatientsList;
