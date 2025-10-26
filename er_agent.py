# backend/agents/er_agent.py
from agents.base_agent import BaseAgent
from typing import Dict, Optional, List
from datetime import datetime, timedelta
import random

class ERAgent(BaseAgent):
    """
    ER Agent: Manages emergency room operations
    - Monitors ER occupancy
    - Predicts overflow situations
    - Decides on patient transfers
    - Learns optimal thresholds
    """
    
    def __init__(self):
        super().__init__(name="ER-Agent", role="ER")
        
        # ER-specific parameters
        self.capacity = 30
        self.critical_threshold = 0.90  # Will learn!
        self.warning_threshold = 0.75   # Will learn!
        
        # Pattern memory (LEARNING!)
        self.hourly_patterns = {}  # Learns peak hours
        self.crisis_history = []
        
    def perceive(self, hospital_state: Dict) -> Dict:
        """Step 1: Observe ER state"""
        er_state = hospital_state.get('er', {})
        
        perception = {
            'occupancy': er_state.get('current_occupancy', 0),
            'capacity': er_state.get('capacity', 30),
            'occupancy_rate': er_state.get('occupancy_rate', 0),
            'patients': er_state.get('patients', []),
            'wait_time': er_state.get('wait_time', 0),
            'current_hour': datetime.now().hour
        }
        
        # Learn patterns (ADAPTIVE!)
        self._learn_hourly_pattern(perception)
        
        # Predict future state
        perception['predicted_occupancy_1h'] = self._predict_occupancy(1)
        perception['predicted_occupancy_2h'] = self._predict_occupancy(2)
        
        return perception
    
    def decide(self, perception: Dict) -> Optional[Dict]:
        """Step 2: Make intelligent decision"""
        
        occupancy_rate = perception['occupancy_rate']
        predicted_1h = perception.get('predicted_occupancy_1h', occupancy_rate)
        
        # DECISION LOGIC (Using learned thresholds!)
        
        # Critical situation - immediate action
        if occupancy_rate >= self.thresholds['high_occupancy']:
            return {
                'action': 'TRANSFER_PATIENTS',
                'priority': 'HIGH',
                'target': 'ICU',
                'patient_count': 3,
                'reasoning': f"ER at {occupancy_rate*100:.0f}% capacity (threshold: {self.thresholds['high_occupancy']*100:.0f}%)",
                'confidence': self.get_confidence(),
                'threshold_used': 'high_occupancy'
            }
        
        # Predicted overflow - proactive action
        elif predicted_1h > self.thresholds['transfer_threshold']:
            stable_patients = self._find_stable_patients(perception['patients'])
            if stable_patients:
                return {
                    'action': 'EARLY_TRANSFER',
                    'priority': 'MEDIUM',
                    'target': 'ICU',
                    'patients': stable_patients[:2],
                    'reasoning': f"Predicted overflow in 1h: {predicted_1h*100:.0f}%",
                    'confidence': self.get_confidence() * 0.8,  # Lower confidence for predictions
                    'threshold_used': 'transfer_threshold'
                }
        
        # Warning level - prepare
        elif occupancy_rate >= self.thresholds['warning_occupancy']:
            return {
                'action': 'ALERT_PREPARE',
                'priority': 'LOW',
                'message': f"ER reaching capacity: {occupancy_rate*100:.0f}%",
                'reasoning': "Proactive monitoring",
                'confidence': self.get_confidence()
            }
        
        # Normal operations
        else:
            return {
                'action': 'MONITOR',
                'priority': 'LOW',
                'reasoning': f"ER stable at {occupancy_rate*100:.0f}%",
                'confidence': self.get_confidence()
            }
    
    def _find_stable_patients(self, patients: List[Dict]) -> List[str]:
        """Find stable patients suitable for transfer"""
        stable = []
        for p in patients:
            if p.get('severity') == 'stable':
                stable.append(p['id'])
        return stable
    
    def _learn_hourly_pattern(self, perception: Dict):
        """LEARNING: Track patterns by hour of day"""
        hour = perception['current_hour']
        occupancy = perception['occupancy_rate']
        
        if hour not in self.hourly_patterns:
            self.hourly_patterns[hour] = {
                'samples': 0,
                'avg_occupancy': 0,
                'max_occupancy': 0
            }
        
        pattern = self.hourly_patterns[hour]
        n = pattern['samples']
        
        # Update running average (online learning)
        pattern['avg_occupancy'] = (pattern['avg_occupancy'] * n + occupancy) / (n + 1)
        pattern['max_occupancy'] = max(pattern['max_occupancy'], occupancy)
        pattern['samples'] += 1
    
    def _predict_occupancy(self, hours_ahead: int) -> float:
        """PREDICTION: Forecast future occupancy using learned patterns"""
        future_hour = (datetime.now().hour + hours_ahead) % 24
        
        if future_hour in self.hourly_patterns:
            pattern = self.hourly_patterns[future_hour]
            
            # Use learned average with some randomness
            prediction = pattern['avg_occupancy'] * random.uniform(0.9, 1.1)
            return min(1.0, prediction)
        else:
            # No pattern learned yet, use current + small increase
            return min(1.0, random.uniform(0.6, 0.8))
    
    def handle_crisis(self, crisis_type: str) -> Dict:
        """Special handler for crisis situations"""
        self.crisis_history.append({
            'type': crisis_type,
            'timestamp': datetime.now().isoformat()
        })
        
        return {
            'action': 'CRISIS_RESPONSE',
            'priority': 'CRITICAL',
            'crisis_type': crisis_type,
            'reasoning': f"Emergency protocol activated: {crisis_type}",
            'measures': [
                'Request immediate OR postponement',
                'Prepare ICU for transfers',
                'Alert all staff',
                'Increase triage speed'
            ],
            'confidence': 1.0
        }
