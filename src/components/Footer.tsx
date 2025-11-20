import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-32 pt-8 border-t border-gray-300 dark:border-white/10 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
      <p>&copy; {new Date().getFullYear()} Quentin Nivelais. Built with React & Tailwind.</p>
      <div className="flex gap-6 mt-4 md:mt-0 font-mono text-xs">
        <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">RSS</a>
        <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Email</a>
        <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">PGP Key</a>
      </div>
    </footer>
  );
};

export default Footer;
