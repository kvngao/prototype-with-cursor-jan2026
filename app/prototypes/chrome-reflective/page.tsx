"use client";

import Link from 'next/link';
import styles from './styles.module.css';
import { useState } from 'react';

export default function ChromeReflectivePrototype() {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div 
      className={styles.container}
      onMouseMove={handleMouseMove}
    >
      <Link href="/" className={styles.backButton}>
        ←
      </Link>

      <main className={styles.main}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>CHROME</h1>
          <p className={styles.subtitle}>Reflective Y2K Aesthetic</p>
        </div>

        <div className={styles.chromeGrid}>
          {/* Chrome Letter R Sculpture */}
          <div 
            className={`${styles.chromeSculpture} ${styles.letterR}`}
            onMouseEnter={() => setHoveredElement('r')}
            onMouseLeave={() => setHoveredElement(null)}
            style={{
              '--mouse-x': `${mousePosition.x}px`,
              '--mouse-y': `${mousePosition.y}px`,
            } as React.CSSProperties}
          >
            <div className={styles.sculptureReflection}></div>
            <div className={styles.sculptureHighlight}></div>
          </div>

          {/* Chrome Buttons */}
          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.chromeButton} ${hoveredElement === 'btn1' ? styles.hovered : ''}`}
              onMouseEnter={() => setHoveredElement('btn1')}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <span className={styles.buttonReflection}></span>
              <span className={styles.buttonText}>ENTER</span>
            </button>

            <button 
              className={`${styles.chromeButton} ${styles.buttonAlt} ${hoveredElement === 'btn2' ? styles.hovered : ''}`}
              onMouseEnter={() => setHoveredElement('btn2')}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <span className={styles.buttonReflection}></span>
              <span className={styles.buttonText}>SUBMIT</span>
            </button>

            <button 
              className={`${styles.chromeButton} ${styles.buttonAlt2} ${hoveredElement === 'btn3' ? styles.hovered : ''}`}
              onMouseEnter={() => setHoveredElement('btn3')}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <span className={styles.buttonReflection}></span>
              <span className={styles.buttonText}>LAUNCH</span>
            </button>
          </div>

          {/* Chrome Card */}
          <div 
            className={`${styles.chromeCard} ${hoveredElement === 'card' ? styles.hovered : ''}`}
            onMouseEnter={() => setHoveredElement('card')}
            onMouseLeave={() => setHoveredElement(null)}
          >
            <div className={styles.cardReflection}></div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>MIRROR FINISH</h3>
              <p className={styles.cardText}>
                Highly polished chrome surface with distorted reflections of the environment.
                Classic Y2K aesthetic meets modern web design.
              </p>
            </div>
          </div>

          {/* Chrome Panel */}
          <div 
            className={`${styles.chromePanel} ${hoveredElement === 'panel' ? styles.hovered : ''}`}
            onMouseEnter={() => setHoveredElement('panel')}
            onMouseLeave={() => setHoveredElement(null)}
          >
            <div className={styles.panelReflection}></div>
            <div className={styles.panelContent}>
              <div className={styles.panelItem}>
                <span className={styles.panelLabel}>REFLECTIVITY</span>
                <div className={styles.panelBar}>
                  <div className={styles.panelBarFill}></div>
                </div>
              </div>
              <div className={styles.panelItem}>
                <span className={styles.panelLabel}>POLISH</span>
                <div className={styles.panelBar}>
                  <div className={styles.panelBarFill} style={{ width: '85%' }}></div>
                </div>
              </div>
              <div className={styles.panelItem}>
                <span className={styles.panelLabel}>DISTORTION</span>
                <div className={styles.panelBar}>
                  <div className={styles.panelBarFill} style={{ width: '70%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className={styles.infoSection}>
          <p className={styles.infoText}>
            This prototype demonstrates the chrome/reflective Y2K aesthetic with mirror-finish surfaces,
            distorted reflections, and high-polish metallic effects.
          </p>
        </div>
      </main>
    </div>
  );
}
