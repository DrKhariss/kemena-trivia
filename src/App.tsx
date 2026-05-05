/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import Trivia from './components/Trivia';
import Leaderboard from './components/Leaderboard';
import AdminNews from './components/AdminNews';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const [username, setUsername] = useState('');
  const [isMusicRequested, setIsMusicRequested] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (isMusicRequested && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.warn("Audio playback failed. Ensure 'battle-music.mp3' is in /src/assets/", err);
      });
      
      // Stop music when user leaves the website (tab hidden)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          audioRef.current?.pause();
        } else if (isMusicRequested) {
          audioRef.current?.play().catch(() => {});
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [isMusicRequested]);

  return (
    <ThemeProvider>
      <Router>
        <Navbar />
        <div className="bg-army-dark text-tactical-cyan min-h-screen selection:bg-tactical-amber selection:text-white">
          <div className="scanline"></div>
          
          {/* Tactical Audio Feed (MP3 Orchestrator) */}
          <div className="hidden">
            <audio ref={audioRef} src="/src/assets/battle-music.mp3" loop />
          </div>

          <div className="main-wrapper">
            <main className="flex-1 px-4 md:px-0 pt-[80px] sm:pt-[100px]">
              <Routes>
                <Route path="/" element={<Home setUsername={setUsername} startMusic={() => setIsMusicRequested(true)} />} />
                <Route path="/trivia" element={<Trivia username={username} />} />
                <Route path="/leaderboard" element={<Leaderboard highlightUser={username} />} />
                <Route path="/admin" element={<AdminNews />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
}

