import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-32 pt-8 border-t border-gray-300 dark:border-white/10 text-center text-sm text-gray-500">
      <p>&copy; {new Date().getFullYear()} Quentin Nivelais.</p>
    </footer>
  );
};

export default Footer;
