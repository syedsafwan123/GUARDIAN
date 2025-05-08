import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import admin from 'firebase-admin';

// Get Firebase service account configuration
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || "women-saftey-10c68",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@women-saftey-10c68.iam.gserviceaccount.com",
  // Store private key properly with escaped newlines
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDUPwQEVkPxasMd\nZasG8rgYbclLnGA15W30tseqUAKN6He66kYVnsqdW+fC29qrHdz9jvJigxfkuNHn\nAUikNk2CSV4S1SxSaukBJfab55HBOBQqFC59uA/VMKcb/QXEOmcKbYiiqOrU/E43\npMG9X70M/5opc+bdnDA4O5GtCr885ZM/BzSrDcgYjzvOanIt+T4dY1FF5RdHWC62\nN0fLi0/pNjSrBKn1w/wfWLKd876z+rN8UgqRb/OcSakFXOv5BU4N5apEGjFBpuDl\nh3VjyjpkXeQsiAPkfTSgxfDVYQqIfwCce5a8B+uQX6cAliO2o4gJoXKe797LFEWx\n1oRnd9j3AgMBAAECggEAF4vIH80MK4+rBqtdPl+V8cvYLYWzHLePq7rNSsUmi2Sz\nR66uyL49fxiPjQwD5cDh39VIaYpej7a7PpPjYahOj/ogsBkrGheXMtPp2GDnyBY3\nEnX7tGHDi+SiXVYEGkFaZgtBwb3Yk3lMGhsyjRY+bF881IVxorostlEdzgU10asZf\nYIZWeIANHusrLydjklYtAWSPcy63O/NYARkc4BuceNUNuAXo+mnMKDN/iSTb1wk1\ngjQDvDXhUD0arL/yGUPS6/5ACs8aEBmiCNd3yOPujkLw+K6Vi6ow0D0KPzT32tAp\nCyLaKFMytyY7Lg0o/Brn0LYbRs//7QyL3f7OZyAOAQKBgQD7wTAZVaCGX/rYxz3E\nx458yELgEpl6RCHqlF9u94vZ5PXGGYU/DE0m2OnR3dmpyoBzZ+iSDWCGk+cVbgHM\nlH7bUBgC8Q2gwEruYcxA3UGLaW4qmxDo/rqc59b41yQDFx6O/iyLMxTQdkI5leLI\ntxYPicQBOA0n4a+76xmYQE3yAQKBgQDX00WLqWvclD/gmI6pODq3NP6cM6jEMkA2\n+6cmwmkbr3ITytD7vXnpXOjkfs6kpWnSqlIy1+kiIp64NzDpBRJMgkqCgmuM0ZR9\nuKcqcU/R64ymsN8OkKE2rxjjPsov2t4iPitdvvNQ0klt5llR+ZaX1Tx+smKpfqJ1\nlNsVhy9a9wKBgQCThJYsojIXyzHvyH/3SH/Duo0FQ6DPNhExpZNuMHuwSCuD0vxy\n/0BOHRiVswuSJGi0NxTeUBxZf10O/5DqUbErzXjkcF9t7H97w66t63g2uqalLIvy\nGyE6Q9eBpH8jmG59l45+WoY9yK3xlFR5DF9O54kEtdVvox0YXiB3SGbkAQKBgBQI\nTSU4dYWE0SUEpAE68eA9cACJnvmO/HzeANbNJrpmH32Mzrb/EEjD0e4bgwyvOdJO\n8tA7UC1V70uD++s1CEzHryjL+DWa4mCE+icrW1BNv8FdG2cbr4sG15WIJ3Ynp4Sg\nJqBN8AGpcx1bSyEbvImdRj8wSY4X7fZh+a/W22NjAoGBALs6tSFm/CmvY/YiiRir\ncvhWsQq7gZ9WF4Do4OuozlCQXj/4al8B67s8avhrovvl1uQjGt0vBkeYNm1IUbg8\nEPswY+u3bk1zXckx5qhc4HxbRFLhSabKm1rk/XDdJvDaK50HgDsh4RBBWXjDD7tm\n65ha+cKV9HcMhYugI5Clv2QW\n-----END PRIVATE KEY-----\n").replace(/\\n/g, '\n')
};

// Use a more robust singleton pattern for Firebase Admin
function getOrInitializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://women-saftey-10c68-default-rtdb.firebaseio.com"
      });
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
      // If the app is already initialized, get the existing one
      return admin.app();
    }
  }
  
  return admin.app(); // Return the existing app instance
}

export async function POST(request) {
  try {
    // Get current Clerk user
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Firebase Admin if needed
    getOrInitializeFirebaseAdmin();
    
    // Create a custom token
    const firebaseToken = await admin.auth().createCustomToken(userId);
    
    return NextResponse.json({ firebaseToken });
  } catch (error) {
    console.error('Error creating Firebase token:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    );
  }
}