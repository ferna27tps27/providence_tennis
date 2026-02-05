/**
 * Training plan type definitions
 */

export interface TrainingPlan {
  id: string;
  playerId: string;
  createdAt: string;
  lastModified: string;
  
  // Analysis from journals
  focusAreas: string[];
  strengths: string[];
  areasForImprovement: string[];
  
  // Recommendations
  recommendations: string;
  suggestedDrills: string[];
  weeklyGoals: string[];
  
  // Progress tracking
  sessionCount: number;
  lastReviewDate: string;
  progressNotes?: string;
  
  // Metadata
  createdBy: string; // AI or coach ID
  version: number;
}

export interface TrainingPlanRequest {
  playerId: string;
  focusAreas: string[];
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string;
  suggestedDrills: string[];
  weeklyGoals: string[];
  progressNotes?: string;
}

export interface JournalAnalytics {
  totalSessions: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  areasFrequency: Record<string, number>;
  areasPercentage: Record<string, number>;
  recentFocus: string[];
  coachPointers: string[];
  playerReflections: string[];
  trends: {
    improving: string[];
    needsWork: string[];
  };
}
