# backend/agents/base_agent.py
from datetime import datetime
from typing import Dict, List, Optional
import random

class BaseAgent:
    """Base class for all intelligent agents"""
    
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role  # "ER", "OR", "ICU", "Orchestrator"
        
        # Learning parameters
        self.decision_history: List[Dict] = []
        self.success_count = 0
        self.failure_count = 0
        self.experience = 0
        
        # Adaptive thresholds (these will LEARN!)
        self.thresholds = {
            'high_occupancy': 0.85,
            'warning_occupancy': 0.70,
            'transfer_threshold': 0.80
        }
        
        # Learning rate
        self.learning_rate = 0.05
        
    def perceive(self, hospital_state: Dict) -> Dict:
        """
        STEP 1: Agent observes the environment
        Override in child classes
        """
        raise NotImplementedError
    
    def decide(self, perception: Dict) -> Optional[Dict]:
        """
        STEP 2: Agent makes intelligent decision
        Override in child classes
        """
        raise NotImplementedError
    
    def act(self, decision: Dict, hospital_state) -> bool:
        """
        STEP 3: Agent executes decision
        Returns True if successful
        """
        if decision is None or decision.get('action') == 'MONITOR':
            return True
        
        # Log decision
        decision['timestamp'] = datetime.now().isoformat()
        decision['agent'] = self.name
        self.decision_history.append(decision)
        
        print(f"\n🤖 {self.name}: {decision.get('action')} - {decision.get('reasoning', '')}")
        
        return True
    
    def learn_from_outcome(self, decision: Dict, outcome: Dict):
        """
        STEP 4: Agent learns from results (ADAPTIVE LEARNING!)
        """
        self.experience += 1
        
        if outcome.get('success', False):
            self.success_count += 1
            
            # Decision worked! Adjust threshold to be more aggressive
            threshold_key = decision.get('threshold_used')
            if threshold_key and threshold_key in self.thresholds:
                adjustment = self.learning_rate * outcome.get('benefit', 0.5)
                self.thresholds[threshold_key] -= adjustment
                
                # Keep in valid range
                self.thresholds[threshold_key] = max(0.5, min(0.95, self.thresholds[threshold_key]))
            
            print(f"✅ {self.name} LEARNED: Success! Adjusted thresholds")
            
        else:
            self.failure_count += 1
            
            # Decision failed! Adjust threshold to be more conservative
            threshold_key = decision.get('threshold_used')
            if threshold_key and threshold_key in self.thresholds:
                adjustment = self.learning_rate * outcome.get('penalty', 0.5)
                self.thresholds[threshold_key] += adjustment
                
                # Keep in valid range
                self.thresholds[threshold_key] = max(0.5, min(0.95, self.thresholds[threshold_key]))
            
            print(f"❌ {self.name} LEARNED: Failure. Adjusted thresholds")
    
    def get_success_rate(self) -> float:
        """Calculate agent's success rate"""
        total = self.success_count + self.failure_count
        return self.success_count / total if total > 0 else 0.5
    
    def get_confidence(self) -> float:
        """Confidence increases with experience"""
        return min(0.95, 0.5 + (self.experience / 200))
    
    def get_stats(self) -> Dict:
        """Return agent statistics"""
        return {
            'name': self.name,
            'role': self.role,
            'experience': self.experience,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'success_rate': self.get_success_rate(),
            'confidence': self.get_confidence(),
            'current_thresholds': self.thresholds.copy(),
            'recent_decisions': self.decision_history[-5:]
        }
