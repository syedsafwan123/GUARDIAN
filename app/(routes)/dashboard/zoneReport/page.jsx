"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from "@clerk/clerk-react";
import Link from 'next/link';

export default function EnhancedSafetyMap() {
  const { user } = useUser();
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportedZones, setReportedZones] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('unsafe');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  
  // Get user info
  const userName = user?.fullName || "Anonymous User";
  
  // Zone categories with colors and icons
  const zoneCategories = {
    unsafe: { 
      name: "Unsafe Area", 
      color: "#FF0000",
      icon: "⚠️",
      description: "Areas that feel threatening or dangerous"
    },
    suspicious: { 
      name: "Suspicious Activity", 
      color: "#FF9900",
      icon: "👁️",
      description: "Unusual behavior that causes concern"
    },
    hazard: { 
      name: "Physical Hazard", 
      color: "#FFCC00",
      icon: "⛔",
      description: "Dangerous road conditions, obstacles, etc."
    },
    help: { 
      name: "Help Needed", 
      color: "#0066FF",
      icon: "🆘",
      description: "Someone in need of assistance"
    }
  };
  
  // Get user's location on load
  useEffect(() => {
    getUserLocation();
  }, []);
  
  // Get user's location
  const getUserLocation = () => {
    setLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setLocation(newLocation);
          setLoading(false);
          
          // Show feedback for successful location
          const feedback = document.getElementById('location-feedback');
          if (feedback) {
            feedback.innerText = "Location updated!";
            feedback.style.opacity = "1";
            setTimeout(() => {
              feedback.style.opacity = "0";
            }, 2000);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError(error.message);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser");
      setLoading(false);
    }
  };
  
  // Load saved reports from localStorage
  useEffect(() => {
    try {
      const savedReports = localStorage.getItem('safetyReports');
      if (savedReports) {
        setReportedZones(JSON.parse(savedReports));
      }
    } catch (error) {
      console.error("Error loading saved reports:", error);
    }
  }, []);
  
  // Save reports to localStorage whenever they change
  useEffect(() => {
    if (reportedZones.length > 0) {
      localStorage.setItem('safetyReports', JSON.stringify(reportedZones));
    }
  }, [reportedZones]);
  
  // Submit report
  const submitReport = async (e) => {
    e.preventDefault();
    
    if (!location) return;
    
    try {
      setSubmitting(true);
      
      // Create new report
      const newReport = {
        id: Date.now().toString(),
        userName: userName,
        category: currentCategory,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString()
      };
      
      // Add to local state
      setReportedZones(prev => [newReport, ...prev]);
      
      // Show success message
      setReportSuccess(true);
      setSubmitting(false);
      
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportForm(false);
      }, 3000);
      
    } catch (error) {
      console.error("Error submitting report:", error);
      setSubmitting(false);
    }
  };
  
  // Handle map load
  const handleMapLoad = () => {
    setMapReady(true);
  };
  
  // Function to render the map and location info
  const renderMap = () => {
    if (loading && !location) {
      return (
        <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg shadow-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-3"></div>
            <p className="text-gray-600 font-medium">Finding your location...</p>
            <p className="text-gray-500 text-sm mt-1">Please allow location access when prompted</p>
          </div>
        </div>
      );
    }

    if (locationError) {
      return (
        <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg shadow-md">
          <div className="text-red-500 text-center p-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-bold text-lg mb-2">Unable to get your location</p>
            <p className="text-sm mb-4">{locationError}</p>
            <button 
              onClick={getUserLocation}
              className="bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition"
            >
              Try Again
            </button>
            <p className="mt-4 text-xs text-gray-500">
              Make sure location services are enabled in your browser and device settings
            </p>
          </div>
        </div>
      );
    }

    // Create map URL with OpenStreetMap
    const mapUrl = location ? 
      `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.01}%2C${location.latitude - 0.01}%2C${location.longitude + 0.01}%2C${location.latitude + 0.01}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}` : '';
    
    // URL to open in full map view
    const osmUrl = location ?
      `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}` : '';

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden relative">
        {/* Map embed using OpenStreetMap */}
        <div className="w-full h-96 relative">
          {location ? (
            <iframe
              title="Your location map"
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              src={mapUrl}
              onLoad={handleMapLoad}
            ></iframe>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <p className="text-gray-600">Map loading...</p>
            </div>
          )}
          
          {/* GPS Button - Fixed position on map */}
          <button
            onClick={getUserLocation}
            className="absolute bottom-4 right-4 bg-white shadow-lg rounded-full p-3 z-10 hover:bg-gray-100 transition"
            title="Find my location"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Location updated feedback */}
          <div 
            id="location-feedback"
            className="absolute bottom-16 right-4 bg-blue-600 text-white py-2 px-4 rounded-lg shadow-lg opacity-0 transition-opacity duration-500 text-sm font-medium"
          >
            Location updated!
          </div>
          
          {/* Safety Reports Count */}
          {reportedZones.length > 0 && (
            <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-md text-sm font-medium">
              {reportedZones.length} Safety Alert{reportedZones.length !== 1 ? 's' : ''}
            </div>
          )}
          
          {/* Location status indicator */}
          <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-lg shadow-md flex items-center">
            <span className={`h-3 w-3 rounded-full mr-2 ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
            <span className="text-sm font-medium">
              {loading ? 'Updating...' : 'Location Active'}
            </span>
          </div>
        </div>
        
        {/* Location details card */}
        <div className="p-5 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Current Location</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg">
              Updated: {location?.timestamp || new Date().toLocaleTimeString()}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Latitude</p>
              <p className="font-medium">{location?.latitude.toFixed(6)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Longitude</p>
              <p className="font-medium">{location?.longitude.toFixed(6)}</p>
            </div>
          </div>
          
          <div className="flex justify-between mb-2 items-center">
            <p className="text-sm text-gray-700">GPS Accuracy</p>
            <p className="text-sm font-medium text-gray-700">±{Math.round(location?.accuracy || 0)}m</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-5">
            <div 
              className={`h-2.5 rounded-full ${location?.accuracy < 20 ? 'bg-green-500' : location?.accuracy < 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.max(5, Math.min(100, 100 - (location?.accuracy / 100 * 100)))}%` }}
            ></div>
          </div>
          
          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4">
            <a 
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg flex items-center justify-center shadow-sm transition font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Full Map
            </a>
            <button 
              onClick={() => setShowReportForm(true)}
              className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg flex items-center justify-center shadow-sm transition font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Report Issue
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render reporting form
  const renderReportForm = () => {
    if (!showReportForm) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
          <h3 className="font-bold text-xl mb-5 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Report Safety Concern
          </h3>
          
          {reportSuccess ? (
            <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl mb-4 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-bold text-lg">Report Submitted Successfully</p>
              <p className="text-sm mt-2">Thank you for helping keep the community safe.</p>
              <button
                onClick={() => {
                  setReportSuccess(false);
                  setShowReportForm(false);
                }}
                className="mt-6 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium shadow-sm transition"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={submitReport}>
              <div className="mb-6">
                <p className="mb-2 font-medium">
                  You're reporting a safety concern at:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="mb-1">
                    <span className="font-medium">Latitude:</span> {location?.latitude.toFixed(6)}
                  </div>
                  <div>
                    <span className="font-medium">Longitude:</span> {location?.longitude.toFixed(6)}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Accuracy: ±{Math.round(location?.accuracy || 0)}m
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block font-medium mb-3">
                  What type of safety concern is this?
                </label>
                <div className="space-y-3">
                  {Object.entries(zoneCategories).map(([key, category]) => (
                    <label 
                      key={key} 
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                        currentCategory === key 
                          ? 'bg-gray-50 border-gray-400 shadow-sm' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={key}
                        checked={currentCategory === key}
                        onChange={() => setCurrentCategory(key)}
                        className="mr-3 h-5 w-5"
                      />
                      <div className="flex items-center">
                        <span className="text-xl mr-3">{category.icon}</span>
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-xs text-gray-500">{category.description}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                  onClick={() => setShowReportForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };
  
  // Render zone list
  const renderReportedZones = () => {
    if (reportedZones.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No safety concerns have been reported in your area</p>
          <button 
            onClick={() => setShowReportForm(true)}
            className="mt-4 text-red-600 font-medium hover:underline flex items-center justify-center mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Report your first safety concern
          </button>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          {reportedZones.map((zone) => {
            const category = zoneCategories[zone.category] || zoneCategories.unsafe;
            const date = new Date(zone.timestamp);
            return (
              <div key={zone.id} className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition">
                <div className="flex items-center">
                  <span className="text-xl mr-3">{category.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{category.name}</div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-700">
                        Reported by: {zone.userName}
                      </div>
                      <span className="text-xs text-gray-500">
                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Component's main rendering
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-2xl md:text-3xl">
          Safety Map
        </h2>
        <Link href="/dashboard" className="text-blue-600 hover:underline flex items-center text-sm font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
      
      {/* Map Section */}
      <div className="mb-8">
        {renderMap()}
      </div>
      
      {/* Safety Legend */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-xl">Safety Alert Types</h3>
          <button 
            onClick={() => setShowReportForm(true)}
            className="flex items-center text-sm font-medium bg-red-100 text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-200 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Report
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(zoneCategories).map(([key, category]) => (
            <div key={key} className="bg-white rounded-lg shadow-sm p-3 border border-gray-100 flex items-center">
              <span className="text-xl mr-3">{category.icon}</span>
              <div>
                <div className="font-medium">{category.name}</div>
                <div className="text-xs text-gray-500">{category.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Reported Zones */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-xl">Recent Safety Reports</h3>
          {reportedZones.length > 0 && (
            <span className="text-sm font-medium bg-red-100 text-red-800 px-3 py-1 rounded-lg">
              {reportedZones.length} Total
            </span>
          )}
        </div>
        
        {renderReportedZones()}
      </div>
      
      {/* Report modal */}
      {renderReportForm()}
      
      {/* Fixed action button for mobile */}
      <div className="fixed right-6 bottom-6 z-20">
        <button
          onClick={() => setShowReportForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition"
          aria-label="Report a safety concern"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </button>
      </div>
    </div>
  );
}