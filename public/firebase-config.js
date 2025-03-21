// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCZR0yqDxpcSBSNeeXzM4TJBAC5yPKBX2c",
  authDomain: "golf-ball-blast.firebaseapp.com",
  projectId: "golf-ball-blast",
  storageBucket: "golf-ball-blast.firebasestorage.app",
  messagingSenderId: "30314302279",
  appId: "1:30314302279:web:1269fa089866e05a165a62",
  measurementId: "G-1X377HF780"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);