import { useEffect, useState } from "react";
    import { useLocation, useNavigate } from "react-router-dom";
    import { supabase } from "./supabaseClient";
    import Navigation from "./Navigation";
    import BackHomeButton from "./BackHomeButton";
    import { Shield } from "lucide-react";
    import "./index.css";
    import ListofAthletesButton from "./ListofAthletesButton.jsx";
    import logo from "./assets/logo.png"; 
		import { useRef } from "react";
    import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import loadImage from 'blueimp-load-image';
import { useDragScroll } from './useDragScroll';
import { fetchClubNames, fetchLeagueNames } from './ExportUtils';
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from "./components/BarLoading";
import CircleLoading from "./components/CircleLoading";
import { initializePrimaryButtons, handlePrimaryButtonClick } from "./primaryButtonHandler";

		  



    export default function MemberListClubC() {
      const { state } = useLocation();
      const navigate = useNavigate();

      // Members and club info
      const [members, setMembers] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [success, setSuccess] = useState("");
      const [club, setClub] = useState(null);
      const [member, setMember] = useState(null);
      const [editingId, setEditingId] = useState(null);
      const [editedMember, setEditedMember] = useState({});

      // Header logos
      const [federationLogo, setFederationLogo] = useState(null);
      const [leagueLogo, setLeagueLogo] = useState("");
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
      
      // Mapping for club and league names
      const [clubNames, setClubNames] = useState({});
      const [leagueNames, setLeagueNames] = useState({});

      const [lastName, setLastName] = useState("");
      const [firstName, setFirstName] = useState("");
      const [dob, setDob] = useState("");
      const [pob, setPob] = useState("");
      const [roleId, setRoleId] = useState("");
      const [bloodType, setBloodType] = useState("");
      const [nid, setNid] = useState("");
      const [password, setPassword] = useState("");
      const [confirmPassword, setConfirmPassword] = useState("");
      const [logoFile, setLogoFile] = useState(null);
      const [photoFile, setPhotoFile] = useState(null);
      const [nationality, setNationality] = useState("");
      const [grade, setGrade] = useState("");
      const [holderOf, setHolderOf] = useState("");
			const [searchTerm, setSearchTerm] = useState("");
			const [submitLoading, setSubmitLoading] = useState(false);
			const [saveLoading, setSaveLoading] = useState(false);
			
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

      const fetchClubAndLeagueNames = async (members) => {
        try {
          // Get unique club and league IDs
          const clubIds = [...new Set(members.map(m => m.club_id).filter(Boolean))];
          const leagueIds = [...new Set(members.map(m => m.league_id).filter(Boolean))];

          // Fetch club names
          if (clubIds.length > 0) {
            const { data: clubData } = await supabase
              .from("nameclub")
              .select("id, name_club")
              .in("id", clubIds);
            
            const clubNamesMap = {};
            clubData?.forEach(club => {
              clubNamesMap[club.id] = club.name_club;
            });
            setClubNames(clubNamesMap);
          }

          // Fetch league names
          if (leagueIds.length > 0) {
            const { data: leagueData } = await supabase
              .from("nameleague")
              .select("id, name_league")
              .in("id", leagueIds);
            
            const leagueNamesMap = {};
            leagueData?.forEach(league => {
              leagueNamesMap[league.id] = league.name_league;
            });
            setLeagueNames(leagueNamesMap);
          }
        } catch (err) {
          console.error("Error fetching club/league names:", err);
        }
      };

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

          // league name + logo (logo from league_members via league_id)
          if (state?.league_id) {
            const { data: ln } = await supabase
              .from("nameleague")
              .select("name_league")
              .eq("id", state.league_id)
              .single();
            if (ln) setLeagueName(ln.name_league);

            const { data: llogoRows } = await supabase
              .from("league_members")
              .select("logo_url")
              .eq("league_id", state.league_id)
              .order("id", { ascending: false })
              .limit(1);
            if (llogoRows?.length) setLeagueLogo(getLogoUrl(llogoRows[0].logo_url));
          }

          // club name + logo (logo from club_members via club_id)
          if (state?.club_id) {
            const { data: cn } = await supabase
              .from("nameclub")
              .select("name_club, id")
              .eq("id", state.club_id)
              .single();
            if (cn) {
              setClubName(cn.name_club);
              setClub(cn);
            }

            const { data: clogoRows, error: clogoError } = await supabase
              .from("club_members")
              .select("logo_url")
              .eq("club_id", state.club_id)
              .not("logo_url", "is", null) // only rows that actually have a logo
              .order("id", { ascending: false }) // take the latest one if multiple
              .limit(1);

            if (clogoError) {
              console.error("Error fetching club logo:", clogoError.message);
            } else if (clogoRows?.length && clogoRows[0].logo_url) {
              setClubLogo(getLogoUrl(clogoRows[0].logo_url));
            }
          }

          // logged in member if provided (state.member_id)
          if (state?.member_id) {
            const { data: m } = await supabase
              .from("club_members")
              .select("*")
              .eq("id", state.member_id)
              .single();
            if (m) setMember(m);
          }

          // All members of club
          if (state?.club_id) {
            const { data: membersData } = await supabase
              .from("club_members")
              .select("*")
              .eq("club_id", state.club_id);
            setMembers(membersData || []);
          }
        } catch (err) {
          setError(err);
          console.error("Error fetching data:", err.message);
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => {
        fetchData();
      }, [state]);

      useEffect(() => {
        const fetchRoles = async () => {
          const { data } = await supabase.from("clubrole").select("id, club_role");
          if (data) setRoles(data);
        };
        fetchRoles();
      }, []);

      useEffect(() => {
        const fetchClubs = async () => {
          const { data } = await supabase.from("nameclub").select("id, name_club");
          if (data) setClubs(data);
        };
        fetchClubs();
      }, []);

      useEffect(() => {
        const fetchLeagues = async () => {
          const { data } = await supabase.from("nameleague").select("id, name_league");
          if (data) setLeagues(data);
        };
        fetchLeagues();
      }, []);

      // Ensure club header (name + logo) loads when club selection or state changes
      useEffect(() => {
        const loadClubHeader = async () => {
          const clubIdVal = selectedClubId || state?.club_id;
          if (!clubIdVal) { setClubLogo(null); setClubName(""); return; }

          try {
            // Fetch club name
            const { data: cn } = await supabase
              .from("nameclub")
              .select("name_club, id")
              .eq("id", Number(clubIdVal))
              .single();
            if (cn) setClubName(cn.name_club);

            // Fetch latest non-null club logo from club_members
            const { data: clogoRows, error: clogoError } = await supabase
              .from("club_members")
              .select("logo_url")
              .eq("club_id", Number(clubIdVal))
              .not("logo_url", "is", null)
              .order("id", { ascending: false })
              .limit(1);
            if (clogoError) {
              console.error("Error fetching club logo:", clogoError.message);
              setClubLogo(null);
            } else if (clogoRows?.length && clogoRows[0].logo_url) {
              setClubLogo(getLogoUrl(clogoRows[0].logo_url));
            } else {
              setClubLogo(null);
            }
          } catch (e) {
            console.error("Error loading club header:", e);
            setClubLogo(null);
            setClubName("");
          }
        };

        loadClubHeader();
      }, [selectedClubId, state?.club_id]);

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
  
useEffect(() => {
  initializePrimaryButtons(); // ✅ re-apply active class from localStorage
}, []);
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
          /*const uploadedClubLogo = await uploadFile(logoFile);*/
          const uploadedPhoto = await uploadFile(photoFile);

          const roleName = roles.find((r) => r.id === parseInt(roleId))?.club_role || "";
          const renewalNumber = await getNextRenewal(nid, selectedClubId, roleName);
          const seasonYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

          const newMember = {
            last_name: lastName,
            first_name: firstName,
            date_of_birth: dob,
            place_of_birth: pob,
            role: roleName,
            blood_type: bloodType,
            nationality,
            grade,
            holder_of: holderOf,
            national_id_number: nid,
            password,
            photo_url: uploadedPhoto,
            logo_url: clubLogo,
            renewal: renewalNumber,
            year: seasonYear,
            confirmation: false,
            club_id: selectedClubId,
            league_id: selectedLeagueId,
            license_number: `LIC-${Date.now()}`,
            registration_date: new Date().toISOString().split("T")[0],
          };

          const { error: insertError } = await supabase.from("club_members").insert([newMember]);
          if (insertError) throw insertError;

          setSuccess(`Member ${firstName} ${lastName} added successfully!`);
          fetchData();

          // reset form
          setLastName(""); setFirstName(""); setDob(""); setPob(""); setRoleId("");
          setBloodType(""); setNid(""); setPassword(""); setConfirmPassword(""); setSelectedClubId("");
          setSelectedLeagueId(""); setLogoFile(null); setPhotoFile(null); setNationality(""); setGrade(""); setHolderOf("");
          
          console.log("Setting submitLoading to false - success");
          setSubmitLoading(false);

          // Refresh page after showing success message
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (err) {
          setError(err.message);
          console.log("Setting submitLoading to false - error");
          setSubmitLoading(false);
        }
      };

      // Table actions
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
        setError("");
        setSuccess("");
        setSaveLoading(true);

        // Validation checks
        if (!editedMember.first_name || !editedMember.last_name || !editedMember.date_of_birth || !editedMember.place_of_birth || !editedMember.role) {
          const missingFields = [];
          if (!editedMember.first_name) missingFields.push("First Name");
          if (!editedMember.last_name) missingFields.push("Last Name");
          if (!editedMember.date_of_birth) missingFields.push("Date of Birth");
          if (!editedMember.place_of_birth) missingFields.push("Place of Birth");
          if (!editedMember.role) missingFields.push("Role");
          
          setError(`Please fill in the following required fields: ${missingFields.join(", ")}`);
          setSaveLoading(false);
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
          setSaveLoading(false);
          return;
        }

        try {
          const { error } = await supabase.from("club_members").update(editedMember).eq("id", id);
          if (error) throw error;
          
          setSuccess(`Member ${editedMember.first_name} ${editedMember.last_name} updated successfully!`);
          cancelEdit();
          fetchData();
          setSaveLoading(false);

          // Refresh page after showing success message
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (err) {
          setError(err.message);
          setSaveLoading(false);
        }
      };
      const handleDelete = async (member) => {
  try {
    // Compare only the date part (YYYY-MM-DD)
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
  // Filter members
  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      (m.first_name?.toLowerCase() ?? "").includes(term) ||
      (m.last_name?.toLowerCase() ?? "").includes(term) ||
      (m.national_id_number ?? "").includes(term)
    );
  });

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
    doc.text(`Club Member Information - ${sanitizeText(member.first_name)} ${sanitizeText(member.last_name)}`, 14, 30);
    
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
    const confirmationText = member.confirmation ? "CONFIRMED ✓" : "NOT CONFIRMED ✗";
    doc.text(confirmationText, 160, 50);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Create member information table
    const foundRole = roles.find(role => role.id === parseInt(member.role_id));
    const roleName = foundRole?.club_role || member.role || 'No Role';
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
  const addFederationHeader = (doc, pageNumber = 1, clubName = '', leagueName = '') => {
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
    doc.text('Algerian Judo Federation', pageWidth / 2, 25, { align: 'center' });
    
    // League and Club info (centered)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`League: ${leagueName}`, pageWidth / 2, 35, { align: 'center' });
    doc.text(`Club: ${clubName}`, pageWidth / 2, 45, { align: 'center' });
    
    // Page number
    doc.setFontSize(10);
    doc.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    
    return 55; // Return Y position for content start
  };

  const prepareGeneralMemberData = (members) => {
    return members.map(member => {
      const foundRole = roles.find(r => r.id === member.role_id);
      const roleName = foundRole?.club_role || 'No Role';
      return [
        sanitizeText(member.last_name) || '',
        sanitizeText(member.first_name) || '',
        sanitizeText(member.date_of_birth) || '',
        sanitizeText(member.place_of_birth) || '',
        sanitizeText(roleName),
        sanitizeText(member.blood_type) || '',
        sanitizeText(member.nationality) || '',
        sanitizeText(member.national_id_number) || '',
        sanitizeText(member.license_number) || '',
        sanitizeText(member.registration_date) || ''
      ];
    });
  };

  const prepareGradeRoleMemberData = (members) => {
    return members.map(member => {
      const foundRole = roles.find(r => r.id === member.role_id);
      const roleName = foundRole?.club_role || 'No Role';
      return [
        sanitizeText(member.last_name) || '',
        sanitizeText(member.first_name) || '',
        sanitizeText(member.grade) || '',
        sanitizeText(roleName),
        sanitizeText(member.holder_of) || '',
        sanitizeText(member.national_id_number) || '',
        sanitizeText(member.license_number) || ''
      ];
    });
  };

  const exportGeneralPDF = async () => {
    try {
      if (!filteredMembers || filteredMembers.length === 0) {
        setError('No members found to export');
        return;
      }

      const doc = new jsPDF('landscape');
      let currentY = addFederationHeader(doc, 1, clubName || 'Unknown Club', leagueName || '');
      let yPosition = currentY;

      // Add centered title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0); // Red color
      doc.text('Club Members - General Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 20;

      // Group members by year
      const membersByYear = {};
      filteredMembers.forEach(member => {
        const year = member.year || 'Unknown Year';
        if (!membersByYear[year]) {
          membersByYear[year] = [];
        }
        membersByYear[year].push(member);
      });

      // Sort years
      const sortedYears = Object.keys(membersByYear).sort();

      // Process each year
      for (const year of sortedYears) {
        const yearMembers = membersByYear[year];

        // Sort members within year by registration_date
        const sortedMembers = yearMembers.sort((a, b) => {
          const dateA = new Date(a.registration_date || '1900-01-01');
          const dateB = new Date(b.registration_date || '1900-01-01');
          return dateA - dateB;
        });

        // Year header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0); // Black color for year
        doc.text(`Year: ${year}`, 20, yPosition);
        yPosition += 12;

        // Prepare table data for this year
        const tableData = sortedMembers.map(member => {
          // Get role name from role_id with proper type matching
          const roleName = roles.find(role => role.id === parseInt(member.role_id))?.club_role || member.role || 'No Role';
          
          return [
            sanitizeText(member.last_name),
            sanitizeText(member.first_name),
            sanitizeText(member.date_of_birth),
            sanitizeText(member.place_of_birth),
            sanitizeText(member.blood_type),
            sanitizeText(member.nationality),
            sanitizeText(roleName),
            sanitizeText(member.grade),
            sanitizeText(member.holder_of),
            sanitizeText(member.national_id_number),
            sanitizeText(member.password),
            sanitizeText(member.renewal),
            member.confirmation ? 'Yes' : 'No',
            sanitizeText(member.license_number)
          ];
        });

        autoTable(doc, {
          head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Role', 'Grade', 'Holder Of', 'NID', 'Password', 'Renewal', 'Confirmation', 'License #']],
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

        // Update yPosition for next year
        yPosition = doc.lastAutoTable.finalY + 15;

        // Check if we need a new page for the next year
        if (yPosition > 180 && year !== sortedYears[sortedYears.length - 1]) {
          doc.addPage();
          yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), clubName || 'Unknown Club', leagueName || '') + 10;
        }
      }

      const currentDate = new Date().getFullYear();
      doc.save(`club_members_general_${currentDate}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Error generating PDF: ' + error.message);
    }
  };

  const exportGradeRolePDF = async () => {
    try {
      if (!filteredMembers || filteredMembers.length === 0) {
        setError('No members found to export');
        return;
      }

      const doc = new jsPDF('landscape');
      let currentY = addFederationHeader(doc, 1, clubName || 'Unknown Club', leagueName || '');
      let yPosition = currentY;

      // Main title for the entire report
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0); // Red color
      doc.text('Club Members - Grade & Role Report', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 20;

      // FIRST SECTION: Role-based report grouped by year
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeText('ROLES SECTION'), 20, yPosition);
      yPosition += 15;

      // Group members by year first, then by role
      const yearRoleGroups = {};
      
      filteredMembers.forEach(member => {
        const year = member.year || 'No Year';
        // Ensure proper type matching for role lookup
        const foundRole = roles.find(role => role.id === parseInt(member.role_id));
        const role = foundRole?.club_role || member.role || 'No Role';
        
        if (!yearRoleGroups[year]) {
          yearRoleGroups[year] = {};
        }
        if (!yearRoleGroups[year][role]) {
          yearRoleGroups[year][role] = [];
        }
        yearRoleGroups[year][role].push(member);
      });

      // Sort years
      const sortedYears = Object.keys(yearRoleGroups).sort();

      // Process each year for roles
      for (const year of sortedYears) {
        // Year header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Year: ${sanitizeText(year)}`, 20, yPosition);
        yPosition += 10;

        // Process each role within the year
        for (const [roleName, roleMembers] of Object.entries(yearRoleGroups[year])) {
          if (roleMembers.length === 0) continue;

          // Role subtitle
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Role: ${sanitizeText(roleName)}`, 30, yPosition);
          yPosition += 8;

          // Sort members by registration date
          const sortedMembers = roleMembers.sort((a, b) => new Date(a.registration_date) - new Date(b.registration_date));

          // Prepare table data for this role
          const tableData = sortedMembers.map(member => {
            // Get role name from role_id with proper type matching
            const roleName = roles.find(role => role.id === parseInt(member.role_id))?.club_role || member.role || 'No Role';
            
            return [
              sanitizeText(member.last_name),
              sanitizeText(member.first_name),
              sanitizeText(member.date_of_birth),
              sanitizeText(member.place_of_birth),
              sanitizeText(member.blood_type),
              sanitizeText(member.nationality),
              sanitizeText(roleName),
              sanitizeText(member.grade),
              sanitizeText(member.holder_of),
              sanitizeText(member.national_id_number),
              sanitizeText(member.password),
              sanitizeText(member.renewal),
              member.confirmation ? 'Yes' : 'No',
              sanitizeText(member.license_number)
            ];
          });

          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Role', 'Grade', 'Holder Of', 'NID', 'Password', 'Renewal', 'Confirmation', 'License #']],
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
            yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), clubName || 'Unknown Club', leagueName || '') + 5;
          }
        }

        // Add spacing between years
        yPosition += 10;

        // Check if we need a new page for the next year
        if (yPosition > 170 && year !== sortedYears[sortedYears.length - 1]) {
          doc.addPage();
          yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), clubName || 'Unknown Club', leagueName || '') + 10;
        }
      }

      // Add new page for grade-based report
      doc.addPage();
      yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), clubName || 'Unknown Club', leagueName || '');

      // SECOND SECTION: Grades section grouped by year
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeText('GRADES SECTION'), 20, yPosition);
      yPosition += 15;

      // Group members by year first, then by grade
      const yearGradeGroups = {};
      filteredMembers.forEach(member => {
        const year = member.year || 'No Year';
        const grade = member.grade || 'No Grade';
        
        if (!yearGradeGroups[year]) {
          yearGradeGroups[year] = {};
        }
        if (!yearGradeGroups[year][grade]) {
          yearGradeGroups[year][grade] = [];
        }
        yearGradeGroups[year][grade].push(member);
      });

      // Process each year for grades
      for (const year of sortedYears) {
        // Year header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Year: ${sanitizeText(year)}`, 20, yPosition);
        yPosition += 10;

        // Process each grade within the year
        for (const [gradeName, gradeMembers] of Object.entries(yearGradeGroups[year] || {})) {
          if (gradeMembers.length === 0) continue;

          // Grade subtitle
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Grade: ${sanitizeText(gradeName)}`, 30, yPosition);
          yPosition += 8;

          // Sort members by registration date
          const sortedMembers = gradeMembers.sort((a, b) => new Date(a.registration_date) - new Date(b.registration_date));

          // Prepare table data for this grade
          const tableData = sortedMembers.map(member => {
            const foundRole = roles.find(role => role.id === parseInt(member.role_id));
            const roleName = foundRole?.club_role || member.role || 'No Role';
            return [
              sanitizeText(member.last_name),
              sanitizeText(member.first_name),
              sanitizeText(member.date_of_birth),
              sanitizeText(member.place_of_birth),
              sanitizeText(member.blood_type),
              sanitizeText(member.nationality),
              sanitizeText(roleName),
              sanitizeText(member.grade),
              sanitizeText(member.holder_of),
              sanitizeText(member.national_id_number),
              sanitizeText(member.password),
              sanitizeText(member.renewal),
              member.confirmation ? 'Yes' : 'No',
              sanitizeText(member.license_number)
            ];
          });

          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Role', 'Grade', 'Holder Of', 'NID', 'Password', 'Renewal', 'Confirmation', 'License #']],
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
            yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), clubName || 'Unknown Club', leagueName || '') + 5;
          }
        }

        // Add spacing between years
        yPosition += 10;

        // Check if we need a new page for the next year
        if (yPosition > 170 && year !== sortedYears[sortedYears.length - 1]) {
          doc.addPage();
          yPosition = addFederationHeader(doc, doc.internal.getNumberOfPages(), clubName || 'Unknown Club', leagueName || '') + 10;
        }
      }

      const currentDate = new Date().getFullYear();
      doc.save(`club_members_grade_role_${currentDate}.pdf`);

    } catch (error) {
      console.error('Error exporting complete club report PDF:', error);
      setError('Error exporting PDF: ' + error.message);
    }
  };





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
  data-id="1"   // ✅ Club Member List = 1
  onClick={(e) => {
    // Handle primary button state
    handlePrimaryButtonClick(e.target);

    if (club && member) {
      console.log("➡️ Navigating to /club-member-listC with state:", {
        club_id: club.id,
        club_name: club.name_club,
        league_id: state?.league_id,
        member_id: member.id, 
        first_name: member.first_name,
        last_name: member.last_name,
        role: member.role,
        club_logo: clubLogo,
      });

      navigate("/club-member-listC", {
        state: {
          club_id: club.id,
          club_name: club.name_club,
          league_id: state?.league_id,
          member_id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          role: member.role,
          club_logo: clubLogo,
        },
      });
    } else {
      console.log("❌ No club or member found, cannot navigate.");
    }
  }}
>
  The Club Member List
</button>
           <button
  type="button"
  className="primary-btn"
  data-id="2"   // ✅ Athlete List = 2
  onClick={(e) => {
    // Handle primary button state
    handlePrimaryButtonClick(e.target);

    if (club && member) {
      navigate("/AthletePage", {
        state: {
          club_id: club.id,
          club_name: club.name_club,
          league_id: state?.league_id,
          member_id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          role: member.role,
          club_logo: clubLogo,
          ...state,   // keep any existing state
          club: club,
          member: member,
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
                    National ID *
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
                    Club Logo *
                    <input type="text" value={clubLogo || ""} disabled />
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

              <h2 className="form-title">List of Members Club</h2>

						       <div className="form-grid">
						  <div><h2 className="form-title">Search Members Club</h2></div>
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
											    {filteredMembers.length === 0 ? (
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
											                value={editedMember.role || ""}
											                onChange={(e) => handleChange(e, "role")}
											              >
											                <option value="">-- Select --</option>
											                {roles.map((r) => (
											                  <option key={r.id} value={r.club_role}>
											                    {r.club_role}
											                  </option>
											                ))}
											              </select>
											            ) : (
											              m.role || 'No Role'
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
											                <option>A+</option><option>A-</option>
											                <option>B+</option><option>B-</option>
											                <option>AB+</option><option>AB-</option>
											                <option>O+</option><option>O-</option>
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
											          <td>{m.photo_url ? <img src={m.photo_url} alt="Photo" style={{width: '50px', height: '50px'}} /> : 'No Photo'}</td>
											          <td>{m.confirmation ? 'Yes' : 'No'}</td>
											          <td>{m.club_id}</td>
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
											                <button
																			  className="secondary-btn"
																			  onClick={() => handleDelete(m)} // pass full member object, not just id
																			>
																			  Delete
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

        {/* PDF Export Buttons */}
        <div >
          <BackHomeButton />
          <button className="primary-b"
            onClick={exportGeneralPDF}
           
          >
            Export General PDF
          </button>
          <button className="primary-b"
            onClick={exportGradeRolePDF}
           
     
          >
           Export Grade & Role PDF
          </button>
        </div>
				</section>
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

    {loading && (
      <div>Loading...</div>
    )}

    {/* Circle Loading for Submit and Save operations */}
    {submitLoading && <CircleLoading message="Adding member..." />}
    {saveLoading && <CircleLoading message="Saving changes..." />}

    <Navigation />

    <footer className="footer bg-red-600 text-white p-4 mt-6">
      <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
    </footer>
  </div>
);
    }
