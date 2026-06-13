'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function AddTestCourse() {
  const [status, setStatus] = useState('');

  const addCourse = async () => {
    try {
      setStatus('Adding course...');
      const docRef = await addDoc(collection(db, 'courses'), {
        title: 'Test Course from App',
        description: 'This course was added directly from the Next.js app',
        level: 'Beginner',
        category: 'Test Category',
        duration: 5,
        price: 0,
        imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06',
        isPublished: true,
        instructorName: 'Admin Test',
        totalStudents: 0,
        rating: 5,
        createdAt: new Date()
      });
      setStatus(`✅ Course added successfully! ID: ${docRef.id}`);
      console.log('Course added:', docRef.id);
    } catch (error) {
      console.error('Error adding course:', error);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add Test Course</h1>
      <button 
        onClick={addCourse}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Add Course Directly
      </button>
      {status && <p className="mt-4">{status}</p>}
    </div>
  );
}