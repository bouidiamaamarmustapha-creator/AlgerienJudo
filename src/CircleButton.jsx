import React from 'react';
import { ExternalLink, Download } from 'lucide-react';

const CircleButton = ({ 
  id, 
  image, 
  title, 
  description, 
  link, 
  type = 'website', // 'website' or 'pdf'
  onClick 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (link) {
      if (type === 'pdf') {
        // For PDF files, trigger download
        const a = document.createElement('a');
        a.href = link;
        a.download = title || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // For websites, open in new tab
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div className="circle-button-container">
      <div 
        className="circle-button"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* 3D Circle */}
        <div className="circle-button-inner">
          {/* Image Container */}
          <div className="circle-image-container">
            {image ? (
              <img 
                src={image} 
                alt={title || 'Button'} 
                className="circle-image"
              />
            ) : (
              <div className="circle-placeholder">
                {type === 'pdf' ? (
                  <Download className="w-8 h-8 text-white" />
                ) : (
                  <ExternalLink className="w-8 h-8 text-white" />
                )}
              </div>
            )}
          </div>
          
          {/* Overlay with icon */}
          <div className="circle-overlay">
            {type === 'pdf' ? (
              <Download className="w-6 h-6 text-white" />
            ) : (
              <ExternalLink className="w-6 h-6 text-white" />
            )}
          </div>
        </div>
      </div>
      
      {/* Title and Description */}
      {(title || description) && (
        <div className="circle-button-info">
          {title && <h3 className="circle-button-title">{title}</h3>}
          {description && <p className="circle-button-description">{description}</p>}
        </div>
      )}
    </div>
  );
};

export default CircleButton;