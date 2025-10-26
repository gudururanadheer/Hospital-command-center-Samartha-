# backend/agents/or_agent.py
from agents.base_agent import BaseAgent
from typing import Dict, Optional, List
from datetime import datetime, timedelta

class ORAgent(BaseAgent):
    """
    OR Agent: Manages operating room scheduling
    - Schedules surgeries based on priority
    - Can postpone non-urgent surgeries in crisis
    - Optimizes OR utilization
    - Learns optimal scheduling patterns
    """
    
    def __init__(self):
        super().__init__(name="OR-Agent", role="OR")
        
        # OR-specific parameters
        self.num_rooms = 5
        self.surgery_queue = []
        
        # Learned scheduling efficiency
        self.avg_surgery_duration = 120  # minutes (will adapt!)
        
    def perceive(self, hospital_state: Dict) -> Dict:
        """Step 1: Observe OR state"""
        or_state = hospital_state.get('or', {})
        er_state = hospital_state.get('er', {})
        
        perception = {
            'occupancy': or_state.get('current_occupancy', 0),
            'capacity': or_state.get('capacity', 5),
            'occupancy_rate': or_state.get('occupancy_rate', 0),
            'patients': or_state.get('patients', []),
            'er_crisis': er_state.get('occupancy_rate', 0) > 0.9,  # Is ER in crisis?
            'available_rooms': self.num_rooms - or_state.get('current_occupancy', 0)
        }
        
        return perception
    
    def decide(self, perception: Dict) -> Optional[Dict]:
        """Step 2: Make scheduling decisions"""
        
        occupancy_rate = perception['occupancy_rate']
        er_crisis = perception['er_crisis']
        
        # CRISIS RESPONSE: Postpone non-urgent surgeries
        if er_crisis and occupancy_rate > 0.6:
            elective_surgeries = self._find_elective_surgeries(perception['patients'])
            
            if elective_surgeries:
                return {
                    'action': 'POSTPONE_ELECTIVE',
                    'priority': 'HIGH',
                    'surgeries_postponed': elective_surgeries,
                    'reasoning': "ER crisis detected - freeing OR capacity for emergencies",
                    'confidence': self.get_confidence(),
                    'threshold_used': 'high_occupancy'
                }
        
        # OPTIMIZATION: Schedule efficiently
        elif perception['available_rooms'] > 0:
            return {
                'action': 'OPTIMIZE_SCHEDULE',
                'priority': 'MEDIUM',
                'available_rooms': perception['available_rooms'],
                'reasoning': "OR capacity available for scheduling",
                'confidence': self.get_confidence()
            }
        
        # FULL: Request patience
        elif occupancy_rate >= 1.0:
            return {
                'action': 'DELAY_ADMISSIONS',
                'priority': 'MEDIUM',
                'reasoning': "All OR rooms occupied",
                'estimated_wait': self.avg_surgery_duration,
                'confidence': self.get_confidence()
            }
        
        # NORMAL OPERATIONS
        else:
            return {
                'action': 'MONITOR',
                'priority': 'LOW',
                'reasoning': f"OR running smoothly at {occupancy_rate*100:.0f}%",
                'confidence': self.get_confidence()
            }
    
    def _find_elective_surgeries(self, patients: List[Dict]) -> List[str]:
        """Find non-urgent surgeries that can be postponed"""
        elective = []
        for p in patients:
            if p.get('severity') != 'critical':
                elective.append(p['id'])
        return elective
    
    def schedule_surgery(self, patient_id: str, urgency: str) -> Dict:
        """Schedule a surgery"""
        surgery = {
            'patient_id': patient_id,
            'urgency': urgency,
            'scheduled_time': datetime.now().isoformat(),
            'estimated_duration': self.avg_surgery_duration
        }
        
        self.surgery_queue.append(surgery)
        
        return {
            'action': 'SURGERY_SCHEDULED',
            'patient': patient_id,
            'position_in_queue': len(self.surgery_queue),
            'estimated_start': datetime.now() + timedelta(minutes=30)
        }
