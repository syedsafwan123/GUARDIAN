// app/api/send-emergency-sms/route.js
import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request) {
  try {
    // Get data from request body
    const { contactNumbers, message, userName, userId } = await request.json();
    
    // Validation
    if (!contactNumbers || !Array.isArray(contactNumbers) || contactNumbers.length === 0) {
      return NextResponse.json({ 
        error: 'At least one contact number is required', 
        success: false 
      }, { status: 400 });
    }
    
    if (!message) {
      return NextResponse.json({ 
        error: 'Message is required', 
        success: false 
      }, { status: 400 });
    }
    
    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    // Log for debugging
    console.log('Sending emergency SMS to contacts:', contactNumbers);
    console.log('From user:', userName);
    
    // Check if Twilio credentials are available
    if (!accountSid || !authToken || !fromNumber) {
      console.error('Missing Twilio credentials');
      
      // For development, simulate success without actual Twilio
      if (process.env.NODE_ENV === 'development') {
        console.log('DEV MODE: Simulating successful SMS send');
        return NextResponse.json({
          success: true,
          message: "Emergency SMS sent successfully (Development Mode - No actual SMS sent)",
          details: contactNumbers.map(number => ({
            to: number,
            success: true,
            sid: 'dev-mode-sid'
          }))
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'SMS service not configured' 
      }, { status: 500 });
    }
    
    // Initialize Twilio
    const client = twilio(accountSid, authToken);
    
    // Send messages
    const messagePromises = contactNumbers.map(async (phoneNumber) => {
      try {
        // Format phone number if needed
        let formattedNumber = phoneNumber;
        if (!phoneNumber.startsWith('+')) {
          // Add country code if not present (using India +91 as default)
          formattedNumber = '+91' + phoneNumber.replace(/\D/g, '');
        }
        
        // Send the message
        const twilioMessage = await client.messages.create({
          body: message,
          from: fromNumber,
          to: formattedNumber
        });
        
        console.log(`SMS sent to ${formattedNumber}, SID: ${twilioMessage.sid}`);
        
        return {
          success: true,
          sid: twilioMessage.sid,
          to: phoneNumber
        };
      } catch (error) {
        console.error(`Failed to send SMS to ${phoneNumber}:`, error);
        return {
          success: false,
          to: phoneNumber,
          error: error.message
        };
      }
    });
    
    // Wait for all messages to be sent
    const results = await Promise.all(messagePromises);
    
    // Check if at least one message was sent successfully
    const anySuccess = results.some(result => result.success);
    
    if (anySuccess) {
      return NextResponse.json({
        success: true,
        message: "Emergency SMS sent successfully",
        details: results
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Failed to send any messages",
        details: results
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in emergency SMS API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}