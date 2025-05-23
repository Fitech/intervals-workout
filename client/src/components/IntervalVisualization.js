import React from 'react';
import './IntervalVisualization.css';

const IntervalVisualization = ({ intervals, currentIntervalIndex, currentPhase, currentTime, totalTime, isPlaying }) => {
  if (!intervals || intervals.length === 0) return null;

  // Calculate total workout time including all sets and rest periods
  const calculateTotalWorkoutTime = () => {
    return intervals.reduce((total, interval) => {
      const activeTime = (interval.activeTime?.minutes || 0) * 60 + (interval.activeTime?.seconds || 0);
      const restTime = (interval.restTime?.minutes || 0) * 60 + (interval.restTime?.seconds || 0);
      const sets = interval.sets || 1;
      return total + (activeTime * sets) + (restTime * Math.max(0, sets - 1));
    }, 0);
  };

  const totalWorkoutTime = totalTime || calculateTotalWorkoutTime();
  
  // Generate all segments (active and rest) for all intervals
  const generateSegments = () => {
    let segments = [];
    let currentTimeInWorkout = 0;
    
    intervals.forEach((interval, intervalIndex) => {
      const activeTime = (interval.activeTime?.minutes || 0) * 60 + (interval.activeTime?.seconds || 0);
      const restTime = (interval.restTime?.minutes || 0) * 60 + (interval.restTime?.seconds || 0);
      const sets = interval.sets || 1;
      
      for (let setIndex = 0; setIndex < sets; setIndex++) {
        // Add active segment for this set
        if (activeTime > 0) {
          const segmentStart = currentTimeInWorkout;
          const segmentEnd = segmentStart + activeTime;
          const segmentDuration = activeTime;
          const widthPercentage = (segmentDuration / totalWorkoutTime) * 100;
          
          const isCurrent = currentTime >= segmentStart && currentTime < segmentEnd && 
                          intervalIndex === currentIntervalIndex &&
                          currentPhase === 'active';
          
          segments.push({
            type: 'active',
            width: widthPercentage,
            intensity: interval.intensity || 75,
            intervalIndex,
            setIndex,
            startTime: segmentStart,
            endTime: segmentEnd,
            isCurrent
          });
          currentTimeInWorkout = segmentEnd;
        }
        
        // Add rest segment after each set (always include rest segments, even after the last set)
        if (restTime > 0) {
          const segmentStart = currentTimeInWorkout;
          const segmentEnd = segmentStart + restTime;
          const segmentDuration = restTime;
          const widthPercentage = (segmentDuration / totalWorkoutTime) * 100;
          
          const isCurrent = currentTime >= segmentStart && currentTime < segmentEnd && 
                          intervalIndex === currentIntervalIndex &&
                          currentPhase === 'rest';
          
          segments.push({
            type: 'rest',
            width: widthPercentage,
            intensity: 10,
            intervalIndex,
            setIndex,
            startTime: segmentStart,
            endTime: segmentEnd,
            isCurrent
          });
          currentTimeInWorkout = segmentEnd;
        }
      }
    });
    
    return segments;
  };

  const segments = generateSegments();
  const currentPosition = currentTime / totalWorkoutTime;
  const currentInterval = intervals[Math.min(currentIntervalIndex, intervals.length - 1)];

  // Calculate the left position
  const calculatePosition = (time) => {
    const totalWidth = 100; // 100% width
    const position = (time / totalWorkoutTime) * totalWidth;
    return position;
  };

  return (
    <div className="interval-visualization">
      <div className="current-activity">
        <span className="activity-type">{currentPhase === 'rest' ? 'Rest' : currentInterval?.type || 'Work'}</span>
        <span className="activity-intensity">{` @ ${currentPhase === 'rest' ? 10 : currentInterval?.intensity || 75}% intensity`}</span>
      </div>
      <div className="intervals-container" style={{ display: 'flex' }}>
        {segments.map((segment, index) => {
          const widthPercentage = ((segment.endTime - segment.startTime) / totalWorkoutTime) * 100;
          
          return (
            <div 
              key={index}
              className={`interval-bar ${segment.type} ${segment.isCurrent && isPlaying ? 'current' : ''}`}
              style={{
                flex: `${widthPercentage} 0 auto`,
                height: `${segment.intensity}%`,
                backgroundColor: (segment.isCurrent && isPlaying && segment.type === 'active') 
                  ? '#4caf50' 
                  : segment.type === 'rest' 
                    ? '#e0e0e0' 
                    : '#9e9e9e',
                boxShadow: (segment.type === 'active' && segment.isCurrent && isPlaying) 
                  ? 'rgb(50 217 57 / 50%) 0px 0px 12px 8px' 
                  : 'none'
              }}
              title={`${segment.type === 'rest' ? 'Rest' : segment.type} - ${segment.intensity}% intensity`}
            />
          );
        })}
        <div 
          className={`current-position ${currentPhase === 'rest' ? 'rest' : 'active'}`} 
          style={{ left: `${calculatePosition(currentTime)}%` }}
        />
      </div>
    </div>
  );
};

export default IntervalVisualization;
