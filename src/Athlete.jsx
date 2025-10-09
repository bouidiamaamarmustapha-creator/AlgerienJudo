import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, User, Calendar, MapPin, Award, Heart, IdCard, Users, Trophy, QrCode } from "lucide-react";
import { supabase } from "./supabaseClient";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import logo from "./assets/logo.png";
import certificateBackground from "./assets/certificat-de-judo2.png";
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from "./components/BarLoading";
import CircleLoading from "./components/CircleLoading";
import QRCode from "qrcode";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchClubNames, fetchLeagueNames } from './ExportUtils';
import loadImage from 'blueimp-load-image'; 

export default function Athlete() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [federationLogo, setFederationLogo] = useState("");
  const [federationName, setFederationName] = useState("Algeria Federation");
  const [athleteData, setAthleteData] = useState(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState("");
  const [relatedAthletes, setRelatedAthletes] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [allAthletes, setAllAthletes] = useState([]);
  const [loadingAllAthletes, setLoadingAllAthletes] = useState(false);
  const [clubName, setClubName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [certificateQrUrl, setCertificateQrUrl] = useState("");
  
  // Get athlete data from navigation state
  useEffect(() => {
    if (location.state) {
      console.log(" Athlete data received:", location.state);
      console.log(" Photo URL field (photos_url):", location.state.photos_url);
      console.log(" Photo URL field (photo_url):", location.state.photo_url);
      console.log(" All available fields:", Object.keys(location.state));
      setAthleteData(location.state);
    } else {
      console.log("❌ No athlete data found in navigation state");
      // Redirect to home if no data
      navigate("/");
    }
  }, [location.state, navigate]);

  // Fetch club and league names when athlete data is available
  useEffect(() => {
    const fetchNames = async () => {
      if (!athleteData?.club_id && !athleteData?.league_id) return;
      
      try {
        // Fetch club name
        if (athleteData.club_id) {
          const clubNames = await fetchClubNames();
          const clubName = clubNames[athleteData.club_id];
          setClubName(clubName || `Club ID: ${athleteData.club_id}`);
        }
        
        // Fetch league name
        if (athleteData.league_id) {
          const leagueNames = await fetchLeagueNames();
          const leagueName = leagueNames[athleteData.league_id];
          setLeagueName(leagueName || `League ID: ${athleteData.league_id}`);
        }
      } catch (error) {
        console.error('Error fetching club/league names:', error);
        // Fallback to showing IDs
        if (athleteData.club_id) setClubName(`Club ID: ${athleteData.club_id}`);
        if (athleteData.league_id) setLeagueName(`League ID: ${athleteData.league_id}`);
      }
    };

    fetchNames();
  }, [athleteData]);

  // Generate QR code when athlete data is available
  useEffect(() => {
    if (athleteData) {
      const generateQRCode = async () => {
        try {
          const qrData = JSON.stringify({
            id: athleteData.id,
            name: `${athleteData.first_name || ''} ${athleteData.last_name || ''}`.trim(),
            license: athleteData.license_number || '',
            club_id: athleteData.club_id || '',
            league_id: athleteData.league_id || '',
            confirmation: athleteData.confirmation || 'Unconfirmed'
          });
          
          const qrCodeURL = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          setQrCodeDataURL(qrCodeURL);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      };
      
      generateQRCode();
    }
  }, [athleteData]);

  // Certificate QR (first name, last name, DOB, POB)
  useEffect(() => {
    if (athleteData && athleteData.grade === 'black belt') {
      const payload = {
        first_name: athleteData.first_name || '',
        last_name: athleteData.last_name || '',
        date_of_birth: athleteData.date_of_birth || '',
        place_of_birth: athleteData.place_of_birth || ''
      };
      QRCode.toDataURL(JSON.stringify(payload), { width: 240, margin: 1 })
        .then((url) => setCertificateQrUrl(url))
        .catch((err) => console.error('Error generating certificate QR:', err));
    } else {
      setCertificateQrUrl("");
    }
  }, [athleteData]);

  // Fetch federation logo
  useEffect(() => {
    const fetchFederationLogo = async () => {
      try {
        const { data, error } = await supabase
          .from("logo")
          .select("logo_url")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          setFederationLogo(data[0].logo_url);
        }
      } catch (error) {
        console.error("Error fetching federation logo:", error);
      }
    };

    fetchFederationLogo();
  }, []);

  // Fetch all athletes from database
  useEffect(() => {
    const fetchAllAthletes = async () => {
      setLoadingAllAthletes(true);
      try {
        const { data, error } = await supabase
          .from("athletes")
          .select("*")
          .order("id", { ascending: false });

        if (!error && data) {
          setAllAthletes(data);
          console.log("🏃‍♂️ All athletes fetched:", data.length, "athletes");
        } else {
          console.error("Error fetching all athletes:", error);
        }
      } catch (error) {
        console.error("Error fetching all athletes:", error);
      } finally {
        setLoadingAllAthletes(false);
      }
    };

    fetchAllAthletes();
  }, []);

  // Fetch related athletes with same national_id_number
  useEffect(() => {
    const fetchRelatedAthletes = async () => {
      if (!athleteData?.national_id_number) return;
      
      setLoadingRelated(true);
      try {
        const nationalId = athleteData.national_id_number;
        
        // Fetch from athletes table
        const { data: athletesData, error: athletesError } = await supabase
          .from("athletes")
          .select("*")
          .eq("national_id_number", nationalId);

        // Fetch from league_members table
        const { data: leagueData, error: leagueError } = await supabase
          .from("league_members")
          .select("*")
          .eq("national_id_number", nationalId);

        // Fetch from club_members table
        const { data: clubData, error: clubError } = await supabase
          .from("club_members")
          .select("*")
          .eq("national_id_number", nationalId);

        // Combine all data and add source information
        const allRelated = [];
        
        if (athletesData && !athletesError) {
          athletesData.forEach(athlete => {
            allRelated.push({
              ...athlete,
              source: 'Athletes',
              table_type: 'athletes'
            });
          });
        }

        if (leagueData && !leagueError) {
          leagueData.forEach(member => {
            allRelated.push({
              ...member,
              source: 'League Members',
              table_type: 'league_members'
            });
          });
        }

        if (clubData && !clubError) {
          clubData.forEach(member => {
            allRelated.push({
              ...member,
              source: 'Club Members',
              table_type: 'club_members'
            });
          });
        }

        setRelatedAthletes(allRelated);
        console.log("🔍 Related athletes found:", allRelated);
        
      } catch (error) {
        console.error("Error fetching related athletes:", error);
      } finally {
        setLoadingRelated(false);
      }
    };

    fetchRelatedAthletes();
  }, [athleteData]);

  
      // Function to generate Judo Certificate PDF with background image
  const generateJudoCertificate = async (athleteData) => {
    try {
      setLoading(true);
      
      // Create new PDF document in landscape orientation (using points for better precision)
      const doc = new jsPDF('landscape', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const athleteName = `${athleteData.first_name || ''} ${athleteData.last_name || ''}`.trim();
      
      try {
        // Add the background image using addImage
        doc.addImage(certificateBackground, 'PNG', 0, 0, pageWidth, pageHeight);
        
        // Add text over the background image (English only, positioned more to the right)
        // Set text color to black for visibility
        doc.setTextColor(0, 0, 0);
        
        // Ministry text at the top (English only)
        doc.setFontSize(14);
        doc.setFont('times', 'normal');
        doc.text('The Ministry of Youth and Sports', (pageWidth / 2) + 80, 105, { align: 'center' });
        
        // Federation name (English only)
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.text('Algerian judo federation', (pageWidth / 2) + 80, 130, { align: 'center' });
        
        // Certificate title
        doc.setFontSize(24);
        doc.setFont('times', 'bold');
        doc.text('Judo Certificate', (pageWidth / 2) + 80, 200, { align: 'center' });
        
        // Main certificate text
        doc.setFontSize(16);
        doc.setFont('times', 'normal');
        
        // First line: "Mr. [Name] belt Black is hereby awarded"
        doc.text(`Mr. ${athleteName} belt Black is hereby awarded`, (pageWidth / 2) + 80, 240, { align: 'center' });
        
        // Empty line space
        
        // Second line: "this certificate, in recognition of his progress, his sporting qualities,"
        doc.text('this certificate, in recognition of his progress, his sporting qualities,', (pageWidth / 2) + 80, 280, { align: 'center' });
        
        // Empty line space
        
        // Third line: "his loyalty to his school, and to the spirit of Judo."
        doc.text('his loyalty to his school, and to the spirit of Judo.', (pageWidth / 2) + 80, 320, { align: 'center' });
        
        // President and Instructor labels at the bottom (moved more to the right)
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.text('The President:', 260, 400);
        doc.text('The Instructor:', 600, 400);
        
      } catch (imageError) {
        console.warn('Failed to load background image, using fallback design:', imageError);
        
        // Fallback: Create a beautiful certificate design without background image
        // Add thick black border
        doc.setLineWidth(4);
        doc.setDrawColor(0, 0, 0);
        doc.rect(20, 20, pageWidth - 40, pageHeight - 40);
        
        // Add decorative inner border
        doc.setLineWidth(1);
        doc.rect(40, 40, pageWidth - 80, pageHeight - 80);
        
        // Set text color to black
        doc.setTextColor(0, 0, 0);
        
        // Ministry text at the top (English only)
        doc.setFontSize(14);
        doc.setFont('times', 'normal');
        doc.text('The Ministry of Youth and Sports', (pageWidth / 2) + 80, 105, { align: 'center' });
        
        // Federation name (English only)
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.text('Algerian judo federation', (pageWidth / 2) + 80, 130, { align: 'center' });
        
        // Certificate title
        doc.setFontSize(24);
        doc.setFont('times', 'bold');
        doc.text('Judo Certificate', (pageWidth / 2) + 80, 200, { align: 'center' });
        
        // Main certificate text
        doc.setFontSize(16);
        doc.setFont('times', 'normal');
        
        // First line: "Mr. [Name] belt Black is hereby awarded"
        doc.text(`Mr. ${athleteName} belt Black is hereby awarded`, (pageWidth / 2) + 80, 240, { align: 'center' });
        
        // Second line: "this certificate, in recognition of his progress, his sporting qualities,"
        doc.text('this certificate, in recognition of his progress, his sporting qualities,', (pageWidth / 2) + 80, 280, { align: 'center' });
        
        // Third line: "his loyalty to his school, and to the spirit of Judo."
        doc.text('his loyalty to his school, and to the spirit of Judo.', (pageWidth / 2) + 80, 320, { align: 'center' });
        
        // President and Instructor labels at the bottom (moved more to the right)
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.text('The President:', 260, 400);
        doc.text('The Instructor:', 600, 400);
      } 
      
      // Add certificate QR to the PDF if available (black belt only)
      try {
        if (certificateQrUrl) {
          const qrSize = 32; // very small QR size in jsPDF points
          const qrX = pageWidth - qrSize - 60; // right margin
          const qrY = pageHeight - qrSize - 80; // bottom margin

          // Embed the QR image
          doc.addImage(certificateQrUrl, 'PNG', qrX, qrY, qrSize, qrSize);

          // Optional caption below the QR
          doc.setFontSize(7);
          doc.setFont('times', 'normal');
          doc.text('Scan to verify certificate', qrX + qrSize / 2, qrY + qrSize + 10, { align: 'center' });
        }
      } catch (qrErr) {
        console.warn('Failed to add certificate QR to PDF:', qrErr);
      }

      // Save the PDF
      const fileName = `Judo_Certificate_${athleteName.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`;
      doc.save(fileName);
      
      setSuccessMessage('Judo Certificate generated successfully!');
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Error generating Judo Certificate:', error);
      setErrorMessage('Failed to generate Judo Certificate. Please try again.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  // Function to normalize image orientation using EXIF data with fallback
  function normalizeImage(url) {
        return new Promise((resolve, reject) => {
          // First try to load with EXIF orientation correction
          loadImage(
            url,
            (canvas) => {
              if (canvas.type === "error") {
                console.warn("EXIF processing failed, using original image:", url);
                // Fallback: return the original URL if EXIF processing fails
                resolve(url);
              } else {
                try {
                  const dataURL = canvas.toDataURL("image/png");
                  resolve(dataURL); // returns normalized base64
                } catch (error) {
                  console.warn("Canvas conversion failed, using original image:", error);
                  resolve(url); // Fallback to original URL
                }
              }
            },
            { 
              orientation: true, 
              canvas: true,
              crossOrigin: 'anonymous' // Try to handle CORS
            }
          );
        });
      }

  // Handle PDF export for related athletes
  // Show rotation selection modal
      const handleExportPDF = (data) => {
        console.log('🎯 handleExportPDF called with data:', data);
        console.log('📊 Data type:', typeof data);
        console.log('📋 Data keys:', data ? Object.keys(data) : 'No data');
        console.log('🆔 national_id_number in data:', data?.national_id_number);
        
        if (!data || Object.keys(data).length === 0) {
          console.error('❌ No data available to export');
          alert('No data available to export');
          return;
        }
        
        console.log('✅ Data validation passed, calling exportPDFWithAutoOrientation...');
        exportPDFWithAutoOrientation(data);
      };

   // Individual athlete PDF export function with automatic orientation
      const exportPDFWithAutoOrientation = async (data) => {
      console.log('🚀 PDF Generation - Starting with data:', data);
      
      if (!data || (!data.primary_id && !data.national_id_number)) {
        console.error('❌ No data or primary_id/national_id_number provided for PDF generation');
        alert('No valid data available for PDF generation');
        return;
      }

      try {
        // Determine the table and ID field to use based on table_source
        const tableSource = data.table_source || 'athletes';
        const idField = 'id'; // All tables use 'id' as primary key
        const idValue = data.primary_id || data.id;
        
        console.log('🔍 Fetching complete athlete data from database...');
        console.log('📊 Table source:', tableSource);
        console.log('🆔 ID field:', idField);
        console.log('🔢 ID value:', idValue);
        
        // Fetch complete athlete data from the appropriate table using the correct ID
        const { data: completeAthleteData, error: athleteError } = await supabase
          .from(tableSource)
          .select("*")
          .eq(idField, idValue)
          .single();

        if (athleteError || !completeAthleteData) {
          console.error('❌ Error fetching athlete data:', athleteError);
          console.log('🔄 Falling back to national_id_number query...');
          
          // Fallback to national_id_number if primary ID fails
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("athletes")
            .select("*")
            .eq("national_id_number", data.national_id_number)
            .single();
            
          if (fallbackError || !fallbackData) {
            console.error('❌ Fallback query also failed:', fallbackError);
            alert('Error fetching complete athlete data from database');
            return;
          }
          
          console.log('✅ Fallback athlete data fetched:', fallbackData);
          var athleteDataForPDF = fallbackData;
        } else {
          console.log('✅ Complete athlete data fetched:', completeAthleteData);
          var athleteDataForPDF = completeAthleteData;
        }
        
        console.log('✅ Using complete athlete data for PDF:', athleteDataForPDF);
        
        // Fetch club and league names
        let fetchedClubName = null;
        let fetchedLeagueName = null;
        
        try {
          console.log('🔍 Fetching club and league names...');
          
          if (athleteDataForPDF.club_id) {
            console.log('🏢 Fetching club name for ID:', athleteDataForPDF.club_id);
            const clubNames = await fetchClubNames();
            console.log('🏢 Club names object:', clubNames);
            fetchedClubName = clubNames[athleteDataForPDF.club_id];
            console.log('🏢 Fetched club name:', fetchedClubName);
          } else {
            console.log('⚠️ No club_id found in athlete data');
          }
          
          if (athleteDataForPDF.league_id) {
            console.log('🏆 Fetching league name for ID:', athleteDataForPDF.league_id);
            const leagueNames = await fetchLeagueNames();
            console.log('🏆 League names object:', leagueNames);
            fetchedLeagueName = leagueNames[athleteDataForPDF.league_id];
            console.log('🏆 Fetched league name:', fetchedLeagueName);
          } else {
            console.log('⚠️ No league_id found in athlete data');
          }
        } catch (error) {
          console.error('❌ Error fetching names:', error);
        }
        
        // Create a new PDF document
        const doc = new jsPDF('portrait', 'mm', 'a4');
        
        // Add federation header
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Algerian Judo Federation', 14, 15);
        
        // Add title
        const title = `Athlete Information - ${athleteDataForPDF.first_name} ${athleteDataForPDF.last_name}`;
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text(title, 14, 30);
        
        // Add timestamp
        doc.setFontSize(10);
        const timestamp = new Date().toLocaleString();
        doc.text(`Generated: ${timestamp}`, 14, 37);
        
        // Add logo if provided
        if (federationLogo) {
          try {
            doc.addImage(federationLogo, 'PNG', 170, 10, 25, 25);
          } catch (error) {
            console.error('Error adding logo to PDF:', error);
          }
        }
        
        // Add member photo if available 
        let startY = 70; 
        if (data.photos_url) { 
          try { 
            const fixedPhoto = await normalizeImage(data.photos_url); 
            // Determine image format based on whether it's a data URL or regular URL 
            const imageFormat = fixedPhoto.startsWith('data:') ? "PNG" : "JPEG"; 
            doc.addImage(fixedPhoto, imageFormat, 14, 45, 25, 20); 
            startY = 70; 
          } catch (error) { 
            console.error("Error adding photo to PDF:", error); 
            // If all else fails, try to add the original image directly 
            try { 
              doc.addImage(data.photos_url, "JPEG", 14, 45, 25, 20); 
            } catch (fallbackError) { 
              console.error("Fallback image addition also failed:", fallbackError); 
            } 
            startY = 70; 
          } 
        }
        
        // Add confirmation status
        doc.setFontSize(12);
        if (athleteDataForPDF.confirmation) {
          doc.setTextColor(0, 128, 0); // Green for confirmed
        } else {
          doc.setTextColor(255, 0, 0); // Red for not confirmed
        }
        const confirmationText = athleteDataForPDF.confirmation ? "CONFIRMED ✓" : "NOT CONFIRMED ✗";
        doc.text(confirmationText, 160, 50);
        
        // Prepare data for the table
        // Define all possible fields with their labels
        const allFields = {
          last_name: 'Last Name',
          first_name: 'First Name',
          date_of_birth: 'Date of Birth',
          place_of_birth: 'Place of Birth',
          role: 'Role',
          blood_type: 'Blood Type',
          national_id_number: 'National ID',
          nationality: 'Nationality',
          grade: 'Grade',
          genres: 'Gender',
          categories: 'Category',
          weight: 'Weight',
          license_number: 'License Number',
          registration_date: 'Registration Date',
          year: 'Year',
          renewal: 'Renewal',
          confirmation: 'Confirmation Status'
        };
        
        // Filter to only include fields that have actual data (not null, undefined, or empty string)
        const availableFields = Object.keys(allFields).filter(field => 
          athleteDataForPDF[field] !== null && 
          athleteDataForPDF[field] !== undefined && 
          athleteDataForPDF[field] !== '' && 
          athleteDataForPDF[field] !== 'null'
        );
        
        console.log('PDF Generation - All data fields:', Object.keys(athleteDataForPDF));
        console.log('PDF Generation - Available fields with data:', availableFields);
        console.log('PDF Generation - Fields with no data:', Object.keys(allFields).filter(field => !availableFields.includes(field)));
        
        const tableData = availableFields.map(field => {
          const label = allFields[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
          return [label, athleteDataForPDF[field]];
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
        if (athleteDataForPDF.club_id) {
          const displayClubName = fetchedClubName || `Club ID: ${athleteDataForPDF.club_id}`;
          doc.text(`Club: ${displayClubName}`, 14, finalY + 60);
          doc.text("Club Visa: _________________", 14, finalY + 70);
        }
        
        // Display league information
        if (athleteDataForPDF.league_id) {
          const displayLeagueName = fetchedLeagueName || `League ID: ${athleteDataForPDF.league_id}`;
          doc.text(`League: ${displayLeagueName}`, 120, finalY + 60);
          doc.text("League Visa: _________________", 120, finalY + 70);
        }

        // Add QR code at the bottom of the page
        try {
          const qrData = JSON.stringify({
            id: athleteDataForPDF.id,
            name: `${athleteDataForPDF.first_name || ''} ${athleteDataForPDF.last_name || ''}`.trim(),
            license: athleteDataForPDF.license_number || '',
            club_id: athleteDataForPDF.club_id || '',
            league_id: athleteDataForPDF.league_id || '',
            confirmation: athleteDataForPDF.confirmation || 'Unconfirmed'
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
        const filename = `athlete_${athleteDataForPDF.first_name}_${athleteDataForPDF.last_name}_${athleteDataForPDF.id || 'record'}.pdf`;
        console.log('Saving PDF with filename:', filename);
        doc.save(filename);
        console.log('PDF generation completed successfully');
        
      } catch (error) {
        console.error('Error in PDF generation:', error);
        alert(`Error generating PDF: ${error.message}`);
      }
    };

  const handleBackHome = () => {
    navigate("/");
  };

  if (!athleteData) {
    return (
      <div className="page-container">
        <BarLoading />
        <div className="content-box">
          <div className="text-center p-8">
            <p>Loading athlete information...</p>
          </div>
        </div>



      </div>
    );
  }

  return (
    <div className="page-container">
      {loading && <BarLoading />}
      <div className="content-box">
        {/* Header */}
        <header className="bg-white text-gray-800 p-6 shadow-lg border-b-4 border-red-500">
          <div className="federation-header">
            {federationLogo ? (
              <img
                src={federationLogo}
                alt="Federation Logo"
                className="federation-logo"
              />
            ) : (
              <Shield className="w-16 h-16 text-green-700" />
            )}
            <h1 className="federation-title">{federationName}</h1>
          </div>
        </header>

        {/* Back Home Button */}
        <BackHomeButton />

        {/* Athlete Profile Section */}
        <div className="athlete-profile">
          
          <h2 className="form-title">Athlete Profile</h2>

          {/* Form Grid Layout */}
          <div className="form-grid">
            {/* Photo Section */}
            <div className="photo-section">
              {(athleteData.photos_url || athleteData.photo_url) ? (
                <img
                  src={athleteData.photos_url || athleteData.photo_url}
                  alt={`${athleteData.first_name} ${athleteData.last_name}`}
                  className="athlete-photo"
                />
              ) : (
                <div className="photo-placeholder">
                  <User />
                </div>
              )}
              <h3>
                {athleteData.first_name} {athleteData.last_name}
              </h3>
              <p>
                {athleteData.role || "Athlete"}
              </p>
              {athleteData.confirmation && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm mt-2">
                  ✓ Confirmed
                </span>
              )}
            </div>

            {/* Information Grid */}
            <div className="info-grid">
              {/* Personal Information */}
              <div className="info-card">
                <h3>
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>
                <div className="info-item">
                  <span className="info-label">First Name:</span>
                  <span className="info-value">{athleteData.first_name || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Last Name:</span>
                  <span className="info-value">{athleteData.last_name || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Date of Birth:</span>
                  <span className="info-value">{athleteData.date_of_birth || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Place of Birth:</span>
                  <span className="info-value">{athleteData.place_of_birth || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Nationality:</span>
                  <span className="info-value">{athleteData.nationality || "N/A"}</span>
                </div>
              </div>

              {/* Athletic Information */}
              <div className="info-card">
                <h3>
                  <Trophy className="w-5 h-5" />
                  Athletic Information
                </h3>
                <div className="info-item">
                  <span className="info-label">Grade:</span>
                  <span className="info-value">{athleteData.grade || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Category:</span>
                  <span className="info-value">{athleteData.categories || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Weight:</span>
                  <span className="info-value">{athleteData.weight || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Gender:</span>
                  <span className="info-value">{athleteData.genres || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">License Number:</span>
                  <span className="info-value">{athleteData.license_number || "N/A"}</span>
                </div>
              </div>

              {/* Medical Information */}
              <div className="info-card">
                <h3>
                  <Heart className="w-5 h-5" />
                  Medical Information
                </h3>
                <div className="info-item">
                  <span className="info-label">Blood Type:</span>
                  <span className="info-value">{athleteData.blood_type || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">National ID:</span>
                  <span className="info-value">{athleteData.national_id_number || "N/A"}</span>
                </div>
              </div>

              {/* Registration Information */}
              <div className="info-card">
                <h3>
                  <Calendar className="w-5 h-5" />
                  Registration Information
                </h3>
                <div className="info-item">
                  <span className="info-label">Registration Date:</span>
                  <span className="info-value">{athleteData.registration_date || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Year:</span>
                  <span className="info-value">{athleteData.year || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Renewal:</span>
                  <span className="info-value">{athleteData.renewal || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Club:</span>
                  <span className="info-value">{clubName || "N/A"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">League:</span>
                  <span className="info-value">{leagueName || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {athleteData.description && (
            <div className="athlete-description">
              <h3>Description:</h3>
              <p>{athleteData.description}</p>
            </div>
          )}

          {/* QR Code Section */}
          <div className="qr-code-section">
            <h3>
              <QrCode className="w-5 h-5" />
              Athlete QR Code
            </h3>
            <p>Scan to access athlete information</p>
            
            <div className="qr-code-container">
              {qrCodeDataURL ? (
                <img
                  src={qrCodeDataURL}
                  alt="Athlete QR Code"
                  className="qr-code-centered"
                />
              ) : (
                <div className="qr-code-loading">
                  <QrCode className="w-16 h-16 text-gray-400" />
                  <p>Generating QR Code...</p>
                </div>
              )}
            </div>
            
            {qrCodeDataURL && (
              <div className="qr-code-status">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  ✓ QR Code Ready
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Related Athletes Section */}
        <div className="form-grid">
          <div className="photo-section">
            <h3>Related Licenses</h3>
            <p>All athlete licenses with the same National ID Number</p>
            <div className="related-stats">
              <div className="stat-item">
                <span className="stat-number">{relatedAthletes.length}</span>
                <span className="stat-label">Total Licenses</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{relatedAthletes.filter(a => a.table_type === 'athletes').length}</span>
                <span className="stat-label">Athletes</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{relatedAthletes.filter(a => a.table_type === 'league_members').length}</span>
                <span className="stat-label">League Members</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{relatedAthletes.filter(a => a.table_type === 'club_members').length}</span>
                <span className="stat-label">Club Members</span>
              </div>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-card">
              <h4>Athlete Licenses Table</h4>
              <p>Double-click any row to generate PDF for that athlete</p>
              
              {loadingRelated ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading related athletes...</p>
                </div>
              ) : relatedAthletes.length > 0 ? (
                <div className="table-container">
                  <table className="athletes-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Full Name</th>
                        <th>License Number</th>
                        <th>National ID</th>
                        <th>Club/League ID</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {console.log('🔍 Rendering table with relatedAthletes:', relatedAthletes)}
                      {relatedAthletes.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>
                            No related athlete licenses found
                          </td>
                        </tr>
                      ) : (
                        relatedAthletes.map((athlete, index) => (
                        <tr 
                          key={`${athlete.table_type}-${athlete.id || index}`}
                          onDoubleClick={() => {
                            console.log('🎯 Double-click fired on athlete:', athlete);
                            console.log('📋 Available fields:', Object.keys(athlete));
                            console.log('🏷️ Table type:', athlete.table_type);
                            console.log('🆔 Original national_id_number:', athlete.national_id_number);
                            console.log('🆔 Fallback athlete_nid:', athlete.athlete_nid);
                            console.log('🆔 Fallback nid:', athlete.nid);
                            
                            // Create safe data with fallback for national_id_number field and appropriate ID
                            const safeData = {
                              ...athlete,
                              national_id_number: athlete.national_id_number || athlete.athlete_nid || athlete.nid,
                              // Add the appropriate primary key (all tables use 'id')
                              primary_id: athlete.id,
                              table_source: athlete.table_type
                            };
                            
                            console.log('✅ Safe data created with normalized national_id_number:', safeData.national_id_number);
                            console.log('📦 Complete safe data object:', safeData);
                            
                            console.log('🚀 About to call handleExportPDF...');
                            try {
                              handleExportPDF(safeData);
                              console.log('✅ handleExportPDF called successfully');
                            } catch (error) {
                              console.error('❌ Error calling handleExportPDF:', error);
                            }
                          }}
                          className="clickable-row"
                          style={{ cursor: 'pointer' }}
                          title="Double-click to generate PDF"
                        >
                          <td>
                            <span className={`source-badge ${athlete.table_type}`}>
                              {athlete.source}
                            </span>
                          </td>
                          <td className="name-cell">
                            {athlete.first_name && athlete.last_name 
                              ? `${athlete.first_name} ${athlete.last_name}`
                              : athlete.full_name || 'N/A'
                            }
                          </td>
                          <td className="license-cell">
                            {athlete.license_number || athlete.athlete_license_number || 'N/A'}
                          </td>
                          <td className="id-cell">
                            {athlete.national_id_number}
                          </td>
                          <td className="club-cell">
                            {athlete.club_id || athlete.league_id || 'N/A'}
                          </td>
                          <td>
                            <span className={`status-badge ${athlete.status || 'active'}`}>
                              {athlete.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">
                  <p>No related athlete licenses found with the same National ID Number.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Judo Certificate Section - Only for Black Belt Athletes */}
        {athleteData && athleteData.grade === 'black belt' && (
          <div className="form-grid">
            <div className="photo-section">
              <h3>Judo Certificate</h3>
              <p>Generate official Judo certificate for black belt athletes</p>
              <div className="certificate-preview">
                <div className="certificate-badge">
                  <Trophy className="certificate-icon" />
                  <span>Black Belt Certificate</span>
                </div>
                <div className="certificate-info">
                  <p><strong>Athlete:</strong> {athleteData.first_name} {athleteData.last_name}</p>
                  <p><strong>Grade:</strong> {athleteData.grade}</p>
                  <p><strong>License:</strong> {athleteData.license_number}</p>
                </div>
                <div className="certificate-qr" style={{ marginTop: '10px' }}>
                  <h5 style={{ margin: 0 }}>Certificate QR</h5>
                  {certificateQrUrl ? (
                    <img
                      src={certificateQrUrl}
                      alt="Certificate QR Code"
                      style={{ width: '32px', height: '32px', border: '1px solid #eee', borderRadius: '4px' }}
                    />
                  ) : (
                    <p style={{ fontSize: '12px', color: '#666' }}>QR appears when data is complete.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="info-grid">
              <div className="info-card">
                <h4>Certificate Generation</h4>
                <p>Click the button below to generate the official Judo certificate</p>
                
                <div className="certificate-actions">
                  <button 
                    className="primary-button certificate-btn"
                    onClick={() => generateJudoCertificate(athleteData)}
                    disabled={loading}
                  >
                    <Trophy size={20} />
                    {loading ? 'Generating...' : 'Generate Judo Certificate'}
                  </button>
                </div>

                <div className="certificate-requirements">
                  <h5>Certificate Requirements:</h5>
                  <ul>
                    <li>✓ Black Belt Grade</li>
                    <li>✓ Valid License Number</li>
                    <li>✓ Complete Athlete Information</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <Navigation />
      </div>
    </div>
  );
}
