"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  collection, 
  addDoc, 
  doc,
  updateDoc,
  deleteDoc,
  query, 
  getDocs
} from 'firebase/firestore';

// Import Firebase from your centralized utility file
import { db, app, realDb, auth } from '../../../lib/firebase';

function Dashboard() {
  const { user, isLoaded: userLoaded } = useUser(); // Using the user context with loading state
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);

  // Emergency contacts state
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    notes: ''
  });

  // Twilio SMS state
  const [smsSending, setSmsSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState(null); // 'success', 'error', or null

  // Check if Firebase is initialized
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  
  useEffect(() => {
    if (app && db) {
      console.log("Firebase initialized successfully");
      setFirebaseInitialized(true);
    } else {
      console.error("Firebase initialization failed");
    }
  }, []);

  // Get user data when user is available
  useEffect(() => {
    if (userLoaded && user && firebaseInitialized) {
      console.log("User is loaded:", user.id);
      getBudgetList();
      getIncomeData();
      loadEmergencyContacts(); // Load emergency contacts when user is available
    }
  }, [userLoaded, user, firebaseInitialized]);

  // Function to get budget list (stub for now)
  const getBudgetList = () => {
    // Implementation will be added later
    console.log("Getting budget list for user:", user?.fullName);
  };

  // Function to get income data (stub for now)
  const getIncomeData = () => {
    // Implementation will be added later
    console.log("Getting income data for user:", user?.fullName);
  };

  // Get and watch user location
  useEffect(() => {
    // Start continuous location tracking when component mounts
    if (navigator.geolocation) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setLocation(newLocation);
          setLocationHistory(prev => [...prev, newLocation]);
          setLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError(error.message);
          setLoading(false);
        },
        { enableHighAccuracy: true }
      );
      
      // Set up continuous location watching
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setLocation(newLocation);
          // Only add to history if moved more than 10 meters
          if (locationHistory.length === 0 || 
              calculateDistance(
                locationHistory[locationHistory.length-1].latitude,
                locationHistory[locationHistory.length-1].longitude,
                newLocation.latitude,
                newLocation.longitude
              ) > 10) {
            setLocationHistory(prev => [...prev.slice(-9), newLocation]);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error watching location:", error);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      
      setWatchId(id);
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      setLoading(false);
    }
    
    // Clean up the watch when component unmounts
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Calculate distance between two points in meters (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const [shakeThreshold, setShakeThreshold] = useState(15); // Adjustable sensitivity
  const [shakeCooldown, setShakeCooldown] = useState(false);
  const [shakeCounter, setShakeCounter] = useState(0);
  const [lastShakeTime, setLastShakeTime] = useState(0);
  const [showShakeAlert, setShowShakeAlert] = useState(false);

  // Handle device shake detection
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    
    // Function to handle device motion events
    const handleDeviceMotion = (event) => {
      const acceleration = event.accelerationIncludingGravity;
      
      if (!acceleration) return;
      
      const currentTime = new Date().getTime();
      
      // Only process if we're not in cooldown and enough time has passed
      if (!shakeCooldown && (currentTime - lastShakeTime) > 300) {
        const x = acceleration.x;
        const y = acceleration.y;
        const z = acceleration.z;
        
        if (!lastX && !lastY && !lastZ) {
          lastX = x;
          lastY = y;
          lastZ = z;
          return;
        }
        
        const deltaX = Math.abs(lastX - x);
        const deltaY = Math.abs(lastY - y);
        const deltaZ = Math.abs(lastZ - z);
        
        // If the shake is strong enough
        if ((deltaX > shakeThreshold && deltaY > shakeThreshold) || 
            (deltaX > shakeThreshold && deltaZ > shakeThreshold) || 
            (deltaY > shakeThreshold && deltaZ > shakeThreshold)) {
          
          setLastShakeTime(currentTime);
          setShakeCounter(prevCount => {
            const newCount = prevCount + 1;
            
            // If user has shaken the device 3 times in quick succession
            if (newCount >= 3) {
              // Show confirmation alert
              setShowShakeAlert(true);
              
              // Reset counter
              return 0;
            }
            
            // Reset counter after 2 seconds if they don't complete the pattern
            setTimeout(() => {
              setShakeCounter(0);
            }, 2000);
            
            return newCount;
          });
        }
        
        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };
    
    // Set up shake detection if device motion is available
    if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
    };
  }, [shakeCooldown, shakeThreshold, lastShakeTime]);
  
  // Function to send emergency SMS to all contacts
  const sendEmergencySMS = async () => {
    // Don't send if no location or no contacts
    if (!location || emergencyContacts.length === 0) {
      console.log("Cannot send SMS: No location data or no emergency contacts");
      return false;
    }
    
    setSmsSending(true);
    setSmsStatus(null);
    
    try {
      // Create location URL for SMS
      const locationUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      
      // Prepare contact phone numbers array
      const contactNumbers = emergencyContacts.map(contact => contact.phone);
      
      // Create emergency message
      const emergencyMessage = `EMERGENCY ALERT from ${user?.fullName || "a user"}: I need immediate help! My current location: ${locationUrl} (Accuracy: ±${Math.round(location.accuracy)}m)`;
      
      console.log("Sending emergency SMS to contacts:", contactNumbers);
      
      // Make API call to your server endpoint
      const response = await fetch('/api/send-emergency-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactNumbers,
          message: emergencyMessage,
          userName: user?.fullName,
          userId: user?.id
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log("✅ Emergency SMS sent successfully");
        setSmsStatus('success');
        return true;
      } else {
        console.error("Failed to send SMS:", result.error);
        setSmsStatus('error');
        return false;
      }
    } catch (error) {
      console.error("Error sending emergency SMS:", error);
      setSmsStatus('error');
      return false;
    } finally {
      setSmsSending(false);
    }
  };
  
  // Handle SOS button click or shake activation
  const handleSOSClick = async () => {
    // First attempt to send SMS to all emergency contacts
    if (emergencyContacts.length > 0) {
      try {
        // Send SMS in the background
        sendEmergencySMS().catch(error => {
          console.error("Failed to send emergency SMS:", error);
        });
      } catch (error) {
        console.error("Error initiating SMS send:", error);
      }
    }
    
    // Continue with emergency call
    window.location.href = "tel:100";
    
    // Set a cooldown to prevent multiple triggers
    setShakeCooldown(true);
    setTimeout(() => {
      setShakeCooldown(false);
    }, 5000); // 5 seconds cooldown
  };
  
  // Confirm SOS from shake
  const confirmShakeSOSCall = () => {
    setShowShakeAlert(false);
    handleSOSClick();
  };
  
  // Cancel SOS from shake
  const cancelShakeSOSCall = () => {
    setShowShakeAlert(false);
  };

  // =============================================
  // EMERGENCY CONTACTS FUNCTIONS
  // =============================================

  // Function to load emergency contacts from Firestore
  const loadEmergencyContacts = async () => {
    if (!firebaseInitialized) {
      console.error("Firebase not initialized");
      setContactError("Database connection error. Please try again later.");
      return;
    }
    
    if (!user?.id) {
      console.error("User ID not available");
      return;
    }
    
    setContactLoading(true);
    setContactError(null);
    
    try {
      console.log("Loading contacts for user:", user.id);
      
      // Create a reference to the user's contacts collection
      const contactsRef = collection(db, "users", user.id, "emergencyContacts");
      const contactsQuery = query(contactsRef);
      
      // Get the contacts
      const contactsSnapshot = await getDocs(contactsQuery);
      
      // Map the contacts to an array
      const contactsList = contactsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("✅ Loaded emergency contacts:", contactsList.length);
      setEmergencyContacts(contactsList);
    } catch (error) {
      console.error("Error loading emergency contacts:", error);
      setContactError("Failed to load contacts: " + error.message);
    } finally {
      setContactLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: '',
      relationship: '',
      phone: '',
      email: '',
      notes: ''
    });
    setEditingContact(null);
  };

  // Toggle add contact form
  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    resetForm();
  };

  // Set up form for editing
  const handleEditContact = (contact) => {
    setFormData({
      name: contact.name || '',
      relationship: contact.relationship || '',
      phone: contact.phone || '',
      email: contact.email || '',
      notes: contact.notes || ''
    });
    setEditingContact(contact.id);
    setShowAddForm(true);
  };

  // Add new contact
  const handleAddContact = async (e) => {
    e.preventDefault();
    
    if (!firebaseInitialized) {
      setContactError("Database connection error. Please try again later.");
      return;
    }
    
    if (!user?.id) {
      setContactError("You must be logged in to add contacts");
      return;
    }
    
    if (!formData.name || !formData.phone) {
      setContactError("Name and phone number are required");
      return;
    }
    
    setContactLoading(true);
    setContactError(null);
    
    try {
      console.log("Adding contact for user:", user.id);
      
      // Create a reference to the user's contacts collection
      const contactsRef = collection(db, "users", user.id, "emergencyContacts");
      
      // Add the new contact
      const newContact = {
        name: formData.name,
        relationship: formData.relationship || "",
        phone: formData.phone,
        email: formData.email || "",
        notes: formData.notes || "",
        createdAt: new Date().toISOString()
      };
      
      console.log("Adding contact:", newContact);
      
      // Add the document to Firestore
      const docRef = await addDoc(contactsRef, newContact);
      console.log("Contact added with ID:", docRef.id);
      
      // Reload contacts
      await loadEmergencyContacts();
      
      // Reset form and hide it
      resetForm();
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding contact:", error);
      setContactError("Failed to add contact: " + error.message);
    } finally {
      setContactLoading(false);
    }
  };

  // Update existing contact
  const handleUpdateContact = async (e) => {
    e.preventDefault();
    
    if (!firebaseInitialized) {
      setContactError("Database connection error. Please try again later.");
      return;
    }
    
    if (!user?.id || !editingContact) {
      setContactError("Unable to update contact");
      return;
    }
    
    if (!formData.name || !formData.phone) {
      setContactError("Name and phone number are required");
      return;
    }
    
    setContactLoading(true);
    setContactError(null);
    
    try {
      console.log("Updating contact:", editingContact);
      
      // Get a reference to the contact document
      const contactRef = doc(db, "users", user.id, "emergencyContacts", editingContact);
      
      // Update fields
      const updatedData = {
        name: formData.name,
        relationship: formData.relationship || "",
        phone: formData.phone,
        email: formData.email || "",
        notes: formData.notes || "",
        updatedAt: new Date().toISOString()
      };
      
      // Update the document
      await updateDoc(contactRef, updatedData);
      console.log("Contact updated successfully");
      
      // Reload contacts
      await loadEmergencyContacts();
      
      // Reset form and hide it
      resetForm();
      setShowAddForm(false);
    } catch (error) {
      console.error("Error updating contact:", error);
      setContactError("Failed to update contact: " + error.message);
    } finally {
      setContactLoading(false);
    }
  };

  // Delete contact
  const handleDeleteContact = async (contactId) => {
    if (!window.confirm("Are you sure you want to delete this emergency contact?")) {
      return;
    }
    
    if (!firebaseInitialized) {
      setContactError("Database connection error. Please try again later.");
      return;
    }
    
    if (!user?.id || !contactId) {
      setContactError("Unable to delete contact");
      return;
    }
    
    setContactLoading(true);
    setContactError(null);
    
    try {
      console.log("Deleting contact:", contactId);
      
      // Get a reference to the contact document
      const contactRef = doc(db, "users", user.id, "emergencyContacts", contactId);
      
      // Delete the document
      await deleteDoc(contactRef);
      console.log("Contact deleted successfully");
      
      // Reload contacts
      await loadEmergencyContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
      setContactError("Failed to delete contact: " + error.message);
    } finally {
      setContactLoading(false);
    }
  };

  // Format phone number for display (optional)
  const formatPhone = (phone) => {
    // Basic formatting - can be expanded as needed
    if (!phone) return '';
    
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    return phone;
  };

  // Render the Emergency Contacts Modal
  const renderEmergencyContactsModal = () => {
    if (!showContactsModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h2 className="font-bold text-xl">Emergency Contacts</h2>
            <button 
              onClick={() => setShowContactsModal(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4">
            {/* Firebase connection status */}
            {!firebaseInitialized && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                Connecting to database... Please wait.
              </div>
            )}
            
            {/* Error message */}
            {contactError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {contactError}
              </div>
            )}
            
            {/* Loading state */}
            {contactLoading && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              </div>
            )}
            
            {/* Contact list */}
            {!contactLoading && emergencyContacts.length === 0 && !showAddForm && (
              <div className="text-center py-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-600 mb-4">No emergency contacts added yet</p>
                <button 
                  onClick={toggleAddForm}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
                >
                  Add Your First Contact
                </button>
              </div>
            )}
            
            {!contactLoading && emergencyContacts.length > 0 && !showAddForm && (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  These contacts will be available for quick sharing during emergencies
                </p>
                
                <div className="space-y-3 mb-4">
                  {emergencyContacts.map(contact => (
                    <div key={contact.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{contact.name}</h3>
                          {contact.relationship && (
                            <p className="text-sm text-gray-500">{contact.relationship}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditContact(contact)}
                            className="text-blue-600 hover:text-blue-800"
                            aria-label="Edit contact"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteContact(contact.id)}
                            className="text-red-600 hover:text-red-800"
                            aria-label="Delete contact"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        {contact.phone && (
                          <a 
                            href={`tel:${contact.phone}`}
                            className="flex items-center text-blue-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {formatPhone(contact.phone)}
                          </a>
                        )}
                        
                        {contact.email && (
                          <a 
                            href={`mailto:${contact.email}`}
                            className="flex items-center text-blue-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {contact.email}
                          </a>
                        )}
                      </div>
                      
                      {contact.notes && (
                        <p className="mt-2 text-sm text-gray-600 border-t border-gray-100 pt-2">
                          {contact.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={toggleAddForm}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded w-full"
                >
                  Add New Contact
                </button>
              </div>
            )}
            
            {/* Add/Edit Form */}
            {showAddForm && (
              <form onSubmit={editingContact ? handleUpdateContact : handleAddContact}>
                <h3 className="font-semibold mb-3">
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </h3>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship
                    </label>
                    <input
                      type="text"
                      id="relationship"
                      name="relationship"
                      value={formData.relationship}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Family, Friend, etc."
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Phone number"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Email address"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="2"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Additional information"
                    ></textarea>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={toggleAddForm}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
                    disabled={contactLoading}
                  >
                    {contactLoading ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
                  </button>
                </div>
              </form>
            )}
          </div>
          
          {/* Footer with info text */}
          <div className="border-t border-gray-200 p-4">
            <p className="text-xs text-gray-500">
              Emergency contacts can be quickly reached during emergency situations.
              They will receive your location when you use the emergency features.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Function to render the location information and map
  const renderLocationInfo = () => {
    if (loading) {
      return (
        <div className="h-80 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Locating you...</p>
          </div>
        </div>
      );
    }

    if (locationError) {
      return (
        <div className="h-80 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-red-500 text-center p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-bold mb-2">Unable to get your location</p>
            <p className="text-sm">{locationError}</p>
            <p className="mt-4 text-sm">
              Please enable location access in your browser settings. This is essential for emergency services to find you.
            </p>
          </div>
        </div>
      );
    }

    // Create map URL with OpenStreetMap
    const mapUrl = location ? 
      `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.01}%2C${location.latitude - 0.01}%2C${location.longitude + 0.01}%2C${location.latitude + 0.01}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}` : '';
    
    // Alternative URL for OSM - this one zooms in more and shows just the marker
    const osmUrl = location ?
      `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}` : '';

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Map embed - showing the roads using OpenStreetMap */}
        <div className="w-full h-64 relative">
          {location ? (
            <iframe
              title="Your location map"
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              src={mapUrl}
            ></iframe>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <p className="text-gray-600">Map loading...</p>
            </div>
          )}
          
          {/* Location status overlay */}
          <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full shadow-md text-xs flex items-center">
            <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Live tracking
          </div>
        </div>
        
        {/* Coordinates */}
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Latitude</p>
              <p className="font-medium">{location?.latitude.toFixed(6)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Longitude</p>
              <p className="font-medium">{location?.longitude.toFixed(6)}</p>
            </div>
          </div>
          
          <div className="flex justify-between mb-1 items-center">
            <p className="text-xs text-gray-500">GPS Accuracy</p>
            <p className="text-xs font-medium text-gray-700">±{Math.round(location?.accuracy || 0)}m</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className={`h-2 rounded-full ${location?.accuracy < 20 ? 'bg-green-500' : location?.accuracy < 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.max(5, Math.min(100, 100 - (location?.accuracy / 100 * 100)))}%` }}
            ></div>
          </div>
          
          {/* Link to open in full OSM */}
          <div className="mt-4">
            <a 
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 flex items-center justify-center w-full py-2 border border-blue-600 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Full Map
            </a>
          </div>
          
          <div className="mt-4 text-xs text-center text-gray-600">
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
        
        {/* Location history - last few points */}
        {locationHistory.length > 1 && (
          <div className="p-4 border-t border-gray-200">
            <h4 className="text-sm font-medium mb-2">Location History</h4>
            <div className="max-h-32 overflow-y-auto">
              {locationHistory.slice().reverse().map((loc, index) => (
                <div key={index} className="flex items-center text-xs mb-1 pb-1 border-b border-gray-100">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-gray-500 w-16">{loc.timestamp}</span>
                  <span className="truncate">
                    {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-10">      
      <div className="flex items-center justify-between mb-6">
        {/* Updated heading with user's name */}
        <h2 className="font-bold text-2xl md:text-3xl">
          Hi, {user?.fullName} 👋
        </h2>
        <div className="flex items-center space-x-2">
          {/* Add button to manage emergency contacts */}
          <button
            onClick={() => setShowContactsModal(true)}
            className="mr-2 text-white bg-red-700 hover:bg-red-800 px-3 py-1 rounded-lg text-sm flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Contacts ({emergencyContacts.length})
          </button>
          
          <span className={`h-3 w-3 rounded-full mr-2 ${locationError ? 'bg-red-500' : location ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
          <span className="text-sm font-medium">
            {locationError ? 'Offline' : location ? 'Live Tracking' : 'Connecting...'}
          </span>
        </div>
      </div>
      
      {/* Firebase Connection Status */}
      {!firebaseInitialized && (
        <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 p-4 rounded-lg">
          <p className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Connecting to database... This may take a moment.
          </p>
        </div>
      )}
      
      {/* Location Info */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg md:text-xl">Your Current Location</h3>
          {location && !locationError && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Updated: {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {renderLocationInfo()}
        
        {!locationError && location && (
          <div className="mt-2 text-xs text-gray-600">
            <p>
              Your location updates automatically for emergency services to find you quickly
            </p>
          </div>
        )}
      </div>

      {/* SOS Button with SMS status indicators */}
      <div className="flex flex-col items-center">
        <button
          onClick={handleSOSClick}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-full text-xl shadow-lg animate-pulse w-full max-w-xs"
          aria-label="Emergency SOS button - calls emergency services at 100"
        >
          SOS EMERGENCY
        </button>
        <p className="mt-4 text-gray-600 text-center">
          Press the SOS button or shake your phone rapidly to call emergency services (100)
          {emergencyContacts.length > 0 && ' and alert your emergency contacts'}
        </p>
        
        {/* SMS Status Indicator */}
        {smsSending && (
          <div className="mt-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg text-sm animate-pulse">
            Sending emergency alerts...
          </div>
        )}
        {smsStatus === 'success' && (
          <div className="mt-2 bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm">
            Emergency alerts sent successfully!
          </div>
        )}
        {smsStatus === 'error' && (
          <div className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded-lg text-sm">
            Failed to send emergency alerts. Emergency call will still be placed.
          </div>
        )}
      </div>
      
      {/* Shake detection alert */}
      {showShakeAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="h-20 w-20 mx-auto mb-4 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Emergency Call</h3>
              <p className="text-gray-600 mt-2">
                Phone shake detected. Make emergency call to 100?
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={cancelShakeSOSCall}
                className="w-1/2 py-2 bg-gray-200 text-gray-800 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={confirmShakeSOSCall}
                className="w-1/2 py-2 bg-red-600 text-white rounded"
              >
                Call Emergency
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Render Emergency Contacts Modal */}
      {renderEmergencyContactsModal()}
    </div>
  );
}

export default Dashboard;