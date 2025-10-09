import { useState, useEffect } from 'react';
import { exportToPDF, exportToCSV, fetchClubNames, fetchLeagueNames } from './ExportUtils';

/**
 * A reusable button component for exporting data to PDF or CSV
 * 
 * @param {Object} props
 * @param {Array} props.data - The data to export
 * @param {String} props.title - The title for the export document
 * @param {Array} props.columns - Column configuration for the export
 * @param {Object} props.pdfOptions - Additional options for PDF export
 * @param {String} props.filename - Filename for the export (without extension)
 * @param {String} props.buttonText - Text to display on the button
 * @param {String} props.className - Additional CSS classes for the button
 */
export default function ExportDataButton({
  data = [],
  title = 'Exported Data',
  columns = [],
  pdfOptions = {},
  filename = 'export',
  buttonText = 'Export',
  className = '',
}) {
  const [clubNames, setClubNames] = useState({});
  const [leagueNames, setLeagueNames] = useState({});

  useEffect(() => {
    const loadNames = async () => {
      const clubs = await fetchClubNames();
      const leagues = await fetchLeagueNames();
      setClubNames(clubs);
      setLeagueNames(leagues);
    };
    
    loadNames();
  }, []);
  const [showOptions, setShowOptions] = useState(false);

  // Handle export to PDF
  const handleExportPDF = () => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }
    exportPDFWithAutoOrientation();
  };

  // Export PDF with automatic orientation
  const exportPDFWithAutoOrientation = () => {
    exportToPDF(data, title, columns, {
      ...pdfOptions,
      filename,
      clubNames,
      leagueNames
    });
    
    setShowOptions(false);
  };

  // Handle export to CSV
  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }
    
    exportToCSV(data, filename, columns);
    
    setShowOptions(false);
  };

  return (
    <div className="export-container relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className={`export-button bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded ${className}`}
      >
        {buttonText}
      </button>
      
      {showOptions && (
        <div className="export-options absolute right-0 mt-2 bg-white border border-gray-300 rounded shadow-lg z-10">
          <button
            onClick={handleExportPDF}
            className="primary-b block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Export as PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="primary-b block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}