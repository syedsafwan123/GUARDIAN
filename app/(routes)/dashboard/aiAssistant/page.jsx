"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from "@clerk/clerk-react";
import Link from 'next/link';

// Import icons
import { Send, Bot, User, RefreshCw } from 'lucide-react';

export default function SafetyBot() {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyApvMsyUp3Zw_nKwWqF33k9U17eKvQow3w";
  
  // Initial welcome message when component mounts
  useEffect(() => {
    setMessages([
      {
        role: 'bot',
        content: "Hello! I'm your Safety Assistant. I can help with safety tips, emergency guidance, or answer questions about personal safety. How can I help you today?",
        timestamp: new Date()
      }
    ]);
  }, []);

  // Automatically scroll to the bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message to Gemini API
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Update messages with user input
    const userMessage = {
      role: 'user',
      content: inputText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input and set loading state
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      // Create safety context for the AI to ensure relevant and safe responses
      const safetyContext = `You are a helpful safety assistant for women. 
      Provide informative, supportive advice on personal safety, emergency situations, 
      and related topics. Be empathetic, practical, and focus on safety and wellbeing. 
      If asked about something not related to safety, politely guide the conversation 
      back to safety topics. Keep responses concise and actionable.`;
      
      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      
      // Add the new user message
      conversationHistory.push({
        role: 'user',
        parts: [{ text: inputText }]
      });
      
      // Prepare the API request
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: safetyContext }]
            },
            ...conversationHistory
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            topP: 0.95,
            topK: 40,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Error from Gemini API');
      }
      
      // Extract the bot's response
      const botResponse = data.candidates[0]?.content?.parts[0]?.text || 
                          "I'm sorry, I couldn't generate a response. Please try again.";
      
      // Add bot response to messages
      setMessages(prev => [
        ...prev, 
        {
          role: 'bot',
          content: botResponse,
          timestamp: new Date()
        }
      ]);
      
    } catch (err) {
      console.error('Error with Gemini API:', err);
      setError('Failed to get a response. Please try again later.');
      
      // Add error message to chat
      setMessages(prev => [
        ...prev, 
        {
          role: 'bot',
          content: 'Sorry, I encountered an error. Please try again or refresh the page.',
          timestamp: new Date(),
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render message bubbles
  const renderMessages = () => {
    return messages.map((message, index) => (
      <div 
        key={index} 
        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div 
          className={`max-w-3/4 rounded-lg px-4 py-3 ${
            message.role === 'user' 
              ? 'bg-purple-50 ml-auto' 
              : message.isError 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center mb-1">
            {message.role === 'user' ? (
              <>
                <span className="font-medium text-sm">You</span>
                <span className="text-xs text-gray-500 ml-2">{formatTime(message.timestamp)}</span>
              </>
            ) : (
              <>
                <div className="bg-red-600 text-white p-1 rounded-full mr-1">
                  <Bot size={12} />
                </div>
                <span className="font-medium text-sm">Safety Assistant</span>
                <span className="text-xs text-gray-500 ml-2">{formatTime(message.timestamp)}</span>
              </>
            )}
          </div>
          <div className="text-sm whitespace-pre-line">{message.content}</div>
        </div>
      </div>
    ));
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 bg-red-600 p-3 rounded-lg text-white">
        <h2 className="font-bold text-xl">Safety Assistant</h2>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard" className="text-white hover:underline flex items-center text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
      
      {/* Main chat container */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 border border-gray-200">
        {/* Chat messages */}
        <div className="h-96 p-4 overflow-y-auto bg-gray-50">
          {renderMessages()}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start mb-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center">
                <div className="animate-spin mr-2">
                  <RefreshCw size={16} />
                </div>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          )}
          
          {/* Anchor for auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input and send button */}
        <form onSubmit={sendMessage} className="p-3 border-t border-gray-200">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Ask me about safety issues, emergency guidance, or safety tips..."
              className="flex-1 border border-gray-300 rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`${
                isLoading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'
              } text-white py-2 px-4 rounded-r-lg flex items-center`}
              disabled={isLoading || !inputText.trim()}
            >
              <Send size={16} className="mr-1" />
              Send
            </button>
          </div>
          
          {/* Suggested questions */}
          <div className="mt-3 overflow-x-auto">
            <p className="text-xs text-gray-500 mb-2">Try asking:</p>
            <div className="flex space-x-2">
              <button
                type="button"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded whitespace-nowrap"
                onClick={() => setInputText("What should I do if I'm being followed?")}
              >
                What if I'm being followed?
              </button>
              <button
                type="button"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded whitespace-nowrap"
                onClick={() => setInputText("Tips for staying safe at night")}
              >
                Safety at night
              </button>
              <button
                type="button"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded whitespace-nowrap"
                onClick={() => setInputText("How to create an emergency plan")}
              >
                Emergency plan
              </button>
              <button
                type="button"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded whitespace-nowrap"
                onClick={() => setInputText("Self-defense basics")}
              >
                Self-defense basics
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Safety tips section */}
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-base mb-2">About This Assistant</h3>
        <p className="text-xs text-gray-700 mb-2">
          The Safety Assistant uses Google's Gemini AI to provide guidance on personal safety topics.
          While it offers helpful information, remember:
        </p>
        <ul className="text-xs text-gray-700 space-y-1">
          <li className="flex items-start">
            <span className="text-red-500 mr-1">•</span>
            In emergencies, always call emergency services first (100 for police in India)
          </li>
          <li className="flex items-start">
            <span className="text-red-500 mr-1">•</span>
            Use the Emergency button on the dashboard for immediate alerts
          </li>
          <li className="flex items-start">
            <span className="text-red-500 mr-1">•</span>
            Your conversations are not stored permanently for privacy
          </li>
        </ul>
      </div>
    </div>
  );
}