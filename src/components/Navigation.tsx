import React, { useState, useEffect } from 'react';
import { Terminal, Menu, X, Sun, Moon } from 'lucide-react';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('theme', newTheme);
    
    // Trigger mermaid re-render event
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newTheme } }));
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 dark:bg-[#0a0a0a]/90 bg-white/90 backdrop-blur-sm border-b border-gray-200 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-lg tracking-tight">
            <Terminal size={18} className="text-gray-600 dark:text-gray-400" />
            <span>~/nivelais</span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
            <a href="/#articles" className="hover:text-gray-900 dark:hover:text-white transition-colors">Recent</a>
            <a href="/#collections" className="hover:text-gray-900 dark:hover:text-white transition-colors">Collections</a>
            <a href="/#projects" className="hover:text-gray-900 dark:hover:text-white transition-colors">Selected works</a>
            <a href="/articles" className="hover:text-gray-900 dark:hover:text-white transition-colors">All articles</a>
            <button 
              onClick={toggleTheme}
              className="p-2 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Mobile Nav */}
          <div className="flex md:hidden items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="text-gray-600 dark:text-gray-300 p-2"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="text-gray-600 dark:text-gray-300" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white dark:bg-[#0a0a0a] pt-20 px-6 md:hidden">
          <div className="flex flex-col gap-6 text-xl font-medium text-gray-600 dark:text-gray-300">
            <a href="/#articles" onClick={() => setIsMenuOpen(false)}>Recent</a>
            <a href="/#collections" onClick={() => setIsMenuOpen(false)}>Collections</a>
            <a href="/#projects" onClick={() => setIsMenuOpen(false)}>Selected works</a>
            <a href="/articles" onClick={() => setIsMenuOpen(false)}>All articles</a>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
