# backend/agents/icu_agent.py
from agents.base_agent import BaseAgent
from typing import Dict, Optional, List
from datetime import datetime, timedelta
import random

class ICUAgent(BaseAgent):
    """
    ICU Agent: Manages intensive care unit operations
    - Monitors ICU capacity
    - Identifies early discharge candidates
    - Accepts transfers from ER
    - Learns patient recovery patterns
    """
    
    def __init__(self):
        super().__init__(name="ICU-Agent", role="ICU")
        
        # ICU-specific parameters
        self.capacity = 20
        
        # Learning: Average recovery times by severity
        self.recovery_patterns = {
            'critical': {'avg_hours': 72, 'samples': 0},
            'urgent': {'avg_hours': 48, 'samples': 0},
            'stable': {'avg_hours': 24, 'samples': 0}
        }
        
    def perceive(self, hospital_state: Dict) -> Dict:
        """Step 1: Observe ICU state"""
        icu_state = hospital_state.get('icu', {})
        er_state = hospital_state.get('er', {})
        
        perception = {
            'occupancy': icu_state.get('current_occupancy', 0),
            'capacity': icu_state.get('capacity', 20),
            'occupancy_rate': icu_state.get('occupancy_rate', 0),
            'patients': icu_state.get('patients', []),
            'available_beds': self.capacity - icu_state.get('current_occupancy', 0),
            'er_needs_transfer': er_state.get('occupancy_rate', 0) > 0.85
        }
        
        # Identify discharge candidates
        perception['discharge_candidates'] = self._identify_discharge_candidates(
            perception['patients']
        )
        
        return perception
    
    def decide(self, perception: Dict) -> Optional[Dict]:
        """Step 2: Make intelligent decisions"""
        
        occupancy_rate = perception['occupancy_rate']
        available_beds = perception['available_beds']
        er_needs_help = perception['er_needs_transfer']
        discharge_candidates = perception['discharge_candidates']
        
        # PROACTIVE DISCHARGE: Make room if ER needs help
        if er_needs_help and discharge_candidates and available_beds < 3:
            return {
                'action': 'EARLY_DISCHARGE',
                'priority': 'HIGH',
                'patients': discharge_candidates[:2],
                'reasoning': "ER crisis - proactively freeing beds",
                'confidence': self.get_confidence(),
                'threshold_used': 'transfer_threshold'
            }
        
        # ACCEPT TRANSFERS: Have capacity
        elif available_beds > 5 and er_needs_help:
            return {
                'action': 'ACCEPT_TRANSFER',
                'priority': 'MEDIUM',
                'available_beds': available_beds,
                'reasoning': f"ICU has {available_beds} beds available for ER transfers",
                'confidence': self.get_confidence()
            }
        
        # HIGH OCCUPANCY: Prepare discharges
        elif occupancy_rate > self.thresholds['high_occupancy']:
            if discharge_candidates:
                return {
                    'action': 'PREPARE_DISCHARGE',
                    'priority': 'MEDIUM',
                    'patients': discharge_candidates,
                    'reasoning': f"ICU at {occupancy_rate*100:.0f}% - preparing discharges",
                    'confidence': self.get_confidence(),
                    'threshold_used': 'high_occupancy'
                }
        
        # CAPACITY WARNING
        elif occupancy_rate > self.thresholds['warning_occupancy']:
            return {
                'action': 'MONITOR_CLOSELY',
                'priority': 'LOW',
                'reasoning': f"ICU at {occupancy_rate*100:.0f}% capacity",
                'available_beds': available_beds,
                'confidence': self.get_confidence()
            }
        
        # NORMAL OPERATIONS
        else:
            return {
                'action': 'MONITOR',
                'priority': 'LOW',
                'reasoning': f"ICU stable at {occupancy_rate*100:.0f}%",
                'available_beds': available_beds,
                'confidence': self.get_confidence()
            }
    
    def _identify_discharge_candidates(self, patients: List[Dict]) -> List[str]:
        """Find patients ready for discharge using learned patterns"""
        candidates = []
        
        for patient in patients:
            severity = patient.get('severity', 'stable')
            arrival_time = datetime.fromisoformat(patient.get('arrival_time', datetime.now().isoformat()))
            hours_in_icu = (datetime.now() - arrival_time).total_seconds() / 3600
            
            # Use learned recovery patterns
            if severity in self.recovery_patterns:
                expected_recovery = self.recovery_patterns[severity]['avg_hours']
                
                # Ready for discharge if stayed longer than average
                if hours_in_icu >= expected_recovery * 0.8:  # 80% of expected time
                    candidates.append(patient['id'])
        
        return candidates
    
    def learn_recovery_time(self, patient_severity: str, actual_hours: float):
        """LEARNING: Update recovery time patterns"""
        if patient_severity in self.recovery_patterns:
            pattern = self.recovery_patterns[patient_severity]
            n = pattern['samples']
            
            # Update running average
            pattern['avg_hours'] = (pattern['avg_hours'] * n + actual_hours) / (n + 1)
            pattern['samples'] += 1
            
            print(f"🎓 ICU-Agent LEARNED: {patient_severity} recovery time updated to {pattern['avg_hours']:.1f}h")
