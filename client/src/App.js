import React, { useState, useEffect, useCallback } from 'react';
import WorkoutForm from './components/WorkoutForm';
import WorkoutPlayer from './components/WorkoutPlayer';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');
  const [view, setView] = useState('dashboard'); // 'dashboard', 'form', or 'player'
  const [currentWorkout, setCurrentWorkout] = useState(null);
  
  // Initialize workouts from localStorage or empty array
  const [workouts, setWorkouts] = useState(() => {
    try {
      const savedWorkouts = localStorage.getItem('workouts');
      return savedWorkouts ? JSON.parse(savedWorkouts) : [];
    } catch (error) {
      console.error('Error loading workouts from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    // Test the API connection
    fetch('/api')
      .then(res => res.json())
      .then(data => setMessage('Connected to server'))
      .catch(err => setMessage('Error connecting to the server'));
  }, []);

  // Save workout to state and localStorage
  const saveWorkoutsToStorage = useCallback((workoutsToSave) => {
    try {
      localStorage.setItem('workouts', JSON.stringify(workoutsToSave));
    } catch (error) {
      console.error('Error saving workouts to localStorage:', error);
    }
  }, []);

  // Save a new workout
  const handleSaveWorkout = (workout) => {
    try {
      const workoutWithId = {
        ...workout,
        id: Date.now().toString(), // Add unique ID
        createdAt: new Date().toISOString()
      };
      
      const updatedWorkouts = [workoutWithId, ...workouts].slice(0, 10); // Keep last 10 workouts
      
      setWorkouts(updatedWorkouts);
      saveWorkoutsToStorage(updatedWorkouts);
      setCurrentWorkout(workoutWithId);
      setView('player');
    } catch (error) {
      console.error('Error saving workout:', error);
      // Could add user-visible error message here
    }
  };
  
  // Delete a workout
  const handleDeleteWorkout = (workoutId) => {
    try {
      const updatedWorkouts = workouts.filter(workout => workout.id !== workoutId);
      setWorkouts(updatedWorkouts);
      saveWorkoutsToStorage(updatedWorkouts);
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

  const handlePlayWorkout = (workout) => {
    if (workout && workout.intervals && workout.intervals.length > 0) {
      // Find the most recent version of the workout in case it was updated
      const currentWorkoutData = workouts.find(w => w.id === workout.id) || workout;
      setCurrentWorkout(currentWorkoutData);
      setView('player');
    } else {
      console.error('Invalid workout data:', workout);
      // Could add user-visible error message here
    }
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
  };

  const renderView = () => {
    switch (view) {
      case 'form':
        return (
          <WorkoutForm 
            onSave={handleSaveWorkout} 
            onCancel={() => setView('dashboard')} 
          />
        );
      case 'player':
        if (!currentWorkout) {
          return (
            <div className="error-message">
              <p>No workout selected. Please try again.</p>
              <button onClick={handleBackToDashboard} className="btn primary">
                Back to Dashboard
              </button>
            </div>
          );
        }
        return (
          <WorkoutPlayer 
            workout={currentWorkout} 
            onBack={handleBackToDashboard} 
          />
        );
      case 'dashboard':
      default:
        return (
          <div className="dashboard">
            <div className="workout-controls">
              <h2>Start a New Workout</h2>
              <button 
                className="btn primary" 
                onClick={() => setView('form')}
              >
                Create Workout
              </button>
              <button className="btn secondary">Use Template</button>
            </div>
            
            <div className="recent-workouts">
              <h2>Recent Workouts</h2>
              {workouts.length > 0 ? (
                <ul className="workouts-list">
                  {workouts.map((workout, index) => (
                    <li 
                      key={index} 
                      className="workout-item"
                      onClick={() => handlePlayWorkout(workout)}
                    >
                      <h3>{workout.name}</h3>
                      <div className="workout-details">
                        <span>{workout.intervals.length} interval{workout.intervals.length !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{formatWorkoutTime(workout.intervals)}</span>
                        <button 
                          className="btn-text delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this workout?')) {
                              handleDeleteWorkout(workout.id);
                            }
                          }}
                          title="Delete workout"
                        >
                          🗑️
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No recent workouts found. Create one to get started!</p>
              )}
            </div>
          </div>
        );
    }
  };

  const formatWorkoutTime = (intervals) => {
    const totalSeconds = intervals.reduce((total, interval) => {
      const activeTime = (interval.activeTime.minutes * 60) + interval.activeTime.seconds;
      const restTime = (interval.restTime.minutes * 60) + interval.restTime.seconds;
      return total + (interval.sets * (activeTime + restTime));
    }, 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Interval Training App</h1>
        <p>Plan and execute your interval workouts</p>
      </header>
      <main className="app-main">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
