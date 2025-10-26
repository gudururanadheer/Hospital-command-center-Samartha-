
import {
  GoogleGenAI,
  Type
} from "@google/genai";
import {
  PatientAdmissionData,
  Section,
  StaffMember,
  Patient,
  AssignmentResponse
} from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({
  apiKey: API_KEY
});

export const assignPatient = async (
  newPatient: PatientAdmissionData,
  availableSections: Section[],
  availableDoctors: StaffMember[],
  availableNurses: StaffMember[],
  admittedPatients: Patient[]
): Promise < AssignmentResponse > => {
  const model = 'gemini-2.5-flash';
  
  const simplifiedSections = availableSections.map(s => {
    const patientsInSection = admittedPatients.filter(p => p.assignedSectionId === s.id).length;
    return {
      id: s.id,
      name: s.name,
      availableBeds: s.capacity - patientsInSection,
      equipment: s.equipment.map(e => ({
        name: e.name,
        available: e.available
      }))
    };
  }).filter(s => s.availableBeds > 0);


  const prompt = `
    You are an expert hospital resource allocation AI. Your task is to assign a new patient to the most appropriate section and staff from the available options. You must return your decision in a valid JSON format.

    **New Patient Details:**
    ${JSON.stringify(newPatient, null, 2)}
    
    **Current Hospital State:**
    - Available Sections (with bed counts): ${JSON.stringify(simplifiedSections, null, 2)}
    - Available Doctors/Specialists: ${JSON.stringify(availableDoctors, null, 2)}
    - Available Nurses: ${JSON.stringify(availableNurses, null, 2)}

    **Assignment Logic Rules:**
    1.  **Seriousness to Section Matching is the highest priority.**
        -   **High Seriousness (8-10):** You MUST prioritize assigning these patients to sections whose names suggest intensive or critical care, such as 'ICU', 'Intensive Care Unit', 'Critical Care', or 'Emergency'.
        -   **Medium Seriousness (4-7):** Assign these patients to general or specialized wards like 'General Ward', 'Surgical Ward', or a ward that matches their symptoms (e.g., 'Cardiology').
        -   **Low Seriousness (1-3):** These patients are best suited for 'General Ward' or 'Observation' units.
    2.  **Specialist Matching:** If the patient's symptoms strongly suggest a specialty (e.g., 'head injury', 'stroke'), assign a corresponding specialist (e.g., 'Neuro Surgeon') from the available list. Otherwise, a 'General Doctor' is acceptable.
    3.  **Resource Availability:** The assigned section absolutely MUST have an available bed and be from the provided 'Available Sections' list.
    4.  **Staff Assignment:** You must assign one doctor/specialist from the 'Available Doctors/Specialists' list and one nurse from the 'Available Nurses' list. Do NOT assign staff who are not on these lists.
    5.  **No Suitable Resources:** If no section perfectly matches the seriousness level, choose the next best available option and note this compromise in your reasoning. If the provided lists are empty, you must still return valid IDs from the non-empty lists, but explain the critical lack of resources in the reasoning. Do not return null or empty IDs.

    **Task:**
    Based on the patient details, available resources, and the logic rules above, determine the best section, doctor, and nurse for this new patient. Provide a brief reasoning for your choice.

    Return a single JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sectionId: {
              type: Type.STRING,
              description: "The ID of the assigned section."
            },
            doctorId: {
              type: Type.STRING,
              description: "The ID of the assigned doctor or specialist."
            },
            nurseId: {
              type: Type.STRING,
              description: "The ID of the assigned nurse."
            },
            reasoning: {
              type: Type.STRING,
              description: "A brief explanation for the assignment decision."
            }
          },
          required: ["sectionId", "doctorId", "nurseId", "reasoning"],
        }
      }
    });

    const jsonText = response.text.trim();
    const assignment: AssignmentResponse = JSON.parse(jsonText);

    return assignment;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get assignment from AI.");
  }
};
