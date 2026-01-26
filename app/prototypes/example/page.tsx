"use client";

import styles from './styles.module.css';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import { useState, useRef } from 'react';

const geist = Geist({ subsets: ['latin'] });

const THEMES = {
  blue: {
    primary: '#2a4b8d',
    secondary: '#1a325e',
    light: '#e6f0ff',
    background: '#f5f8ff',
  },
  pink: {
    primary: '#d4649b',
    secondary: '#a13d71',
    light: '#ffe6f3',
    background: '#fff5fa',
  },
  yellow: {
    primary: '#ffc107',
    secondary: '#b78500',
    light: '#fff9e6',
    background: '#fffdf5',
  },
  green: {
    primary: '#64d47c',
    secondary: '#3da152',
    light: '#e6ffe9',
    background: '#f5fff6',
  },
  black: {
    primary: '#444444',
    secondary: '#222222',
    light: '#f0f0f0',
    background: '#ffffff',
  },
};

type ThemeColor = keyof typeof THEMES;

export default function ExamplePrototype() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [theme, setTheme] = useState<ThemeColor>('blue');
  const dragStart = useRef({ x: 0, y: 0 });
  const windowStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    windowStart.current = position;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    setPosition({
      x: windowStart.current.x + dx,
      y: windowStart.current.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const currentTheme = THEMES[theme];

  return (
    <div className={`${styles.container} ${geist.className}`}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}
         style={{
           background: `repeating-conic-gradient(${currentTheme.primary} 0% 25%, ${currentTheme.secondary} 0% 50%) 50% / 2px 2px`
         }}>
      <div className={styles.buttonContainer}>
        <Link href="/" className={styles.backButton} style={{
          backgroundColor: currentTheme.light,
          borderColor: currentTheme.secondary,
          color: currentTheme.secondary,
          boxShadow: `2px 2px 0 ${currentTheme.secondary}4D`
        }}>☜</Link>
      </div>
      <div className={styles.themeContainer}>
        {(Object.keys(THEMES) as ThemeColor[]).map((color) => (
          <button
            key={color}
            className={`${styles.themeButton} ${theme === color ? styles.themeButtonActive : ''}`}
            onClick={() => setTheme(color)}
            style={{
              backgroundColor: THEMES[color].primary,
              borderColor: THEMES[color].secondary
            }}
            aria-label={`Switch to ${color} theme`}
          />
        ))}
      </div>
      <div className={styles.window}
           style={{
             transform: `translate(${position.x}px, ${position.y}px)`,
             cursor: isDragging ? 'grabbing' : 'auto'
           }}>
        <div className={styles.windowBar}
             onMouseDown={handleMouseDown}
             style={{ 
               cursor: 'grab',
               background: `linear-gradient(to bottom, ${currentTheme.light} 0%, ${currentTheme.light} 95%, ${currentTheme.primary} 100%)`,
               borderColor: currentTheme.secondary
             }}>
          <div className={styles.windowTitle} style={{ color: currentTheme.secondary }}>
            Example Prototype
          </div>
        </div>
        <div className={styles.windowContent} style={{
          backgroundColor: currentTheme.background,
          borderColor: currentTheme.secondary,
          boxShadow: `2px 2px 0 ${currentTheme.secondary}4D`
        }}>
          <h1 className={styles.heading1} style={{ color: currentTheme.secondary }}>
            Welcome to example prototype
          </h1>
          <div className={styles.section} style={{ 
            borderColor: currentTheme.primary,
            backgroundColor: '#ffffff'
          }}>
            <h2 className={styles.heading2} style={{ color: currentTheme.secondary }}>
              How to create a prototype
            </h2>
            <ol className={styles.list}>
              <li style={{ color: currentTheme.secondary }}>① Open Composer Agent (⌘-I)</li>
              <li style={{ color: currentTheme.secondary }}>② Type: "Create a prototype for me"</li>
              <li style={{ color: currentTheme.secondary }}>③ Describe the key features you need</li>
              <li style={{ color: currentTheme.secondary }}>④ Share any design preferences</li>
            </ol>
          </div>
          <div className={styles.section} style={{ 
            borderColor: currentTheme.primary,
            backgroundColor: '#ffffff'
          }}>
            <h2 className={styles.heading2} style={{ color: currentTheme.secondary }}>
              Things to know
            </h2>
            <ol className={styles.list}>
              <li style={{ color: currentTheme.secondary }}>◇ Use shared components from components folder</li>
              <li style={{ color: currentTheme.secondary }}>◇ Use shared styles from styles folder</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 