// TheClubListAddFedLeague.jsx
import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import { Shield } from "lucide-react";
import "./index.css";
import ListofAthletesButton from "./ListofAthletesButton.jsx";
import logo from "./assets/logo.png";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchClubNames, sanitizeText } from './ExportUtils';
import { useDragScroll } from './useDragScroll';
import loadImage from 'blueimp-load-image';
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from './components/BarLoading';
import CircleLoading from './components/CircleLoading';
import { initializePrimaryButtons, handlePrimaryButtonClick } from './primaryButtonHandler';


export default function TheClubListAddFedLeague() {
  const { state } = useLocation(); // optional: { club_id, league_id, member_id, ... }
  const navigate = useNavigate();

  // Members and club info
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [club, setClub] = useState(null);
  const [league, setLeague] = useState(null);
  const [member, setMember] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editedMember, setEditedMember] = useState({});

  // Header logos and names
  const [federationLogo, setFederationLogo] = useState(null);
  const [leagueLogo, setLeagueLogo] = useState(null);
  const [leagueName, setLeagueName] = useState("");
  const [clubLogo, setClubLogo] = useState(null);
  const [clubName, setClubName] = useState("");
  const [selectedClubId, setSelectedClubId] = useState(state?.club_id || "");
  const [selectedLeagueId, setSelectedLeagueId] = useState(state?.league_id || "");

  const federationName = "Algerian Judo Federation";
  const STORAGE_URL = "https://aolsbxfulbvpiobqqsao.supabase.co/storage/v1/object/public/logos/";

  const [roles, setRoles] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [leagues, setLeagues] = useState([]);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState("");
  const [pob, setPob] = useState("");
  const [roleId, setRoleId] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [nid, setNid] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [nationality, setNationality] = useState("");
  const [grade, setGrade] = useState("");
  const [holderOf, setHolderOf] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const tableRef = useDragScroll();

  const getLogoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${STORAGE_URL}${path}`;
  };
//Initialize in useEffect button: 
useEffect(() => {
  initializePrimaryButtons();
}, []);
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

  // Helper functions to show overlay messages
  const showError = (message) => {
    setError(message);
    setSuccess(null);
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setError(null);
  };

 // fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from("clubrole")
        .select("id, club_role");
      if (error) console.error("Error fetching roles:", error.message);
      if (data) setRoles(data);
    };
    fetchRoles();
  }, []);


// Fetch all data: federation logo, league, club, members
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // federation logo
      const { data: fedData } = await supabase
        .from("logo")
        .select("logo_url")
        .order("created_at", { ascending: false })
        .limit(1);
      if (fedData?.length) setFederationLogo(getLogoUrl(fedData[0].logo_url));

      // league info
      if (state?.league_id) {
        const { data: lData } = await supabase
          .from("nameleague")
          .select("*")
          .eq("id", state.league_id)
          .single();
        if (lData) {
          setLeague(lData);
          setLeagueName(lData.name_league);
        }

        const { data: llogoRows } = await supabase
          .from("league_members")
          .select("logo_url")
          .eq("league_id", state.league_id)
          .order("id", { ascending: false })
          .limit(1);
        if (llogoRows?.length) setLeagueLogo(getLogoUrl(llogoRows[0].logo_url));
      }

      // club info
      let activeClubId = state?.club_id;
      if (!activeClubId && state?.league_id) {
        const { data: clubsInLeague } = await supabase
          .from("nameclub")
          .select("id")
          .eq("league_id", state.league_id);

        if (clubsInLeague?.length) {
          const { data: membersByClubs } = await supabase
            .from("club_members")
            .select("club_id")
            .in("club_id", clubsInLeague.map(c => c.id));

          if (membersByClubs?.length) {
            const clubIdsWithMembers = new Set(membersByClubs.map(m => m.club_id));
            const firstClub = clubsInLeague.find(c => clubIdsWithMembers.has(c.id));
            if (firstClub) activeClubId = firstClub.id;
          }
        }
      }

      if (activeClubId) {
        const { data: cn } = await supabase
          .from("nameclub")
          .select("name_club, id")
          .eq("id", activeClubId)
          .single();
        if (cn) {
          setClubName(cn.name_club);
          setClub(cn);
        }

        const { data: clogoRows } = await supabase
          .from("club_members")
          .select("logo_url")
          .eq("club_id", activeClubId)
          .order("id", { ascending: false })
          .limit(1);
        if (clogoRows?.length) setClubLogo(getLogoUrl(clogoRows[0].logo_url));
      }

      // logged in member
      if (state?.member_id) {
        const { data: m } = await supabase
          .from("club_members")
          .select("*")
          .eq("id", state.member_id)
          .single();
        if (m) setMember(m);
      }

      // all members of clubs in this league (filtered if selectedClubId chosen)
      if (state?.league_id) {
        let query = supabase
          .from("club_members")
          .select("*, nameclub!inner(league_i)")
          .eq("nameclub.league_i", state.league_id);

        if (selectedClubId) {
          query = query.eq("club_id", selectedClubId);
        }

        const { data: membersInLeague, error: leagueMembersError } = await query;
        if (leagueMembersError) throw leagueMembersError;

        setMembers(membersInLeague || []);
      }
    } catch (err) {
      showError(`Error fetching data: ${err.message}`);
      console.error("Error fetching data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch clubs from nameclub for this league
  useEffect(() => {
    const fetchClubs = async () => {
      console.log("fetchClubs called with state?.league_id:", state?.league_id, "selectedLeagueId:", selectedLeagueId);
      
      if (!state?.league_id && !selectedLeagueId) {
        console.log("No league_id available, returning early");
        return;
      }

      const leagueToUse = state?.league_id || selectedLeagueId;
      console.log("Using league_id:", leagueToUse);

      const { data, error } = await supabase
        .from("nameclub")
        .select("id, name_club, league_i")
        .eq("league_i", leagueToUse);

      if (error) {
        console.error("Error fetching clubs:", error);
      } else {
        console.log("Fetched clubs:", data);
        setClubs(data || []);
      }
    };

    fetchClubs();
  }, [state?.league_id, selectedLeagueId]);

  // run fetchData when page loads or club/league changes
  useEffect(() => {
    fetchData();
  }, [selectedClubId, selectedLeagueId]);

  // Cleanup error and success states on component unmount
  useEffect(() => {
    return () => {
      setError("");
      setSuccess("");
    };
  }, []);

  // Table actions
  const handleEdit = (member) => {
    setEditingId(member.id);
    setEditedMember({ ...member });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditedMember({});
  };

  const handleChange = (e, field) => {
    setEditedMember({ ...editedMember, [field]: e.target.value });
  };

  const handleSave = async (id) => {
    setError("");
    setSuccess("");
    setSubmitLoading(true);

    // Validation checks
    if (!editedMember.first_name || !editedMember.last_name || !editedMember.date_of_birth || !editedMember.place_of_birth || !editedMember.role_id) {
      const missingFields = [];
      if (!editedMember.first_name) missingFields.push("First Name");
      if (!editedMember.last_name) missingFields.push("Last Name");
      if (!editedMember.date_of_birth) missingFields.push("Date of Birth");
      if (!editedMember.place_of_birth) missingFields.push("Place of Birth");
      if (!editedMember.role_id) missingFields.push("Role");
      
      setError(`Please fill in the following required fields: ${missingFields.join(", ")}`);
      setSubmitLoading(false);
      return;
    }

    // Age validation - member must be more than 21 years old
    const birthDate = new Date(editedMember.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    
    // Adjust age if birthday hasn't occurred this year
    const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;
    
    if (actualAge <= 21) {
      setError("Member must be more than 21 years old to register.");
       setSubmitLoading(false);
      return;
    }

    // Check if Last Name and Password combination already exists (excluding current member)
    if (editedMember.last_name && editedMember.password) {
      const { data: existingNamePassword } = await supabase
        .from("club_members")
        .select("*")
        .eq("last_name", editedMember.last_name)
        .eq("password", editedMember.password)
        .neq("id", id);
      
      if (existingNamePassword && existingNamePassword.length > 0) {
        setError("Change your Password for this name because is already exist");
        setSubmitLoading(false);
        return;
      }
    }

    try {
      // Convert role_id to role name for database storage
      const roleName = roles.find((r) => r.id === parseInt(editedMember.role_id))?.club_role || "";
      const memberToUpdate = { ...editedMember, role: roleName };
      delete memberToUpdate.role_id; // Remove role_id since database uses role field
      
      const { error } = await supabase
        .from("club_members")
        .update(memberToUpdate)
        .eq("id", id);
      if (error) throw error;
      setSuccess(`Member "${editedMember.first_name} ${editedMember.last_name}" has been successfully updated!`);
      cancelEdit();
      fetchData();
      setSubmitLoading(false);
    } catch (err) {
      setError(`Failed to update member: ${err.message}`);
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (member) => {
    try {
      const registrationDate = new Date(member.registration_date)
        .toISOString()
        .split("T")[0];
      const today = new Date().toISOString().split("T")[0];

      if (registrationDate !== today) {
        setError("You can only delete members on the same day of registration.");
        return;
      }

      const { error } = await supabase
        .from("club_members")
        .delete()
        .eq("id", member.id);
      if (error) throw error;

      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleMemberConfirmation = async (memberId, currentStatus) => {
    try {
      const { error } = await supabase
        .from("club_members")
        .update({ confirmation: !currentStatus })
        .eq("id", memberId);
      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, confirmation: !currentStatus } : m
        )
      );
    } catch (err) {
      showError(`Failed to update member confirmation: ${err.message}`);
    }
  };

  // Search filter
  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.first_name.toLowerCase().includes(term) ||
      m.last_name.toLowerCase().includes(term) ||
      m.national_id_number.includes(term)
    );
  });

  // Double-click handler to generate individual member PDF
  const handleMemberDoubleClick = (member) => {
    console.log('👆 handleMemberDoubleClick called with member:', member);
    generateIndividualMemberPDF(member);
  };

  // Generate individual member PDF
  const generateIndividualMemberPDF = (member) => {
    console.log('🎯 generateIndividualMemberPDF called with member:', member);
    if (!member || Object.keys(member).length === 0) {
      setError('No member data available to export');
      return;
    }
    exportPDFWithAutoOrientation(member);
  };

  // Individual member PDF export function with automatic orientation
  const exportPDFWithAutoOrientation = async (member) => {
    try {
      console.log('🔥 exportPDFWithAutoOrientation called with member:', member);
      const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Fetch the specific club name for this member
    let memberClubName = clubName; // Default to current club name
    console.log('Initial clubName:', clubName, 'member.club_id:', member.club_id); // Debug log
    if (member.club_id) {
      try {
        const clubNames = await fetchClubNames();
        console.log('Fetched clubNames:', clubNames); // Debug log
        // clubNames is an object where keys are club IDs and values are club names
        if (clubNames[member.club_id]) {
          memberClubName = clubNames[member.club_id];
          console.log('Found memberClubName:', memberClubName); // Debug log
        } else {
          console.log('Club ID not found in clubNames:', member.club_id); // Debug log
        }
      } catch (error) {
        console.error('Error fetching club name:', error);
      }
    }
    
    // Add federation name at top left
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(sanitizeText(federationName), 14, 15);
    
    // Add member title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(`Athlete Information - ${sanitizeText(member.first_name)} ${sanitizeText(member.last_name)}`, 14, 30);
    
    // Add generation date
    doc.setFontSize(10);
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, 14, 37);
    
    // Add federation logo at top right
    if (federationLogo) {
      try {
        doc.addImage(federationLogo, 'PNG', 170, 10, 25, 25);
      } catch (error) {
        console.error('Error adding federation logo to PDF:', error);
      }
    }

    
    // Add member photo if available
    let startY = 70;
    if (member.photos_url || member.photo_url) {
      try {
        const photoUrl = member.photos_url || member.photo_url;
        const fixedPhoto = await normalizeImage(photoUrl);
        // Determine image format based on whether it's a data URL or regular URL
        const imageFormat = fixedPhoto.startsWith('data:') ? "PNG" : "JPEG";
        doc.addImage(fixedPhoto, imageFormat, 14, 45, 25, 20);
        // Adjust the startY for the table to make room for the photo
        startY = 70;
      } catch (error) {
        console.error("Error adding photo to PDF:", error);
        // If all else fails, try to add the original image directly
        try {
          const photoUrl = member.photos_url || member.photo_url;
          doc.addImage(photoUrl, "JPEG", 14, 45, 25, 20);
          startY = 70;
        } catch (fallbackError) {
          console.error("Fallback image addition also failed:", fallbackError);
          startY = 70;
        }
      }
    }
    
    // Add confirmation status
    doc.setFontSize(12);
    if (member.confirmation) {
      doc.setTextColor(0, 128, 0); // Green for confirmed
    } else {
      doc.setTextColor(255, 0, 0); // Red for not confirmed
    }
    const confirmationText = member.confirmation ? "CONFIRMED" : "NOT CONFIRMED";
    doc.text(confirmationText, 160, 50);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Create member information table
    const foundRole = roles.find(role => role.id === member.role_id);
    const roleName = foundRole?.club_role || 'No Role';
    const memberData = [
      ['Last Name', sanitizeText(member.last_name) || ''],
      ['First Name', sanitizeText(member.first_name) || ''],
      ['Date of Birth', sanitizeText(member.date_of_birth) || ''],
      ['Place of Birth', sanitizeText(member.place_of_birth) || ''],
      ['Role', sanitizeText(roleName)],
      ['Blood type', sanitizeText(member.blood_type) || ''],
      ['National ID', sanitizeText(member.national_id_number) || ''],
      ['Nationality', sanitizeText(member.nationality) || ''],
      ['Grade', sanitizeText(member.grade) || ''],
      ['Genres', sanitizeText(member.gender) || ''],
      ['Categories', sanitizeText(member.category) || ''],
      ['Weight', sanitizeText(member.weight) || ''],
      ['License Number', sanitizeText(member.license_number) || ''],
      ['Registration Date', sanitizeText(member.registration_date) || ''],
      ['Year', sanitizeText(member.year) || ''],
      ['Renewal', sanitizeText(member.renewal) || '']
    ];
    
    autoTable(doc, {
      startY: startY,
      head: [['Field', 'Value']],
      body: memberData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { overflow: 'linebreak' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' }
      }
    });
    
    // Add medical certificate section
    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Medical certificate', 14, finalY + 20);
    
    // Add signature line
    doc.setDrawColor(0);
    doc.line(14, finalY + 40, 80, finalY + 40);
    
    // Add club and league information at bottom
    doc.setFontSize(10);
    console.log('memberClubName:', memberClubName, 'finalY:', finalY); // Debug log
    if (memberClubName) {
      doc.text(`Club: ${sanitizeText(memberClubName)}`, 14, finalY + 60);
      doc.text("Club Visa: _________________", 14, finalY + 70);
    } else {
      console.log('No memberClubName found, member.club_id:', member.club_id); // Debug log
    }
    
    if (leagueName) {
      doc.text(`League: ${sanitizeText(leagueName)}`, 120, finalY + 60);
      doc.text("League Visa: _________________", 120, finalY + 70);
    }
    
    // Add QR code at the bottom right
    try {
      const qrData = JSON.stringify({
        id: member.id,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
        license: member.license_number || '',
        club_id: member.club_id || '',
        league_id: member.league_id || ''
      });
      
      const QRCode = (await import('qrcode')).default;
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
    const filename = `athlete_${sanitizeText(member.first_name)}_${sanitizeText(member.last_name)}_${member.id || 'record'}.pdf`;
    console.log('💾 About to save PDF with filename:', filename);
    doc.save(filename);
    console.log('✅ PDF save completed');
    } catch (error) {
      console.error('❌ Error in exportPDFWithAutoOrientation:', error);
      setError(`Error generating PDF: ${error.message}`);
    }
  };

  // PDF Export Functions
  const addFederationHeader = (doc, pageNumber = 1, clubNameParam = '', leagueNameParam = '') => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add federation logo on the right side
    if (federationLogo) {
      try {
        doc.addImage(federationLogo, 'PNG', pageWidth - 40, 15, 25, 25);
      } catch (e) {
        console.warn('Could not add federation logo:', e);
      }
    }
    
    // Add print date on the left side
    const currentDate = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Print Date: ${currentDate}`, 15, 20);
    
    // Federation name (centered)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText('Algerian Judo Federation'), pageWidth / 2, 25, { align: 'center' });
    
    // League and Club information (centered, below federation name)
    if (leagueNameParam) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`League: ${sanitizeText(leagueNameParam)}`, pageWidth / 2, 40, { align: 'center' });
    }
    
    if (clubNameParam) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Club: ${sanitizeText(clubNameParam)}`, pageWidth / 2, 53, { align: 'center' });
    }
    
    // Page number
    doc.setFontSize(10);
    doc.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    
    return clubNameParam ? 70 : (leagueNameParam ? 57 : 40); // Return Y position for content start
  };

  // Helper function to sanitize text for PDF
  const sanitizeText = (text) => {
    if (!text) return '';
    
    // Convert to string and remove the exact corrupted characters
    let cleanText = String(text)
      // Remove specific corrupted character sequences
      .replace(/Ø=UÈ/g, '')
      .replace(/Ø<ða/g, '')
      .replace(/Ø=Ud/g, '')
      .replace(/Ø-ÜÈ/g, '')
      .replace(/Ø-Üd/g, '')
      .replace(/Ø<Ða/g, '')
      .replace(/Ø<ßà/g, '')
      // Remove percentage characters and related encoding issues
      .replace(/%[0-9A-Fa-f]{2}/g, '') // Remove URL-encoded characters like %20, %C3, etc.
      .replace(/% % %/g, '') // Remove the specific "% % %" pattern
      .replace(/%%%/g, '') // Remove triple percentage
      .replace(/%%/g, '') // Remove double percentage
      .replace(/%\s+%/g, '') // Remove percentage with spaces
      .replace(/%+/g, '') // Remove any sequence of percentage signs
      .replace(/\s*%\s*/g, '') // Remove percentage with any surrounding spaces
      // Remove other problematic characters
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\uFFFD/g, '') // Remove replacement character
      // General cleanup for common encoding issues
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
      .replace(/Ã¤/g, 'ä')
      .trim();
    
    return cleanText;
  };

  const prepareGeneralMemberData = (members) => {
    return members.map(member => {
      const foundRole = roles.find(role => role.id === member.role_id);
      const roleName = foundRole?.club_role || 'No Role';
      return [
        sanitizeText(member.last_name),
        sanitizeText(member.first_name),
        sanitizeText(member.date_of_birth),
        sanitizeText(member.place_of_birth),
        sanitizeText(roleName),
        sanitizeText(member.blood_type),
        sanitizeText(member.nationality),
        sanitizeText(member.national_id_number),
        sanitizeText(member.license_number),
        sanitizeText(member.registration_date),
        sanitizeText(clubName), // Club name
        '' // Club Visa placeholder
      ];
    });
  };

  const prepareGradeRoleMemberData = (members) => {
    return members.map(member => {
      const foundRole = roles.find(role => role.id === member.role_id);
      const roleName = foundRole?.club_role || 'No Role';
      return [
        sanitizeText(member.last_name),
        sanitizeText(member.first_name),
        sanitizeText(member.grade),
        sanitizeText(roleName),
        sanitizeText(member.holder_of),
        sanitizeText(member.national_id_number),
        sanitizeText(member.license_number),
        sanitizeText(clubName), // Club name
        '' // Club Visa placeholder
      ];
    });
  };

  const exportGeneralPDF = async () => {
    const activeLeagueId = state?.league_id || selectedLeagueId;
    if (!activeLeagueId) {
      showError('No league selected');
      return;
    }

    try {
      // Fetch all clubs in the league using correct field name
      const { data: clubsInLeague, error: clubsError } = await supabase
        .from("nameclub")
        .select("id, name_club")
        .eq("league_i", activeLeagueId);

      if (clubsError) throw clubsError;

      if (!clubsInLeague || clubsInLeague.length === 0) {
        showError('No clubs found in this league');
        return;
      }

      // Fetch all members for all clubs in the league
      const clubIds = clubsInLeague.map(club => club.id);
      const { data: allMembers, error: membersError } = await supabase
        .from("club_members")
        .select("*")
        .in("club_id", clubIds);

      if (membersError) throw membersError;

      if (!allMembers || allMembers.length === 0) {
        showError('No members found in any clubs of this league');
        return;
      }

      const doc = new jsPDF('landscape');
      let currentY = addFederationHeader(doc, 1, '', leagueName || 'Unknown League');
      let yPosition = currentY;

      // Add centered title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0); // Red color
      doc.text('Club Members - General Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 20;

      // Group members by year first, then by club
      const membersByYear = {};
      allMembers.forEach(member => {
        const year = member.year || 'Unknown Year';
        
        if (!membersByYear[year]) {
          membersByYear[year] = {};
        }
        
        const clubData = clubsInLeague.find(club => club.id === member.club_id);
        const clubName = clubData ? sanitizeText(clubData.name_club) : 'Unknown Club';
        
        if (!membersByYear[year][clubName]) {
          membersByYear[year][clubName] = [];
        }
        membersByYear[year][clubName].push(member);
      });

      // Also group members by club for the roles section
      const membersByClub = {};
      allMembers.forEach(member => {
        const clubData = clubsInLeague.find(club => club.id === member.club_id);
        const clubName = clubData ? sanitizeText(clubData.name_club) : 'Unknown Club';
        
        if (!membersByClub[clubName]) {
          membersByClub[clubName] = [];
        }
        membersByClub[clubName].push(member);
      });

      // Simple club listing ordered by club and date of creation

      // Process each club
      for (const [clubName, clubMembers] of Object.entries(membersByClub)) {
          if (clubMembers.length === 0) continue;

          // Sort members by registration_date (date of creation)
          const sortedMembers = clubMembers.sort((a, b) => {
            const dateA = new Date(a.registration_date || '1900-01-01');
            const dateB = new Date(b.registration_date || '1900-01-01');
            return dateA - dateB;
          });

          // Club header
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(`${sanitizeText(clubName)}`, 20, yPosition);
          yPosition += 12;

          // Prepare table data for this club
          const tableData = sortedMembers.map(member => [
            sanitizeText(member.last_name),
            sanitizeText(member.first_name),
            sanitizeText(member.date_of_birth),
            sanitizeText(member.place_of_birth),
            sanitizeText(member.blood_type),
            sanitizeText(member.nationality),
            sanitizeText(member.grade),
            sanitizeText(member.holder_of),
            sanitizeText(member.national_id_number),
            sanitizeText(member.password),
            sanitizeText(member.renewal),
            member.confirmation ? 'Yes' : 'No',
            sanitizeText(member.license_number)
          ]);

          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Holder Of', 'NID', 'Password', 'Renewal', 'Confirmation', 'License #']],
            body: tableData,
            startY: yPosition,
            styles: {
              fontSize: 5,
              cellPadding: 1,
            },
            headStyles: {
              fillColor: [34, 139, 34], // Green color
              textColor: 255,
              fontStyle: 'bold',
              fontSize: 5
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            },
            margin: { left: 10, right: 10 }
          });

          yPosition = doc.lastAutoTable.finalY + 8;

          // Check if we need a new page
          if (yPosition > 180) {
            doc.addPage();
            yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), '', leagueName || 'Unknown League') + 5;
          }

          // Add space between clubs
          yPosition += 8;

          // Check if we need a new page for the next club
          if (yPosition > 160) {
            doc.addPage();
            yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), '', leagueName) + 5;
          }
        }



      const currentDate = new Date().getFullYear();
      doc.save(`federation_league_club_members_general_${currentDate}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Error generating PDF: ' + error.message);
    }
  };

  const exportGradeRolePDF = async () => {
    const activeLeagueId = state?.league_id || selectedLeagueId;
    if (!activeLeagueId) {
      showError('No league selected');
      return;
    }

    try {
      // Fetch all clubs in the league using correct field name
      const { data: clubsInLeague, error: clubsError } = await supabase
        .from("nameclub")
        .select("id, name_club")
        .eq("league_i", activeLeagueId);

      if (clubsError) throw clubsError;

      if (!clubsInLeague || clubsInLeague.length === 0) {
        showError('No clubs found in this league');
        return;
      }

      // Fetch all members for all clubs in the league
      const clubIds = clubsInLeague.map(club => club.id);
      const { data: allMembers, error: membersError } = await supabase
        .from("club_members")
        .select("*")
        .in("club_id", clubIds);

      if (membersError) throw membersError;

      if (!allMembers || allMembers.length === 0) {
        showError('No members found in any clubs of this league');
        return;
      }

      const doc = new jsPDF('landscape');
      let currentY = addFederationHeader(doc, 1, '', leagueName);

      // Remove extra spacing - start content immediately after header
      let yPosition = currentY;

      // Group members by year first, then by club
      const membersByYear = {};
      allMembers.forEach(member => {
        const clubData = clubsInLeague.find(club => club.id === member.club_id);
        const clubName = clubData ? sanitizeText(clubData.name_club) : 'Unknown Club';
        const year = member.year || 'Unknown Year';
        
        if (!membersByYear[year]) {
          membersByYear[year] = {};
        }
        if (!membersByYear[year][clubName]) {
          membersByYear[year][clubName] = [];
        }
        membersByYear[year][clubName].push(member);
      });

      // FIRST SECTION: Role-based report
      // Main title for the entire report
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0); // Red color
      doc.text('Club Members - Grade & Role Report', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 20;
      
      // Process each year for role-based grouping
      let isFirstYear = true;
      for (const [year, clubsInYear] of Object.entries(membersByYear)) {
        // Add page break between years (except for the first year)
        if (!isFirstYear) {
          doc.addPage();
          yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), '', leagueName || 'Unknown League') + 5;
        }
        isFirstYear = false;

        // Year header for roles section
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeText(`ROLES SECTION - ${year}`), 20, yPosition);
        yPosition += 15;

        // Process each club within this year
        for (const [currentClubName, clubMembers] of Object.entries(clubsInYear)) {
          if (clubMembers.length === 0) continue;

          // Club header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`Club: ${sanitizeText(currentClubName)}`, 35, yPosition);
          yPosition += 10;

        // Group members by role within this club
        const roleGroups = {};
        clubMembers.forEach(member => {
          const foundRole = roles.find(role => role.id === member.role_id);
          const role = foundRole?.club_role || 'No Role';
          if (!roleGroups[role]) {
            roleGroups[role] = [];
          }
          roleGroups[role].push(member);
        });

        // Process each role within the club
        for (const [roleName, roleMembers] of Object.entries(roleGroups)) {
          if (roleMembers.length === 0) continue;

          // Role subtitle (without "Role:" prefix)
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Role: ${sanitizeText(roleName)}`, 30, yPosition);
          yPosition += 8;

          // Prepare table data for this role (including grades in the table)
          const tableData = roleMembers.map(member => [
            sanitizeText(member.last_name),
            sanitizeText(member.first_name),
            sanitizeText(member.date_of_birth),
            sanitizeText(member.place_of_birth),
            sanitizeText(member.blood_type),
            sanitizeText(member.nationality),
            sanitizeText(member.grade),
            sanitizeText(member.holder_of),
            sanitizeText(member.national_id_number),
            sanitizeText(member.password),
            sanitizeText(member.renewal),
            member.confirmation ? 'Yes' : 'No',
            sanitizeText(member.license_number)
          ]);

          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Holder Of', 'NID', 'Password', 'Renewal', 'Confirmation', 'License #']],
            body: tableData,
            startY: yPosition,
            styles: {
              fontSize: 5,
              cellPadding: 1,
            },
            headStyles: {
              fillColor: [34, 139, 34], // Green color
              textColor: 255,
              fontStyle: 'bold',
              fontSize: 5
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            },
            margin: { left: 10, right: 10 }
          });

          yPosition = doc.lastAutoTable.finalY + 8;

          // Check if we need a new page
          if (yPosition > 180) {
            doc.addPage();
            yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), '', leagueName || 'Unknown League') + 5;
          }
        }

        // Add space between clubs
        yPosition += 8;

        // Check if we need a new page for the next club
        if (yPosition > 160) {
          doc.addPage();
          yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), '', leagueName || 'Unknown League') + 5;
        }
      }

        // Add space between years
        yPosition += 10;
      }

      // Add new page for grade-based report
      doc.addPage();
      yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), '', leagueName);

      // SECOND SECTION: Grades section
      // Main title for the grades section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0); // Red color
      doc.text('Club Members - Grade & Role Report', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 20;
      
      // Process each year for grade-based grouping
      let isFirstYearGrades = true;
      for (const [year, clubsInYear] of Object.entries(membersByYear)) {
        // Add page break between years (except for the first year)
        if (!isFirstYearGrades) {
          doc.addPage();
          yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), '', leagueName) + 5;
        }
        isFirstYearGrades = false;

        // Year header for grades section
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeText(`GRADES SECTION - ${year}`), 20, yPosition);
        yPosition += 15;

        // Process each club within this year
        for (const [currentClubName, clubMembers] of Object.entries(clubsInYear)) {
        if (clubMembers.length === 0) continue;

        // Club header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`Club: ${sanitizeText(currentClubName)}`, 35, yPosition);
          yPosition += 10;

        // Group members by grade within this club
        const gradeGroups = {};
        clubMembers.forEach(member => {
          const grade = member.grade || 'No Grade';
          if (!gradeGroups[grade]) {
            gradeGroups[grade] = [];
          }
          gradeGroups[grade].push(member);
        });

        // Process each grade within the club
        for (const [gradeName, gradeMembers] of Object.entries(gradeGroups)) {
          if (gradeMembers.length === 0) continue;

          // Grade subtitle (without "Grade:" prefix)
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Grade: ${sanitizeText(gradeName)}`, 30, yPosition);
          yPosition += 8;

          // Prepare table data for this grade (including roles in the table)
          const tableData = gradeMembers.map(member => {
            const foundRole = roles.find(role => role.id === member.role_id);
            const roleName = foundRole?.club_role || 'No Role';
            return [
              sanitizeText(member.last_name),
              sanitizeText(member.first_name),
              sanitizeText(member.date_of_birth),
              sanitizeText(member.place_of_birth),
              sanitizeText(member.blood_type),
              sanitizeText(member.nationality),
              sanitizeText(roleName),
              sanitizeText(member.holder_of),
              sanitizeText(member.national_id_number),
              sanitizeText(member.password),
              sanitizeText(member.renewal),
              member.confirmation ? 'Yes' : 'No',
              sanitizeText(member.license_number)
            ];
          });

          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Role', 'Holder Of', 'NID', 'Password', 'Renewal', 'Confirmation', 'License #']],
            body: tableData,
            startY: yPosition,
            styles: {
              fontSize: 5,
              cellPadding: 1,
            },
            headStyles: {
              fillColor: [34, 139, 34], // Green color
              textColor: 255,
              fontStyle: 'bold',
              fontSize: 5
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            },
            margin: { left: 10, right: 10 }
          });

          yPosition = doc.lastAutoTable.finalY + 8;

          // Check if we need a new page
          if (yPosition > 180) {
            doc.addPage();
            yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), '', leagueName) + 5;
          }
        }

        // Add space between clubs
        yPosition += 8;

        // Check if we need a new page for the next club
        if (yPosition > 160) {
          doc.addPage();
          yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), '', leagueName) + 5;
        }
      }

      // Add space between years
      yPosition += 10;
    }

      const currentDate = new Date().getFullYear();
      doc.save(`league_${sanitizeText(leagueName)}_complete_report_${currentDate}.pdf`);

    } catch (error) {
      console.error('Error exporting complete league report PDF:', error);
      setError('Error exporting PDF: ' + error.message);
    }
  };





  useEffect(() => {
    const timeout = setTimeout(() => {}, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);



  useEffect(() => {
    fetchData();
  }, [selectedClubId, selectedLeagueId]);

      // Upload a file to storage and return public URL
  const uploadFile = async (file) => {
    if (!file) return null;
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(fileName, file);
    if (error) {
      setError(`Upload failed: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from("logos").getPublicUrl(fileName);
    return data?.publicUrl ?? null;
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return null;
    const ext = photoFile.name.split(".").pop();
    const fileName = `club_member-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(fileName, photoFile);
    if (error) {
      console.error("upload error", error);
      return null;
    }
    const { data } = supabase.storage.from("logos").getPublicUrl(fileName);
    return data?.publicUrl ?? null;
  };

  // ------------------ renewal helper (updated for year-based logic) ------------------
  const getNextRenewal = async (nidVal, clubIdVal, roleVal, currentSeasonYear) => {
    // Check if member already exists in current year
    const { data: existingInCurrentYear } = await supabase
      .from("club_members")
      .select("*")
      .eq("national_id_number", nidVal)
      .eq("club_id", clubIdVal)
      .eq("role", roleVal)
      .eq("year", currentSeasonYear);
    
    if (existingInCurrentYear && existingInCurrentYear.length > 0) {
      throw new Error("This member is already registered for the current season with the same role and club.");
    }
    
    // Count total registrations across all years for this combination
    const { count } = await supabase
      .from("club_members")
      .select("*", { count: "exact", head: true })
      .eq("national_id_number", nidVal)
      .eq("club_id", clubIdVal)
      .eq("role", roleVal);
    
    return (count || 0) + 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    console.log("Setting submitLoading to true");
    setSubmitLoading(true);
    
    // Add a small delay to ensure loading state is visible
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!firstName || !lastName || !dob || !pob || !roleId || !selectedClubId || !selectedLeagueId || !password || !confirmPassword) {
      const missingFields = [];
      if (!firstName) missingFields.push("First Name");
      if (!lastName) missingFields.push("Last Name");
      if (!dob) missingFields.push("Date of Birth");
      if (!pob) missingFields.push("Place of Birth");
      if (!roleId) missingFields.push("Role");
      if (!selectedClubId) missingFields.push("Club");
      if (!selectedLeagueId) missingFields.push("League");
      if (!password) missingFields.push("Password");
      if (!confirmPassword) missingFields.push("Confirm Password");
     
      
      setError(`Please fill in the following required fields: ${missingFields.join(", ")}`);
      console.log("Setting submitLoading to false - missing fields");
      setSubmitLoading(false);
      return;
    }

    // Additional validation for club_id and league_id
    const clubIdValue = Number(selectedClubId);
    const leagueIdValue = Number(selectedLeagueId);
    if (!clubIdValue || isNaN(clubIdValue)) {
      setError("Please select a valid club.");
      setSubmitLoading(false);
      return;
    }
    if (!leagueIdValue || isNaN(leagueIdValue)) {
      setError("Please select a valid league.");
      setSubmitLoading(false);
      return;
    }
    if (nid.length !== 18) {
      setError("National ID must be exactly 18 digits.");
      setSubmitLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitLoading(false);
      return;
    }

    // Age validation - member must be more than 21 years old
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    
    // Adjust age if birthday hasn't occurred this year
    const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;
    
   if (actualAge <= 21) {
      setError("Member must be more than 21 years old to register.");
      setSubmitLoading(false);
      return;
    }

    // Check if Last Name and Password combination already exists
    if (lastName && password) {
      const { data: existingNamePassword } = await supabase
        .from("club_members")
        .select("*")
        .eq("last_name", lastName)
        .eq("password", password);
      
      if (existingNamePassword && existingNamePassword.length > 0) {
        setError("Change your Password for this name because is already exist");
        setSubmitLoading(false);
        return;
      }
    }

    // Convert role_id to role name for database storage
    const roleName = roles.find((r) => r.id === parseInt(roleId))?.club_role || "";
    
    // Get renewal number
    const currentYear = new Date().getFullYear();
    const seasonYear = `${currentYear}/${currentYear + 1}`;
    
    let renewal;
    try {
      renewal = await getNextRenewal(nid, clubIdValue, roleName, seasonYear);
    } catch (renewalError) {
      setError(renewalError.message);
      setSubmitLoading(false);
      return;
    }

    try {
      const photoUrl = await handlePhotoUpload();
      const uploadedClubLogo = await uploadFile(logoFile);

      const newClubMember = {
        last_name: lastName,
        first_name: firstName,
        date_of_birth: dob,
        place_of_birth: pob,
        role: roleName,
        blood_type: bloodType,
        national_id_number: nid,
        password,
        photo_url: photoUrl,
        logo_url: uploadedClubLogo,
        nationality,
        grade,
        holder_of: holderOf,
        club_id: clubIdValue,
        league_id: leagueIdValue,
        license_number: `LIC-${Date.now()}`,
        renewal: renewal,
        year: seasonYear,
      };

      const { error } = await supabase.from("club_members").insert([newClubMember]);
      if (error) {
        console.error("insert club member error", error);
        setError("Error saving club member: " + error.message);
        setSubmitLoading(false);
      } else {
        setSuccess(`Member "${firstName} ${lastName}" has been successfully added to the club!`);
        setLastName("");
        setFirstName("");
        setDob("");
        setPob("");
        setRoleId("");
        setBloodType("");
        setNid("");
        setPassword("");
        setConfirmPassword("");
        setNationality("");
        setGrade("");
        setHolderOf("");
        setPhotoFile(null);
        setLogoFile(null);

        await fetchData();
        setSubmitLoading(false);
      }
    } catch (err) {
      console.error("handleSubmit error", err);
      setError("Unexpected error: " + err.message);
      setSubmitLoading(false);
    }
  };

  return (
    <div className="app-container">
      {loading && <BarLoading />}
      {submitLoading && <CircleLoading />}
    {/* HEADER Fédération + League */}
      <header>
        <div className="federation-header">
          {/* Federation row */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {federationLogo ? (
              <img
                src={federationLogo}
                alt="Federation Logo"
                className="federation-logo"
              />
            ) : (
              <img
                src={logo}
                alt="Default Federation Logo"
                className="federation-logo"
              />
            )}
            <h1 className="federation-title">
              {federationName || "Algerian Judo Federation"}
            </h1>
          </div>

          {/* League row */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {state.logo_url ? (
              <img
                src={state.logo_url}
                alt="League Logo"
                className="member-logo"
              />
            ) : null}
            <h2 className="federation-title" style={{ fontSize: "1.5rem" }}>
              {leagueName || "League Name"}
            </h2>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <section className="app-container">
         <h2>
          Welcome {state.first_name} {state.last_name}
        </h2>
        <p>
          <strong>Role:</strong> {state.role}
        </p>
        <div className="form-table-wrapper">
          <div className="sticky-button-bar">
            <BackHomeButton />
            {/* UPDATED BUTTON:  */}
            <button 
  className="primary-btn" data-id="1"
  onClick={async (e) => {
    // Highlight clicked button
    handlePrimaryButtonClick(e.currentTarget);

    // Prevent navigation if errors exist
    if (error) {
      alert("Please resolve the current error before navigating to another page.");
      return;
    }

    if (!league || !league.id) {
      alert("League data not loaded yet.");
      return;
    }

    navigate("/member-list-l", {
      state: {
        ...state,
        league_id: league.id,
        league_name: league.name_league || "",
        league_logo: league?.logo_url || null,
      },
    });
  }}
>
  The League Member List
</button>

<button
  className="primary-btn" data-id="2"
  onClick={async (e) => {
    // Highlight clicked button
    handlePrimaryButtonClick(e.currentTarget);

    if (error) {
      alert("Please resolve the current error before navigating to another page.");
      return;
    }

    if (!league || !league.id) {
      alert("League data not loaded yet.");
      return;
    }

    navigate("/TheClubListAddFed-League", {
      state: {
        ...state,
        league_id: league.id,
        league_name: league.name_league || "",
        league_logo: league?.logo_url || null,
      },
    });
  }}
>
  The Club Member List
</button>

<button
  className="primary-btn" data-id="3"
  onClick={async (e) => {
    // Highlight clicked button
    handlePrimaryButtonClick(e.currentTarget);

    if (error) {
      alert("Please resolve the current error before navigating to another page.");
      return;
    }

    if (!league || !league.id) {
      alert("League data not loaded yet.");
      return;
    }

    navigate("/TheAthleteListAdd-League", {
      state: {
        ...state,
        league_id: league.id,
        league_name: league.name_league || "",
        league_logo: league?.logo_url || null,
      },
    });
  }}
>
  The Athlete List Add
</button>

          </div>

          <section>
            <section>
              <h2 className="form-title">Add Club Member</h2>
              <form onSubmit={handleSubmit} className="form-grid">

                {/* Club Role */}
                <label>
                  Club Role *
                  <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
                    <option value="">Select Role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.club_role}
                      </option>
                    ))}
                  </select>
                </label>

                {/* club/league selects: prefilled from state if present (disabled) */}
              {/* League Selection */}
								<label>
								  League: *
								  <select
								    value={selectedLeagueId}
								    onChange={(e) => {
								      setSelectedLeagueId(e.target.value);
								      setSelectedClubId("");
								    }}
								    disabled={!!state?.league_id} // lock if coming from state
								    required
								  >
								    {state?.league_id ? (
								      <option value={state.league_id}>{leagueName}</option>
								    ) : (
								      <>
								        <option value="">-- Select League --</option>
								        {leagues.map((l) => (
								          <option key={l.id} value={l.id}>
								            {l.name_league}
								          </option>
								        ))}
								      </>
								    )}
								  </select>
								</label>
								
								{/* Club Selection */}
								<label>
  Club: *
  <select
    value={selectedClubId}
    onChange={(e) => setSelectedClubId(e.target.value)}
    required
  >
    <option value="">-- Select Club --</option>
    {clubs.map((c) => (
      <option key={c.id} value={c.id}>
        {c.name_club}
      </option>
    ))}
  </select>
</label>


                {/* Nationality */}
                <label>
                  Nationality *
                  <select value={nationality} onChange={(e) => setNationality(e.target.value)} required>
                    <option value="">-- Select --</option>
                    <option>Algerian</option>
                    <option>Tunisian</option>
                  </select>
                </label>

                {/* Grade */}
                <label>
                  Grade *
                  <select value={grade} onChange={(e) => setGrade(e.target.value)} required>
                    <option value="">-- Select --</option>
                    <option>Brown Belt</option>
                    <option>Black Belt</option>
                  </select>
                </label>

                {/* Holder of */}
                <label>
                  Holder of *
                  <input type="text" value={holderOf} onChange={(e) => setHolderOf(e.target.value)} required />
                </label>

                {/* Blood Type */}
                <label>
                  Blood Type *
                  <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} required>
                    <option value="">-- Select --</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                    <option>O+</option>
                    <option>O-</option>
                  </select>
                </label>

                {/* Last Name */}
                <label>
                  Last Name *
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </label>

                {/* First Name */}
                <label>
                  First Name *
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </label>

                {/* Date of Birth */}
                <label>
                  Date of Birth *
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
                </label>

                {/* Place of Birth */}
                <label>
                  Place of Birth *
                  <input value={pob} onChange={(e) => setPob(e.target.value)} required />
                </label>

                {/* National ID */}
                <label>
                  National Identity Number *
                  <input value={nid} onChange={(e) => setNid(e.target.value)} maxLength="18" required />
                  <small>18 digits required — must be unique. </small>
                </label>

                {/* Password */}
                <label>
                  Password *
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </label>

                {/* Confirm Password */}
                <label>
                  Confirm Password *
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Upload Club Logo *
                  <input
                    type="file"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </label>

                {/* Upload Member Photo */}
                <label>
                  Upload Member Photo *
                  <input type="file" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} required />
                </label>

                <div className="btn-row">
                  <button type="submit" className="primary-b" disabled={submitLoading}>
                    {submitLoading ? "Saving..." : "Save Member"}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
                  All fields marked with an asterisk (*) must be filled in.
                </p>
              </form>
            </section>

            <h2 className="form-title">List Of Club Members</h2>

            <div className="form-grid">
              {/* League Selection */}
							{/* League Selection */}
								<label>
								  League:
								  <select
								    value={selectedLeagueId}
								    onChange={(e) => {
								      setSelectedLeagueId(e.target.value);
								      setSelectedClubId("");
								    }}
								    disabled={!!state?.league_id} // lock if coming from state
								  >
								    {state?.league_id ? (
								      <option value={state.league_id}>{leagueName}</option>
								    ) : (
								      <>
								        <option value="">-- Select League --</option>
								        {leagues.map((l) => (
								          <option key={l.id} value={l.id}>
								            {l.name_league}
								          </option>
								        ))}
								      </>
								    )}
								  </select>
								</label>
								
								{/* Club Selection */}
								<label>
  Club:
  <select
    value={selectedClubId}
    onChange={(e) => setSelectedClubId(e.target.value)}
    required
  >
    <option value="">-- Select Club --</option>
    {clubs.map((c) => (
      <option key={c.id} value={c.id}>
        {c.name_club}
      </option>
    ))}
  </select>
</label>



              <div><h2 className="form-title">search Member</h2></div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search by First Name, Last Name, or NID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="table-container" ref={tableRef}>
              <table className="athlete-table">
                <thead>
                  <tr>
                    <th>Last</th>
                    <th>First</th>
                    <th>DOB</th>
                    <th>POB</th>
                    <th>Role</th>
                    <th>Blood</th>
                    <th>Nationality</th>
                    <th>Grade</th>
                    <th>holder_of</th>
                    <th>NID</th>
                    <th>Renewal</th>
                    <th>Year</th>
                    <th>License #</th>
                    <th>Registration</th>
                    <th>Photos</th>
                    <th>Confirmation</th>
                    <th>Club ID</th>
                    <th>League ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={19}>No members found.</td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => (
                      <tr 
                        key={m.id}
                        onDoubleClick={() => handleMemberDoubleClick(m)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Last */}
                        <td>
                          {editingId === m.id ? (
                            <input
                              value={editedMember.last_name || ""}
                              onChange={(e) => handleChange(e, "last_name")}
                            />
                          ) : (
                            m.last_name
                          )}
                        </td>

                        {/* First */}
                        <td>
                          {editingId === m.id ? (
                            <input
                              value={editedMember.first_name || ""}
                              onChange={(e) => handleChange(e, "first_name")}
                            />
                          ) : (
                            m.first_name
                          )}
                        </td>

                        {/* DOB */}
                        <td>
                          {editingId === m.id ? (
                            <input
                              type="date"
                              value={editedMember.date_of_birth || ""}
                              onChange={(e) => handleChange(e, "date_of_birth")}
                            />
                          ) : (
                            m.date_of_birth
                          )}
                        </td>

                        {/* POB */}
                        <td>
                          {editingId === m.id ? (
                            <input
                              value={editedMember.place_of_birth || ""}
                              onChange={(e) => handleChange(e, "place_of_birth")}
                            />
                          ) : (
                            m.place_of_birth
                          )}
                        </td>

                        {/* Role */}
                <td>
                  {editingId === m.id ? (
                    <select
                      value={editedMember.role_id || ""}
                      onChange={(e) => handleChange(e, "role_id")}
                    >
                      <option value="">-- Select --</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.club_role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    m.role || 'No Role'
                  )}
                </td>

                        {/* Blood */}
                        <td>
                          {editingId === m.id ? (
                            <select
                              value={editedMember.blood_type || ""}
                              onChange={(e) => handleChange(e, "blood_type")}
                            >
                              <option value="">--</option>
                              <option>A+</option><option>A-</option>
                              <option>B+</option><option>B-</option>
                              <option>AB+</option><option>AB-</option>
                              <option>O+</option><option>O-</option>
                            </select>
                          ) : (
                            m.blood_type
                          )}
                        </td>

                        {/* Nationality */}
                        <td>
                          {editingId === m.id ? (
                            <select
                              value={editedMember.nationality || ""}
                              onChange={(e) => handleChange(e, "nationality")}
                            >
                              <option value="">-- Select --</option>
                              <option>Algerian</option>
                              <option>Tunisian</option>
                              {/* add others if needed */}
                            </select>
                          ) : (
                            m.nationality
                          )}
                        </td>

                        {/* Grade */}
                        <td>
                          {editingId === m.id ? (
                            <select
                              value={editedMember.grade || ""}
                              onChange={(e) => handleChange(e, "grade")}
                            >
                              <option value="">-- Select --</option>
                              <option>Brown Belt</option>
                              <option>Black Belt</option>
                            </select>
                          ) : (
                            m.grade
                          )}
                        </td>

                        {/* holder_of */}
                        <td>
                          {editingId === m.id ? (
                            <input
                              value={editedMember.holder_of || ""}
                              onChange={(e) => handleChange(e, "holder_of")}
                            />
                          ) : (
                            m.holder_of
                          )}
                        </td>

                        {/* NID */}
                        <td>{m.national_id_number}</td>

                        {/* Renewal */}
                        <td>{m.renewal}</td>

                        {/* Year */}
                        <td>{m.year}</td>

                        {/* License */}
                        <td>{m.license_number}</td>

                        {/* Registration */}
                        <td>{m.registration_date}</td>

                        {/* Photos */}
                        <td>
                          {m.photos_url || m.photo_url ? (
                            <img
                              src={getLogoUrl(m.photos_url || m.photo_url)}
                              alt="Member"
                              style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "50%" }}
                            />
                          ) : (
                            "No Photo"
                          )}
                        </td>

                        {/* Confirmation */}
                        <td>{m.confirmation ? "✅" : "❌"}</td>

                        {/* Club ID */}
                        <td>{m.club_id}</td>

                        {/* League ID */}
                        <td>{m.league_id}</td>

                        {/* Actions */}
                        <td>
                          {editingId === m.id ? (
                            <>
                              <button className="primary-S" onClick={() => handleSave(m.id)}>Save</button>
                              <button className="secondary-btn" onClick={cancelEdit}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="primary-M" onClick={() => handleEdit(m)}>Modify</button>
                              <button className="secondary-btn" onClick={() => handleDelete(m)}>Delete</button>
                              <button
                                className={m.confirmation ? "cancel-btn" : "confirm-btn"}
                                onClick={() => toggleMemberConfirmation(m.id, m.confirmation)}
                              >
                                {m.confirmation ? "Cancel Confirmation" : "Confirm"}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          
          {/* PDF Export Section */}
          
          <BackHomeButton />
          {/* PDF Export Section */}
           <button className="primary-b"
              onClick={exportGeneralPDF}
            >
              Export General PDF
            </button>
            <button className="primary-b"
              onClick={exportGradeRolePDF}
            >
              Export Grade Role PDF
            </button>
        </div>
      </section>
      <Navigation />
     <footer className="footer" style={{ backgroundColor: "red" }}>
        <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
      </footer>

      {/* Error and Success Overlays */}
      {error && (
        <ErrorOverlay
          error={error}
          onClose={() => setError(null)}
        />
      )}
      {success && (
        <SuccessOverlay
          success={success}
          onClose={() => setSuccess("")}
        />
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes bounceIn {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
