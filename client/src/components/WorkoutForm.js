import React, { useState, useEffect } from 'react';
import './WorkoutForm.css';

const WorkoutForm = ({ onSave, onCancel }) => {
  const [workoutName, setWorkoutName] = useState('');
  const [intervals, setIntervals] = useState([
    { 
      id: 1, 
      sets: 1, 
      activeTime: { minutes: 0, seconds: 30 },
      restTime: { minutes: 0, seconds: 15 },
      type: 'warmup',
      intensity: 60 // Default intensity for warmup
    }
  ]);
  const [nextId, setNextId] = useState(2);

  const handleAddInterval = () => {
    setIntervals([
      ...intervals,
      { 
        id: nextId, 
        sets: 1, 
        activeTime: { minutes: 0, seconds: 30 },
        restTime: { minutes: 0, seconds: 15 },
        type: 'work',
        intensity: 75 // Default intensity for work intervals
      }
    ]);
    setNextId(nextId + 1);
  };

  const handleRemoveInterval = (id) => {
    setIntervals(intervals.filter(interval => interval.id !== id));
  };

  const handleIntervalChange = (id, field, value) => {
    setIntervals(intervals.map(interval => 
      interval.id === id ? { ...interval, [field]: value } : interval
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: workoutName,
      intervals: intervals.map(({ id, ...rest }) => rest) // Remove id before saving
    });
  };

  const calculateTotalTime = () => {
    return intervals.reduce((total, interval) => {
      const activeTimeInSeconds = (interval.activeTime.minutes * 60) + interval.activeTime.seconds;
      const restTimeInSeconds = (interval.restTime.minutes * 60) + interval.restTime.seconds;
      return total + (interval.sets * (activeTimeInSeconds + restTimeInSeconds));
    }, 0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTimeChange = (id, field, timeField, value) => {
    const newValue = parseInt(value) || 0;
    
    // Validate seconds don't exceed 59
    if (timeField === 'seconds' && newValue > 59) return;
    
    setIntervals(intervals.map(interval => {
      if (interval.id === id) {
        return {
          ...interval,
          [field]: {
            ...interval[field],
            [timeField]: newValue
          }
        };
      }
      return interval;
    }));
  };
  
  const calculateIntervalTotal = (interval) => {
    const activeTimeInSeconds = (interval.activeTime.minutes * 60) + interval.activeTime.seconds;
    const restTimeInSeconds = (interval.restTime.minutes * 60) + interval.restTime.seconds;
    return interval.sets * (activeTimeInSeconds + restTimeInSeconds);
  };

  return (
    <div className="workout-form-container">
      <h2>Create New Workout</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Workout Name</label>
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="e.g., Morning Spin"
            required
          />
        </div>

        <div className="intervals-table">
          <div className="table-header">
            <div>Type</div>
            <div>Sets</div>
            <div>Active Time</div>
            <div>Rest Time</div>
            <div>Total</div>
            <div>Actions</div>
          </div>
          
          {intervals.map((interval, index) => (
            <div key={interval.id} className="table-row">
              <select
                value={interval.type}
                onChange={(e) => handleIntervalChange(interval.id, 'type', e.target.value)}
              >
                <option value="warmup">Warm-up</option>
                <option value="work">Work</option>
                <option value="cooldown">Cooldown</option>
              </select>
              
              <input
                type="number"
                min="1"
                value={interval.sets}
                onChange={(e) => handleIntervalChange(interval.id, 'sets', parseInt(e.target.value) || 1)}
                className="interval-sets"
              />
              
              <div className="time-input">
                <input
                  type="number"
                  min="0"
                  value={interval.activeTime.minutes}
                  onChange={(e) => handleTimeChange(interval.id, 'activeTime', 'minutes', e.target.value)}
                  placeholder="Min"
                />
                <span>:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={interval.activeTime.seconds}
                  onChange={(e) => handleTimeChange(interval.id, 'activeTime', 'seconds', e.target.value)}
                  placeholder="Sec"
                />
                <span>@</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={interval.intensity || 75}
                  onChange={(e) => handleIntervalChange(interval.id, 'intensity', parseInt(e.target.value) || 0)}
                  className="intensity-input"
                />
                <span>%</span>
              </div>
              
              <div className="time-input">
                <input
                  type="number"
                  min="0"
                  value={interval.restTime.minutes}
                  onChange={(e) => handleTimeChange(interval.id, 'restTime', 'minutes', e.target.value)}
                  placeholder="Min"
                />
                <span>:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={interval.restTime.seconds}
                  onChange={(e) => handleTimeChange(interval.id, 'restTime', 'seconds', e.target.value)}
                  placeholder="Sec"
                />
              </div>
              
              <div className="interval-total">
                {formatTime(calculateIntervalTotal(interval))}
              </div>
              
              <button
                type="button"
                className="btn danger remove-interval"
                onClick={() => handleRemoveInterval(interval.id)}
                disabled={intervals.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
          
          <div className="table-footer">
          <div className="total-time">
            <span>Total Workout Time:</span>
            <span>{formatTime(calculateTotalTime())}</span>
          </div>
          <button type="button" className="btn add-interval" onClick={handleAddInterval}>
            Add Interval
          </button>
          </div>
        </div>

        
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Save Workout
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkoutForm;
