import React, { useState } from 'react';
import { Terminal, Menu, X } from 'lucide-react';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-white text-lg tracking-tight">
            <Terminal size={18} className="text-gray-400" />
            <span>~/nivelais</span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
            <a href="/#articles" className="hover:text-white transition-colors">Recent</a>
            <a href="/#collections" className="hover:text-white transition-colors">Collections</a>
            <a href="/#projects" className="hover:text-white transition-colors">Selected works</a>
            <a href="/articles" className="hover:text-white transition-colors">All articles</a>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden text-gray-300" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0a0a0a] pt-20 px-6 md:hidden">
          <div className="flex flex-col gap-6 text-xl font-medium text-gray-300">
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
