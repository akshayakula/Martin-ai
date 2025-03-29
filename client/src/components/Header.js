import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({ onResetSetup }) => {
  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-accentCyan font-bold text-2xl">Martin</span>
              <span className="text-text font-bold text-2xl">AI</span>
            </Link>
            <span className="ml-4 text-sm py-1 px-2 bg-accentCyan bg-opacity-10 text-accentCyan rounded">
              Maritime AIS Threat Detection
            </span>
          </div>
          
          <nav>
            <ul className="flex space-x-6">
              <li>
                <button 
                  onClick={onResetSetup}
                  className="text-textSecondary hover:text-accentCyan"
                >
                  Reset Setup
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header; 