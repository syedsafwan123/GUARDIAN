"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from "@clerk/clerk-react";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  getDocs,
  limit 
} from 'firebase/firestore';
import {
  ref,
  onValue,
  set,
  onDisconnect
} from 'firebase/database';
import { db, realDb } from '../../../../lib/firebase';

function CommunityAlert() {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState(0);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]); // Store emergency contacts
  const messagesEndRef = useRef(null);
  
  // Get user name or default to Anonymous
  const userName = user?.fullName || "Anonymous User";
  const userId = user?.id || "anonymous";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userPhone = user?.primaryPhoneNumber?.phoneNumber || "";

  // Check Firebase connection
  useEffect(() => {
    console.log("Checking Firebase connection...");
    try {
      // Test Firestore connection
      const testConnection = async () => {
        try {
          await getDocs(collection(db, "messages")).then(() => {
            console.log("✅ Firestore connected successfully");
            setFirebaseConnected(true);
          });
        } catch (error) {
          console.error("❌ Firestore connection error:", error);
        }
      };
      
      testConnection();
    } catch (error) {
      console.error("Firebase initialization error:", error);
    }
    
    // Force loading to end after 5 seconds to prevent infinite loading
    const timer = setTimeout(() => {
      if (loading) {
        console.log("Loading timeout reached - forcing loading to end");
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [loading]);

  // Set up Firestore listener for messages
  useEffect(() => {
    if (!firebaseConnected) return;
    
    try {
      console.log("Setting up Firestore messages listener");
      
      const messagesRef = collection(db, "messages");
      const messagesQuery = query(
        messagesRef, 
        orderBy("timestamp", "asc")
      );
      
      const unsubscribe = onSnapshot(
        messagesQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          console.log("📩 Firestore data received:", snapshot.docs.length, "messages");
          
          const messageList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.().getTime() || 
                      doc.data().clientTimestamp || 
                      Date.now()
          }));
          
          setMessages(messageList);
          setLoading(false);
        },
        (error) => {
          console.error("❌ Firestore messages error:", error);
          setLoading(false);
        }
      );
      
      return () => {
        console.log("Unsubscribing from Firestore messages");
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up Firestore messages:", error);
      setLoading(false);
    }
  }, [firebaseConnected]);

  // Set up presence system
  useEffect(() => {
    if (!firebaseConnected || !userId || userId === "anonymous") return;
    
    try {
      console.log("Setting up presence system for user:", userId);
      
      // Set up presence reference
      const presenceRef = ref(realDb, `presence/${userId}`);
      
      // Online status
      set(presenceRef, {
        name: userName,
        email: userEmail,
        phone: userPhone,
        online: true,
        lastActive: Date.now()
      });
      
      // Remove when disconnected
      onDisconnect(presenceRef).remove();
      
      // Get active users count
      const allPresenceRef = ref(realDb, 'presence');
      
      const presenceUnsubscribe = onValue(allPresenceRef, (snapshot) => {
        const users = snapshot.val() || {};
        const userCount = Object.keys(users).length;
        console.log("👥 Active users:", userCount);
        setActiveUsers(userCount);
      });

      // Load emergency contacts if available
      const loadEmergencyContacts = async () => {
        try {
          const contactsRef = collection(db, "users", userId, "emergencyContacts");
          const contactsSnapshot = await getDocs(contactsRef);
          const contactsList = contactsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setEmergencyContacts(contactsList);
          console.log("✅ Loaded emergency contacts:", contactsList.length);
        } catch (error) {
          console.error("Error loading emergency contacts:", error);
        }
      };
      
      loadEmergencyContacts();
      
      return () => {
        console.log("Cleaning up presence for user:", userId);
        presenceUnsubscribe();
        // Remove user when component unmounts
        set(presenceRef, null);
      };
    } catch (error) {
      console.error("Error setting up presence:", error);
    }
  }, [userId, userName, userEmail, userPhone, firebaseConnected]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create location URL
  const createLocationURL = (lat, lng) => {
    return `https://maps.google.com/?q=${lat},${lng}`;
  };

  // Create SMS link with location
  const createSmsLink = (lat, lng, phoneNumber = "", message = "Emergency! My location:") => {
    const locationUrl = createLocationURL(lat, lng);
    const smsBody = encodeURIComponent(`${message} ${locationUrl}`);
    return phoneNumber ? `sms:${phoneNumber}?body=${smsBody}` : `sms:?body=${smsBody}`;
  };

  // Single function to open location in map
  const navigateToLocation = (lat, lng) => {
    window.open(createLocationURL(lat, lng), '_blank');
  };
  
  // Get directions to a location
  const getDirectionsToLocation = (lat, lng) => {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(directionsUrl, '_blank');
  };

  // Enhanced Location sharing function
  const shareLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const locationURL = createLocationURL(lat, lng);
      
      // Append location to existing message or create new one
      setNewMessage(prev => {
        const locationText = `My current location: ${locationURL}`;
        if (prev.trim()) {
          return `${prev}\n\n${locationText}`;
        } else {
          return locationText;
        }
      });
      
    } catch (error) {
      console.error("Error getting location:", error);
      alert("Failed to get your location. Please check your location permissions.");
    }
  };

  // Share location with emergency contacts
  const shareLocationWithContacts = async () => {
    if (!navigator.geolocation || emergencyContacts.length === 0) {
      alert(emergencyContacts.length === 0 
        ? "No emergency contacts found. Please add some in your profile." 
        : "Geolocation is not supported by your browser");
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      // Create a dropdown to select a contact
      const contactsDropdown = document.createElement('select');
      contactsDropdown.innerHTML = `
        <option value="">Select an emergency contact</option>
        ${emergencyContacts.map(contact => `
          <option value="${contact.phone}">${contact.name} (${contact.phone})</option>
        `).join('')}
        <option value="new">Send to a new number...</option>
      `;
      
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '50%';
      container.style.left = '50%';
      container.style.transform = 'translate(-50%, -50%)';
      container.style.backgroundColor = 'white';
      container.style.padding = '20px';
      container.style.borderRadius = '8px';
      container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      container.style.zIndex = '1000';
      container.style.maxWidth = '90%';
      container.style.width = '300px';
      
      const title = document.createElement('h3');
      title.innerText = 'Share location with:';
      title.style.marginBottom = '10px';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'space-between';
      buttonContainer.style.marginTop = '15px';
      
      const cancelButton = document.createElement('button');
      cancelButton.innerText = 'Cancel';
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.borderRadius = '4px';
      cancelButton.style.border = '1px solid #ccc';
      cancelButton.style.backgroundColor = '#f5f5f5';
      
      const shareButton = document.createElement('button');
      shareButton.innerText = 'Share';
      shareButton.style.padding = '8px 16px';
      shareButton.style.borderRadius = '4px';
      shareButton.style.border = 'none';
      shareButton.style.backgroundColor = '#d32f2f';
      shareButton.style.color = 'white';
      
      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(shareButton);
      
      container.appendChild(title);
      container.appendChild(contactsDropdown);
      container.appendChild(buttonContainer);
      
      document.body.appendChild(container);
      
      // Handle button clicks
      cancelButton.onclick = () => {
        document.body.removeChild(container);
      };
      
      shareButton.onclick = () => {
        const selectedPhone = contactsDropdown.value;
        if (!selectedPhone) {
          alert('Please select a contact');
          return;
        }
        
        if (selectedPhone === 'new') {
          const phone = prompt('Enter phone number:');
          if (phone) {
            window.location.href = createSmsLink(lat, lng, phone, "EMERGENCY! I need help. My location:");
          }
        } else {
          window.location.href = createSmsLink(lat, lng, selectedPhone, "EMERGENCY! I need help. My location:");
        }
        
        document.body.removeChild(container);
      };
      
    } catch (error) {
      console.error("Error sharing location with contacts:", error);
      alert("Failed to get your location. Please check your location permissions.");
    }
  };

  // Send message
  const sendMessage = async (messageType) => {
    if (!newMessage.trim() || !userId) return;
    
    try {
      console.log("Sending message:", messageType);
      
      // Get location for emergency messages
      let locationData = null;
      
      if (messageType === 'emergency' && navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });
          
          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
        } catch (error) {
          console.error("Error getting location:", error);
          // Continue without location
        }
      }
      
      // Create a new message
      await addDoc(collection(db, "messages"), {
        text: newMessage,
        name: userName,
        userId: userId,
        email: userEmail,
        phone: userPhone,
        timestamp: serverTimestamp(),
        clientTimestamp: Date.now(),
        type: messageType,
        location: locationData
      });
      
      console.log("✅ Message sent successfully");
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error("❌ Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessage("message");
  };

  const handleAlertSubmit = () => {
    sendMessage("alert");
  };
  
  // Enhanced Emergency Alert function
  const handleEmergencyAlert = async () => {
    try {
      // If no message is set, use a default emergency message
      if (!newMessage.trim()) {
        setNewMessage("EMERGENCY ALERT! I need immediate assistance!");
      }
      
      // Always try to get location for emergency alerts
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        // Create location object
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        // Add to message text for clarity
        const locationText = `\n\nMy exact location: ${createLocationURL(locationData.latitude, locationData.longitude)}`;
        setNewMessage(prev => prev + locationText);
        
        // Automatically share location with emergency contacts if available
        if (emergencyContacts.length > 0) {
          // Ask if user wants to share location with contacts
          const shouldShare = window.confirm(
            "Do you want to automatically share your location with your emergency contacts via SMS?"
          );
          
          if (shouldShare) {
            // Send SMS to all emergency contacts
            emergencyContacts.forEach(contact => {
              const smsLink = createSmsLink(
                locationData.latitude, 
                locationData.longitude, 
                contact.phone,
                "EMERGENCY! I need help. Location:"
              );
              // Open in a new tab to prevent navigation away
              window.open(smsLink, '_blank');
            });
          }
        }
      }
    } catch (error) {
      console.error("Error in emergency alert:", error);
      // Continue without location if there's an error
    }
    
    // Send as emergency message
    sendMessage("emergency");
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get time remaining until message expires
  const getTimeRemaining = (timestamp) => {
    const messageTime = new Date(timestamp);
    const now = new Date();
    const timeDiff = 24 * 60 * 60 * 1000 - (now - messageTime); // 24 hours in ms
    
    if (timeDiff <= 0) return "Expiring soon";
    
    const hoursLeft = Math.floor(timeDiff / (60 * 60 * 1000));
    const minutesLeft = Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hoursLeft > 0) {
      return `${hoursLeft}h left`;
    } else {
      return `${minutesLeft}m left`;
    }
  };

  // Sort messages by timestamp - ensure consistent sorting
  const sortedMessages = [...messages].sort((a, b) => {
    // Normalize timestamps to numbers
    const aTime = typeof a.timestamp === 'number' ? a.timestamp : 0;
    const bTime = typeof b.timestamp === 'number' ? b.timestamp : 0;
    return aTime - bTime;
  });

  // Function to extract and make clickable URLs in text
  const renderMessageWithClickableLinks = (text) => {
    if (!text) return '';
    
    // Regular expression to match URLs (including Google Maps URLs)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Split the text by URLs and map each part
    const parts = text.split(urlRegex);
    
    // Find all URLs in the text
    const urls = text.match(urlRegex) || [];
    
    // Combine parts and URLs
    return parts.map((part, i) => {
      // If this part is a URL (every odd index in our parts array)
      if (urls.includes(part)) {
        const isLocationUrl = part.includes('maps.google.com') || part.includes('goo.gl/maps');
        
        if (isLocationUrl) {
          // Extract coordinates from Google Maps URL if possible
          let lat, lng;
          const coordsMatch = part.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
          
          if (coordsMatch) {
            lat = parseFloat(coordsMatch[1]);
            lng = parseFloat(coordsMatch[2]);
            
            // Return a clickable location link
            return (
              <a 
                key={i}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToLocation(lat, lng);
                }}
                className="text-blue-600 underline font-medium"
              >
                View my location on map
              </a>
            );
          }
        }
        
        // Regular URL
        return (
          <a 
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {part}
          </a>
        );
      }
      
      // Regular text
      return part;
    });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 bg-red-600 p-3 rounded-lg text-white">
        <h2 className="font-bold text-xl">Safety Chat</h2>
        <div className="flex items-center space-x-2">

        </div>
      </div>
      
      {/* Main chat container */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 border border-gray-200">
        {/* Chat messages */}
        <div className="h-96 p-4 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-center">No messages yet. Be the first to send one!</p>
              <p className="text-xs mt-2 text-gray-400">Messages expire after 24 hours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Welcome message - always shown */}
              <div className="p-3 rounded-lg max-w-3xl bg-blue-100 text-blue-800 mx-auto text-center mb-4">
                <div className="flex items-center justify-center mb-1">
                  <strong>Safety Chat</strong>
                </div>
                <p className="text-sm">Welcome to the safety chat! Use the Emergency Alert button for urgent assistance.</p>
              </div>
              
              {/* Dynamic messages */}
              {sortedMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`p-3 rounded-lg max-w-3xl ${
                    message.userId === userId
                      ? 'ml-auto bg-purple-50 border border-purple-100'
                      : message.type === 'system'
                        ? 'bg-blue-100 text-blue-800 mx-auto text-center'
                        : message.type === 'alert'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : message.type === 'emergency'
                            ? 'bg-red-500 text-white'
                            : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <strong className="text-sm">{message.name}</strong>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.type === 'alert' && (
                        <span className="ml-2 bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                          Alert
                        </span>
                      )}
                      {message.type === 'emergency' && (
                        <span className="ml-2 bg-white text-red-800 text-xs px-2 py-0.5 rounded-full animate-pulse">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {getTimeRemaining(message.timestamp)}
                    </span>
                  </div>
                  
                  {/* Message text with clickable links */}
                  <div className="text-sm whitespace-pre-line">
                    {renderMessageWithClickableLinks(message.text)}
                  </div>
                  
                  {/* Enhanced location display for emergency messages with direct actions */}
                  {message.type === 'emergency' && message.location && (
                    <div className="mt-2 border-t border-red-300 pt-2">
                      <div className="flex flex-col">
                        <p className="text-xs text-white mb-2">
                          Location (Accuracy: ~{Math.round(message.location.accuracy)}m)
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                          {/* View Map - Direct navigation */}
                          <button 
                            onClick={() => navigateToLocation(message.location.latitude, message.location.longitude)}
                            className="text-xs flex items-center bg-white text-red-600 px-2 py-1 rounded"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            View Map
                          </button>
                          
                          {/* Get Directions */}
                          <button 
                            onClick={() => getDirectionsToLocation(message.location.latitude, message.location.longitude)}
                            className="text-xs flex items-center bg-white text-blue-600 px-2 py-1 rounded"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Directions
                          </button>
                          
                          {/* SMS Share */}
                          <a 
                            href={createSmsLink(message.location.latitude, message.location.longitude, "", "Emergency location:")}
                            className="text-xs flex items-center bg-white text-green-600 px-2 py-1 rounded"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            SMS Share
                          </a>
                        </div>
                      </div>
                  
                      {/* Contact info for emergency messages */}
                      {message.email || message.phone ? (
                        <div className="mt-2 text-xs text-white border-t border-red-300 pt-2">
                          <strong>Contact:</strong>
                          {message.email && (
                            <a href={`mailto:${message.email}`} className="flex items-center text-white hover:text-white/80 mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {message.email}
                            </a>
                          )}
                          {message.phone && (
                            <a href={`tel:${message.phone}`} className="flex items-center text-white hover:text-white/80 mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {message.phone}
                            </a>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message input and action buttons */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!user}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-r-lg"
              disabled={!newMessage.trim() || !user}
            >
              Send
            </button>
          </div>
          
          {/* Quick template selection for common emergency messages */}
          <div className="mt-2 overflow-x-auto">
            <div className="flex space-x-2">
              <button
                type="button"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded whitespace-nowrap"
                onClick={() => setNewMessage("I need help. Please contact me.")}
              >
                Need Help
              </button>
              <button
                type="button"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded whitespace-nowrap"
                onClick={() => setNewMessage("Medical emergency! Need assistance.")}
              >
                Medical
              </button>
              <button
                type="button"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded whitespace-nowrap"
                onClick={() => setNewMessage("I'm being followed. Need help urgently!")}
              >
                Being Followed
              </button>
              <button
                type="button"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded whitespace-nowrap"
                onClick={() => setNewMessage("I feel unsafe. Can someone check on me?")}
              >
                Feel Unsafe
              </button>
            </div>
          </div>
          
          {/* Main action buttons */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={shareLocation}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-2 rounded text-sm"
            >
              Share Location
            </button>
            <button
              type="button"
              onClick={handleAlertSubmit}
              className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-2 rounded text-sm"
              disabled={!newMessage.trim() || !user}
            >
              Send Alert
            </button>
            <button
              type="button"
              onClick={handleEmergencyAlert}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-2 rounded text-sm font-bold"
              disabled={!user}
            >
              EMERGENCY
            </button>
          </div>
          
          
          {/* Emergency Templates Dropdown - Keep it simple and functional */}
          <div className="mt-2">
            <select 
              className="w-full p-2 border border-gray-300 rounded text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  setNewMessage(e.target.value);
                }
              }}
              value=""
            >
              <option value="">-- Emergency Message Templates --</option>
              <option value="EMERGENCY ALERT! I need immediate assistance at my current location!">Need Immediate Help</option>
              <option value="EMERGENCY! Medical assistance required urgently!">Medical Emergency</option>
              <option value="ALERT! I'm being followed/stalked. Need assistance.">Being Followed</option>
              <option value="EMERGENCY! I'm in an unsafe situation and need help.">Unsafe Situation</option>
              <option value="ALERT! I'm stranded and need help. My phone battery is low.">Stranded/Battery Low</option>
            </select>
          </div>
          
          {/* Message expiry notice */}
          <div className="mt-2 text-xs text-center text-gray-500">
            Messages will expire after 24 hours for privacy
          </div>
        </form>
      </div>
      
      {/* Safety guidelines - Simple but informative */}
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-base mb-2">Quick Safety Tips</h3>
        <ul className="text-xs text-gray-700 space-y-1">
          <li className="flex items-start">
            <span className="text-amber-500 mr-1">•</span>
            Use "Share Location" to let others know where you are
          </li>
          <li className="flex items-start">
            <span className="text-amber-500 mr-1">•</span>
            "Send Alert" for safety concerns that aren't emergencies
          </li>
          <li className="flex items-start">
            <span className="text-amber-500 mr-1">•</span>
            "EMERGENCY" button shares your location and alerts everyone
          </li>
          <li className="flex items-start">
            <span className="text-amber-500 mr-1">•</span>
            Click on any location link to open it directly in maps
          </li>
          <li className="flex items-start">
            <span className="text-amber-500 mr-1">•</span>
            Use templates for quick standardized messages
          </li>
        </ul>
      </div>
    </div>
  );
}

export default CommunityAlert;