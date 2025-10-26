export interface Equipment {
  id: string;
  name: string;
  total: number;
  available: number;
}

export interface Section {
  id: string;
  name: string;
  capacity: number;
  equipment: Equipment[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export interface PatientAdmissionData {
  name: string;
  age: number;
  symptoms: string;
  seriousness: number; // 1 to 10
}

export interface Patient extends PatientAdmissionData {
  id: string;
  assignedSectionId: string;
  assignedDoctorId: string;
  assignedNurseId: string;
  admissionDate: string;
  dischargeDate?: string;
}

export interface AssignmentResponse {
  sectionId: string;
  doctorId: string;
  nurseId: string;
  reasoning: string;
}

export interface Notification {
  id: string;
  patientName: string;
  patientSymptoms: string;
  message: string;
  timestamp: string;
}
