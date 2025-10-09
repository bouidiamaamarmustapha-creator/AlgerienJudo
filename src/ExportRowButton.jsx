import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { fetchClubNames, fetchLeagueNames } from './ExportUtils';

/**
 * A button component for exporting a single row of data to PDF
 * 
 * @param {Object} props
 * @param {Object} props.data - The row data to export
 * @param {String} props.title - The title for the PDF document
 * @param {Array} props.fields - Fields to include in the PDF
 * @param {Object} props.labels - Custom labels for fields
 * @param {String} props.buttonText - Text to display on the button
 * @param {String} props.className - Additional CSS classes for the button
 * @param {String} props.logoUrl - URL of logo to include in the PDF
 * @param {Boolean} props.includePhoto - Whether to include the photo in the PDF
 * @param {Object} props.clubName - Club name to display in the PDF
 * @param {Object} props.leagueName - League name to display in the PDF
 */
export default function ExportRowButton({
  data = {},
  title = 'Member Information',
  fields = [],
  labels = {},
  buttonText = 'Export',
  className = '',
  logoUrl = null,
  includePhoto = true,
  clubName = null,
  leagueName = null,
}) {
  const [fetchedClubName, setFetchedClubName] = useState(null);
  const [fetchedLeagueName, setFetchedLeagueName] = useState(null);
  
  useEffect(() => {
    const loadNames = async () => {
      if (data.club_id) {
        const clubs = await fetchClubNames();
        if (clubs[data.club_id]) {
          setFetchedClubName(clubs[data.club_id]);
        }
      }
      
      if (data.league_id) {
        const leagues = await fetchLeagueNames();
        if (leagues[data.league_id]) {
          setFetchedLeagueName(leagues[data.league_id]);
        }
      }
    };
    
    loadNames();
  }, [data.club_id, data.league_id]);
  
  // Show rotation selection modal
  const handleExportPDF = () => {
    if (!data || Object.keys(data).length === 0) {
      alert('No data available to export');
      return;
    }
    exportPDFWithAutoOrientation();
  };

  // Individual record PDF export function with automatic orientation
  const exportPDFWithAutoOrientation = async () => {
    
    // Create a new PDF document
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    // Add federation header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Algerian Judo Federation', 14, 15);
    
    // Add title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 30);
    
    // Add timestamp
    doc.setFontSize(10);
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, 14, 37);
    
    // Add logo if provided
    if (logoUrl) {
      try {
        doc.addImage(logoUrl, 'PNG', 170, 10, 25, 25);
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
      }
    }
    
    // Add person photo if available and includePhoto is true
    let startY = 45;
    if (includePhoto && data.photos_url) {
      try {
        // Display photo smaller (25x20)
        doc.addImage(data.photos_url, 'PNG', 14, 45, 25, 20);
        // Adjust the startY for the table to make room for the photo
        startY = 70;
      } catch (error) {
        console.error('Error adding person photo to PDF:', error);
        startY = 45;
      }
    }
    
    // Add confirmation status
    doc.setFontSize(12);
    if (data.confirmation) {
      doc.setTextColor(0, 128, 0); // Green for confirmed
    } else {
      doc.setTextColor(255, 0, 0); // Red for not confirmed
    }
    const confirmationText = data.confirmation ? "CONFIRMED ✓" : "NOT CONFIRMED ✗";
    doc.text(confirmationText, 160, 50);
    
    // Determine which fields to include
    const fieldsToInclude = fields.length > 0 ? fields : Object.keys(data);
    
    // Prepare data for the table
    const tableData = fieldsToInclude.map(field => {
      const label = labels[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      return [label, data[field] || ''];
    });
    
    // Generate the table
    autoTable(doc, {
      startY: startY,
      head: [['Field', 'Value']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { overflow: 'linebreak' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' }
      }
    });
    
    // Add medical certificate text under the table
    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Medical certificate", 14, finalY + 20);
    
    // Add space for signature
    doc.setDrawColor(0);
    doc.line(14, finalY + 40, 80, finalY + 40); // Signature line
    
    // Add club and league information if available
     doc.setFontSize(10);
     
     // Display club information
     if (data.club_id || clubName) {
       const displayClubName = clubName || fetchedClubName || (data.club_name ? data.club_name : `ID: ${data.club_id}`);
       doc.text(`Club: ${displayClubName}`, 14, finalY + 60);
       doc.text("Club Visa: _________________", 14, finalY + 70);
     }
     
     // Display league information
     if (data.league_id || leagueName) {
       const displayLeagueName = leagueName || fetchedLeagueName || (data.league_name ? data.league_name : `ID: ${data.league_id}`);
       doc.text(`League: ${displayLeagueName}`, 120, finalY + 60);
       doc.text("League Visa: _________________", 120, finalY + 70);
     }

    // Add QR code at the bottom of the page
    try {
      const qrData = JSON.stringify({
        id: data.id,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        license: data.license_number || '',
        club_id: data.club_id || '',
        league_id: data.league_id || ''
      });
      
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 60,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Add QR code at bottom right corner (small size: 15x15)
      doc.addImage(qrCodeDataURL, 'PNG', 180, finalY + 75, 15, 15);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
    
    // Save the PDF
    const filename = `${title.toLowerCase().replace(/ /g, '_')}_${data.id || 'record'}.pdf`;
    doc.save(filename);
  };

  return (
    <button
      onClick={handleExportPDF}
      className={`export-row-button bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded text-sm ${className}`}
      title="Export this record as PDF"
    >
      {buttonText}
    </button>
  );
}