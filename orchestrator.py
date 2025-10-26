# backend/agents/orchestrator.py
from agents.base_agent import BaseAgent
from typing import Dict, Optional, List
from datetime import datetime, timedelta

class OrchestratorAgent(BaseAgent):
    """
    Orchestrator Agent: Master coordinator of all agents
    - Monitors entire hospital system
    - Predicts system-wide bottlenecks
    - Coordinates agent actions
    - Makes strategic decisions
    """
    
    def __init__(self, er_agent, or_agent, icu_agent):
        super().__init__(name="Orchestrator", role="System-Wide")
        
        # References to other agents
        self.er_agent = er_agent
        self.or_agent = or_agent
        self.icu_agent = icu_agent
        
        # System-wide monitoring
        self.system_alerts = []
        self.bottleneck_predictions = []
        
    def perceive(self, hospital_state: Dict) -> Dict:
        """Step 1: Observe entire hospital system"""
        
        perception = {
            'overall_occupancy': hospital_state.get('overall_occupancy', 0),
            'er_state': hospital_state.get('er', {}),
            'or_state': hospital_state.get('or', {}),
            'icu_state': hospital_state.get('icu', {}),
            'total_patients': hospital_state.get('total_admitted', 0),
            'timestamp': hospital_state.get('timestamp', datetime.now().isoformat())
        }
        
        # Analyze system health
        perception['system_health'] = self._assess_system_health(perception)
        perception['predicted_bottleneck'] = self._predict_bottleneck(perception)
        
        return perception
    
    def decide(self, perception: Dict) -> Optional[Dict]:
        """Step 2: Make strategic system-wide decisions"""
        
        system_health = perception['system_health']
        bottleneck = perception['predicted_bottleneck']
        
        # CRITICAL SYSTEM STATE
        if system_health == 'CRITICAL':
            return self._crisis_coordination(perception)
        
        # PREDICTED BOTTLENECK
        elif bottleneck:
            return {
                'action': 'PREEMPTIVE_COORDINATION',
                'priority': 'HIGH',
                'bottleneck': bottleneck,
                'reasoning': f"Predicted bottleneck in {bottleneck['department']} in {bottleneck['hours']}h",
                'coordination_plan': self._create_coordination_plan(bottleneck),
                'confidence': self.get_confidence()
            }
        
        # WARNING STATE
        elif system_health == 'WARNING':
            return {
                'action': 'MONITOR_CLOSELY',
                'priority': 'MEDIUM',
                'reasoning': "System approaching capacity",
                'overall_occupancy': perception['overall_occupancy'],
                'confidence': self.get_confidence()
            }
        
        # NORMAL OPERATIONS
        else:
            return {
                'action': 'NORMAL_OPERATIONS',
                'priority': 'LOW',
                'reasoning': "All systems operating normally",
                'system_health': system_health,
                'confidence': self.get_confidence()
            }
    
    def _assess_system_health(self, perception: Dict) -> str:
        """Assess overall hospital system health"""
        
        er_rate = perception['er_state'].get('occupancy_rate', 0)
        or_rate = perception['or_state'].get('occupancy_rate', 0)
        icu_rate = perception['icu_state'].get('occupancy_rate', 0)
        
        # Count critical departments
        critical_count = sum([
            er_rate > 0.9,
            or_rate > 0.9,
            icu_rate > 0.9
        ])
        
        warning_count = sum([
            er_rate > 0.75,
            or_rate > 0.75,
            icu_rate > 0.75
        ])
        
        if critical_count >= 2:
            return 'CRITICAL'
        elif critical_count >= 1 or warning_count >= 2:
            return 'WARNING'
        elif warning_count >= 1:
            return 'CAUTION'
        else:
            return 'NORMAL'
    
    def _predict_bottleneck(self, perception: Dict) -> Optional[Dict]:
        """Predict where bottleneck will occur"""
        
        # Get predicted states from individual agents
        er_rate = perception['er_state'].get('occupancy_rate', 0)
        icu_rate = perception['icu_state'].get('occupancy_rate', 0)
        
        # Simple prediction logic (can be enhanced with ML)
        bottlenecks = []
        
        # ER trending toward full
        if er_rate > 0.75:
            bottlenecks.append({
                'department': 'ER',
                'hours': 2,
                'severity': 'HIGH' if er_rate > 0.85 else 'MEDIUM',
                'current_rate': er_rate
            })
        
        # ICU limited capacity with ER pressure
        if icu_rate > 0.75 and er_rate > 0.80:
            bottlenecks.append({
                'department': 'ICU',
                'hours': 3,
                'severity': 'HIGH',
                'current_rate': icu_rate
            })
        
        # Return most severe bottleneck
        if bottlenecks:
            return max(bottlenecks, key=lambda x: 1 if x['severity'] == 'HIGH' else 0)
        
        return None
    
    def _create_coordination_plan(self, bottleneck: Dict) -> List[str]:
        """Create action plan to prevent bottleneck"""
        
        plan = []
        dept = bottleneck['department']
        
        if dept == 'ER':
            plan = [
                'Instruct ICU-Agent to prepare beds',
                'Instruct OR-Agent to postpone elective surgeries',
                'Increase ER-Agent transfer threshold',
                'Alert staff for surge capacity'
            ]
        elif dept == 'ICU':
            plan = [
                'Instruct ICU-Agent to identify discharge candidates',
                'Instruct ER-Agent to hold stable patients',
                'Coordinate early discharges',
                'Prepare step-down units'
            ]
        elif dept == 'OR':
            plan = [
                'Reschedule non-urgent surgeries',
                'Extend OR hours if needed',
                'Optimize OR turnover time'
            ]
        
        return plan
    
    def _crisis_coordination(self, perception: Dict) -> Dict:
        """Coordinate all agents during crisis"""
        
        return {
            'action': 'SYSTEM_CRISIS_MODE',
            'priority': 'CRITICAL',
            'reasoning': "Multiple departments at critical capacity",
            'emergency_measures': [
                '🚨 ACTIVATE CRISIS PROTOCOL',
                '📢 Alert all agents',
                '🔄 Maximize patient flow',
                '🏥 Prepare overflow areas',
                '📞 Request additional staff',
                '🚑 Divert ambulances if needed'
            ],
            'agent_instructions': {
                'ER': 'Expedite triage and transfers',
                'OR': 'Postpone all elective procedures',
                'ICU': 'Immediate discharge review'
            },
            'confidence': 1.0
        }
    
    def coordinate_transfer(self, from_dept: str, to_dept: str, patient_count: int) -> Dict:
        """Coordinate patient transfer between departments"""
        
        # Get agent decisions
        source_agent = self._get_agent(from_dept)
        target_agent = self._get_agent(to_dept)
        
        if not source_agent or not target_agent:
            return {'success': False, 'reason': 'Invalid departments'}
        
        # Negotiate transfer
        negotiation = {
            'from': from_dept,
            'to': to_dept,
            'requested_count': patient_count,
            'timestamp': datetime.now().isoformat()
        }
        
        return {
            'action': 'COORDINATED_TRANSFER',
            'negotiation': negotiation,
            'success': True,
            'reasoning': f"Orchestrator coordinated {patient_count} patient transfer: {from_dept} → {to_dept}"
        }
    
    def _get_agent(self, department: str):
        """Get agent by department name"""
        if department == 'ER':
            return self.er_agent
        elif department == 'OR':
            return self.or_agent
        elif department == 'ICU':
            return self.icu_agent
        return None
