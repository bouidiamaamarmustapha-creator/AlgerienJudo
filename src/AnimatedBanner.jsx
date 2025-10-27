import React from 'react';

const AnimatedBanner = ({ announcements = [] }) => {
  if (announcements.length === 0) return null;
  
  return (
    <div className="green-tape-banner relative overflow-hidden">
      {/* Main green background */}
       <div className="text-white py-20 shadow-2xl relative">
        {/* Content */}
        <div className="relative z-20">
          <h2 className="header-text-massive font-bold text-center mb-8 tracking-wider">
             OFFICIAL ANNOUNCEMENTS - JUDO ALGERIA
          </h2>
          <div className="overflow-hidden whitespace-nowrap">
            <div className="animate-marquee">
              {/* Display each announcement once in the same line */}
              {announcements.map((announcement, index) => (
                <span key={index} className="announcement-text-huge mx-8 text-white font-bold tracking-wider whitespace-nowrap">
                  ⭐ {announcement} ⭐
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedBanner;