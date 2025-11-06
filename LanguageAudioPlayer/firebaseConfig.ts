// Firebase Configuration
// Replace the values below with your actual Firebase project credentials

import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration

const firebaseConfig = {

    apiKey: "AIzaSyD-T30gzwYcCyevxivxUVjY2A2it5NiK6w",
  
    authDomain: "jim-c9df8.firebaseapp.com",
  
    projectId: "jim-c9df8",
  
    storageBucket: "jim-c9df8.firebasestorage.app",
  
    messagingSenderId: "1057730593689",
  
    appId: "1:1057730593689:web:233a536f6f260eba308908"
  
  };
  

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase Storage instance
export const storage = getStorage(app);

