
import React, {
  useState,
  useEffect
} from 'react';
import {
  Section,
  StaffMember,
  Patient,
  PatientAdmissionData,
  Notification
} from './types';
import {
  assignPatient as apiAssignPatient
} from './services/geminiService';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import {
  Header
} from './components/Header';
import Modal from './components/Modal';
import PatientAdmissionForm from './components/PatientAdmissionForm';
import {
  Toaster,
  toast
} from './components/Toaster';
import DischargedPatientsList from './components/DischargedPatientsList';

type AppState = 'setup' | 'dashboard' | 'discharged' | 'edit_setup';

const getInitialState = () => {
    try {
        const savedState = localStorage.getItem('hospital_config');
        if (savedState) {
            const { sections, staff } = JSON.parse(savedState);
            // If there's any saved config, we are not in the initial setup phase.
            // This correctly handles cases where sections or staff might be an empty array.
            return { sections: sections || [], staff: staff || [], isInitialSetup: false };
        }
    } catch (e) {
        console.error("Could not parse saved state", e);
    }
    // Only return initial setup if there is no saved state at all.
    return { sections: [], staff: [], isInitialSetup: true };
};


const App: React.FC = () => {
    const [sections, setSections] = useState<Section[]>(() => getInitialState().sections);
    const [staff, setStaff] = useState<StaffMember[]>(() => getInitialState().staff);
    const [admittedPatients, setAdmittedPatients] = useState<Patient[]>([]);
    const [dischargedPatients, setDischargedPatients] = useState<Patient[]>([]);

    const [appState, setAppState] = useState<AppState>(() => getInitialState().isInitialSetup ? 'setup' : 'dashboard');
    const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (appState !== 'setup') {
            try {
                const stateToSave = { sections, staff };
                localStorage.setItem('hospital_config', JSON.stringify(stateToSave));
            } catch (e) {
                console.error("Could not save state", e);
            }
        }
    }, [sections, staff, appState]);

    useEffect(() => {
        const syncState = (event: StorageEvent) => {
            if (event.key === 'hospital_config' && event.newValue) {
                try {
                    const { sections: newSections, staff: newStaff } = JSON.parse(event.newValue);
                    setSections(newSections);
                    setStaff(newStaff);
                    toast.info("Hospital configuration updated automatically.");
                } catch (e) {
                    console.error("Could not sync state", e);
                }
            }
        };

        window.addEventListener('storage', syncState);
        return () => {
            window.removeEventListener('storage', syncState);
        };
    }, []);

    const createNotification = (staffId: string, patient: Patient) => {
        const key = `hospital_notifications_${staffId}`;
        try {
            const notification: Notification = {
                id: `notif_${crypto.randomUUID()}`,
                patientName: patient.name,
                patientSymptoms: patient.symptoms,
                message: `You have been assigned a new patient: ${patient.name} (Age: ${patient.age})`,
                timestamp: new Date().toISOString(),
            };
            const existing = localStorage.getItem(key);
            const allNotifications = existing ? JSON.parse(existing) : [];
            allNotifications.push(notification);
            localStorage.setItem(key, JSON.stringify(allNotifications));
        } catch (e) {
            console.error(`Failed to create notification for staff ${staffId}`, e);
        }
    };


    const handleSetupComplete = (newSections: Section[], newStaff: StaffMember[]) => {
      setSections(newSections);
      setStaff(newStaff);
      toast.success(appState === 'setup' ? "Hospital setup complete. Command center is now active." : "Hospital configuration updated.");
      setAppState('dashboard');
    };

    const handleAdmitPatient = async (patientData: PatientAdmissionData) => {
      setIsLoading(true);
      setIsAdmissionModalOpen(false);

      const availableSections = sections.filter(s => {
        const admittedCount = admittedPatients.filter(p => p.assignedSectionId === s.id).length;
        return admittedCount < s.capacity;
      });

      if (availableSections.length === 0) {
          toast.error("Admission Failed: No available beds in any section.");
          setIsLoading(false);
          return;
      }
      
      const assignedDoctorIds = new Set(admittedPatients.map(p => p.assignedDoctorId));
      const assignedNurseIds = new Set(admittedPatients.map(p => p.assignedNurseId));

      const availableDoctors = staff.filter(s => s.role.toLowerCase() !== 'nurse' && !assignedDoctorIds.has(s.id));
      const availableNurses = staff.filter(s => s.role.toLowerCase() === 'nurse' && !assignedNurseIds.has(s.id));

      if (availableDoctors.length === 0) {
          toast.error("Admission Failed: All doctors are currently assigned.");
          setIsLoading(false);
          return;
      }
       if (availableNurses.length === 0) {
          toast.error("Admission Failed: All nurses are currently assigned.");
          setIsLoading(false);
          return;
      }

      try {
        const assignment = await apiAssignPatient(patientData, availableSections, availableDoctors, availableNurses, admittedPatients);

        if (!assignment || !assignment.sectionId || !assignment.doctorId || !assignment.nurseId) {
          throw new Error("AI failed to provide a valid assignment.");
        }
        
        const assignedSection = sections.find(s => s.id === assignment.sectionId);
        if (!assignedSection) {
             throw new Error("AI assigned to a non-existent section.");
        }
        
        const patientsInSection = admittedPatients.filter(p => p.assignedSectionId === assignment.sectionId).length;
        if(patientsInSection >= assignedSection.capacity) {
            toast.error(`Admission Failed: Section "${assignedSection.name}" is now full.`);
            setIsLoading(false);
            return;
        }

        const newPatient: Patient = {
          id: `patient_${Date.now()}`,
          ...patientData,
          assignedSectionId: assignment.sectionId,
          assignedDoctorId: assignment.doctorId,
          assignedNurseId: assignment.nurseId,
          admissionDate: new Date().toISOString(),
        };

        setAdmittedPatients(prev => [...prev, newPatient]);

        const assignedDoctor = staff.find(s => s.id === newPatient.assignedDoctorId);
        const assignedNurse = staff.find(s => s.id === newPatient.assignedNurseId);

        if (assignedDoctor) createNotification(assignedDoctor.id, newPatient);
        if (assignedNurse) createNotification(assignedNurse.id, newPatient);

        toast.success(`Patient ${patientData.name} admitted. Assigned to ${assignedSection.name}.`);

      } catch (error) {
        console.error("Failed to admit patient:", error);
        toast.error("AI could not assign patient. Please check resources or try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const handleDischargePatient = (patientId: string) => {
      const patientToDischarge = admittedPatients.find(p => p.id === patientId);
      if (!patientToDischarge) return;

      setAdmittedPatients(prev => prev.filter(p => p.id !== patientId));
      setDischargedPatients(prev => [{ ...patientToDischarge,
        dischargeDate: new Date().toISOString()
      }, ...prev]);

      toast.info(`Patient ${patientToDischarge.name} has been discharged.`);
    };

    const renderContent = () => {
      switch (appState) {
        case 'setup':
          return <SetupScreen
            onSetupComplete={handleSetupComplete}
            initialSections={sections}
            initialStaff={staff}
          />;
        case 'edit_setup':
            return <SetupScreen 
                onSetupComplete={handleSetupComplete}
                initialSections={sections}
                initialStaff={staff}
                onCancel={() => setAppState('dashboard')}
            />;
        case 'dashboard':
          return <Dashboard
            sections={sections}
            staff={staff}
            admittedPatients={admittedPatients}
            onDischarge={handleDischargePatient}
          />;
        case 'discharged':
          return <DischargedPatientsList patients={dischargedPatients} />;
        default:
          return <SetupScreen
            onSetupComplete={handleSetupComplete}
            initialSections={sections}
            initialStaff={staff}
           />;
      }
    }
    
    return (
      <>
        <Toaster />
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
          <Header
            onNavigate={setAppState}
            isSetupComplete={appState !== 'setup'}
            onAdmitPatientClick={() => setIsAdmissionModalOpen(true)}
          />
          <main className="flex-grow p-4 sm:p-6 lg:p-8">
            {renderContent()}
          </main>

          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400" />
                <p className="text-cyan-300 text-xl font-semibold">AI is allocating resources...</p>
              </div>
            </div>
          )}

          <Modal
            isOpen={isAdmissionModalOpen}
            onClose={() => setIsAdmissionModalOpen(false)}
            title="Admit New Patient"
          >
            <PatientAdmissionForm
              sections={sections}
              onSubmit={handleAdmitPatient}
              onCancel={() => setIsAdmissionModalOpen(false)}
            />
          </Modal>
        </div>
      </>
    );
  };

export default App;
