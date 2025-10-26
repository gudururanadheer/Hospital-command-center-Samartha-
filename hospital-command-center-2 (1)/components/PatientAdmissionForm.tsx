
import React, { useState } from 'react';
import { PatientAdmissionData, Section } from '../types';

interface PatientAdmissionFormProps {
    onSubmit: (data: PatientAdmissionData) => void;
    onCancel: () => void;
    sections: Section[];
}

const PatientAdmissionForm: React.FC<PatientAdmissionFormProps> = ({ onSubmit, onCancel, sections }) => {
    const [formData, setFormData] = useState<Omit<PatientAdmissionData, 'requiredEquipment'>>({
        name: '',
        age: 0,
        symptoms: '',
        seriousness: 5,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.name || formData.age <= 0 || !formData.symptoms) {
            alert("Please fill in all patient details.");
            return;
        }
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300">Patient Name</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                    <label htmlFor="age" className="block text-sm font-medium text-slate-300">Age</label>
                    <input type="number" name="age" id="age" value={formData.age} onChange={handleChange} required min="0" className="mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
            </div>
            <div>
                <label htmlFor="symptoms" className="block text-sm font-medium text-slate-300">Symptoms</label>
                <textarea name="symptoms" id="symptoms" value={formData.symptoms} onChange={handleChange} required rows={3} className="mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
                 <label htmlFor="seriousness" className="block text-sm font-medium text-slate-300">Seriousness: {formData.seriousness}/10</label>
                <input type="range" name="seriousness" id="seriousness" value={formData.seriousness} onChange={handleChange} min="1" max="10" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg shadow-md transition-colors">Admit Patient</button>
            </div>
        </form>
    );
};

export default PatientAdmissionForm;
