import React, { useState, useEffect, useRef } from "react";
    import { useNavigate, useLocation } from "react-router-dom";
    import { Shield } from "lucide-react";
    import { supabase } from "./supabaseClient";
    import BackHomeButton from "./BackHomeButton";
import PhotosLogoPublication from "./PhotosLogoPublication";
import { initializePrimaryButtons, handlePrimaryButtonClick } from './primaryButtonHandler';
    import Navigation from "./Navigation";
    import logo from "./assets/logo.png";
    import { jsPDF } from 'jspdf';
    import autoTable from 'jspdf-autotable';
    import { fetchClubNames, fetchLeagueNames, sanitizeText, sanitizeForPDF } from './ExportUtils';
import { useDragScroll } from './useDragScroll';
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from './components/BarLoading';


export default function TheClubListAddFed() {
  // Initialize active state for primary buttons
  useEffect(() => {
    initializePrimaryButtons();
  }, []);
  useEffect(() => {
    initializePrimaryButtons();
  }, []);
      const navigate = useNavigate();
      const location = useLocation();
      const state = location.state || {};
      const [federationLogo, setFederationLogo] = useState(null);
      const [federationName] = useState("Algerian Judo Federation");
      const [roles, setRoles] = useState([]);
      const [clubs, setClubs] = useState([]);
      const [leagues, setLeagues] = useState([]);
      const [members, setMembers] = useState([]);
      const [selectedLeague, setSelectedLeague] = useState(state?.league_id || "");
      const [selectedClub, setSelectedClub] = useState(state?.club_id || "");
      const [lastName, setLastName] = useState("");
      const [firstName, setFirstName] = useState("");
      const [dob, setDob] = useState("");
      const [pob, setPob] = useState("");
      const [roleId, setRoleId] = useState("");
      const [bloodType, setBloodType] = useState("");
      const [nid, setNid] = useState("");
      const [password, setPassword] = useState("");
      const [confirmPassword, setConfirmPassword] = useState("");
      const [nationality, setNationality] = useState("");
      const [grade, setGrade] = useState("");
      const [holderOf, setHolderOf] = useState("");
      const [photoFile, setPhotoFile] = useState(null);
      const [logoFile, setLogoFile] = useState(null);
      const [searchTerm, setSearchTerm] = useState(""); // Add this line
      const [error, setError] = useState("");
      const [success, setSuccess] = useState("");
      const [editingId, setEditingId] = useState(null);
      const [editedMember, setEditedMember] = useState({});
      const [loading, setLoading] = useState(true);
      const [clubName, setClubName] = useState("");
      const [leagueName, setLeagueName] = useState("");
      const [athletes, setAthletes] = useState([]);
      const [allAthletes, setAllAthletes] = useState([]);
      
      const STORAGE_URL = "https://aolsbxfulbvpiobqqsao.supabase.co/storage/v1/object/public/logos/";
      const tableRef = useDragScroll();

      const getLogoUrl = (path) => {
        if (!path) return null;
        if (path.startsWith("http")) return path;
        return `${STORAGE_URL}${path}`;
      };

      // Utility function to force refresh data and clear cache
      const forceRefreshData = async () => {
        try {
          console.log('Force refreshing all data...');
          
          // Clear all localStorage cache and force browser cache clear
          if (typeof Storage !== "undefined") {
            localStorage.clear();
            sessionStorage.clear();
          }
          
          // Force browser cache clear
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => {
                caches.delete(name);
              });
            });
          }
          
          // Add timestamp to force fresh data
          const timestamp = Date.now();
          console.log('🔍 Cache cleared at:', timestamp);
          
          // Force refresh leagues
          const { data: freshLeagues, error: leaguesError } = await supabase
            .from("nameleague")
            .select("id, name_league");
          
          if (!leaguesError && freshLeagues) {
            // DEBUG: Check raw database data
            console.log('🔍 RAW DATABASE LEAGUES:', freshLeagues);
            freshLeagues.forEach(league => {
              if (league.name_league?.includes('%')) {
                console.log('🚨 DATABASE CORRUPTION FOUND - League:', league.name_league);
                console.log('🚨 Character codes:', league.name_league.split('').map(char => `${char}(${char.charCodeAt(0)})`).join(' '));
              }
            });
            
            // Sanitize league names immediately
            freshLeagues.forEach(league => {
              if (league.name_league) {
                league.name_league = sanitizeText(league.name_league);
              }
            });
            setLeagues(freshLeagues);
          }
          
          // Force refresh clubs
          const { data: freshClubs, error: clubsError } = await supabase
            .from("nameclub")
            .select("id, name_club, league_i");
          
          if (!clubsError && freshClubs) {
            // DEBUG: Check raw database data
            console.log('🔍 RAW DATABASE CLUBS:', freshClubs);
            freshClubs.forEach(club => {
              if (club.name_club?.includes('%')) {
                console.log('🚨 DATABASE CORRUPTION FOUND - Club:', club.name_club);
                console.log('🚨 Character codes:', club.name_club.split('').map(char => `${char}(${char.charCodeAt(0)})`).join(' '));
              }
            });
            
            // Sanitize club names immediately
            freshClubs.forEach(club => {
              if (club.name_club) {
                club.name_club = sanitizeText(club.name_club);
              }
            });
            setClubs(freshClubs);
          }
          
          console.log('Data refresh completed');
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      };

      // ---------- Fetch roles, leagues, and all clubs on mount ----------
      useEffect(() => {
        const fetchInitialData = async () => {
          try {
            // 1️⃣ Fetch roles
            const { data: rolesData, error: rolesError } = await supabase
              .from("clubrole")
              .select("*");
            if (rolesError) throw rolesError;
            

            
            setRoles(rolesData || []);

            // 2️⃣ Fetch leagues
            const { data: leaguesData, error: leaguesError } = await supabase
              .from("nameleague")
              .select("id, name_league");
            if (leaguesError) throw leaguesError;
            setLeagues(leaguesData || []);

            // 3️⃣ Fetch all clubs (unfiltered)
            const { data: clubsData, error: clubsError } = await supabase
              .from("nameclub")
              .select("id, name_club, league_i");
            if (clubsError) throw clubsError;
            setClubs(clubsData || []);
          } catch (err) {
            console.error("Error fetching initial data:", err.message);
          } finally {
            setLoading(false);
          }
        };
        fetchInitialData();
      }, []);

      // ---------- Fetch clubs whenever a league is selected ----------
      useEffect(() => {
        const fetchClubs = async () => {
          if (!selectedLeague) {
            setClubs([]);
            setSelectedClub(""); // reset selected club
            return;
          }
          try {
            const { data, error } = await supabase
              .from("nameclub")
              .select("id, name_club")
              .eq("league_i", Number(selectedLeague)); // ✅ use league_i
            if (error) throw error;
            setClubs(data || []);
            setSelectedClub(""); // reset club selection when league changes
          } catch (err) {
            console.error("Error fetching clubs:", err.message);
            setClubs([]);
          }
        };
        fetchClubs();
      }, [selectedLeague]);

      // ---------- Fetch club name when selectedClub changes ----------
      useEffect(() => {
        const fetchClubName = async () => {
          if (!selectedClub) {
            setClubName("");
            return;
          }
          try {
            console.log("Fetching club name for selectedClub:", selectedClub);
            const { data, error } = await supabase
              .from("nameclub")
              .select("name_club")
              .eq("id", Number(selectedClub))
              .single();
            if (error) throw error;
            console.log("Club data retrieved:", data);
            setClubName(data?.name_club || "");
            console.log("Club name set to:", data?.name_club || "");
          } catch (err) {
            console.error("Error fetching club name:", err.message);
            setClubName("");
          }
        };
        fetchClubName();
      }, [selectedClub]);

      // ---------- Fetch league name when selectedLeague changes ----------
      useEffect(() => {
        const fetchLeagueName = async () => {
          if (!selectedLeague) {
            setLeagueName("");
            return;
          }
          try {
            console.log("Fetching league name for selectedLeague:", selectedLeague);
            const { data, error } = await supabase
              .from("nameleague")
              .select("name_league")
              .eq("id", Number(selectedLeague))
              .single();
            if (error) throw error;
            console.log("League data retrieved:", data);
            setLeagueName(data?.name_league || "");
            console.log("League name set to:", data?.name_league || "");
          } catch (err) {
            console.error("Error fetching league name:", err.message);
            setLeagueName("");
          }
        };
        fetchLeagueName();
      }, [selectedLeague]);

      useEffect(() => {
        const fetchLogo = async () => {
          const { data } = await supabase
            .from("logo")
            .select("logo_url")
            .order("created_at", { ascending: false })
            .limit(1);
          if (data?.length) setFederationLogo(data[0].logo_url);
        };
        fetchLogo();
      }, []);

      const fetchMembers = async () => {
        const { data } = await supabase.from("club_members").select("*");
        setMembers(data || []);
      };

      useEffect(() => {
        fetchMembers();
      }, []);

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

      // Get next renewal number
  const getNextRenewal = async (nidVal, clubIdVal, roleName) => {
    const { count } = await supabase
      .from("club_members")
      .select("*", { count: "exact", head: true })
      .eq("national_id_number", nidVal)
      .eq("club_id", clubIdVal)
      .eq("role", roleName);
    return (count || 0) + 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !firstName ||
      !lastName ||
      !dob ||
      !pob ||
      !roleId ||
      !selectedClub ||
      !selectedLeague ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all required fields.");
      return;
    }
    if (nid.length !== 18) {
      setError("National ID must be exactly 18 digits.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const uploadedClubLogo = await uploadFile(logoFile);
      const uploadedPhoto = await uploadFile(photoFile);

      const roleName =
        roles.find((r) => r.id === parseInt(roleId))?.club_role || "";
      const renewalNumber = await getNextRenewal(nid, selectedClub, roleName);
      const currentYear = new Date().getFullYear();
      const seasonYear = `${currentYear}/${currentYear + 1}`;

      const newMember = {
        last_name: lastName,
        first_name: firstName,
        date_of_birth: dob,
        place_of_birth: pob,
        role: roleName,
        blood_type: bloodType,
        national_id_number: nid,
        password,
        nationality,
        grade,
        holder_of: holderOf,
        photo_url: uploadedPhoto,
        renewal: renewalNumber,
        year: seasonYear,
        confirmation: false,
        logo_url: uploadedClubLogo,
        club_id: selectedClub,
        league_id: selectedLeague,
        license_number: `LIC-${Date.now()}`,
        registration_date: new Date().toISOString().split("T")[0],
      };

      const { error: insertError } = await supabase
        .from("club_members")
        .insert([newMember]);
      if (insertError) {
        setError(`Failed to save member: ${insertError.message}`);
        return;
      }

      setSuccess(`Member "${firstName} ${lastName}" added successfully!`);

      // reset form
      setLastName("");
      setFirstName("");
      setDob("");
      setPob("");
      setRoleId("");
      setBloodType("");
      setNid("");
      setPassword("");
      setConfirmPassword("");
      setSelectedClub("");
      setSelectedLeague("");
      setLogoFile(null);
      setPhotoFile(null);
      setNationality("");
      setGrade("");
      setHolderOf("");
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
    }
  };

      const handleEdit = (m) => {
        setEditingId(m.id);
        setEditedMember(m);
      };

      const cancelEdit = () => {
        setEditingId(null);
        setEditedMember({});
      };

      const handleChange = (e, field) => {
        setEditedMember({ ...editedMember, [field]: e.target.value });
      };

      const handleSave = async (id) => {
        try {
          const { error } = await supabase.from("club_members").update(editedMember).eq("id", id);
          if (error) throw error;
          cancelEdit();
          fetchMembers();
        } catch (err) {
          setError(err.message);
        }
      };

      const handleDelete = async (member) => {
        try {
          const registrationDate = new Date(member.registration_date)
            .toISOString()
            .split("T")[0];
          const today = new Date().toISOString().split("T")[0];
          if (registrationDate !== today) {
            alert("You can only delete members on the same day of registration.");
            return;
          }
          const { error } = await supabase
            .from("club_members")
            .delete()
            .eq("id", member.id);
          if (error) throw error;
          setMembers((prev) => prev.filter((m) => m.id !== member.id));
        } catch (err) {
          setError(err.message);
        }
      };

      // confirmation toggle for athletes
      const toggleConfirmation = async (memberId, currentStatus) => {
        try {
          const { error } = await supabase
            .from("club_members")
            .update({ confirmation: !currentStatus }) // toggle
            .eq("id", memberId);

          if (error) throw error;

          // Update local state immediately
          setMembers((prev) =>
            prev.map((m) =>
              m.id === memberId ? { ...m, confirmation: !currentStatus } : m
            )
          );
        } catch (err) {
          setError(`Failed to update confirmation: ${err.message}`);
        }
      };

      // search
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
        generateIndividualMemberPDF(member);
      };

      // Individual Member PDF Generation
      const generateIndividualMemberPDF = async (member) => {
        if (!member || Object.keys(member).length === 0) {
          alert('No data available to export');
          return;
        }
        
        // Fetch club and league names for this specific member
        let fetchedClubName = null;
        let fetchedLeagueName = null;
        
        try {
          if (member.club_id) {
            const clubNames = await fetchClubNames();
            fetchedClubName = clubNames[member.club_id];
          }
          
          if (member.league_id) {
            const leagueNames = await fetchLeagueNames();
            fetchedLeagueName = leagueNames[member.league_id];
          }
        } catch (error) {
          console.error('Error fetching names:', error);
        }
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // Add federation name at top left
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text(federationName, 14, 15);
        
        // Add member title
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text(`Athlete Information - ${member.first_name} ${member.last_name}`, 14, 30);
        
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
        let startY = 45;
        if (member.photo_url) {
          try {
            // Display photo with proper dimensions (25x20)
            doc.addImage(member.photo_url, 'PNG', 14, 45, 25, 20);
            // Adjust the startY for the table to make room for the photo
            startY = 70;
          } catch (error) {
            console.error('Error adding member photo to PDF:', error);
            startY = 45;
          }
        }
        
        // Add confirmation status
        doc.setFontSize(12);
        if (member.confirmation) {
          doc.setTextColor(0, 128, 0); // Green for confirmed
        } else {
          doc.setTextColor(255, 0, 0); // Red for not confirmed
        }
        const confirmationText = member.confirmation ? "CONFIRMED ✓" : "NOT CONFIRMED ✗";
        doc.text(confirmationText, 160, 50);
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        
        // Create member information table
        const memberData = [
          ['Last Name', sanitizeForPDF(member.last_name) || ''],
          ['First Name', sanitizeForPDF(member.first_name) || ''],
          ['Date of Birth', sanitizeForPDF(member.date_of_birth) || ''],
          ['Place of Birth', sanitizeForPDF(member.place_of_birth) || ''],
          ['Role', (() => {
            const foundRole = roles.find(r => r.id === member.role_id);
            return sanitizeForPDF(foundRole?.club_role) || 'No Role';
          })()],
          ['Blood type', sanitizeForPDF(member.blood_type) || ''],
          ['National ID', sanitizeForPDF(member.national_id_number) || ''],
          ['Nationality', sanitizeForPDF(member.nationality) || ''],
          ['Grade', sanitizeForPDF(member.grade) || ''],
          ['Genres', sanitizeForPDF(member.gender) || ''],
          ['Categories', sanitizeForPDF(member.category) || ''],
          ['Weight', sanitizeForPDF(member.weight) || ''],
          ['License Number', sanitizeForPDF(member.license_number) || ''],
          ['Registration Date', sanitizeForPDF(member.registration_date) || ''],
          ['Year', sanitizeForPDF(member.year) || ''],
          ['Renewal', sanitizeForPDF(member.renewal) || '']
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
        
        // Display club information
        if (member.club_id || fetchedClubName) {
          const displayClubName = fetchedClubName || `ID: ${member.club_id}`;
          doc.text(`${displayClubName}`, 14, finalY + 60);
          doc.text("Club Visa: _________________", 14, finalY + 70);
        }
        
        // Display league information
        if (member.league_id || fetchedLeagueName) {
          const displayLeagueName = fetchedLeagueName || `ID: ${member.league_id}`;
          doc.text(`${displayLeagueName}`, 120, finalY + 60);
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
        const filename = `athlete_${member.first_name}_${member.last_name}_${member.id || 'record'}.pdf`;
        doc.save(filename);
      };

      // PDF Export Functions
      const addFederationHeader = (doc, pageNumber = 1) => {
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
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const currentDate = new Date().toLocaleDateString();
        doc.text(`Print Date: ${currentDate}`, 15, 20);
        
        // Add club logo (keep in center-right area)
        const selectedClubData = clubs.find(c => c.id === selectedClub);
        if (selectedClubData?.logo_club) {
          try {
            const clubLogoUrl = selectedClubData.logo_club.startsWith('http') 
              ? selectedClubData.logo_club 
              : `https://aolsbxfulbvpiobqqsao.supabase.co/storage/v1/object/public/logos/${selectedClubData.logo_club}`;
            doc.addImage(clubLogoUrl, 'PNG', pageWidth - 70, 15, 25, 25);
          } catch (e) {
            console.warn('Could not add club logo:', e);
          }
        }
        
        // Federation name
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(federationName, pageWidth / 2, 30, { align: 'center' });
        
        // League and Club info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const leagueName = leagues.find(l => l.id === selectedLeague)?.name_league || '';
        const clubName = clubs.find(c => c.id === selectedClub)?.name_club || '';
        doc.text(`${sanitizeText(leagueName)}`, pageWidth / 2, 35, { align: 'center' });
        doc.text(`${sanitizeText(clubName)}`, pageWidth / 2, 45, { align: 'center' });
        
        // Page number
        doc.setFontSize(10);
        doc.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
        
        return 45; // Return Y position for content start
      };

      const prepareGeneralMemberData = (members) => {
        return members.map(member => {
          const clubName = clubs.find(c => c.id === member.club_id)?.name_club || '';
          const leagueName = leagues.find(l => l.id === member.league_id)?.name_league || '';
          
          return [
            sanitizeText(member.last_name) || '',
            sanitizeText(member.first_name) || '',
            sanitizeText(member.date_of_birth) || '',
            sanitizeText(member.place_of_birth) || '',
            sanitizeText(member.role_name) || '',
            sanitizeText(member.blood_type) || '',
            sanitizeText(member.nationality) || '',
            sanitizeText(member.national_id_number) || '',
            sanitizeText(member.license_number) || '',
            sanitizeText(member.registration_date) || '',
            sanitizeText(clubName),
            sanitizeText(leagueName),
            '', // Club Visa placeholder
            ''  // League Visa placeholder
          ];
        });
      };

      const prepareGradeRoleMemberData = (members) => {
        return members.map(member => {
          const clubName = clubs.find(c => c.id === member.club_id)?.name_club || '';
          const leagueName = leagues.find(l => l.id === member.league_id)?.name_league || '';
          
          return [
            sanitizeText(member.last_name) || '',
            sanitizeText(member.first_name) || '',
            sanitizeText(member.grade) || '',
            sanitizeText(member.role_name) || '',
            sanitizeText(member.holder_of) || '',
            sanitizeText(member.national_id_number) || '',
            sanitizeText(member.license_number) || '',
            sanitizeText(clubName),
            sanitizeText(leagueName),
            '', // Club Visa placeholder
            ''  // League Visa placeholder
          ];
        });
      };

      const exportGeneralPDF = async () => {
        try {
          console.log('Starting General PDF export...');
          
          // Force refresh data to ensure clean data without %%% characters
          await forceRefreshData();
          
          console.log('Filtered members count:', filteredMembers?.length || 0);
          
          if (!filteredMembers || filteredMembers.length === 0) {
            alert('No member data available to export. Please ensure members are loaded.');
            return;
          }
          
          const doc = new jsPDF('landscape');
          let currentY = addFederationHeader(doc);
          
          // Title
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Federation Club Members - General Report', doc.internal.pageSize.getWidth() / 2, currentY + 10, { align: 'center' });
          
          const tableData = prepareGeneralMemberData(filteredMembers);
          console.log('Table data prepared, rows:', tableData.length);
          
          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'POB', 'Role', 'Blood', 'Nationality', 'NID', 'License #', 'Registration', 'Club', 'League', 'Club Visa', 'League Visa']],
            body: tableData,
            startY: currentY + 20,
            styles: {
              fontSize: 7,
              cellPadding: 1,
            },
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
              fontStyle: 'bold'
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            },
            columnStyles: {
              10: { cellWidth: 25 }, // Club column
              11: { cellWidth: 25 }, // League column
              12: { cellWidth: 20 }, // Club Visa column
              13: { cellWidth: 20 }  // League Visa column
            },
            didDrawPage: (data) => {
              if (data.pageNumber > 1) {
                addFederationHeader(doc, data.pageNumber);
              }
            }
          });
          
          const currentDate = new Date().getFullYear();
          const filename = `federation_club_members_general_${currentDate}.pdf`;
          console.log('Saving PDF as:', filename);
          doc.save(filename);
          console.log('General PDF export completed successfully');
          
        } catch (error) {
          console.error('Error exporting General PDF:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          alert(`Error exporting General PDF: ${error.message}`);
        }
      };



      const exportGradeRolePDF = async () => {
        try {
          console.log('Starting Grade & Role PDF export...');
          
          // Force refresh data to ensure clean data without %%% characters
          await forceRefreshData();
          
          // Fetch leagues with fresh data
          console.log('Fetching leagues...');
          const { data: allLeagues, error: leaguesError } = await supabase
            .from("nameleague")
            .select("id, name_league");

          if (leaguesError) {
            console.error('Error fetching leagues:', leaguesError);
            throw new Error(`Failed to fetch leagues: ${leaguesError.message}`);
          }

          console.log('Leagues fetched:', allLeagues?.length || 0);
          if (!allLeagues || allLeagues.length === 0) {
            alert('No leagues found');
            return;
          }

          // Sanitize league names immediately after fetching
          allLeagues.forEach(league => {
            if (league.name_league) {
              console.log('Original league name:', league.name_league);
              league.name_league = sanitizeText(league.name_league);
              console.log('Sanitized league name:', league.name_league);
            }
          });

          // Fetch all clubs
          console.log('Fetching clubs...');
          const { data: allClubs, error: clubsError } = await supabase
            .from("nameclub")
            .select("id, name_club, league_i");

          if (clubsError) {
            console.error('Error fetching clubs:', clubsError);
            throw new Error(`Failed to fetch clubs: ${clubsError.message}`);
          }

          console.log('Clubs fetched:', allClubs?.length || 0);
          if (!allClubs || allClubs.length === 0) {
            alert('No clubs found');
            return;
          }

          // Sanitize club names immediately after fetching
          allClubs.forEach(club => {
            if (club.name_club) {
              console.log('Original club name:', club.name_club);
              club.name_club = sanitizeText(club.name_club);
              console.log('Sanitized club name:', club.name_club);
            }
          });

          // Fetch all members
          console.log('Fetching members...');
          const { data: allMembers, error: membersError } = await supabase
            .from("club_members")
            .select("*");

          if (membersError) {
            console.error('Error fetching members:', membersError);
            throw new Error(`Failed to fetch members: ${membersError.message}`);
          }

          console.log('Members fetched:', allMembers?.length || 0);
          if (!allMembers || allMembers.length === 0) {
            alert('No members found');
            return;
          }

          const doc = new jsPDF('landscape');
          let currentY = addFederationHeader(doc);
          let yPosition = currentY;

          // Group members by year, then by league, then by club
          const membersByYear = {};
          console.log('🔍 DEBUG: Starting member processing...');
          allMembers.forEach(member => {
            const clubData = allClubs.find(club => club.id === member.club_id);
            const leagueData = allLeagues.find(league => league.id === clubData?.league_i);
            
            // DEBUG: Log raw data before sanitization
            if (leagueData?.name_league?.includes('%')) {
              console.log('🔍 DEBUG: Raw league name contains %:', leagueData.name_league);
            }
            if (clubData?.name_club?.includes('%')) {
              console.log('🔍 DEBUG: Raw club name contains %:', clubData.name_club);
            }
            
            const leagueName = leagueData ? sanitizeText(leagueData.name_league) : 'Unknown League';
            const clubName = clubData ? sanitizeText(clubData.name_club) : 'Unknown Club';
            const memberYear = member.year || 'Unknown Year';
            
            if (!membersByYear[memberYear]) {
              membersByYear[memberYear] = {};
            }
            if (!membersByYear[memberYear][leagueName]) {
              membersByYear[memberYear][leagueName] = {};
            }
            if (!membersByYear[memberYear][leagueName][clubName]) {
              membersByYear[memberYear][leagueName][clubName] = [];
            }
            membersByYear[memberYear][leagueName][clubName].push(member);
          });

          // FIRST SECTION: Role-based report
          // Main title for the entire report
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('Club Members - Grade & Role Report', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
          yPosition += 20;
          
          doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeText('ROLES SECTION'), 20, yPosition);
          yPosition += 10;

          // Process each year for role-based grouping
          let isFirstYear = true;
          for (const [year, leaguesInYear] of Object.entries(membersByYear)) {
            if (Object.keys(leaguesInYear).length === 0) continue;

            // Add page break between years (except for the first year)
            if (!isFirstYear) {
              doc.addPage();
              yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages()) + 5;
            }
            isFirstYear = false;

            // Year header
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Year: ${sanitizeForPDF(year)}`, 20, yPosition);
            yPosition += 15;

            // Process each league within the year
            for (const [leagueName, clubsInLeague] of Object.entries(leaguesInYear)) {
              if (Object.keys(clubsInLeague).length === 0) continue;

              // League header
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text(`League: ${sanitizeForPDF(leagueName)}`, 35, yPosition);
              yPosition += 12;

              // Process each club within the league
              for (const [clubName, clubMembers] of Object.entries(clubsInLeague)) {
                if (clubMembers.length === 0) continue;

                // Club header
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`Club: ${sanitizeForPDF(clubName)}`, 50, yPosition);
                yPosition += 10;

              // Group members by role within this club
              const roleGroups = {};
              clubMembers.forEach(member => {
                const foundRole = roles.find(role => role.id === member.role_id);
                const roleName = foundRole?.club_role || 'No Role';
                
                if (!roleGroups[roleName]) {
                  roleGroups[roleName] = [];
                }
                roleGroups[roleName].push(member);
              });

              // Process each role within the club
              for (const [roleName, roleMembers] of Object.entries(roleGroups)) {
                if (roleMembers.length === 0) continue;

                // Role subtitle
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`Role: ${sanitizeText(roleName)}`, 65, yPosition);
                yPosition += 6;

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
                  sanitizeText(member.nid),
                  sanitizeText(member.password),
                  sanitizeText(member.renewal),
                  member.confirmation ? 'Yes' : 'No',
                  sanitizeText(member.license_number),
                  
                ]);

                autoTable(doc, {
                  head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Holder Of', 'NID', 'Password', 'Renewal', 'Confirmation', 'License #', ]],
                  body: tableData,
                  startY: yPosition,
                  styles: {
                    fontSize: 5,
                    cellPadding: 1,
                  },
                  headStyles: {
                    fillColor: [52, 152, 219],
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
                  yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages()) + 5;
                }
              }

              // Add space between clubs
              yPosition += 8;

              // Check if we need a new page for the next club
              if (yPosition > 160) {
                doc.addPage();
                yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages()) + 5;
              }
            }

              // Add space between leagues
              yPosition += 10;
            }

            // Add space between years
            yPosition += 15;
          }

          // Add new page for grade-based report
          doc.addPage();
          yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages());

          // SECOND SECTION: Grades section
          // Main title for the grades section
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('Federation Club Members - Grade & Role Report', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
          yPosition += 20;
          
          doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeText('GRADES SECTION'), 20, yPosition);
          yPosition += 10;

          // Process each year for grade-based grouping
          let isFirstYearGrades = true;
          for (const [year, leaguesInYear] of Object.entries(membersByYear)) {
            if (Object.keys(leaguesInYear).length === 0) continue;

            // Add page break between years (except for the first year)
            if (!isFirstYearGrades) {
              doc.addPage();
              yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages()) + 5;
            }
            isFirstYearGrades = false;

            // Year header
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Year: ${sanitizeText(year)}`, 20, yPosition);
            yPosition += 15;

            // Process each league within the year
            for (const [leagueName, clubsInLeague] of Object.entries(leaguesInYear)) {
              if (Object.keys(clubsInLeague).length === 0) continue;

              // League header
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text(`League: ${sanitizeText(leagueName)}`, 35, yPosition);
              yPosition += 12;

              // Process each club within the league
              for (const [clubName, clubMembers] of Object.entries(clubsInLeague)) {
                if (clubMembers.length === 0) continue;

                // Club header
                 doc.setFontSize(12);
                 doc.setFont('helvetica', 'bold');
                 doc.text(`Club: ${sanitizeText(clubName)}`, 50, yPosition);
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

                // Grade subtitle
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`Grade: ${sanitizeText(gradeName)}`, 65, yPosition);
                yPosition += 6;

                // Prepare table data for this grade (including roles in the table)
                const tableData = gradeMembers.map(member => {
                  const foundRole = roles.find(r => r.id === member.role_id);
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
                    sanitizeText(member.nid),
                    sanitizeText(member.password),
                    sanitizeText(member.renewal),
                    member.confirmation ? 'Yes' : 'No',
                    sanitizeText(member.license_number),
                    sanitizeText(clubName)
                  ];
                });

                autoTable(doc, {
                  head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Role', 'Holder Of', 'NID', 'Password', 'Renewal', 'Confirmation', 'License #', 'Club']],
                  body: tableData,
                  startY: yPosition,
                  styles: {
                    fontSize: 5,
                    cellPadding: 1,
                  },
                  headStyles: {
                    fillColor: [52, 152, 219],
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
                  yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages()) + 5;
                }
              }

              // Add space between clubs
              yPosition += 8;

              // Check if we need a new page for the next club
              if (yPosition > 160) {
                doc.addPage();
                yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages()) + 5;
              }
            }

              // Add space between leagues
              yPosition += 10;
            }

            // Add space between years
            yPosition += 15;
          }

          const currentDate = new Date().getFullYear();
          doc.save(`federation_complete_league_club_report_${currentDate}.pdf`);

        } catch (error) {
          console.error('Error exporting complete federation report PDF:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          
          // Provide more specific error messages
          let errorMessage = 'Error exporting PDF: ';
          if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Network connection error. Please check your internet connection and try again.';
          } else if (error.message.includes('Failed to fetch leagues')) {
            errorMessage += 'Unable to load league data from database.';
          } else if (error.message.includes('Failed to fetch clubs')) {
            errorMessage += 'Unable to load club data from database.';
          } else if (error.message.includes('Failed to fetch members')) {
            errorMessage += 'Unable to load member data from database.';
          } else {
            errorMessage += error.message;
          }
          
          alert(errorMessage);
        }
      };



      useEffect(() => {
        const timeout = setTimeout(() => {
          // Filtering logic runs after 300ms of no typing
        }, 300);
        return () => clearTimeout(timeout);
      }, [searchTerm]);



      //*********************************
      useEffect(() => {
        const fetchLeagueData = async () => {
          if (!selectedLeague) {
            setClubs([]);
            setSelectedClub("");
            setMembers([]);
            return;
          }
          try {
            setLoading(true);
            // 1️⃣ Fetch clubs for this league
            const { data: clubsData, error: clubsError } = await supabase
              .from("nameclub")
              .select("id, name_club")
              .eq("league_i", Number(selectedLeague));
            if (clubsError) throw clubsError;
            setClubs(clubsData || []);
            setSelectedClub(""); // Reset club selection

            // 2️⃣ Fetch members for the league
            const { data: membersData, error: membersError } = await supabase
              .from("club_members")
              .select("*")
              .eq("league_id", Number(selectedLeague));
            if (membersError) throw membersError;
            setMembers(membersData || []);
          } catch (err) {
            console.error("Error fetching league data:", err);
            setClubs([]);
            setMembers([]);
          } finally {
            setLoading(false);
          }
        };
        fetchLeagueData();
      }, [selectedLeague]);

      // Fetch members whenever a club is selected
      useEffect(() => {
        const fetchMembersByClub = async () => {
          if (!selectedLeague || !selectedClub) return; // make sure both are selected
          setLoading(true);
          try {
            // Fetch members from club_members table
            const { data, error } = await supabase
              .from("club_members")
              .select("*")
              .eq("league_id", Number(selectedLeague)) // matches league_id in club_members
              .eq("club_id", Number(selectedClub)); // matches club_id in club_members
            if (error) throw error;
            setMembers(data || []);
          } catch (err) {
            console.error("Error fetching members by club:", err);
            setMembers([]);
          } finally {
            setLoading(false);
          }
        };
        fetchMembersByClub();
      }, [selectedClub, selectedLeague]);


      //
      return (
        <div className="app-container">
          {loading && <BarLoading />}
          <header className="bg-white text-gray-800 p-6 shadow-lg border-b-4 border-red-500">
            <div className="container mx-auto">
              <div className="federation-header">
                {federationLogo ? (
                  <img
                    src={federationLogo}
                    alt="Logo Fédération"
                    className="federation-logo"
                  />
                ) : (
                  <Shield className="w-16 h-16 text-green-700" />
                )}
                <h1 className="federation-title">
                  {federationName || "Algerian Judo Federation"}
                </h1>
              </div>
            </div>
          </header>

          <section className="app-container">
            <h2>Welcome to the Federation Account</h2>
            <p>This is the Federation Account page.</p>
            <div className="form-table-wrapper">
              <div className="sticky-button-bar">
                <BackHomeButton />
                <PhotosLogoPublication data-id="1" />
                <button
                  className="primary-btn"
                  data-id="2"
                  onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/MemberListPageP"); }}
                >
                  The Member List Add
                </button>
                <button
                  className="primary-btn"
                  data-id="3"
                  onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheLeagueList-Add"); }}
                >
                  The League List Add
                </button>
                <button
                  className="primary-btn"
                  data-id="4"
                  onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheClubListAdd-Fed"); }}
                >
                  The Club List Add
                </button>
                <button
                  className="primary-btn"
                  data-id="5"
                  onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheAthleteList-Add"); }}
                >
                  The Athlete List Add
                </button>
              </div>
              <h2 className="form-title">Add Club Member</h2>
              <form onSubmit={handleSubmit} className="form-grid">
                <label>
                  Club Role
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    required
                  >
                    <option value="">Select Role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.club_role}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  League
                  <select
                    value={selectedLeague}
                    onChange={(e) => setSelectedLeague(e.target.value)}
                    required
                  >
                    <option value="">Select League</option>
                    {leagues.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name_league}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Club
                  <select
                    value={selectedClub}
                    onChange={(e) => setSelectedClub(e.target.value)}
                    required
                  >
                    <option value="">Select Club</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_club}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Nationality
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    <option>Algerian</option>
                    <option>Tunisian</option>
                  </select>
                </label>

                <label>
                  Grade
                  <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                    <option value="">-- Select --</option>
                    <option>Brown Belt</option>
                    <option>Black Belt</option>
                  </select>
                </label>

                <label>
                  Holder of
                  <input
                    value={holderOf}
                    onChange={(e) => setHolderOf(e.target.value)}
                  />
                </label>

                <label>
                  Blood Type
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                  >
                    <option value="">--</option>
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

                <label>
                  Last Name
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </label>

                <label>
                  First Name
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>

                <label>
                  Date of Birth
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </label>

                <label>
                  Place of Birth
                  <input value={pob} onChange={(e) => setPob(e.target.value)} />
                </label>

                <label>
                  National ID
                  <input
                    value={nid}
                    onChange={(e) => setNid(e.target.value)}
                    maxLength="18"
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>

                <label>
                  Confirm Password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </label>

                <label>
                  Upload Club Logo
                  <input type="file" onChange={(e) => setLogoFile(e.target.files?.[0])} />
                </label>

                <label>
                  Upload Member Photo
                  <input type="file" onChange={(e) => setPhotoFile(e.target.files?.[0])} />
                </label>

                <div>
                  <button type="submit" className="primary-b">
                    Save Member
                  </button>
                </div>
              </form>

              <h2 className="form-title">List Of Clubs Members</h2>
              <div className="form-grid">
                <label>
                  League:
                  <select
                    value={selectedLeague}
                    onChange={(e) => setSelectedLeague(e.target.value)}
                  >
                    <option value="">-- All Leagues --</option>
                    {leagues.map(l => (
                      <option key={l.id} value={l.id}>{l.name_league}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Club:
                  <select
                    value={selectedClub}
                    onChange={(e) => setSelectedClub(e.target.value)}
                    disabled={!selectedLeague}
                  >
                    <option value="">-- All Clubs --</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name_club}</option>
                    ))}
                  </select>
                </label><p><h2 className="form-title">search Club Member</h2></p>
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

                      {/* Non-editable */}
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
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={19}>No members found.</td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => (
                        <tr 
                          key={m.id}
                          onDoubleClick={(e) => {
                            // Check if this is right after a drag operation
                            const timeSinceLastDrag = Date.now() - (window.lastDragEndTime || 0);
                            if (timeSinceLastDrag < 200) {
                              console.log('🚫 Preventing double-click after drag');
                              e.preventDefault();
                              e.stopPropagation();
                              return;
                            }
                            handleMemberDoubleClick(m);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Editable: Last */}
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

                          {/* Editable: First */}
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

                          {/* Editable: DOB */}
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

                          {/* Editable: POB */}
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

                          {/* Editable: Role (dropdown from roles state) */}
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
                              (() => {
                                const foundRole = roles.find(r => r.id === m.role_id);
                                return foundRole?.club_role || 'No Role';
                              })()
                            )}
                          </td>

                          {/* Editable: Blood */}
                          <td>
                            {editingId === m.id ? (
                              <select
                                value={editedMember.blood_type || ""}
                                onChange={(e) => handleChange(e, "blood_type")}
                              >
                                <option value="">--</option>
                                <option>A+</option>
                                <option>A-</option>
                                <option>B+</option>
                                <option>B-</option>
                                <option>AB+</option>
                                <option>AB-</option>
                                <option>O+</option>
                                <option>O-</option>
                              </select>
                            ) : (
                              m.blood_type
                            )}
                          </td>

                          {/* Editable: Nationality */}
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

                          {/* Editable: Grade */}
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

                          {/* Editable: holder_of */}
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

                          {/* --- Non-editable columns --- */}
                          <td>{m.national_id_number}</td>
                          <td>{m.renewal}</td>
                          <td>{m.year}</td>
                          <td>{m.license_number}</td>
                          <td>{m.registration_date}</td>

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

                          <td>{m.confirmation ? "✅" : "❌"}</td>
                          <td>{m.club_id}</td>
                          <td>{m.league_id}</td>

                          {/* Actions */}
                          <td>
                            {editingId === m.id ? (
                              <>
                                <button className="primary-b" onClick={() => handleSave(m.id)}>
                                  Save
                                </button>
                                <button className="secondary-btn" onClick={cancelEdit}>
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="primary-b" onClick={() => handleEdit(m)}>
                                  Modify
                                </button>
                                <button
                                  className="secondary-btn"
                                  onClick={() => handleDelete(m)} // pass full member object, not just id
                                >
                                  Delete
                                </button>
                                {/* Confirm / Cancel Confirmation button */}
                                <button className={m.confirmation ? "cancel-btn" : "confirm-btn"}
                                  onClick={() => toggleConfirmation(m.id, m.confirmation)}
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
                  <BackHomeButton />      
              {/* PDF Export Buttons */}
              
                <button
                  className="primary-b" onClick={exportGeneralPDF}
                
                >
                  Export General PDF
                </button>
                <button
                  className="primary-b" onClick={exportGradeRolePDF}
                >
                   Export Grade & Role PDF
                </button>
              
            </div>
          </section>

          {/* Transparent Error/Success Overlay System */}
          {error && (
            <ErrorOverlay 
              error={error} 
              onClose={() => setError("")} 
            />
          )}
          {success && (
            <SuccessOverlay 
              success={success} 
              onClose={() => setSuccess("")} 
            />
          )}

          {/* NAVIGATION */}
          <Navigation />

          {/* FOOTER */}
          <footer className="footer" style={{ backgroundColor: "red" }}>
            <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
          </footer>
        </div>
      );
    }
