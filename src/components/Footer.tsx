import React from 'react';
import { AVAILABILITY, CALENDLY_URL } from '../consts';

const Footer = () => {
  return (
    <footer className="mt-16 pt-8 border-t border-gray-300 dark:border-white/10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Quentin Nivelais.</p>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Available {AVAILABILITY}
          </span>
          <a 
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            Book a call
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
