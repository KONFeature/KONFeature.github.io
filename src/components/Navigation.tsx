import React, { useState } from 'react';
import { Terminal, Command, Menu, X } from 'lucide-react';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-white text-xl tracking-tighter">
            <Terminal size={20} className="text-green-500" />
            <span>nivelais.com</span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="/#about" className="hover:text-green-400 transition-colors">About</a>
            <a href="/career" className="hover:text-green-400 transition-colors">Career</a>
            <a href="/#articles" className="hover:text-green-400 transition-colors">Writing</a>
            <a href="/#projects" className="hover:text-green-400 transition-colors">Projects</a>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-xs text-gray-300">
              <Command size={12} />
              <span>Cmd+K</span>
            </button>
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
            <a href="/#about" onClick={() => setIsMenuOpen(false)}>About</a>
            <a href="/career" onClick={() => setIsMenuOpen(false)}>Career</a>
            <a href="/#articles" onClick={() => setIsMenuOpen(false)}>Writing</a>
            <a href="/#projects" onClick={() => setIsMenuOpen(false)}>Projects</a>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
