# backend/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import asyncio
import json
from datetime import datetime
import uvicorn

# Import our models and agents
from models.hospital_state import HospitalState
from agents.er_agent import ERAgent
from agents.or_agent import ORAgent
from agents.icu_agent import ICUAgent
from agents.orchestrator import OrchestratorAgent
from simulation.hospital_sim import HospitalSimulation

# Initialize FastAPI
app = FastAPI(title="Hospital Digital Twin API", version="1.0.0")

# Enable CORS (so frontend can connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
hospital_state = HospitalState()
er_agent = ERAgent()
or_agent = ORAgent()
icu_agent = ICUAgent()
orchestrator = OrchestratorAgent(er_agent, or_agent, icu_agent)

# WebSocket connections
active_connections: List[WebSocket] = []

# Simulation instance
simulation = None

# Agent decision loop
agent_loop_running = False

# ============================================================================
# REST API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """API health check"""
    return {
        "status": "online",
        "service": "Hospital Digital Twin Backend",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/state")
async def get_hospital_state():
    """Get current hospital state"""
    return hospital_state.get_full_state()

@app.get("/api/agents/stats")
async def get_agent_stats():
    """Get all agent statistics"""
    return {
        "er_agent": er_agent.get_stats(),
        "or_agent": or_agent.get_stats(),
        "icu_agent": icu_agent.get_stats(),
        "orchestrator": orchestrator.get_stats()
    }

@app.post("/api/simulation/start")
async def start_simulation():
    """Start hospital simulation"""
    global simulation, agent_loop_running
    
    if simulation is None:
        simulation = HospitalSimulation(
            hospital_state,
            event_callback=broadcast_event
        )
        simulation.start()
        
        # Start agent decision loop
        if not agent_loop_running:
            asyncio.create_task(agent_decision_loop())
            agent_loop_running = True
        
        return {"status": "started", "message": "Simulation started successfully"}
    
    return {"status": "already_running", "message": "Simulation is already running"}

@app.post("/api/simulation/stop")
async def stop_simulation():
    """Stop hospital simulation"""
    global simulation
    
    if simulation:
        simulation.stop()
        simulation = None
        return {"status": "stopped", "message": "Simulation stopped"}
    
    return {"status": "not_running", "message": "Simulation is not running"}

@app.post("/api/simulation/crisis")
async def trigger_crisis(crisis_type: str = "MASS_CASUALTY"):
    """Manually trigger a crisis event"""
    if simulation:
        simulation.trigger_crisis(crisis_type)
        return {
            "status": "triggered",
            "crisis_type": crisis_type,
            "message": f"Crisis '{crisis_type}' triggered"
        }
    
    return {"status": "error", "message": "Simulation not running"}

@app.post("/api/patients/admit")
async def admit_patient(department: str = "ER", severity: str = "stable"):
    """Manually admit a patient"""
    patient = hospital_state.admit_patient(department, severity)
    
    if patient:
        await broadcast_update({
            "type": "PATIENT_ADMITTED",
            "patient": patient.to_dict(),
            "department": department
        })
        return {"status": "success", "patient": patient.to_dict()}
    
    return {"status": "error", "message": f"{department} is full"}

@app.post("/api/patients/discharge/{patient_id}")
async def discharge_patient(patient_id: str):
    """Discharge a patient"""
    success = hospital_state.discharge_patient(patient_id)
    
    if success:
        await broadcast_update({
            "type": "PATIENT_DISCHARGED",
            "patient_id": patient_id
        })
        return {"status": "success", "patient_id": patient_id}
    
    return {"status": "error", "message": "Patient not found"}

@app.post("/api/patients/transfer")
async def transfer_patient(patient_id: str, from_dept: str, to_dept: str):
    """Transfer patient between departments"""
    success = hospital_state.transfer_patient(patient_id, from_dept, to_dept)
    
    if success:
        await broadcast_update({
            "type": "PATIENT_TRANSFERRED",
            "patient_id": patient_id,
            "from": from_dept,
            "to": to_dept
        })
        return {"status": "success"}
    
    return {"status": "error", "message": "Transfer failed"}

# ============================================================================
# WEBSOCKET ENDPOINT (Real-time updates)
# ============================================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket connection for real-time updates"""
    await websocket.accept()
    active_connections.append(websocket)
    
    print(f"✅ WebSocket client connected. Total connections: {len(active_connections)}")
    
    # Send initial state
    try:
        await websocket.send_json({
            "type": "INITIAL_STATE",
            "data": hospital_state.get_full_state()
        })
        
        # Keep connection alive and listen for messages
        while True:
            # Wait for any message from client (ping/pong)
            data = await websocket.receive_text()
            
            # Echo back (for connection testing)
            await websocket.send_json({
                "type": "PONG",
                "timestamp": datetime.now().isoformat()
            })
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"❌ WebSocket client disconnected. Remaining: {len(active_connections)}")
    except Exception as e:
        print(f"⚠️ WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)

# ============================================================================
# BACKGROUND TASKS
# ============================================================================

async def agent_decision_loop():
    """Continuous loop where agents make decisions"""
    global agent_loop_running
    
    print("🤖 Agent decision loop STARTED")
    
    while agent_loop_running:
        try:
            # Get current state
            current_state = hospital_state.get_full_state()
            
            # Each agent perceives and decides
            # ER Agent
            er_perception = er_agent.perceive(current_state)
            er_decision = er_agent.decide(er_perception)
            if er_decision:
                er_agent.act(er_decision, hospital_state)
                await broadcast_agent_decision("ER", er_decision)
                
                # Simulate outcome and learn
                outcome = evaluate_decision(er_decision, 'ER')
                er_agent.learn_from_outcome(er_decision, outcome)
            
            # OR Agent
            or_perception = or_agent.perceive(current_state)
            or_decision = or_agent.decide(or_perception)
            if or_decision:
                or_agent.act(or_decision, hospital_state)
                await broadcast_agent_decision("OR", or_decision)
                
                outcome = evaluate_decision(or_decision, 'OR')
                or_agent.learn_from_outcome(or_decision, outcome)
            
            # ICU Agent
            icu_perception = icu_agent.perceive(current_state)
            icu_decision = icu_agent.decide(icu_perception)
            if icu_decision:
                icu_agent.act(icu_decision, hospital_state)
                await broadcast_agent_decision("ICU", icu_decision)
                
                outcome = evaluate_decision(icu_decision, 'ICU')
                icu_agent.learn_from_outcome(icu_decision, outcome)
            
            # Orchestrator
            orch_perception = orchestrator.perceive(current_state)
            orch_decision = orchestrator.decide(orch_perception)
            if orch_decision:
                orchestrator.act(orch_decision, hospital_state)
                await broadcast_agent_decision("Orchestrator", orch_decision)
            
            # Broadcast updated state
            await broadcast_state_update()
            
            # Wait before next decision cycle (agents decide every 5 seconds)
            await asyncio.sleep(5)
            
        except Exception as e:
            print(f"⚠️ Error in agent decision loop: {e}")
            await asyncio.sleep(5)

def evaluate_decision(decision: dict, department: str) -> dict:
    """Simple outcome evaluation for learning"""
    # This is a simplified evaluation
    # In real system, would track actual results
    
    action = decision.get('action', '')
    
    # Simulate success/failure based on action type
    if action in ['TRANSFER_PATIENTS', 'EARLY_TRANSFER', 'ACCEPT_TRANSFER']:
        # Transfer decisions usually succeed
        return {
            'success': True,
            'benefit': 0.7,
            'penalty': 0.0
        }
    elif action in ['MONITOR', 'NORMAL_OPERATIONS']:
        # Monitoring always succeeds
        return {
            'success': True,
            'benefit': 0.3,
            'penalty': 0.0
        }
    else:
        # Other actions have moderate success
        return {
            'success': True,
            'benefit': 0.5,
            'penalty': 0.0
        }

async def simulation_loop():
    """Run simulation steps continuously"""
    while simulation and simulation.running:
        simulation.run_step()
        await asyncio.sleep(0.1)  # 100ms per step

async def broadcast_state_update():
    """Broadcast current hospital state to all connected clients"""
    if active_connections:
        state = hospital_state.get_full_state()
        await broadcast_update({
            "type": "STATE_UPDATE",
            "data": state
        })

async def broadcast_agent_decision(agent_name: str, decision: dict):
    """Broadcast agent decision to all clients"""
    await broadcast_update({
        "type": "AGENT_DECISION",
        "agent": agent_name,
        "decision": decision
    })

async def broadcast_update(message: dict):
    """Send message to all connected WebSocket clients"""
    if active_connections:
        disconnected = []
        
        for connection in active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"⚠️ Failed to send to client: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            if conn in active_connections:
                active_connections.remove(conn)

def broadcast_event(event: dict):
    """Callback for simulation events (sync to async bridge)"""
    asyncio.create_task(broadcast_update({
        "type": "SIMULATION_EVENT",
        "event": event
    }))

# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize system on startup"""
    print("\n" + "="*60)
    print("🏥 HOSPITAL DIGITAL TWIN BACKEND")
    print("="*60)
    print("✅ FastAPI server initialized")
    print("✅ Agents ready")
    print("✅ Simulation engine ready")
    print("🌐 WebSocket endpoint: ws://localhost:8000/ws")
    print("📚 API docs: http://localhost:8000/docs")
    print("="*60 + "\n")

# ============================================================================
# RUN SERVER
# ============================================================================

if __name__ == "__main__":
    # Start simulation automatically
    simulation = HospitalSimulation(hospital_state, event_callback=broadcast_event)
    simulation.start()
    
    # Run server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
