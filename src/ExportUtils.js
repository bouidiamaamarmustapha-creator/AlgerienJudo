import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabaseClient';

// Super aggressive PDF sanitization function
export const sanitizeForPDF = (text) => {
  if (!text) return '';
  
  let cleanText = String(text);
  
  // ULTRA AGGRESSIVE % REMOVAL - Multiple passes
  for (let i = 0; i < 5; i++) {
    cleanText = cleanText
      .replace(/%%%/g, '')
      .replace(/%\s+%%%/g, '')
      .replace(/%\s{1,}%%%/g, '')
      .replace(/%%\s+%/g, '')
      .replace(/%\s{1,}%\s{1,}%/g, '')
      .replace(/\s*%\s*%\s*%\s*/g, '')
      .replace(/\s*%\s{1,}%\s{1,}%\s*/g, '')
      .replace(/%+/g, '')
      .replace(/%/g, '');
  }
  
  // Remove any remaining problematic characters
  cleanText = cleanText
    .replace(/[^\w\s\-\.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleanText;
};

// Sanitize text to remove problematic characters like %%%
export const sanitizeText = (text) => {
  if (!text) return '';
  
  // Convert to string and apply multiple rounds of cleaning
  let cleanText = String(text);
  
  // DEBUG: Log original text if it contains %
  if (cleanText.includes('%')) {
    console.log('🔍 SANITIZE DEBUG - Original text with %:', cleanText);
    console.log('🔍 Character codes:', cleanText.split('').map(char => `${char}(${char.charCodeAt(0)})`).join(' '));
  }
  
  // ROUND 1: Remove all percentage-related patterns (most aggressive)
  cleanText = cleanText
    // TARGET SPECIFIC PATTERNS FIRST
    .replace(/%%%/g, '')                    // Remove exact %%%
    .replace(/%\s+%%%/g, '')               // Remove %   %%%
    .replace(/%\s{1,}%%%/g, '')            // Remove % with any spaces before %%%
    .replace(/%%\s+%/g, '')                // Remove %%   %
    .replace(/%\s{1,}%\s{1,}%/g, '')       // Remove % % % with spaces
    .replace(/\s*%\s*%\s*%\s*/g, '')       // Remove %%% with any spaces around
    .replace(/\s*%\s{1,}%\s{1,}%\s*/g, '') // Remove spaced % % % patterns
    
    // Remove any sequence of % characters (1 or more)
    .replace(/%+/g, '')
    // Remove % with any characters between them
    .replace(/%.*?%/g, '')
    // Remove % at start or end of words
    .replace(/\b%/g, '')
    .replace(/%\b/g, '')
    // Remove % with spaces around them
    .replace(/\s*%\s*/g, ' ')
    // Remove URL-encoded characters
    .replace(/%[0-9A-Fa-f]{2}/g, '')
    // Remove specific percentage patterns
    .replace(/%%/g, '')
    .replace(/%\s+%/g, '')
    // Remove percentage with any surrounding characters
    .replace(/[^\w\s]%[^\w\s]/g, '');
  
  // ROUND 2: Remove specific corrupted character sequences
  cleanText = cleanText
    .replace(/Ø=UÈ/g, '')
    .replace(/Ø<ða/g, '')
    .replace(/Ø=Ud/g, '')
    .replace(/Ø-ÜÈ/g, '')
    .replace(/Ø-Üd/g, '')
    .replace(/Ø<Ða/g, '')
    .replace(/Ø<ßà/g, '')
    .replace(/Ø/g, '') // Remove any remaining Ø characters
    // Remove other problematic characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\uFFFD/g, '') // Remove replacement character
    .replace(/[^\w\s\-\.]/g, ''); // Keep only word characters, spaces, hyphens, and dots
  
  // ROUND 3: Fix common encoding issues
  cleanText = cleanText
    .replace(/Ã¸/g, 'ø')
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã /g, 'à')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã»/g, 'û')
    .replace(/Ã®/g, 'î')
    .replace(/Ã¯/g, 'ï')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã«/g, 'ë')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã¤/g, 'ä');
  
  // ROUND 4: Final cleanup
  cleanText = cleanText
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing spaces
  
  // ROUND 5: One more aggressive % removal pass
  cleanText = cleanText.replace(/%/g, '');
  
  // DEBUG: Log final result if original contained %
  if (String(text).includes('%')) {
    console.log('🔍 SANITIZE DEBUG - Final cleaned text:', cleanText);
    console.log('🔍 Still contains %?', cleanText.includes('%'));
  }
  
  return cleanText;
};

/**
 * Exports data to PDF format
 * @param {Array} data - The data to export
 * @param {String} title - The title of the PDF document
 * @param {Array} columns - The columns configuration for the table
 * @param {Object} options - Additional options for PDF generation
 * @param {Boolean} options.includePhotos - Whether to include photos in the PDF
 * @param {String} options.photoField - The field name containing photo URLs
 * @param {Object} options.clubNames - Map of club_id to club names
 * @param {Object} options.leagueNames - Map of league_id to league names
 */
export const exportToPDF = (data, title = 'Export Data', columns = [], options = {}) => {
  // Create a new PDF document
  const doc = new jsPDF(options.orientation || 'portrait', 'mm', options.pageSize || 'a4');
  
  // Add federation header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  const federationName = sanitizeForPDF(options.federationName || 'Algerian Judo Federation');
  doc.text(federationName, 14, 15);
  
  // Add title
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  const cleanTitle = sanitizeForPDF(title);
  doc.text(cleanTitle, 14, 30);
  
  // Add timestamp
  doc.setFontSize(10);
  const timestamp = new Date().toLocaleString();
  doc.text(`Generated: ${timestamp}`, 14, 37);
  
  // Add logo if provided
  if (options.logoUrl) {
    try {
      doc.addImage(options.logoUrl, 'PNG', 170, 10, 25, 25);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }
  
  // Set initial Y position for table
  let startY = 45;
  
  // Add photos if requested
  if (options.includePhotos && options.photoField) {
    const photoField = options.photoField || 'photos_url';
    const photoWidth = options.photoWidth || 30; // Width larger than height for horizontal display
    const photoHeight = options.photoHeight || 20;
    const photosPerRow = options.photosPerRow || 5;
    const photoSpacing = options.photoSpacing || 5;
    
    // Filter data to only include items with photos
    const itemsWithPhotos = data.filter(item => item[photoField]);
    
    if (itemsWithPhotos.length > 0) {
      // Calculate how many rows of photos we need
      const photoRows = Math.ceil(itemsWithPhotos.length / photosPerRow);
      
      // Add photos in a grid
      let currentRow = 0;
      let currentCol = 0;
      
      itemsWithPhotos.forEach((item, index) => {
          try {
            const xPos = 14 + (currentCol * (photoWidth + photoSpacing));
            const yPos = 50 + (currentRow * (photoHeight + photoSpacing + 10));
          
          // Display photos horizontally (wider than tall)
          doc.addImage(item[photoField], 'PNG', xPos, yPos, photoWidth, photoHeight);
          
          // Add name under photo if available
          if (item.first_name && item.last_name) {
            doc.setFontSize(8);
            doc.text(`${item.first_name} ${item.last_name}`, xPos, yPos + photoHeight + 5, {
              maxWidth: photoWidth
            });
          } else if (item.first_name || item.last_name) {
            doc.setFontSize(8);
            doc.text(`${item.first_name || ''} ${item.last_name || ''}`.trim(), xPos, yPos + photoHeight + 5, {
              maxWidth: photoWidth
            });
          }
          
          // Add confirmation status if available
          if (item.hasOwnProperty('confirmation')) {
            doc.setFontSize(6);
            if (item.confirmation) {
              doc.setTextColor(0, 128, 0); // Green for confirmed
            } else {
              doc.setTextColor(255, 0, 0); // Red for not confirmed
            }
            const confirmText = item.confirmation ? "✓" : "✗";
            doc.text(confirmText, xPos + photoWidth - 5, yPos + 5);
            doc.setTextColor(0, 0, 0); // Reset text color
          }
          
          // Move to next column or row
          currentCol++;
          if (currentCol >= photosPerRow) {
            currentCol = 0;
            currentRow++;
          }
        } catch (error) {
          console.error(`Error adding photo for item ${index}:`, error);
        }
      });
      
      // Update startY to position table below photos
      if (photoRows > 0) {
        startY = 30 + (photoRows * (photoHeight + photoSpacing + 15));
      }
    }
  }
  
  // Prepare columns for autotable
  const tableColumns = columns.length > 0 
    ? columns.map(col => ({ header: col.header, dataKey: col.dataKey }))
    : Object.keys(data[0] || {}).map(key => ({ header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), dataKey: key }));
  
  // Helper function to get nested property value
  const getNestedValue = (obj, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Prepare table data with final sanitization
  const tableRows = data.map(item => {
    const row = {};
    tableColumns.forEach(col => {
      let value = getNestedValue(item, col.dataKey) || item[col.dataKey];
      // FINAL SANITIZATION: Use super-aggressive PDF sanitization
      if (typeof value === 'string') {
        value = sanitizeForPDF(value);
      }
      row[col.dataKey] = value;
    });
    return row;
  });
  
  // Generate the table
  autoTable(doc, {
    startY: startY,
    head: [tableColumns.map(col => col.header)],
    body: tableRows.map(row => tableColumns.map(col => row[col.dataKey])),
    theme: options.theme || 'striped',
    headStyles: { fillColor: options.headerColor || [40, 40, 40] },
    margin: { top: 30 },
    styles: { overflow: 'linebreak' },
    columnStyles: options.columnStyles || {}
  });
  
  // Add medical certificate text and club/league information after the table
  const finalY = doc.lastAutoTable.finalY || 200;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Medical certificate", 14, finalY + 20);
  
  // Add space for signature
  doc.setDrawColor(0);
  doc.line(14, finalY + 40, 80, finalY + 40); // Signature line
  
  // Add club and league information if available in the data
  if (data.length > 0) {
    doc.setFontSize(10);
    
    // Check if we have club_id and league_id in the data
    const hasClubId = data.some(item => item.club_id);
    const hasLeagueId = data.some(item => item.league_id);
    
    if (hasClubId) {
      // Get the first club_id to display club information
      const firstClubItem = data.find(item => item.club_id);
      if (firstClubItem) {
        const clubId = firstClubItem.club_id;
        const clubName = options.clubNames && options.clubNames[clubId] 
          ? options.clubNames[clubId] 
          : `ID: ${clubId}`;
        
        doc.text(`Club: ${sanitizeText(clubName)}`, 14, finalY + 60);
        doc.text("Club Visa: _________________", 14, finalY + 70);
      }
    }
    
    if (hasLeagueId) {
      // Get the first league_id to display league information
      const firstLeagueItem = data.find(item => item.league_id);
      if (firstLeagueItem) {
        const leagueId = firstLeagueItem.league_id;
        const leagueName = options.leagueNames && options.leagueNames[leagueId] 
          ? options.leagueNames[leagueId] 
          : `ID: ${leagueId}`;
        
        doc.text(`League: ${sanitizeText(leagueName)}`, 120, finalY + 60);
        doc.text("League Visa: _________________", 120, finalY + 70);
      }
    }
  }
  
  // Save the PDF
  doc.save(`${options.filename || title.toLowerCase().replace(/ /g, '_')}.pdf`);
};

/**
 * Fetches club names from the nameclub table
 * @returns {Promise<Object>} Map of club_id to club names
 */
export const fetchClubNames = async () => {
  try {
    const { data, error } = await supabase
      .from('nameclub')
      .select('id, name_club');
    
    if (error) throw error;
    
    // Create a map of club_id to club name
    const clubNames = {};
    data.forEach(club => {
      clubNames[club.id] = club.name_club;
    });
    
    return clubNames;
  } catch (error) {
    console.error('Error fetching club names:', error);
    return {};
  }
};

/**
 * Fetches league names from the nameleague table
 * @returns {Promise<Object>} Map of league_id to league names
 */
export const fetchLeagueNames = async () => {
  try {
    const { data, error } = await supabase
      .from('nameleague')
      .select('id, name_league');
    
    if (error) throw error;
    
    // Create a map of league_id to league name
    const leagueNames = {};
    data.forEach(league => {
      leagueNames[league.id] = league.name_league;
    });
    
    return leagueNames;
  } catch (error) {
    console.error('Error fetching league names:', error);
    return {};
  }
};

/**
 * Exports data to CSV format
 * @param {Array} data - The data to export
 * @param {String} filename - The name of the CSV file
 * @param {Array} columns - The columns to include in the CSV
 */
export const exportToCSV = (data, filename = 'export', columns = []) => {
  // Determine which fields to export
  const fields = columns.length > 0 
    ? columns.map(col => col.field)
    : Object.keys(data[0] || {});
  
  // Create CSV header row
  const header = columns.length > 0
    ? columns.map(col => col.header || col.field).join(',')
    : fields.join(',');
  
  // Create CSV rows
  const csvRows = data.map(item => {
    return fields.map(field => {
      const value = item[field];
      // Handle values that might contain commas or quotes
      if (value === null || value === undefined) {
        return '';
      }
      const valueStr = String(value);
      if (valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n')) {
        return `"${valueStr.replace(/"/g, '""')}"`;  // Escape quotes
      }
      return valueStr;
    }).join(',');
  });
  
  // Combine header and rows
  const csvContent = [header, ...csvRows].join('\n');
  
  // Create a download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};