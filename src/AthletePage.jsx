// AthletePage.jsx
    import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import { Shield, FileDown } from "lucide-react";
import "./index.css";
import logo from "./assets/logo.png";
import ListofAthletesButton from "./ListofAthletesButton.jsx";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { fetchClubNames, fetchLeagueNames } from './ExportUtils';
import loadImage from 'blueimp-load-image';
import { useDragScroll } from './useDragScroll';
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from "./components/BarLoading";
import CircleLoading from "./components/CircleLoading";
import { initializePrimaryButtons, handlePrimaryButtonClick } from "./primaryButtonHandler";

	


    export default function AthletePage() {
      const { state } = useLocation();
      const navigate = useNavigate();

      const [athletes, setAthletes] = useState([]);
      const [loading, setLoading] = useState(true);
      const [circleLoading, setCircleLoading] = useState(false);
      const [error, setError] = useState(null);
      const [success, setSuccess] = useState("");

      const [federationLogo, setFederationLogo] = useState(null);
      const [leagueLogo, setLeagueLogo] = useState(null);
      const [leagueName, setLeagueName] = useState("");
      const [clubLogo, setClubLogo] = useState(null);
      const [clubName, setClubName] = useState("");
      const federationName = "Algerian Judo Federation";
      const STORAGE_URL =
        "https://aolsbxfulbvpiobqqsao.supabase.co/storage/v1/object/public/logos/";

      const [member, setMember] = useState(null);
      const [roles, setRoles] = useState([]);

      const [lastName, setLastName] = useState("");
      const [firstName, setFirstName] = useState("");
      const [dob, setDob] = useState("");
      const [pob, setPob] = useState("");
      const [role, setRole] = useState("");
      const [bloodType, setBloodType] = useState("");
      const [nid, setNid] = useState("");
      const [password, setPassword] = useState("");
      const [confirmPassword, setConfirmPassword] = useState("");
      const [nationality, setNationality] = useState("");
      const [grade, setGrade] = useState("");
      const [photoFile, setPhotoFile] = useState(null);

      const [genres, setGenres] = useState("");
      const [categories, setCategories] = useState("");
      const [weight, setWeight] = useState("");
      const [weights, setWeights] = useState([]);

      const [clubs, setClubs] = useState([]);
      const [leagues, setLeagues] = useState([]);

      const [clubId, setClubId] = useState(state?.club_id ?? "");
      const [leagueId, setLeagueId] = useState(state?.league_id ?? "");

      const [selectedClubId, setSelectedClubId] = useState(state?.club_id || "");
      const [selectedLeagueId, setSelectedLeagueId] = useState(state?.league_id || "");

      const [editingId, setEditingId] = useState(null);
      const [editedAthlete, setEditedAthlete] = useState({});

      const [pdfUrl, setPdfUrl] = useState(null);

      const [searchTerm, setSearchTerm] = useState("");
      const tableRef = useDragScroll();

			

      const getLogoUrl = (path) => {
        if (!path) return null;
        if (path.startsWith("http")) return path;
        return `${STORAGE_URL}${path}`;
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

      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);

          const { data: fedData } = await supabase
            .from("logo")
            .select("logo_url")
            .order("created_at", { ascending: false })
            .limit(1);
          if (fedData?.length) setFederationLogo(getLogoUrl(fedData[0].logo_url));

          if (leagueId) {
            const { data: ln } = await supabase
              .from("nameleague")
              .select("name_league")
              .eq("id", leagueId)
              .single();
            if (ln) setLeagueName(ln.name_league);

            const { data: llogoRows } = await supabase
              .from("league_members")
              .select("logo_url")
              .eq("league_id", leagueId)
              .order("id", { ascending: false })
              .limit(1);
            if (llogoRows?.length) setLeagueLogo(getLogoUrl(llogoRows[0].logo_url));
          }

          if (clubId) {
            const { data: cn } = await supabase
              .from("nameclub")
              .select("name_club, id")
              .eq("id", clubId)
              .single();
            if (cn) {
              setClubName(cn.name_club);
            }

            const { data: clogoRows } = await supabase
              .from("club_members")
              .select("logo_url")
              .eq("club_id", clubId)
              .order("id", { ascending: false })
              .limit(1);
            if (clogoRows?.length) setClubLogo(getLogoUrl(clogoRows[0].logo_url));
          }

          if (state?.member_id) {
            const { data: m } = await supabase
              .from("club_members")
              .select("*")
              .eq("id", state.member_id)
              .single();
            if (m) setMember(m);
          }

          if (clubId && leagueId) {
            const { data: aRows } = await supabase
              .from("athletes")
              .select("*")
              .eq("club_id", clubId)
              .eq("league_id", leagueId)
              .order("id", { ascending: true });
            setAthletes(aRows || []);
          } else {
            setAthletes([]);
          }

          const [{ data: clubsData }, { data: leaguesData }, { data: rolesData }] = await Promise.all([
            supabase.from("nameclub").select("id, name_club"),
            supabase.from("nameleague").select("id, name_league"),
            supabase.from("clubrole").select("*"),
          ]);
          if (clubsData) setClubs(clubsData);
          if (leaguesData) setLeagues(leaguesData);
          if (rolesData) setRoles(rolesData);
        } catch (err) {
          console.error("fetchData error", err);
          setError(err);
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => {
        if (state?.club_id) setClubId(state.club_id);
        if (state?.league_id) setLeagueId(state.league_id);
        fetchData();
      }, [state, clubId, leagueId]);

      // --- Charger les poids quand genres + categories changent ---
      useEffect(() => {
        const fetchWeights = async () => {
          if (!genres || !categories) return;

          try {
            const { data, error } = await supabase
              .from("categories")
              .select("weight")
              .eq("genres", genres) // ex: "Men"
              .eq("categories", categories); // ex: "Benjamins"

            if (error) {
              console.error("Erreur récupération poids:", error.message);
            } else {
              setWeights(data.map((row) => row.weight));
            }
          } catch (err) {
            console.error("Erreur inconnue:", err);
          }
        };

        fetchWeights();
      }, [genres, categories]);

      useEffect(() => {
        const fetchWeights = async () => {
          if (!editedAthlete.genres || !editedAthlete.categories) return;

          try {
            const { data, error } = await supabase
              .from("categories")
              .select("weight")
              .eq("genres", editedAthlete.genres)
              .eq("categories", editedAthlete.categories);

            if (error) {
              console.error("Erreur récupération poids:", error.message);
            } else {
              setWeights(data.map((row) => row.weight));
            }
          } catch (err) {
            console.error("Erreur inconnue:", err);
          }
        };

        fetchWeights();
      }, [editedAthlete.genres, editedAthlete.categories]);

       // compute next renewal count for the same NID within same club+league (not strictly necessary for unique NID rule).
  const getNextRenewal = async (nidVal, currentSeasonYear) => {
    
      const { data: existingInCurrentYear } = await supabase
        .from("athletes")
        .select("*", { count: "exact", head: true })
        .eq("national_id_number", nidVal)
        .eq("year", currentSeasonYear);
     if (existingInCurrentYear && existingInCurrentYear.length > 0) {
      throw new Error("This member is already registered for the current season with the same role and club.");
    }
    // Count total registrations across ALL years for this national_id_number
    const { count } = await supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .eq("national_id_number", nidVal);
    
    return (count || 0) + 1;
  };


      // upload photo helper -> returns publicUrl or null
      const handlePhotoUpload = async () => {
        if (!photoFile) return null;
        const ext = photoFile.name.split(".").pop();
        const fileName = `athlete-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("logos").upload(fileName, photoFile);
        if (error) {
          console.error("upload error", error);
          return null;
        }
        const { data } = supabase.storage.from("logos").getPublicUrl(fileName);
        return data?.publicUrl ?? null;
      };
useEffect(() => {
  initializePrimaryButtons(); // ✅ re-apply active class from localStorage
}, []);
      // Add athlete
      const handleSubmit = async (e) => {
       e.preventDefault();
    setError("");
    setSuccess("");
    setCircleLoading(true);

    // validation
    if (!firstName || !lastName) {
      setError("First name and Last name are required.");
      setCircleLoading(false);
      return;
    }
    if (!/^\d{18}$/.test(nid)) {
      setError("National ID (NID) must be exactly 18 digits.");
      setCircleLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setCircleLoading(false);
      return;
    }
    if (!selectedLeagueId && !leagueId) {
      setError("League must be selected or provided in state.");
      setCircleLoading(false);
      return;
    }
    if (!selectedClubId && !clubId) {
      setError("Club must be selected or provided in state.");
      setCircleLoading(false);
      return;
    }

    // validate age for selected category
    const ageValidation = validateCategoryAge(dob, categories);
    if (!ageValidation.isValid) {
      setError(ageValidation.message);
      setCircleLoading(false);
      return;
    }
 // Check if Last Name and Password combination already exists
    if (lastName && password) {
      const { data: existingNamePassword } = await supabase
        .from("athletes")
        .select("*")
        .eq("password", password);
      
      if (existingNamePassword && existingNamePassword.length > 0) {
        setError("Change your Password for this name because is already exist");
        setCircleLoading(false);
        return;
      }
    }
    // Renewal validation: Check if athlete exists and validate NID consistency for the same year
    const currentYear = new Date().getFullYear();
    const year = `${currentYear}/${currentYear + 1}`;
    
    try {
      // Check if there's already an athlete with this NID in the current year
      const { data: existingInCurrentYear, error: currentYearError } = await supabase
        .from("athletes")
        .select("id, national_id_number")
        .eq("national_id_number", nid)
        .eq("year", year);
      
      if (currentYearError) {
        throw currentYearError;
      }
      
      if (existingInCurrentYear && existingInCurrentYear.length > 0) {
        setError("An athlete with this National ID is already registered for this season.");
        setCircleLoading(false);
        return;
      }
      
    } catch (err) {
      setError(err.message || String(err));
      setCircleLoading(false);
      return;
    }

    try {

      const photoUrl = await handlePhotoUpload();

      // Get renewal number
    const currentYear = new Date().getFullYear();
    const seasonYear = `${currentYear}/${currentYear + 1}`;
    
    let renewal;
    try {
      renewal = await getNextRenewal(nid, seasonYear);
    } catch (renewalError) {
      setError(renewalError.message);
      setSubmitLoading(false);
      return;
    }

          const newAthlete = {
            last_name: lastName,
            first_name: firstName,
            date_of_birth: dob,
            place_of_birth: pob,
            role,
            blood_type: bloodType,
            national_id_number: nid,
            password,
            license_number: `ATH-${Date.now()}`,
            registration_date: new Date().toISOString().split("T")[0],
            photos_url: photoUrl,
            nationality,
            grade,
            renewal: renewal,
            confirmation: false,
            genres,
            categories,
            weight,
            league_id: leagueId,
            club_id: clubId,
            year: seasonYear,
          };

          const { error: insertError } = await supabase.from("athletes").insert([newAthlete]);
          if (insertError) throw insertError;

          setSuccess("Athlete added successfully.");
          // clear form but keep club/league context
          setLastName("");
          setFirstName("");
          setDob("");
          setPob("");
          setRole("");
          setBloodType("");
          setNid("");
          setPassword("");
          setConfirmPassword("");
          setPhotoFile(null);
          setNationality("");
          setGrade("");
          setGenres("");
          setCategories("");
          setWeight("");
          // refresh list
          await fetchData();
        } catch (err) {
          console.error("handleSubmit error", err);
          setError(err?.message || String(err));
        } finally {
          setCircleLoading(false);
        }
      };

      // inline edit handlers
      // Start editing
      const startEdit = (athlete) => {
        setEditingId(athlete.id);
        setEditedAthlete({ ...athlete }); // pre-fill fields
      };

      // Cancel editing
      const cancelEdit = () => {
        setEditingId(null);
        setEditedAthlete({});
      };

      // ---------------- age validation function ----------------
      const validateCategoryAge = (dateOfBirth, category) => {
        if (!dateOfBirth || !category) return { isValid: false, message: "Date of birth and category are required." };
        
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear() - 
                    (today.getMonth() < birthDate.getMonth() || 
                     (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

        const categoryRules = {
          "Poussins": { min: 9, max: 10 },
          "Benjamins": { min: 11, max: 12 },
          "Minimes": { min: 13, max: 14 },
          "Cadets": { min: 15, max: 17 },
          "Juniors": { min: 15, max: 20 },
          "Hopefuls": { min: 15, max: 17 },
          "Seniors": { min: 15, max: 35 },
          "Veterans": { min: 36, max: 150 } // Veterans are more than 35 years old
        };

        const rule = categoryRules[category];
        if (!rule) {
          return { isValid: false, message: `Unknown category: ${category}` };
        }

        if (age < rule.min || age > rule.max) {
          if (category === "Veterans") {
            return { 
              isValid: false, 
              message: `For ${category} category, athlete must be more than 35 years old. Current age: ${age}` 
            };
          } else {
            return { 
              isValid: false, 
              message: `For ${category} category, athlete must be between ${rule.min} and ${rule.max} years old. Current age: ${age}` 
            };
          }
        }

        return { isValid: true, message: "" };
      };

      // Save changes
      const saveEdit = async () => {
        setCircleLoading(true);
        
        // validate age for selected category
        const ageValidation = validateCategoryAge(editedAthlete.date_of_birth, editedAthlete.categories);
        if (!ageValidation.isValid) {
          setCircleLoading(false);
          setError(ageValidation.message);
          return;
        }

        const { error } = await supabase
          .from("athletes")
          .update({
            last_name: editedAthlete.last_name,
            first_name: editedAthlete.first_name,
            date_of_birth: editedAthlete.date_of_birth,
            place_of_birth: editedAthlete.place_of_birth,
            role: editedAthlete.role,
            blood_type: editedAthlete.blood_type,
            nationality: editedAthlete.nationality,
            grade: editedAthlete.grade,
            categories: editedAthlete.categories,
            weight: editedAthlete.weight,
            genres: editedAthlete.genres,
          })
          .eq("id", editingId);

        if (error) {
          setCircleLoading(false);
          setError("Update failed: " + error.message);
        } else {
          // refresh list
          await fetchData();
          cancelEdit();
          setCircleLoading(false);
          setSuccess("Athlete updated successfully!");
        }
      };

      // delete only same day allowed
      const deleteAthlete = async (a) => {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        if (a.registration_date !== today) {
          setError("You can only delete athletes the same day they were added.");
          return;
        }
        if (!window.confirm("Delete this athlete?")) return;
        try {
          const { error } = await supabase.from("athletes").delete().eq("id", a.id);
          if (error) throw error;
          await fetchData();
        } catch (err) {
          console.error("deleteAthlete error", err);
          setError("Error deleting athlete: " + err.message);
        }
      };

      // Show rotation selection modal
      const handleExportPDF = (data) => {
        if (!data || Object.keys(data).length === 0) {
          alert('No data available to export');
          return;
        }
        exportPDFWithAutoOrientation(data);
      };

      // Individual athlete PDF export function with automatic orientation
      const exportPDFWithAutoOrientation = async (data) => {
        
        // Fetch club and league names
        let fetchedClubName = null;
        let fetchedLeagueName = null;
        
        try {
          if (data.club_id) {
            const clubNames = await fetchClubNames();
            const club = clubNames.find(c => c.id === data.club_id);
            fetchedClubName = club?.name_club;
          }
          
          if (data.league_id) {
            const leagueNames = await fetchLeagueNames();
            const league = leagueNames.find(l => l.id === data.league_id);
            fetchedLeagueName = league?.name_league;
          }
        } catch (error) {
          console.error('Error fetching names:', error);
        }
        
        // Create a new PDF document
        const doc = new jsPDF('portrait', 'mm', 'a4');
        
        // Add federation header
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Algerian Judo Federation', 14, 15);
        
        // Add title
        const title = `Athlete Information - ${data.first_name} ${data.last_name}`;
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
        if (data.confirmation) {
          doc.setTextColor(0, 128, 0); // Green for confirmed
        } else {
          doc.setTextColor(255, 0, 0); // Red for not confirmed
        }
        const confirmationText = data.confirmation ? "CONFIRMED ✓" : "NOT CONFIRMED ✗";
        doc.text(confirmationText, 160, 50);
        
        // Prepare data for the table
        const fields = [
          'last_name', 'first_name', 'date_of_birth', 'place_of_birth',
          'role', 'blood_type', 'national_id_number', 'nationality', 'grade',
          'genres', 'categories', 'weight', 'license_number', 'registration_date',
          'year', 'renewal'
        ];
        
        const labels = {
          last_name: 'Last Name',
          first_name: 'First Name',
          date_of_birth: 'Date of Birth',
          place_of_birth: 'Place of Birth',
          national_id_number: 'National ID',
          license_number: 'License Number',
          registration_date: 'Registration Date'
        };
        
        const tableData = fields.map(field => {
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
          const displayClubName = clubName || fetchedClubName || `ID: ${data.club_id}`;
          doc.text(`Club: ${displayClubName}`, 14, finalY + 60);
          doc.text("Club Visa: _________________", 14, finalY + 70);
        }
        
        // Display league information
        if (data.league_id || leagueName) {
          const displayLeagueName = leagueName || fetchedLeagueName || `ID: ${data.league_id}`;
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
            league_id: data.league_id || '',
            confirmation: data.confirmation || 'Unconfirmed'
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
        const filename = `athlete_${data.first_name}_${data.last_name}_${data.id || 'record'}.pdf`;
        doc.save(filename);
      };

      // General PDF Export for all athletes
      const handleGeneralPDFExport = async () => {
        if (!filteredAthletes || filteredAthletes.length === 0) {
          alert('No athletes data available to export');
          return;
        }

        const doc = new jsPDF('landscape', 'mm', 'a4');
        const currentYear = new Date().getFullYear();

        // Add federation header
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Algerian Judo Federation', 14, 15);

        // Add year
        doc.setFontSize(14);
        doc.text(`Year: ${currentYear}`, 14, 25);

        // Add logo if available
        if (federationLogo) {
          try {
            doc.addImage(federationLogo, 'PNG', 250, 10, 25, 25);
          } catch (error) {
            console.error('Error adding logo to PDF:', error);
          }
        }

        // Add title
        doc.setFontSize(16);
        doc.text('General Athletes List', 14, 35);

        // Fetch club and league names once to avoid multiple API calls
        let clubNames = {};
        let leagueNames = {};
        
        try {
          clubNames = await fetchClubNames();
          leagueNames = await fetchLeagueNames();
        } catch (error) {
          console.error('Error fetching club/league names:', error);
        }

        // Prepare data for the table
        const tableData = filteredAthletes.map((athlete) => {
          // Get club and league names from the maps
          let clubName = '';
          let leagueName = '';
          
          if (athlete.club_id) {
            clubName = clubNames[athlete.club_id] || `Club ID: ${athlete.club_id}`;
          }
          
          if (athlete.league_id) {
            leagueName = leagueNames[athlete.league_id] || `League ID: ${athlete.league_id}`;
          }

          return [
            athlete.last_name || '',
            athlete.first_name || '',
            athlete.date_of_birth || '',
            athlete.place_of_birth || '',
            athlete.blood_type || '',
            athlete.national_id_number || '',
            athlete.license_number || '',
            clubName,
            leagueName,
            athlete.role || '',
            athlete.nationality || '',
            athlete.grade || '',
            athlete.genres || '',
            athlete.categories || '',
            athlete.weight || ''
          ];
        });

        // Generate the table
        autoTable(doc, {
          startY: 45,
          head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'National ID', 'License #', 'Club', 'League', 'Role', 'Nationality', 'Grade', 'Gender', 'Category', 'Weight']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [40, 40, 40], fontSize: 8 },
          styles: { fontSize: 7, overflow: 'linebreak' },
          columnStyles: {
            0: { cellWidth: 18 }, // Last Name
            1: { cellWidth: 18 }, // First Name
            2: { cellWidth: 18 }, // DOB
            3: { cellWidth: 18 }, // POB
            4: { cellWidth: 12 }, // Blood Type
            5: { cellWidth: 20 }, // National ID
            6: { cellWidth: 20 }, // License #
            7: { cellWidth: 25 }, // Club
            8: { cellWidth: 25 }, // League
            9: { cellWidth: 15 }, // Role
            10: { cellWidth: 15 }, // Nationality
            11: { cellWidth: 15 }, // Grade
            12: { cellWidth: 12 }, // Gender
            13: { cellWidth: 15 }, // Category
            14: { cellWidth: 12 }  // Weight
          }
        });

        // Save the PDF
        doc.save(`general_athletes_list_${currentYear}.pdf`);
      };

      // Category-based PDF Export with hierarchical structure (Category > Gender > Weight)
      const handleCategoryPDFExport = async () => {
        if (!filteredAthletes || filteredAthletes.length === 0) {
          alert('No athletes data available to export');
          return;
        }

        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const currentYear = new Date().getFullYear();
        const currentDate = new Date().toLocaleDateString();

        // Fetch club and league names once to avoid multiple API calls
        let clubNames = {};
        let leagueNames = {};
        
        try {
          clubNames = await fetchClubNames();
          leagueNames = await fetchLeagueNames();
        } catch (error) {
          console.error('Error fetching club/league names:', error);
        }

        // Helper function to add federation header
        const addFederationHeader = () => {
          // Add date on the left
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40);
          doc.text(`Date: ${currentDate}`, 14, 15);

          // Add federation header - centered, bold, 16px
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(40, 40, 40);
          doc.text('Algerian Judo Federation', pageWidth / 2, 15, { align: 'center' });

          // Add logo on the right
          if (federationLogo) {
            try {
              doc.addImage(federationLogo, 'PNG', pageWidth - 40, 5, 25, 25);
            } catch (error) {
              console.error('Error adding logo to PDF:', error);
            }
          }

          // Add League label - normal, 14px, black color, centered
          doc.setFontSize(14);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40); // Black color
          doc.text(`League: ${leagueName || 'Unknown League'}`, pageWidth / 2, 30, { align: 'center' });
          
          // Add Club label - normal, 14px, black color, centered
          doc.setFontSize(14);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40); // Black color
          doc.text(`Club: ${clubName || 'Unknown Club'}`, pageWidth / 2, 37, { align: 'center' });
          
          // Add title - bold, 14px, red color, centered
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 53, 69); // Red color
          doc.text('Athletes Members - Category Situation', pageWidth / 2, 47, { align: 'center' });
        };

        // Helper function to prepare athlete data for table (sorted by date of birth)
        const prepareAthleteData = (athletes) => {
          // Sort athletes by date of birth
          const sortedAthletes = athletes.sort((a, b) => {
            const dateA = new Date(a.date_of_birth || '1900-01-01');
            const dateB = new Date(b.date_of_birth || '1900-01-01');
            return dateA - dateB;
          });

          return sortedAthletes.map((athlete) => {
            return [
              sanitizeText(athlete.last_name || ''),
              sanitizeText(athlete.first_name || ''),
              sanitizeText(athlete.date_of_birth || ''),
              sanitizeText(athlete.place_of_birth || ''),
              sanitizeText(athlete.blood_type || ''),
              sanitizeText(athlete.nationality || ''),
              sanitizeText(athlete.grade || ''),
              sanitizeText(athlete.genres || ''),
              sanitizeText(athlete.categories || ''),
              sanitizeText(athlete.weight || ''),
              sanitizeText(athlete.national_id_number || ''),
              athlete.confirmation ? 'Yes' : 'No',
              sanitizeText(athlete.license_number || '')
            ];
          });
        };

        // Create hierarchical structure: Year > Club > Category > Gender > Weight
        const hierarchicalData = {};
        
        filteredAthletes.forEach(athlete => {
          const year = athlete.year || 'Unknown Year';
          const clubId = athlete.club_id;
          const clubName = clubId ? (clubNames[clubId] || `Club ID: ${clubId}`) : 'Unknown Club';
          const category = athlete.categories || 'Uncategorized';
          const gender = athlete.genres || 'Unspecified';
          const weight = athlete.weight || 'Unspecified';
          
          if (!hierarchicalData[year]) {
            hierarchicalData[year] = {};
          }
          if (!hierarchicalData[year][clubName]) {
            hierarchicalData[year][clubName] = {};
          }
          if (!hierarchicalData[year][clubName][category]) {
            hierarchicalData[year][clubName][category] = {};
          }
          if (!hierarchicalData[year][clubName][category][gender]) {
            hierarchicalData[year][clubName][category][gender] = {};
          }
          if (!hierarchicalData[year][clubName][category][gender][weight]) {
            hierarchicalData[year][clubName][category][gender][weight] = [];
          }
          
          hierarchicalData[year][clubName][category][gender][weight].push(athlete);
        });

        // Add initial header
        addFederationHeader();
        let currentY = 50;
        let isFirstPage = true;

        // Process hierarchical data
        for (const [year, clubs] of Object.entries(hierarchicalData)) {
          // Check if we need a new page for year
          if (currentY > 180 && !isFirstPage) {
            doc.addPage();
            addFederationHeader();
            currentY = 50;
          }

          // Year header - 13px bold
          doc.setFontSize(13);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'bold');
          doc.text(`Year: ${year}`, 14, currentY);
          currentY += 15;

          for (const [clubName, categories] of Object.entries(clubs)) {
             for (const [category, genders] of Object.entries(categories)) {
              // Check if we need a new page for category
              if (currentY > 210) {
                doc.addPage();
                addFederationHeader();
                currentY = 50;
                // Repeat year and club headers on new page
                doc.setFontSize(13);
                doc.setTextColor(0, 0, 0);
                doc.setFont(undefined, 'bold');
                doc.text(`Year: ${year}`, 14, currentY);
                currentY += 15;
                doc.setFontSize(12);
                doc.text(`  Club: ${clubName}`, 20, currentY);
                currentY += 12;
              }

              // Club and Category header combined - 11px bold
              doc.setFontSize(11);
              doc.setTextColor(0, 0, 0);
              doc.setFont(undefined, 'bold');
              doc.text(`    Club: ${clubName} - Category: ${category}`, 26, currentY);
              currentY += 10;

              for (const [gender, weights] of Object.entries(genders)) {
                // Check if we need a new page for gender
                if (currentY > 220) {
                  doc.addPage();
                  addFederationHeader();
                  currentY = 50;
                  // Repeat year header on new page
                  doc.setFontSize(13);
                  doc.setTextColor(0, 0, 0);
                  doc.setFont(undefined, 'bold');
                  doc.text(`Year: ${year}`, 14, currentY);
                  currentY += 15;
                  doc.setFontSize(11);
                  doc.text(`    Club: ${clubName} - Category: ${category}`, 26, currentY);
                  currentY += 10;
                }

                for (const [weight, athletes] of Object.entries(weights)) {
                  // Check if we need a new page for weight
                  if (currentY > 230) {
                    doc.addPage();
                    addFederationHeader();
                    currentY = 50;
                    // Repeat year and club-category headers on new page
                    doc.setFontSize(13);
                    doc.setTextColor(0, 0, 0);
                    doc.setFont(undefined, 'bold');
                    doc.text(`Year: ${year}`, 14, currentY);
                    currentY += 15;
                    doc.setFontSize(11);
                    doc.text(`    Club: ${clubName} - Category: ${category}`, 26, currentY);
                    currentY += 10;
                  }

                  // Gender and Weight header combined - 10px bold
                  doc.setFontSize(10);
                  doc.setTextColor(0, 0, 0);
                  doc.setFont(undefined, 'bold');
                  doc.text(`      Gender: ${gender} - Weight: ${weight}`, 32, currentY);
                  currentY += 8;

                  // Athletes table for this weight category (ordered by date of birth)
                  const athleteData = prepareAthleteData(athletes);

                  autoTable(doc, {
                    startY: currentY,
                    head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Gender', 'Category', 'Weight', 'NID', 'Confirmation', 'License #']],
                    body: athleteData,
                    theme: 'grid',
                    headStyles: { 
                      fillColor: [40, 167, 69], // Green headers
                      textColor: [255, 255, 255], // White text
                      fontSize: 6 
                    },
                    styles: { fontSize: 5, overflow: 'linebreak' },
                    margin: { left: 44 }, // Indent the table to show hierarchy
                    columnStyles: {
                      0: { cellWidth: 18 }, // Last Name
                      1: { cellWidth: 18 }, // First Name
                      2: { cellWidth: 18 }, // DOB
                      3: { cellWidth: 18 }, // POB
                      4: { cellWidth: 12 }, // Blood Type
                      5: { cellWidth: 18 }, // Nationality
                      6: { cellWidth: 12 }, // Grade
                      7: { cellWidth: 12 }, // Gender
                      8: { cellWidth: 18 }, // Category
                      9: { cellWidth: 12 }, // Weight
                      10: { cellWidth: 20 }, // NID
                      11: { cellWidth: 15 }, // Confirmation
                      12: { cellWidth: 20 }  // License #
                    }
                  });

                  currentY = doc.lastAutoTable.finalY + 8;
                  isFirstPage = false;
                }
                 currentY += 3; // Extra space between genders
               }
               currentY += 5; // Extra space between categories
             }
           }
           currentY += 12; // Extra space between years
        }

        // Save the PDF
        doc.save(`athletes_hierarchical_${currentYear}.pdf`);
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
          .replace(/Ã¼/g, 'ü')
          .replace(/Ã¶/g, 'ö')
          .replace(/Ã¤/g, 'ä')
          .replace(/Ã±/g, 'ñ')
          .replace(/Ã­/g, 'í')
          .replace(/Ã³/g, 'ó')
          .replace(/Ãº/g, 'ú')
          .trim();
        
        return cleanText;
      };

      // Helper function to add general PDF header
      const addGeneralPDFHeader = (doc, federationNameParam, leagueNameParam, clubNameParam) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        
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
        doc.text(sanitizeText(federationNameParam || 'Algerian Judo Federation'), pageWidth / 2, 25, { align: 'center' });
        
        let yPosition = 40;
        
        // League information (centered, below federation name)
        if (leagueNameParam) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          doc.text(`League: ${sanitizeText(leagueNameParam)}`, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 15;
        }
        
        // Club information (centered, below league name)
        if (clubNameParam) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          doc.text(`Club: ${sanitizeText(clubNameParam)}`, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 15;
        }
        
        return yPosition + 2; // Return Y position for content start with small margin
      };

      // Helper function to add federation header
      const addFederationHeader = (doc, federationNameParam, leagueNameParam) => {
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
        doc.text(sanitizeText(federationNameParam || 'Algerian Judo Federation'), pageWidth / 2, 25, { align: 'center' });
        
        // League information (centered, below federation name)
        if (leagueNameParam) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          doc.text(`League: ${sanitizeText(leagueNameParam)}`, pageWidth / 2, 40, { align: 'center' });
        }
        
        // Page number
        doc.setFontSize(10);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
        
        return leagueNameParam ? 57 : 40; // Return Y position for content start
      };

      // Export General PDF function for athletes
      const exportGeneralPDF = async () => {
        if (!selectedClubId && !selectedLeagueId) {
          setError('No club or league selected');
          return;
        }

        try {
          // Fetch athletes based on selected club or league
          let athletesData = [];
          if (selectedClubId) {
            const { data: clubAthletes, error: athletesError } = await supabase
              .from("athletes")
              .select("*")
              .eq("club_id", selectedClubId);

            if (athletesError) throw athletesError;
            athletesData = clubAthletes || [];
          } else if (selectedLeagueId) {
            const { data: leagueAthletes, error: athletesError } = await supabase
              .from("athletes")
              .select("*")
              .eq("league_id", selectedLeagueId);

            if (athletesError) throw athletesError;
            athletesData = leagueAthletes || [];
          }

          if (!athletesData || athletesData.length === 0) {
            setError('No athletes found');
            return;
          }

          const doc = new jsPDF('landscape');
          let yPosition = addGeneralPDFHeader(doc, federationName, leagueName, clubName);

          // Add centered title
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 0, 0); // Red color
          doc.text('Athletes - General Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
          doc.setTextColor(0, 0, 0); // Reset to black
          yPosition += 20;

          // Group athletes by year
          const athletesByYear = {};
          athletesData.forEach(athlete => {
            const year = athlete.year || 'Unknown Year';
            if (!athletesByYear[year]) {
              athletesByYear[year] = [];
            }
            athletesByYear[year].push(athlete);
          });

          // Sort years
          const sortedYears = Object.keys(athletesByYear).sort();

          // Process each year
          for (const year of sortedYears) {
            const yearAthletes = athletesByYear[year];
            
            // Sort athletes within year by date_of_birth
            const sortedAthletes = yearAthletes.sort((a, b) => {
              const dateA = new Date(a.date_of_birth || '1900-01-01');
              const dateB = new Date(b.date_of_birth || '1900-01-01');
              return dateA - dateB;
            });

            // Add year header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0); // Black color
            doc.text(`Year: ${year}`, 20, yPosition);
            yPosition += 15;

            // Prepare table data for this year
            const tableData = sortedAthletes.map(athlete => [
              sanitizeText(athlete.last_name || ""),
              sanitizeText(athlete.first_name || ""),
              sanitizeText(athlete.date_of_birth || ""),
              sanitizeText(athlete.place_of_birth || ""),
              sanitizeText(athlete.blood_type || ""),
              sanitizeText(athlete.nationality || ""),
              sanitizeText(athlete.grade || ""),
              sanitizeText(athlete.genres || ""),
              sanitizeText(athlete.categories || ""),
              sanitizeText(athlete.weight || ""),
              sanitizeText(athlete.national_id_number || ""),
              athlete.confirmation ? 'Yes' : 'No',
              sanitizeText(athlete.license_number || "")
            ]);

            autoTable(doc, {
              head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Gender', 'Category', 'Weight', 'NID', 'Confirmation', 'License #']],
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
              margin: { left: 10, right: 10 },
              didDrawPage: function (data) {
                // Add header to each new page
                if (data.pageNumber > 1) {
                  addGeneralPDFHeader(doc, federationName, leagueName, clubName);
                }
              }
            });

            // Update yPosition for next year
            yPosition = doc.lastAutoTable.finalY + 20;

            // Check if we need a new page
            if (yPosition > doc.internal.pageSize.getHeight() - 50) {
              doc.addPage();
              yPosition = addGeneralPDFHeader(doc, federationName, leagueName, clubName);
            }
          }

          const currentDate = new Date().getFullYear();
          const contextName = leagueName || clubName || 'athletes';
          doc.save(`${sanitizeText(contextName)}_general_athletes_${currentDate}.pdf`);
        } catch (error) {
          console.error("Error exporting general PDF:", error);
          setError("Error exporting PDF. Please try again.");
        }
      };

      // Export Grade Role PDF function for athletes
      const exportGradeRolePDF = async () => {
        if (!selectedClubId && !selectedLeagueId) {
          setError('No club or league selected');
          return;
        }

        try {
          // Fetch athletes based on selected club or league
          let athletesData = [];
          if (selectedClubId) {
            const { data: clubAthletes, error: athletesError } = await supabase
              .from("athletes")
              .select("*")
              .eq("club_id", selectedClubId);

            if (athletesError) throw athletesError;
            athletesData = clubAthletes || [];
          } else if (selectedLeagueId) {
            const { data: leagueAthletes, error: athletesError } = await supabase
              .from("athletes")
              .select("*")
              .eq("league_id", selectedLeagueId);

            if (athletesError) throw athletesError;
            athletesData = leagueAthletes || [];
          }

          if (!athletesData || athletesData.length === 0) {
            setError('No athletes found');
            return;
          }

          const doc = new jsPDF('landscape');
          let yPosition = addGeneralPDFHeader(doc, federationName, leagueName, clubName);

          // Add centered title
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 0, 0); // Red color
          doc.text('Athletes - Grade and Role Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
          doc.setTextColor(0, 0, 0); // Reset to black
          yPosition += 20;

          // Add section header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('SECTION GRADE', 20, yPosition);
          yPosition += 15;

          // Group athletes by year and grade
          const athletesByYearAndGrade = {};
          athletesData.forEach(athlete => {
            const year = athlete.year || 'Unknown Year';
            const grade = athlete.grade || 'Unknown Grade';
            
            if (!athletesByYearAndGrade[year]) {
              athletesByYearAndGrade[year] = {};
            }
            if (!athletesByYearAndGrade[year][grade]) {
              athletesByYearAndGrade[year][grade] = [];
            }
            athletesByYearAndGrade[year][grade].push(athlete);
          });

          // Sort years
          const sortedYears = Object.keys(athletesByYearAndGrade).sort();

          // Process each year
          for (const year of sortedYears) {
            const yearGrades = athletesByYearAndGrade[year];

            // Add year header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0); // Black color
            doc.text(`Year: ${year}`, 20, yPosition);
            yPosition += 15;

            // Sort grades within year
            const sortedGrades = Object.keys(yearGrades).sort();

            // Process each grade
            for (const grade of sortedGrades) {
              const gradeAthletes = yearGrades[grade];

              // Sort athletes within grade by date_of_birth
              const sortedAthletes = gradeAthletes.sort((a, b) => {
                const dateA = new Date(a.date_of_birth || '1900-01-01');
                const dateB = new Date(b.date_of_birth || '1900-01-01');
                return dateA - dateB;
              });

              // Add grade header
              doc.setFontSize(12);
              doc.setFont('helvetica', 'bold');
              doc.text(`Grade: ${grade}`, 30, yPosition);
              yPosition += 10;

              // Prepare table data for this grade
              const tableData = sortedAthletes.map(athlete => [
                sanitizeText(athlete.last_name || ""),
                sanitizeText(athlete.first_name || ""),
                sanitizeText(athlete.date_of_birth || ""),
                sanitizeText(athlete.place_of_birth || ""),
                sanitizeText(athlete.blood_type || ""),
                sanitizeText(athlete.nationality || ""),
                sanitizeText(athlete.genres || ""),
                sanitizeText(athlete.categories || ""),
                sanitizeText(athlete.weight || ""),
                sanitizeText(athlete.national_id_number || ""),
                athlete.confirmation ? 'Yes' : 'No',
                sanitizeText(athlete.license_number || "")
              ]);

              autoTable(doc, {
                head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Gender', 'Category', 'Weight', 'NID', 'Confirmation', 'License #']],
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
                margin: { left: 10, right: 10 },
                didDrawPage: function (data) {
                  // Add header to each new page
                  if (data.pageNumber > 1) {
                    addGeneralPDFHeader(doc, federationName, leagueName, clubName);
                  }
                }
              });

              // Update yPosition for next grade
              yPosition = doc.lastAutoTable.finalY + 15;

              // Check if we need a new page
              if (yPosition > doc.internal.pageSize.getHeight() - 80) {
                doc.addPage();
                yPosition = addGeneralPDFHeader(doc, federationName, leagueName, clubName);
                yPosition += 20; // Add some space after header
              }
            }

            // Add extra space between years
            yPosition += 10;
          }

          const currentDate = new Date().getFullYear();
          const contextName = leagueName || clubName || 'athletes';
          doc.save(`${sanitizeText(contextName)}_grade_role_athletes_${currentDate}.pdf`);
        } catch (error) {
          console.error("Error exporting grade role PDF:", error);
          setError("Error exporting PDF. Please try again.");
        }
      };

      // Define arrays for form options
      const nationalities = ["Algerian", "Tunisian"];
      const grades = ["brown belt", "black belt"];
      const categoriesList = ["Benjamins", "Minimes", "Cadets", "Juniors", "Hopefuls", "Seniors", "Veterans"];
      const genresList = ["Men", "Women"];

      // search
// Search filter
const filteredAthletes = athletes.filter((a) => {
  const term = searchTerm.toLowerCase();
  return (
    (a.first_name?.toLowerCase() ?? "").includes(term) ||
    (a.last_name?.toLowerCase() ?? "").includes(term) ||
    (a.national_id_number ?? "").includes(term)
  );
});

  useEffect(() => {
    const timeout = setTimeout(() => { }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

      //mouse

 
  useEffect(() => {
    const timeout = setTimeout(() => { }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);




      return (
        <div className="app-container">
          {loading && <BarLoading />}
          {/* HEADER Fédération + League + Club */}
          <header>
            <div className="federation-header">
              {/* Federation */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {federationLogo ? (
                  <img src={federationLogo} alt="Federation Logo" className="federation-logo" />
                ) : (
                  <Shield className="federation-logo" />
                )}
                <h1 className="federation-title">{federationName}</h1>
              </div>

              {/* League */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {leagueLogo ? (
                  <img src={leagueLogo} alt="League Logo" className="member-logo" />
                ) : (
                  <p>No league logo</p>
                )}
                <h2 className="federation-title" style={{ fontSize: "1.5rem" }}>
                  {leagueName || "League Name"}
                </h2>
              </div>

              {/* Club */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {clubLogo ? <img src={clubLogo} alt="Club Logo" className="member-logo" /> : <p>No club logo</p>}
                <h3 className="federation-title" style={{ fontSize: "1.2rem" }}>
                  {clubName || "Club Name"}
                </h3>
              </div>
            </div>
          </header>

          {/* MAIN CONTENT */}
          <section className="app-container">
						<div className="form-table-wrapper">
               <h2>Club Member</h2>
            {member ? (
              <p>
                {member.first_name} {member.last_name} —{" "}
                <strong>{(() => {
                  const foundRole = roles.find(role => role.id === parseInt(member.role_id));
                  return foundRole?.club_role || member.club_role || member.role || "No role";
                })()}</strong>
              </p>
            ) : (
              <p>No member found with these credentials.</p>
            )}
            <div className="sticky-button-bar">
              <BackHomeButton />
<button
  type="button"
  className="primary-btn"
  data-id="1"   // ✅ Club Member List button
  onClick={(e) => {
    // Handle primary button state
    handlePrimaryButtonClick(e.target);

    if (clubId && member) {
      navigate("/club-member-listC", {
        state: {
          club_id: clubId,
          club_name: clubName,
          league_id: leagueId,
          member_id: member?.id,
          first_name: member?.first_name,
          last_name: member?.last_name,
          role: member?.role_id,
        },
      });
    } else {
      alert("Club or member not loaded yet.");
    }
  }}
>
  The Club Member List
</button>

<button
  type="button"
  className="primary-btn"
  data-id="2"   // ✅ Athlete List button
  onClick={(e) => {
    // Handle primary button state
    handlePrimaryButtonClick(e.target);

    if (club && member) {
      console.log("➡️ Navigating to /AthletePage with state:", {
        club_id: club.id,
        club_name: club.name_club,
        league_id: state?.league_id,
        member_id: member.id, 
        first_name: member.first_name,
        last_name: member.last_name,
        role: member.role_id,
        club_logo: clubLogo,
      });

      navigate("/AthletePage", {
        state: {
          club_id: club.id,
          club_name: club.name_club,
          league_id: state?.league_id,
          member_id: member.id, 
          first_name: member.first_name,
          last_name: member.last_name,
          role: member.role_id,
          club_logo: clubLogo,
        },
      });
    } else {
      console.log("❌ No club or member found, cannot navigate.");
    }
  }}
>
  List of Athletes
</button>

            </div>
            {/* Athlete Form */}
            <h2 className="form-title">Add Athlete</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Last Name *
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>

              <label>
                First Name *
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>

              <label>
                Date of Birth *
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
              </label>

              <label>
                Place of Birth *
                <input value={pob} onChange={(e) => setPob(e.target.value)} required />
              </label>

              <label>
                Nationality *
                <select value={nationality} onChange={(e) => setNationality(e.target.value)} required>
                  <option value="">-- Select --</option>
                  {nationalities.map((n, i) => (
                    <option key={i} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Grade *
                <select value={grade} onChange={(e) => setGrade(e.target.value)} required>
                  <option value="">-- Select --</option>
                  {grades.map((g, i) => (
                    <option key={i} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Genres *
                <select value={genres} onChange={(e) => setGenres(e.target.value)} required>
                  <option value="">-- Select --</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                </select>
              </label>

              <label>
                Categories *
                <select value={categories} onChange={(e) => setCategories(e.target.value)} required>
                  <option value="">-- Select --</option>
                  <option value="Benjamins">Benjamins</option>
                  <option value="Minimes">Minimes</option>
                  <option value="Cadets">Cadets</option>
                  <option value="Juniors">Juniors</option>
                  <option value="Hopefuls">Hopefuls</option>
                  <option value="Seniors">Seniors</option>
                  <option value="Veterans">Veterans</option>
                  <option value="Cadets By Team">Cadets By Team</option>
                  <option value="Juniors By Team">Juniors By Team</option>
                  <option value="Seniors By Team">Seniors By Team</option>
                  <option value="Cadets By Mixed Team">Cadets By Mixed Team</option>
                  <option value="Juniors By Mixed Team">Juniors By Mixed Team</option>
                  <option value="Seniors By Mixed Team">Seniors By Mixed Team</option>
                </select>
              </label>

              <label>
                Weight *
                <select value={weight} onChange={(e) => setWeight(e.target.value)} required>
                  <option value="">-- Select --</option>
                  {weights.map((w, i) => (
                    <option key={i} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                National ID Number *
                <input value={nid} onChange={(e) => setNid(e.target.value.replace(/\D/g, ""))} maxLength={18} required />
                <small>18 digits required — must be unique. </small>
              </label>

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

              <label>
                Password *
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>

              <label>
                Confirm Password *
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </label>

              {/* club/league selects: prefilled from state if present (disabled) */}
              <label>
                Club *
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  required
                  disabled={!!state?.club_id}
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
                League *
                <select
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(e.target.value)}
                  required
                  disabled={!!state?.league_id}
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
                Upload Athlete Photo *
                <input type="file" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} required />
              </label>

              <div className="btn-row">
                <button type="submit" className="primary-b">
                  Save Athlete
                </button>
                
              </div>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
                  All fields marked with an asterisk (*) must be filled in.
                </p>
            </form>
            <h2 className="form-title">Athletes of {clubName} ({leagueName})</h2>

						       <div className="form-grid">
						  <div><h2 className="form-title">Search Athlete</h2></div>
						  <div className="search-bar">
						    <input
						      type="text"
						      placeholder="Search by First Name, Last Name, or NID..."
						      value={searchTerm}
						      onChange={(e) => setSearchTerm(e.target.value)}
						    />
						  </div>
						</div>
            {/* Athletes Table */}
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
                  <th>NID</th> {/* Non-editable */}
                  <th>Nationality</th>
                  <th>Grade</th>
                  <th>Renewal</th> {/* Non-editable */}
                  <th>Year</th> {/* Non-editable */}
                  <th>Genres</th>
                  <th>Categories</th>
                  <th>Weight</th>
                  <th>License #</th> {/* Non-editable */}
                  <th>Registration</th> {/* Non-editable */}
                  <th>Photos</th> {/* Non-editable */}
                  <th>Confirmation</th> {/* Non-editable */}
                  <th>Club ID</th> {/* Non-editable */}
                  <th>League ID</th> {/* Non-editable */}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
               {filteredAthletes.length === 0 ? (
							    <tr>
							      <td colSpan={21}>No athletes found for this club/league.</td>
							    </tr>
							  ) : (
							    filteredAthletes.map((a) => (
							      <tr key={a.id} onDoubleClick={() => handleExportPDF(a)} style={{ cursor: 'pointer' }}>
                      {/* Last */}
                      <td>
                        {editingId === a.id ? (
                          <input
                            value={editedAthlete.last_name || ""}
                            onChange={(e) =>
                              setEditedAthlete({ ...editedAthlete, last_name: e.target.value })
                            }
                          />
                        ) : (
                          a.last_name
                        )}
                      </td>

                      {/* First */}
                      <td>
                        {editingId === a.id ? (
                          <input
                            value={editedAthlete.first_name || ""}
                            onChange={(e) =>
                              setEditedAthlete({ ...editedAthlete, first_name: e.target.value })
                            }
                          />
                        ) : (
                          a.first_name
                        )}
                      </td>

                      {/* DOB */}
                      <td>
                        {editingId === a.id ? (
                          <input
                            type="date"
                            value={editedAthlete.date_of_birth || ""}
                            onChange={(e) =>
                              setEditedAthlete({ ...editedAthlete, date_of_birth: e.target.value })
                            }
                          />
                        ) : (
                          a.date_of_birth
                        )}
                      </td>

                      {/* POB */}
                      <td>
                        {editingId === a.id ? (
                          <input
                            value={editedAthlete.place_of_birth || ""}
                            onChange={(e) =>
                              setEditedAthlete({ ...editedAthlete, place_of_birth: e.target.value })
                            }
                          />
                        ) : (
                          a.place_of_birth
                        )}
                      </td>

                      {/* Role (dropdown) */}
                      <td>
                        {editingId === a.id ? (
                          <select
                            value={editedAthlete.role || ""}
                            onChange={(e) =>
                              setEditedAthlete({ ...editedAthlete, role: e.target.value })
                            }
                          >
                            <option value="">-- Select --</option>
                            {roles.map((r, i) => (
                              <option key={i} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          a.role
                        )}
                      </td>

                      {/* Blood */}
                      <td>
                        {editingId === a.id ? (
                          <select
                            value={editedAthlete.blood_type || ""}
                            onChange={(e) =>
                              setEditedAthlete({ ...editedAthlete, blood_type: e.target.value })
                            }
                          >
                            <option value="">--</option>
                            <option>A+</option><option>A-</option>
                            <option>B+</option><option>B-</option>
                            <option>AB+</option><option>AB-</option>
                            <option>O+</option><option>O-</option>
                          </select>
                        ) : (
                          a.blood_type
                        )}
                      </td>

                      {/* NID (non-editable) */}
                      <td>{a.national_id_number}</td>

                      {/* Nationality */}
                      <td>
                        {editingId === a.id ? (
                          <select
                            value={editedAthlete.nationality || ""}
                            onChange={(e) =>
                              setEditedAthlete({ ...editedAthlete, nationality: e.target.value })
                            }
                          >
                            <option value="">-- Select --</option>
                            {nationalities.map((n, i) => (
                              <option key={i} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        ) : (
                          a.nationality
                        )}
                      </td>

                      {/* Grade */}
                      <td>
                        {editingId === a.id ? (
                          <select
                            value={editedAthlete.grade || ""}
                            onChange={(e) =>
                              setEditedAthlete({ ...editedAthlete, grade: e.target.value })
                            }
                          >
                            <option value="">-- Select --</option>
                            {grades.map((g, i) => (
                              <option key={i} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        ) : (
                          a.grade
                        )}
                      </td>

                      {/* Renewal (non-editable) */}
                      <td>{a.renewal}</td>

                      {/* Year (non-editable) */}
                      <td>{a.year}</td>

                      {/* Genres */}
                      <td>
                        {editingId === a.id ? (
                          <select
                            value={editedAthlete.genres || ""}
                            onChange={(e) => {
                              const newGenres = e.target.value;
                              setEditedAthlete({
                                ...editedAthlete,
                                genres: newGenres,
                                weight: "", // reset weight when genre changes
                              });
                            }}
                          >
                            <option value="">-- Select --</option>
                            <option value="Men">Men</option>
                            <option value="Women">Women</option>
                          </select>
                        ) : (
                          a.genres
                        )}
                      </td>

                      {/* Categories */}
                      <td>
                        {editingId === a.id ? (
                          <select
                            value={editedAthlete.categories || ""}
                            onChange={(e) => {
                              const newCategories = e.target.value;
                              setEditedAthlete({
                                ...editedAthlete,
                                categories: newCategories,
                                weight: "", // reset weight when category changes
                              });
                            }}
                          >
                            <option value="">-- Select --</option>
                            <option value="Benjamins">Benjamins</option>
                            <option value="Minimes">Minimes</option>
                            <option value="Cadets">Cadets</option>
                            <option value="Juniors">Juniors</option>
                            <option value="Hopefuls">Hopefuls</option>
                            <option value="Seniors">Seniors</option>
                            <option value="Veterans">Veterans</option>
                          </select>
                        ) : (
                          a.categories
                        )}
                      </td>

                      {/* Weight */}
                      <td>
                        {editingId === a.id ? (
                          <select
                            value={editedAthlete.weight || ""}
                            onChange={(e) =>
                              setEditedAthlete({
                                ...editedAthlete,
                                weight: e.target.value,
                              })
                            }
                            disabled={!editedAthlete.genres || !editedAthlete.categories} // only enabled when both are chosen
                          >
                            <option value="">-- Select --</option>
                            {weights.map((w, i) => (
                              <option key={i} value={w}>
                                {w}
                              </option>
                            ))}
                          </select>
                        ) : (
                          a.weight
                        )}
                      </td>

                      {/* License # (non-editable) */}
                      <td>{a.license_number}</td>

                      {/* Registration (non-editable) */}
                      <td>{a.registration_date}</td>

                      {/* Photos (non-editable) */}
                      <td>
                        {a.photos_url ? (
                          <img
                            src={a.photos_url}
                            alt={`${a.first_name} ${a.last_name}`}
                            style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "8px" }}
                          />
                        ) : (
                          "No Photo"
                        )}
                      </td>

                       {/* Confirmation (non-editable) */}
                      <td>{a.confirmation ? "✅" : "❌"}</td>

                      

                      {/* Club ID (non-editable) */}
                      <td>{a.club_id}</td>

                      {/* League ID (non-editable) */}
                      <td>{a.league_id}</td>

                      {/* Actions */}
                      <td>
                        {editingId === a.id ? (
                          <>
                            <button className="primary-S" onClick={saveEdit}>Save</button>
                            <button className="secondary-btn" onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="primary-M" onClick={() => startEdit(a)}>Modify</button>
                            <button className="secondary-btn" onClick={() => deleteAthlete(a.id)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
							</div>
							
							{/* PDF Export Buttons */}
							  <BackHomeButton />
								<button className="primary-b"
									onClick={exportGeneralPDF}
									
								>
								
									Export General PDF
								</button>
								<button className="primary-b"
									onClick={handleCategoryPDFExport}
									
								>
									
									Export by Category
								</button>
                <button className="primary-b"
									onClick={exportGradeRolePDF}
									
								>
									
									Export by Grade PDF
								</button>
							
							
							</div>
          </section>

          {/* Transparent Error/Success Overlay System */}
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
          {circleLoading && <CircleLoading message="Processing athlete data..." />}

          <Navigation />

          <footer className="footer bg-red-600 text-white p-4 mt-6">
            <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
          </footer>
        </div>
      );
    }
