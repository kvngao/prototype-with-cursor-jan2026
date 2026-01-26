"use client";

// Template for creating a new prototype
// To use this template:
// 1. Create a new folder in app/prototypes with your prototype name
// 2. Copy this file and styles.module.css into your new folder
// 3. Create an 'images' folder for your prototype's images
// 4. Rename and customize the component and styles as needed

import Link from 'next/link';
import styles from './styles.module.css';

export default function PrototypeTemplate() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {/* Add your prototype content here */}
      </main>
    </div>
  );
} 