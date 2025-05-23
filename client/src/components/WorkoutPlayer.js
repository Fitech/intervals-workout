import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import './WorkoutPlayer.css';
import IntervalVisualization from './IntervalVisualization';

// Reducer and initial state
const initialState = {
  isPlaying: false,
  currentIntervalIndex: 0,
  currentSet: 1,
  phase: 'active',
  timeLeftInPhase: 0,
  totalTimeRemaining: 0,
  elapsedTime: 0,
  lastUpdate: Date.now()
};

function workoutReducer(state, action) {
  switch (action.type) {
    case 'PLAY':
      return { ...state, isPlaying: true, lastUpdate: Date.now() };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'TICK': {
      const now = Date.now();
      const delta = Math.floor((now - state.lastUpdate) / 1000);
      
      if (delta <= 0) return state;
      
      return {
        ...state,
        timeLeftInPhase: Math.max(0, state.timeLeftInPhase - delta),
        totalTimeRemaining: Math.max(0, state.totalTimeRemaining - delta),
        elapsedTime: state.elapsedTime + delta,
        lastUpdate: now
      };
    }
    case 'NEXT_PHASE':
      return {
        ...state,
        ...action.payload,
        lastUpdate: Date.now()
      };
    case 'SET_PHASE_TIME':
      return {
        ...state,
        timeLeftInPhase: action.payload,
        lastUpdate: Date.now()
      };
    case 'RESTART':
      return { 
        ...initialState, 
        isPlaying: state.isPlaying, // Keep the current play state
        lastUpdate: Date.now()
      };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

const WorkoutPlayer = ({ workout, onBack }) => {
  // State management with useReducer
  const [state, dispatch] = useReducer(workoutReducer, initialState);
  const {
    isPlaying,
    currentIntervalIndex,
    currentSet,
    phase,
    timeLeftInPhase,
    totalTimeRemaining,
    elapsedTime
  } = state;
  
  // Local state
  const [validationError, setValidationError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [safeIntervals, setSafeIntervals] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  
  // Refs
  const timerRef = useRef(null);
  
  // Memoized values and callbacks
  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const secs = Math.floor(seconds);
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  }, []);
  
  // Calculate total workout time in seconds
  const totalWorkoutTime = useMemo(() => {
    if (isLoading || !safeIntervals.length) return 0;
    return safeIntervals.reduce((total, interval) => {
      const active = (interval.activeTime?.minutes || 0) * 60 + (interval.activeTime?.seconds || 0);
      const rest = (interval.restTime?.minutes || 0) * 60 + (interval.restTime?.seconds || 0);
      const sets = interval.sets || 1;
      // Include rest time for all sets
      return total + (active * sets) + (rest * sets);
    }, 0);
  }, [safeIntervals, isLoading]);

  // Derived state
  const { currentInterval, activeTime, restTime, totalSets, isLastSet, isLastInterval } = useMemo(() => {
    if (isLoading || safeIntervals.length === 0) {
      return {
        totalTime: 0,
        currentInterval: {},
        activeTime: 0,
        restTime: 0,
        totalSets: 1,
        isLastSet: false,
        isLastInterval: false
      };
    }

    const total = safeIntervals.reduce((total, interval) => {
      const active = (interval.activeTime.minutes * 60) + (interval.activeTime.seconds || 0);
      const rest = (interval.restTime.minutes * 60) + (interval.restTime.seconds || 0);
      return total + (interval.sets * (active + rest));
    }, 0);

    const current = safeIntervals[Math.min(currentIntervalIndex, safeIntervals.length - 1)] || {};
    const active = (current.activeTime?.minutes || 0) * 60 + (current.activeTime?.seconds || 0);
    const rest = (current.restTime?.minutes || 0) * 60 + (current.restTime?.seconds || 0);
    const sets = current.sets || 1;
    
    return {
      totalTime: total,
      currentInterval: current,
      activeTime: active,
      restTime: rest,
      totalSets: sets,
      isLastSet: currentSet >= sets,
      isLastInterval: currentIntervalIndex >= safeIntervals.length - 1
    };
  }, [isLoading, safeIntervals, currentIntervalIndex, currentSet]);
  
  // Reset the workout to the beginning
  const resetWorkout = useCallback(() => {
    if (safeIntervals.length === 0) return;
    
    const firstInterval = safeIntervals[0];
    const initialTime = (firstInterval.activeTime.minutes * 60) + 
                      (firstInterval.activeTime.seconds || 0);
    
    dispatch({
      type: 'NEXT_PHASE',
      payload: {
        currentIntervalIndex: 0,
        currentSet: 1,
        phase: 'active',
        timeLeftInPhase: initialTime,
        totalTimeRemaining: totalWorkoutTime,
        elapsedTime: 0,
        isPlaying: false
      }
    });
    
    setIsComplete(false);
  }, [safeIntervals, totalWorkoutTime]);

  // Toggle play/pause/restart callback
  const togglePlayPause = useCallback(() => {
    if (isComplete) {
      resetWorkout();
      dispatch({ type: 'PLAY' });
      return;
    }
    
    if (isPlaying) {
      dispatch({ type: 'PAUSE' });
    } else {
      // If we're at the very start, initialize the first interval
      if (timeLeftInPhase === 0 && safeIntervals.length > 0) {
        const firstInterval = safeIntervals[0];
        const initialTime = (firstInterval.activeTime.minutes * 60) + 
                          (firstInterval.activeTime.seconds || 0);
        
        // Calculate total workout time
        const totalWorkoutTime = safeIntervals.reduce((total, interval) => {
          const active = (interval.activeTime.minutes * 60) + (interval.activeTime.seconds || 0);
          const rest = (interval.restTime.minutes * 60) + (interval.restTime.seconds || 0);
          return total + (interval.sets * (active + rest));
        }, 0);
        
        dispatch({
          type: 'NEXT_PHASE',
          payload: {
            currentIntervalIndex: 0,
            currentSet: 1,
            phase: 'active',
            timeLeftInPhase: initialTime,
            elapsedTime: 0
          }
        });
      }
      dispatch({ type: 'PLAY' });
    }
  }, [isPlaying, timeLeftInPhase, safeIntervals, isComplete, resetWorkout]);

  // Timer effect - handles the countdown logic
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying]);

  // Phase transition effect
  useEffect(() => {
    if (timeLeftInPhase > 0 || !isPlaying) return;

    const currentIntervalData = safeIntervals[currentIntervalIndex];
    if (!currentIntervalData) return;

    const isLastSet = currentSet >= (currentIntervalData.sets || 1);
    const isLastInterval = currentIntervalIndex >= safeIntervals.length - 1;

    if (phase === 'active') {
      // Always move to rest phase after active, even if it's the last set of the last interval
      const restTime = (currentIntervalData.restTime.minutes * 60) + 
                      (currentIntervalData.restTime.seconds || 0);
      
      // If there's no rest time, move directly to the next phase
      if (restTime <= 0) {
        if (isLastSet && isLastInterval) {
          // End of workout if this is the last set of the last interval
          dispatch({ type: 'PAUSE' });
          return;
        }
        
        // Move to next set or interval
        if (isLastSet) {
          const nextIntervalIndex = currentIntervalIndex + 1;
          if (nextIntervalIndex >= safeIntervals.length) {
            dispatch({ type: 'PAUSE' });
            return;
          }
          
          const nextInterval = safeIntervals[nextIntervalIndex];
          const nextPhaseTime = (nextInterval.activeTime.minutes * 60) + 
                              (nextInterval.activeTime.seconds || 0);
          
          dispatch({
            type: 'NEXT_PHASE',
            payload: {
              currentIntervalIndex: nextIntervalIndex,
              currentSet: 1,
              phase: 'active',
              timeLeftInPhase: nextPhaseTime
            }
          });
        } else {
          // Next set in current interval
          const nextActiveTime = (currentIntervalData.activeTime.minutes * 60) + 
                                (currentIntervalData.activeTime.seconds || 0);
          
          dispatch({
            type: 'NEXT_PHASE',
            payload: {
              currentSet: currentSet + 1,
              phase: 'active',
              timeLeftInPhase: nextActiveTime
            }
          });
        }
      } else {
        // Move to rest phase
        dispatch({
          type: 'NEXT_PHASE',
          payload: {
            phase: 'rest',
            timeLeftInPhase: restTime
          }
        });
      }
    } else {
      // Handle rest to next phase transition
      if (isLastSet && isLastInterval) {
        // End of workout after last rest phase
        dispatch({ type: 'PAUSE' });
        setIsComplete(true);
        return;
      }
      
      if (isLastSet) {
        // Move to next interval
        const nextIntervalIndex = currentIntervalIndex + 1;
        if (nextIntervalIndex >= safeIntervals.length) {
          dispatch({ type: 'PAUSE' });
          return;
        }
        
        const nextInterval = safeIntervals[nextIntervalIndex];
        const nextPhaseTime = (nextInterval.activeTime.minutes * 60) + 
                            (nextInterval.activeTime.seconds || 0);
        
        dispatch({
          type: 'NEXT_PHASE',
          payload: {
            currentIntervalIndex: nextIntervalIndex,
            currentSet: 1,
            phase: 'active',
            timeLeftInPhase: nextPhaseTime
          }
        });
      } else {
        // Next set in current interval
        const activeTime = (currentIntervalData.activeTime.minutes * 60) + 
                          (currentIntervalData.activeTime.seconds || 0);
        
        dispatch({
          type: 'NEXT_PHASE',
          payload: {
            currentSet: currentSet + 1,
            phase: 'active',
            timeLeftInPhase: activeTime
          }
        });
      }
    }
  }, [timeLeftInPhase, isPlaying, currentIntervalIndex, currentSet, phase, safeIntervals]);

  // Process intervals with defaults
  const processedIntervals = useMemo(() => {
    if (!workout?.intervals?.length) return [];
    
    return workout.intervals.map(interval => ({
      ...interval,
      activeTime: {
        minutes: interval.activeTime?.minutes || 0,
        seconds: interval.activeTime?.seconds || 0
      },
      restTime: {
        minutes: interval.restTime?.minutes || 0,
        seconds: interval.restTime?.seconds || 0
      },
      sets: Math.max(1, parseInt(interval.sets) || 1),
      type: interval.type || 'work'
    }));
  }, [workout]);

  // Set up validation and loading state
  useEffect(() => {
    if (!workout || !workout.intervals || !Array.isArray(workout.intervals) || workout.intervals.length === 0) {
      setValidationError('No valid workout data found. Please try again.');
      setSafeIntervals([]);
    } else {
      setValidationError(null);
      setSafeIntervals(processedIntervals);
    }
    setIsLoading(false);
  }, [workout, processedIntervals]);
  
  // Reset player state when workout changes
  useEffect(() => {
    if (safeIntervals.length === 0) return;
    
    // Calculate total workout time
    const totalWorkoutTime = safeIntervals.reduce((total, interval) => {
      const active = (interval.activeTime.minutes * 60) + (interval.activeTime.seconds || 0);
      const rest = (interval.restTime.minutes * 60) + (interval.restTime.seconds || 0);
      return total + (interval.sets * (active + rest));
    }, 0);
    
    // Reset state
    dispatch({
      type: 'NEXT_PHASE',
      payload: {
        currentIntervalIndex: 0,
        currentSet: 1,
        phase: 'active',
        timeLeftInPhase: 0,
        totalTimeRemaining: totalWorkoutTime,
        elapsedTime: 0,
        isPlaying: false
      }
    });
    
    // Clear any running timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [workout, safeIntervals]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);



  // Render loading state
  if (isLoading) {
    return <div>Loading workout...</div>;
  }

  // Render error state
  if (validationError) {
    return (
      <div className="error-message">
        <p>{validationError}</p>
        <button onClick={onBack} className="btn primary">Back to Workouts</button>
      </div>
    );
  }
  
  // Render empty state
  if (safeIntervals.length === 0) {
    return (
      <div className="no-workout">
        <p>No workout data available</p>
        <button onClick={onBack} className="btn primary">Back to Workouts</button>
      </div>
    );
  }

  // Calculate progress with safety checks
  const progress = totalWorkoutTime > 0 ? Math.min(100, (elapsedTime / totalWorkoutTime) * 100) : 0;
  
  // Calculate time in current phase with safety checks
  const phaseTotal = activeTime + restTime;

  return (
    <div className={`workout-player ${phase === 'active' && isPlaying ? 'workout-active' : ''}`}>
      <div className="player-header">
        <button onClick={onBack} className="btn back-btn">
          ← Back to Workouts
        </button>
        <h2>{workout.name}</h2>
      </div>
      
      {/* Main Timers */}
      <div className="timer-container">
        <div className="timer">
          <div className="timer-label">{phase === 'active' ? 'WORK' : 'REST'} - Interval {currentIntervalIndex + 1}, Set {currentSet}</div>
          <div className="time-display">
            {formatTime(timeLeftInPhase)}
          </div>
        </div>
        
        <div className="timer">
          <div className="timer-label">Total Remaining</div>
          <div className="time-display">
            {formatTime(totalTimeRemaining)}
          </div>
        </div>
      </div>

      {/* Current Interval Info */}
      <div className="interval-details">
        <div>Set {currentSet} of {totalSets}</div>
        <div>Active: {formatTime(activeTime)}</div>
        <div>Rest: {formatTime(restTime)}</div>
      </div>

      {/* Interval Visualization */}
      <IntervalVisualization 
        intervals={safeIntervals}
        currentIntervalIndex={currentIntervalIndex}
        currentPhase={phase}
        currentTime={elapsedTime}
        totalTime={totalWorkoutTime}
        isPlaying={isPlaying}
      />

      {/* Controls */}
      <div className="player-controls">
        <button 
          onClick={togglePlayPause} 
          className={`btn ${isPlaying ? 'pause' : 'play' } ${isComplete ? 'disabled' : ''}`}
          disabled={isComplete}
          title={isComplete ? 'Workout complete' : isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button 
          onClick={() => {
            resetWorkout();
            // Always start playing after reset
            setTimeout(() => dispatch({ type: 'PLAY' }), 10);
          }} 
          className={`btn restart ${elapsedTime === 0 ? 'disabled' : ''}`}
          disabled={elapsedTime === 0}
          title={elapsedTime === 0 ? 'Already at the start' : 'Restart and play workout from beginning'}
        >
          Restart
        </button>
      </div>
      
      {/* Workout Timeline */}
      <div className="workout-timeline">
        <h3>Workout Progress</h3>
        <div className="timeline">
          {safeIntervals.map((interval, idx) => (
            <div 
              key={idx} 
              className={`timeline-interval ${idx === currentIntervalIndex ? 'active' : ''} ${idx < currentIntervalIndex ? 'completed' : ''}`}
            >
              <div className="interval-type">{interval.type || 'Interval ' + (idx + 1)}</div>
              <div className="interval-sets">{interval.sets} set{interval.sets !== 1 ? 's' : ''}</div>
              <div className="interval-time">
                {formatTime(interval.activeTime.minutes * 60 + (interval.activeTime.seconds || 0))} / 
                {formatTime(interval.restTime.minutes * 60 + (interval.restTime.seconds || 0))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkoutPlayer;
