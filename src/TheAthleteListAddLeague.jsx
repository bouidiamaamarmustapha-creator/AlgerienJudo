import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import { Shield } from "lucide-react";
import { exportToPDF, fetchClubNames, fetchLeagueNames } from "./ExportUtils";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { useDragScroll } from './useDragScroll';
import logo from './assets/logo.png';
import ErrorOverlay from './components/ErrorOverlay';
import SuccessOverlay from './components/SuccessOverlay';
import BarLoading from './components/BarLoading';
import CircleLoading from './components/CircleLoading';
import { initializePrimaryButtons, handlePrimaryButtonClick } from './primaryButtonHandler';
import loadImage from 'blueimp-load-image';


export default function TheAthleteListAddLeague() {
  const { state } = useLocation(); // optional: { club_id, league_id, member_id, ... }
  const navigate = useNavigate();

  // --- UI state ---
  const [loading, setLoading] = useState(true);
  const [circleLoading, setCircleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // header logos & names
  const [federationLogo, setFederationLogo] = useState(null);
  const [leagueLogo, setLeagueLogo] = useState(null);
  const [leagueName, setLeagueName] = useState("");
  const [clubLogo, setClubLogo] = useState(null);
  const [clubName, setClubName] = useState("");

  // context ids
  const [clubId, setClubId] = useState(state?.club_id ?? "");
  const [leagueId, setLeagueId] = useState(state?.league_id ?? "");
  const [selectedLeagueId, setSelectedLeagueId] = useState(state?.league_id ?? "");
  const [selectedClubId, setSelectedClubId] = useState(state?.club_id ?? "");

  // lists loaded from DB
  const [roles, setRoles] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [leagues, setLeagues] = useState([]);

  // athletes
  const [athletes, setAthletes] = useState([]); // shown list (filtered)
  const [allAthletes, setAllAthletes] = useState([]); // master list

  // add-athlete form fields
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState("");
  const [pob, setPob] = useState("");
  const [role, setRole] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [nid, setNid] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [nationality, setNationality] = useState("");
  const [grade, setGrade] = useState("");
  const [genres, setGenres] = useState("");
  const [categories, setCategories] = useState("");
  const [weight, setWeight] = useState("");
  const [renewal, setRenewal] = useState(1);

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [editedAthlete, setEditedAthlete] = useState({});

  // search & UI helpers
  const [searchTerm, setSearchTerm] = useState("");
  const tableRef = useDragScroll();

  const STORAGE_URL = "https://aolsbxfulbvpiobqqsao.supabase.co/storage/v1/object/public/logos/";
  const federationName = "Algerian Judo Federation";

  // some static lists (you can fetch these from DB instead)
  const roleOptions = ["Admin", "Coach", "Athlete"];
  const nationalities = ["Algerian", "Tunisian"];
  const grades = ["brown belt", "black belt"];
  const categoriesList = ["Poussins", "Benjamins", "Minimes", "Cadets", "Juniors", "Hopefuls", "Seniors", "Veterans"];
  const genresList = ["Men", "Women"];
	
  const [weights, setWeights] = useState([]);
 
  // ---------------- helpers ----------------
  const getLogoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${STORAGE_URL}${path}`;
  };

  // upload photo to storage, return publicUrl or null
  const handlePhotoUpload = async () => {
    if (!photoFile) return null;
    try {
      const ext = photoFile.name.split(".").pop();
      const fileName = `athlete-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("logos").upload(fileName, photoFile);
      if (uploadError) {
        console.error("upload error", uploadError);
        return null;
      }
      const { data } = supabase.storage.from("logos").getPublicUrl(fileName);
      return data?.publicUrl ?? null;
    } catch (err) {
      console.error("handlePhotoUpload error", err);
      return null;
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

  // Age validation function for categories
  const validateAgeForCategory = (dateOfBirth, selectedCategory) => {
    if (!dateOfBirth || !selectedCategory) return { isValid: true, message: "" };
    
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
      "Veterans": { min: 36, max: 999 }
    };

    const rule = categoryRules[selectedCategory];
    if (!rule) {
      return { isValid: false, message: `Unknown category: ${selectedCategory}` };
    }

    if (age < rule.min || age > rule.max) {
      if (selectedCategory === "Veterans") {
        return { 
          isValid: false, 
          message: `For ${selectedCategory} category, athlete must be more than 35 years old. Current age: ${age}` 
        };
      } else {
        return { 
          isValid: false, 
          message: `For ${selectedCategory} category, athlete must be between ${rule.min} and ${rule.max} years old. Current age: ${age}` 
        };
      }
    }

    return { isValid: true, message: "" };
  };

  // ---------------- data fetching ----------------
  const fetchData = async () => {
    try {
      setError("");

      // Combine multiple queries using Promise.all for better performance
      const [
        fedLogoResult,
        leaguesResult,
        rolesResult,
        clubsResult,
        athletesResult
      ] = await Promise.all([
        // federation logo
        supabase
          .from("logo")
          .select("logo_url")
          .order("created_at", { ascending: false })
          .limit(1),
        
        // load leagues
        supabase.from("nameleague").select("id, name_league"),
        
        // load roles
        supabase.from("roles").select("id, name"),
        
        // clubs (load all initially, filter later if needed)
        selectedLeagueId 
          ? supabase.from("nameclub").select("id, name_club").eq("league_i", selectedLeagueId)
          : supabase.from("nameclub").select("id, name_club"),
        
        // load athletes with pagination limit for better performance
        supabase
          .from("athletes")
          .select("*")
          .order("id", { ascending: false })
          .limit(1000) // Limit initial load to 1000 athletes
      ]);

      // Process federation logo
      if (fedLogoResult.data?.length) {
        setFederationLogo(getLogoUrl(fedLogoResult.data[0].logo_url));
      }

      // Process leagues
      setLeagues(leaguesResult.data || []);

      // Process roles
      if (rolesResult.data) {
        setRoles(rolesResult.data.map(r => r.name));
      } else {
        setRoles(roleOptions); // fallback
      }

      // Process clubs
      setClubs(clubsResult.data || []);

      // Process athletes
      if (athletesResult.error) throw athletesResult.error;
      const athletesData = athletesResult.data || [];
      setAllAthletes(athletesData);
      
      // Apply initial filtering by selected club/league if provided
      let initialList = athletesData;
      if (selectedClubId) {
        initialList = athletesData.filter(a => String(a.club_id) === String(selectedClubId));
      } else if (selectedLeagueId) {
        initialList = athletesData.filter(a => String(a.league_id) === String(selectedLeagueId));
      }
      setAthletes(initialList);

      // Load additional data only if needed
      await Promise.all([
        // league info & logo (only if state.league_id exists)
        state?.league_id ? loadLeagueDetails(state.league_id) : Promise.resolve(),
        
        // club info & logo (only if activeClubId exists)
        (selectedClubId || clubId) ? loadClubDetails(selectedClubId || clubId) : Promise.resolve()
      ]);

    } catch (err) {
      console.error("fetchData error", err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
      setCircleLoading(false);
    }
  };
//Initialize in useEffect button: 
useEffect(() => {
  initializePrimaryButtons();
}, []);
  // Helper function to load league details
  const loadLeagueDetails = async (leagueId) => {
    try {
      const [leagueResult, leagueLogoResult] = await Promise.all([
        supabase.from("nameleague").select("*").eq("id", leagueId).single(),
        supabase
          .from("league_members")
          .select("logo_url")
          .eq("league_id", leagueId)
          .order("id", { ascending: false })
          .limit(1)
      ]);

      if (leagueResult.data) {
        setLeagueName(leagueResult.data.name_league || "");
      }
      if (leagueLogoResult.data?.length) {
        setLeagueLogo(getLogoUrl(leagueLogoResult.data[0].logo_url));
      }
    } catch (err) {
      console.error("loadLeagueDetails error", err);
    }
  };

  // Helper function to load club details
  const loadClubDetails = async (clubId) => {
    try {
      const [clubResult, clubLogoResult] = await Promise.all([
        supabase.from("nameclub").select("name_club, i").eq("id", clubId).single(),
        supabase
          .from("club_members")
          .select("logo_url")
          .eq("club_id", clubId)
          .order("id", { ascending: false })
          .limit(1)
      ]);

      if (clubResult.data) {
        setClubName(clubResult.data.name_club);
      }
      if (clubLogoResult.data?.length) {
        setClubLogo(getLogoUrl(clubLogoResult.data[0].logo_url));
      }
    } catch (err) {
      console.error("loadClubDetails error", err);
    }
  };

  // initial load
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize primary buttons functionality
  useEffect(() => {
    initializePrimaryButtons();
  }, []);

  // Memoized filtered athletes for better performance
  const filteredAthletes = useMemo(() => {
    let filtered = allAthletes;
    if (selectedClubId) {
      filtered = allAthletes.filter(a => String(a.club_id) === String(selectedClubId));
    } else if (selectedLeagueId) {
      filtered = allAthletes.filter(a => String(a.league_id) === String(selectedLeagueId));
    }
    return filtered;
  }, [allAthletes, selectedClubId, selectedLeagueId]);

  // Update athletes when filtered list changes
  useEffect(() => {
    setAthletes(filteredAthletes);
  }, [filteredAthletes]);

  // Fetch clubs when league changes
  useEffect(() => {
    if (selectedLeagueId) {
      const fetchClubs = async () => {
        try {
          const { data: clubsData } = await supabase
            .from("nameclub")
            .select("id, name_club")
            .eq("league_i", selectedLeagueId);
          setClubs(clubsData || []);
        } catch (err) {
          console.error("Error fetching clubs:", err);
        }
      };
      fetchClubs();
    }
  }, [selectedLeagueId]);

  // Optimized weight fetching function
  const fetchWeights = useCallback(async (currentGenres, currentCategories) => {
    if (!currentGenres || !currentCategories) return;

    try {
      const { data, error } = await supabase
        .from("categories")
        .select("weight")
        .eq("genres", currentGenres)
        .eq("categories", currentCategories);

      if (error) {
        console.error("Erreur récupération poids:", error.message);
      } else {
        setWeights(data.map((row) => row.weight));
      }
    } catch (err) {
      console.error("Erreur inconnue:", err);
    }
  }, []);

  // --- Charger les poids quand genres + categories changent ---
  useEffect(() => {
    // Check both form and edited athlete for genres/categories
    const currentGenres = editedAthlete.genres || genres;
    const currentCategories = editedAthlete.categories || categories;
    
    fetchWeights(currentGenres, currentCategories);
  }, [genres, categories, editedAthlete.genres, editedAthlete.categories, fetchWeights]);

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

  // ---------------- form submit (add athlete) ----------------
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
        league_id: selectedLeagueId || leagueId,
        club_id: selectedClubId || clubId,
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
      setLoading(false);
    }
  };

  // ---------------- inline editing ----------------
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

  // ---------------- confirmation toggle ----------------
  const toggleAthleteConfirmation = async (athleteId, currentStatus) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("athletes")
        .update({ confirmation: !currentStatus })
        .eq("id", athleteId);
      if (error) throw error;
      setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, confirmation: !currentStatus } : a));
    } catch (err) {
      console.error("toggle confirmation error", err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // ---------------- search filter ----------------
  const searchFilteredAthletes = athletes.filter(a => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      String(a.first_name || "").toLowerCase().includes(term) ||
      String(a.last_name || "").toLowerCase().includes(term) ||
      String(a.national_id_number || "").includes(term)
    );
  });

  // ---------------- PDF export functions ----------------
  // Show rotation selection modal
  const handleExportPDF = (data) => {
    if (!data || Object.keys(data).length === 0) {
      setError('No data available to export');
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
        fetchedClubName = clubNames[data.club_id];
      }
      
      if (data.league_id) {
        const leagueNames = await fetchLeagueNames();
        fetchedLeagueName = leagueNames[data.league_id];
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
    
    // Prepare athlete data for table
    const athleteInfo = [
      ['First Name', data.first_name || ''],
      ['Last Name', data.last_name || ''],
      ['Date of Birth', data.date_of_birth || ''],
      ['Place of Birth', data.place_of_birth || ''],
      ['National ID', data.national_id_number || ''],
      ['Nationality', data.nationality || ''],
      ['Blood Type', data.blood_type || ''],
      ['Grade', data.grade || ''],
      ['Role', data.role || ''],
      ['Gender', data.genres || ''],
      ['Category', data.categories || ''],
      ['Weight', data.weight || ''],
      ['License Number', data.license_number || ''],
      ['Registration Date', data.registration_date || ''],
      ['Year', data.year || ''],
      ['Renewal', data.renewal || '']
    ];
    
    // Add athlete information table
    autoTable(doc, {
      head: [['Field', 'Value']],
      body: athleteInfo,
      startY: startY,
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
    if (data.club_id || fetchedClubName) {
      const displayClubName = fetchedClubName || `ID: ${data.club_id}`;
      doc.text(`Club: ${displayClubName}`, 14, finalY + 60);
      doc.text("Club Visa: _________________", 14, finalY + 70);
    }

    // Display league information
    if (data.league_id || fetchedLeagueName) {
      const displayLeagueName = fetchedLeagueName || `ID: ${data.league_id}`;
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
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Add QR code aligned with League Visa line (very small size: 15x15)
      doc.addImage(qrCodeDataURL, 'PNG', 175, finalY + 75, 15, 15);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

    // Save the PDF
    doc.save(`athlete_${data.first_name}_${data.last_name}.pdf`);
  };

  // General PDF Export for all athletes
  const handleGeneralPDFExport = async () => {
    if (!searchFilteredAthletes || searchFilteredAthletes.length === 0) {
      setError('No athletes data available to export');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentYear = new Date().getFullYear();
    const currentDate = new Date().toLocaleDateString();

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
    
    // Add title - bold, 14px, red color, centered
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 0, 0); // Red color
    doc.text('Athletes Members - General Situation', pageWidth / 2, 40, { align: 'center' });

    // Fetch club and league names once to avoid multiple API calls
    let clubNames = {};
    let leagueNames = {};
    
    try {
      clubNames = await fetchClubNames();
      leagueNames = await fetchLeagueNames();
    } catch (error) {
      console.error('Error fetching club/league names:', error);
    }

    // Group athletes by year, then by club
    const athletesByYearAndClub = {};
    searchFilteredAthletes.forEach((athlete) => {
      const year = athlete.year || currentYear;
      const clubId = athlete.club_id;
      
      if (!athletesByYearAndClub[year]) {
        athletesByYearAndClub[year] = {};
      }
      if (!athletesByYearAndClub[year][clubId]) {
        athletesByYearAndClub[year][clubId] = [];
      }
      athletesByYearAndClub[year][clubId].push(athlete);
    });

    // Sort years to ensure consistent order
    const sortedYears = Object.keys(athletesByYearAndClub).sort();
    
    let currentY = 55;

    // Generate tables for each year and club
    sortedYears.forEach((year, yearIndex) => {
      const clubsInYear = athletesByYearAndClub[year];
      
      // Add year header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`Year ${year}`, 14, currentY);
      currentY += 15;

      // Sort clubs by name for consistent order
      const sortedClubIds = Object.keys(clubsInYear).sort((a, b) => {
        const clubNameA = clubNames[a] || `Club ${a}`;
        const clubNameB = clubNames[b] || `Club ${b}`;
        return clubNameA.localeCompare(clubNameB);
      });

      sortedClubIds.forEach((clubId, clubIndex) => {
        const athletes = clubsInYear[clubId];
        const clubName = clubNames[clubId] || `Club ${clubId}`;
        
        // Add club header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(`Club ${clubIndex + 1}: ${clubName}`, 14, currentY);
        currentY += 10;

        // Sort athletes by category, gender, and weight
        const sortedAthletes = athletes.sort((a, b) => {
          // First by category
          const categoryA = a.categories || '';
          const categoryB = b.categories || '';
          if (categoryA !== categoryB) {
            return categoryA.localeCompare(categoryB);
          }
          
          // Then by gender
          const genderA = a.genres || '';
          const genderB = b.genres || '';
          if (genderA !== genderB) {
            return genderA.localeCompare(genderB);
          }
          
          // Finally by weight
          const weightA = parseFloat(a.weight) || 0;
          const weightB = parseFloat(b.weight) || 0;
          return weightA - weightB;
        });

        // Prepare data for the table
        const tableData = sortedAthletes.map((athlete) => {
          return [
            athlete.last_name || '',
            athlete.first_name || '',
            athlete.date_of_birth || '',
            athlete.place_of_birth || '',
            athlete.role || '',
            athlete.blood_type || '',
            athlete.national_id_number || '',
            athlete.nationality || '',
            athlete.grade || '',
            athlete.renewal || '',
            athlete.year || '',
            athlete.genres || '',
            athlete.categories || '',
            athlete.weight || '',
            athlete.license_number || '',
            athlete.registration_date || '',
            athlete.confirmation ? 'Yes' : 'No',
            clubNames[athlete.club_id] || `Club ID: ${athlete.club_id}`,
            leagueNames[athlete.league_id] || `League ID: ${athlete.league_id}`
          ];
        });

        // Add table with green headers and alternating row colors for gender
        autoTable(doc, {
          head: [['Last', 'First', 'DOB', 'POB', 'Role', 'Blood', 'NID', 'Nationality', 'Grade', 'Renewal', 'Year', 'Gender', 'Category', 'Weight', 'License #', 'Registration', 'Confirmed', 'Club', 'League']],
          body: tableData,
          startY: currentY,
          theme: 'grid',
          headStyles: { fillColor: [34, 139, 34] }, // Green color
          styles: { fontSize: 8 },
          didParseCell: function(data) {
            // Apply alternating row colors based on gender
            if (data.section === 'body') {
              const rowData = tableData[data.row.index];
              const gender = rowData[11]; // Gender column
              
              if (gender && gender.toLowerCase().includes('women')) {
                data.cell.styles.fillColor = [211, 211, 211]; // Light gray for women
              } else {
                data.cell.styles.fillColor = [255, 255, 255]; // White for men
              }
            }
          },
          columnStyles: {
            0: { cellWidth: 15 }, // Last
            1: { cellWidth: 15 }, // First
            2: { cellWidth: 12 }, // DOB
            3: { cellWidth: 15 }, // POB
            4: { cellWidth: 10 }, // Role
            5: { cellWidth: 8 },  // Blood
            6: { cellWidth: 15 }, // NID
            7: { cellWidth: 12 }, // Nationality
            8: { cellWidth: 10 }, // Grade
            9: { cellWidth: 12 }, // Renewal
            10: { cellWidth: 8 }, // Year
            11: { cellWidth: 10 }, // Gender
            12: { cellWidth: 12 }, // Category
            13: { cellWidth: 10 }, // Weight
            14: { cellWidth: 15 }, // License #
            15: { cellWidth: 15 }, // Registration
            16: { cellWidth: 10 }, // Confirmed
            17: { cellWidth: 20 }, // Club
            18: { cellWidth: 20 }  // League
          }
        });

        // Update currentY for next section
        currentY = doc.lastAutoTable.finalY + 15;

        // Add new page if there's not enough space for next club or year
        if (currentY > 160) {
          doc.addPage();
          currentY = 20;
        }
      });

      // Add extra space between years
      currentY += 10;
    });

    // Save the PDF
    doc.save(`athletes_members_general_situation_${currentYear}.pdf`);
  };

  // Category-based PDF Export with hierarchical structure (Year > Club > Category > Gender > Weight)
  const handleCategoryPDFExport = async () => {
    if (!searchFilteredAthletes || searchFilteredAthletes.length === 0) {
      setError('No athletes data available to export');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentYear = new Date().getFullYear();
    const currentDate = new Date().toLocaleDateString();

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
      
      // Add title - bold, 14px, red color, centered
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 53, 69); // Red color
      doc.text('Athletes Members - Category Situation', pageWidth / 2, 40, { align: 'center' });
    };

    // Add initial header
    addFederationHeader();

    // Fetch club and league names once to avoid multiple API calls
    let clubNames = {};
    let leagueNames = {};
    
    try {
      clubNames = await fetchClubNames();
      leagueNames = await fetchLeagueNames();
    } catch (error) {
      console.error('Error fetching club/league names:', error);
    }

    // Create hierarchical data structure: Year > Club > Category > Gender > Weight
    const hierarchicalData = searchFilteredAthletes.reduce((acc, athlete) => {
      const year = athlete.year || 'Unknown Year';
      const clubId = athlete.club_id || 'Unknown Club';
      const clubName = clubNames[clubId] || `Club ID: ${clubId}`;
      const category = athlete.categories || 'Uncategorized';
      const gender = athlete.genres || 'Unspecified';
      const weight = athlete.weight || 'No Weight';

      if (!acc[year]) acc[year] = {};
      if (!acc[year][clubName]) acc[year][clubName] = {};
      if (!acc[year][clubName][category]) acc[year][clubName][category] = {};
      if (!acc[year][clubName][category][gender]) acc[year][clubName][category][gender] = {};
      if (!acc[year][clubName][category][gender][weight]) acc[year][clubName][category][gender][weight] = [];

      acc[year][clubName][category][gender][weight].push(athlete);
      return acc;
    }, {});

    // Helper function to prepare athlete data for table (sorted by date of birth)
    const prepareAthleteData = (athletes, gender) => {
      // Sort athletes by date of birth
      const sortedAthletes = [...athletes].sort((a, b) => {
        const dateA = new Date(a.date_of_birth || '1900-01-01');
        const dateB = new Date(b.date_of_birth || '1900-01-01');
        return dateA - dateB;
      });

      return sortedAthletes.map((athlete) => [
        athlete.last_name || '',
        athlete.first_name || '',
        athlete.date_of_birth || '',
        athlete.national_id_number || '',
        athlete.nationality || '',
        athlete.grade || '',
        athlete.license_number || '',
        athlete.confirmation ? 'Yes' : 'No',
        clubNames[athlete.club_id] || `Club ID: ${athlete.club_id}`
      ]);
    };

    let currentY = 50;
    let isFirstPage = true;

    // Process hierarchical data: Year > Club > Category > Gender > Weight
    Object.entries(hierarchicalData).sort().forEach(([year, clubs]) => {
      // Add year header
      if (!isFirstPage) {
        doc.addPage();
        addFederationHeader();
        currentY = 50;
      }
      isFirstPage = false;

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`Year: ${year}`, 14, currentY);
      currentY += 15;

      // Sort clubs alphabetically
      Object.entries(clubs).sort().forEach(([clubName, categories]) => {
        Object.entries(categories).sort().forEach(([category, genders]) => {
          Object.entries(genders).sort().forEach(([gender, weights]) => {
            Object.entries(weights).sort().forEach(([weight, athletes]) => {
              // Check if we need a new page before adding titles and table (prevent titles at end of page)
              // Reserve space for: titles (18px) + table header (12px) + at least 4 data rows (32px) = 62px minimum
              // Being very conservative to ensure titles are NEVER orphaned at bottom of page
              if (currentY > 200) {
                doc.addPage();
                addFederationHeader();
                currentY = 50;
              }

              // Add club and category on the same line
              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(40, 40, 40);
              doc.text(`  Club: ${clubName} - Category: ${category}`, 20, currentY);
              currentY += 10;

              // Add gender and weight on the same line
              doc.setFontSize(10);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(40, 40, 40);
              doc.text(`    Gender: ${gender} - Weight: ${weight}`, 30, currentY);
              currentY += 8;

              // Final check if we need a new page for the table after adding titles
              // This ensures the table has enough space and titles are not orphaned
              if (currentY > 220) {
                doc.addPage();
                addFederationHeader();
                currentY = 50;
                
                // Repeat context headers on new page
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(40, 40, 40);
                doc.text(`Year: ${year} (continued)`, 14, currentY);
                currentY += 12;
                
                // Repeat club and category on same line
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(40, 40, 40);
                doc.text(`  Club: ${clubName} - Category: ${category} (continued)`, 20, currentY);
                currentY += 10;
                
                // Repeat gender and weight on same line
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(40, 40, 40);
                doc.text(`    Gender: ${gender} - Weight: ${weight} (continued)`, 30, currentY);
                currentY += 8;
              }

              // Add table for this weight class with indentation
              const athleteData = prepareAthleteData(athletes, gender);
              
              autoTable(doc, {
                head: [['Last Name', 'First Name', 'DOB', 'NID', 'Nationality', 'Grade', 'License #', 'Confirmed', 'Club']],
                body: athleteData,
                startY: currentY,
                margin: { left: 14, right: 14 }, // Wider table with minimal margins
                theme: 'grid',
                headStyles: { 
                  fillColor: [40, 167, 69], // Green headers
                  fontSize: 9,
                  textColor: [255, 255, 255]
                },
                styles: { 
                  fontSize: 8,
                  cellPadding: 2,
                  fillColor: [255, 255, 255] // White background for all rows
                },
                columnStyles: {
                  0: { cellWidth: 25 }, // Last Name (increased further)
                  1: { cellWidth: 30 }, // First Name (x2 larger - doubled from 22)
                  2: { cellWidth: 20 }, // DOB
                  3: { cellWidth: 35 }, // NID
                  4: { cellWidth: 20 }, // Nationality
                  5: { cellWidth: 18 }, // Grade
                  6: { cellWidth: 35 }, // License # (increased further)
                  7: { cellWidth: 20 }, // Confirmed
                  8: { cellWidth: 50 }  // Club (increased further)
                }
              });

              currentY = doc.lastAutoTable.finalY + 10;
            });
          });
        });
      });
    });

    // Save the PDF
    doc.save(`athletes_category_hierarchical_${currentYear}.pdf`);
  };

  const exportGradeRolePDF = async () => {
    try {
      // Use existing athletes data from state
      const athletesData = searchFilteredAthletes || athletes || [];

      if (!athletesData || athletesData.length === 0) {
        setError('No athletes data available to export');
        return;
      }

      // Fetch club and league names for display
      const { clubNames, leagueNames } = await Promise.all([
        fetchClubNames(),
        fetchLeagueNames()
      ]).then(([clubs, leagues]) => ({
        clubNames: clubs,
        leagueNames: leagues
      }));

      // Group athletes by season year and grade
       const currentYear = new Date().getFullYear();
       const groupedData = {};
       athletesData.forEach(athlete => {
         const seasonYear = currentYear; // Use current year as season year
         const grade = athlete.grade || 'No Grade';
         
         if (!groupedData[seasonYear]) {
           groupedData[seasonYear] = {};
         }
         if (!groupedData[seasonYear][grade]) {
           groupedData[seasonYear][grade] = [];
         }
         
         groupedData[seasonYear][grade].push(athlete);
       });

      // Sort athletes within each group by date of birth
      Object.keys(groupedData).forEach(year => {
        Object.keys(groupedData[year]).forEach(grade => {
          groupedData[year][grade].sort((a, b) => new Date(a.date_of_birth) - new Date(b.date_of_birth));
        });
      });

      // Create PDF
      const doc = new jsPDF('landscape', 'mm', 'a4');
      let currentY = 50;

      // Add federation header function
      const addFederationHeader = () => {
        const currentDate = new Date().toLocaleDateString('en-GB');
        
        // Add print date at top left
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Print Date: ${currentDate}`, 14, 10);
        
        // Add federation title (centered)
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('Algerian Judo Federation', doc.internal.pageSize.width / 2, 20, { align: 'center' });
        
        // Add logo (right side)
        if (federationLogo) {
          try {
            doc.addImage(federationLogo, 'PNG', doc.internal.pageSize.width - 40, 15, 25, 25);
          } catch (error) {
            console.warn('Could not add federation logo to PDF:', error);
          }
        }
        
        // Add League with name (centered)
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`League: ${leagueName || 'Unknown League'}`, doc.internal.pageSize.width / 2, 30, { align: 'center' });
        
        // Add main title (centered)
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 53, 69); // Red color
        doc.text('Athletes - Grade and Role Situation', doc.internal.pageSize.width / 2, 40, { align: 'center' });
        
        return 50; // Return Y position for content
      };

      // Add initial header
      currentY = addFederationHeader();

      // Generate PDF content
      const sortedYears = Object.keys(groupedData).sort();
      
      sortedYears.forEach((year, yearIndex) => {
        const sortedGrades = Object.keys(groupedData[year]).sort();
        
        sortedGrades.forEach((grade, gradeIndex) => {
          const athletesInGrade = groupedData[year][grade];
          
          // Check if we need a new page
          if (currentY > 180) {
            doc.addPage();
            currentY = addFederationHeader();
          }
          
          // Add year and grade header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(`Season Year: ${year} - Grade: ${grade}`, 14, currentY);
          currentY += 10;
          
          // Prepare athlete data for table
           const athleteData = athletesInGrade.map(athlete => [
             athlete.last_name || '',
             athlete.first_name || '',
             athlete.date_of_birth ? new Date(athlete.date_of_birth).toLocaleDateString('en-GB') : '',
             athlete.national_id_number || '',
             athlete.nationality || '',
             athlete.grade || '',
             athlete.license_number || '',
             athlete.confirmation ? 'Yes' : 'No',
             clubNames[athlete.club_id] || `Club ID: ${athlete.club_id}`
           ]);
          
          // Add table
          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'NID', 'Nationality', 'Grade', 'License #', 'Confirmed', 'Club']],
            body: athleteData,
            startY: currentY,
            margin: { left: 14, right: 14 },
            theme: 'grid',
            headStyles: { 
              fillColor: [40, 167, 69], // Green headers
              fontSize: 9,
              textColor: [255, 255, 255]
            },
            styles: { 
              fontSize: 8,
              cellPadding: 2,
              fillColor: [255, 255, 255]
            },
            columnStyles: {
              0: { cellWidth: 25 }, // Last Name
              1: { cellWidth: 30 }, // First Name
              2: { cellWidth: 20 }, // DOB
              3: { cellWidth: 35 }, // NID
              4: { cellWidth: 20 }, // Nationality
              5: { cellWidth: 18 }, // Grade
              6: { cellWidth: 35 }, // License #
              7: { cellWidth: 20 }, // Confirmed
              8: { cellWidth: 50 }  // Club
            },
            didDrawPage: function (data) {
              if (data.pageNumber > 1) {
                addFederationHeader();
                // Adjust the starting position for the table content on new pages
                data.settings.margin.top = 80;
              }
            }
          });
          
          currentY = doc.lastAutoTable.finalY + 10;
        });
      });

      // Save the PDF
      doc.save(`athletes_grade_role_${new Date().getFullYear()}.pdf`);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  // ---------------- navigation helpers (require league_id) ----------------
  const goToPageWithLeagueCheck = (path) => {
  // Use selectedLeagueId or state?.league_id as fallback
  const leagueToSend = selectedLeagueId || state?.league_id;

  if (!leagueToSend) {
    setError("League must be selected or provided in state to open this page.");
    return;
  }

  navigate(path, {
    state: {
      ...state,
      league_id: leagueToSend,
    },
  });
};


  // ---------------- render ----------------
  return (
    <div className="app-container">
    {loading && <BarLoading />}
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
            {state?.logo_url ? (
              <img
                src={state.logo_url}
                alt="League Logo"
                className="member-logo"
                style={{ width: "50px", height: "50px" }}
              />
            ) : null}
            <h2 className="federation-title">
              {leagueName || "League Name"}
            </h2>
          </div>
        </div>
      </header>
     
        {/* controls */}
       

        {/* add-athlete form */}
        <section className="app-container">
          <h2>
          Welcome {state?.first_name || 'User'} {state?.last_name || ''}
        </h2>
        <p>
          <strong>Role:</strong> {state?.role || 'N/A'}
        </p>
         <div className="sticky-button-bar" style={{ margin: "12px 0", display: "flex", gap: 8 }}>
          <BackHomeButton />
<button
  className="primary-btn"
  data-id="1"
  onClick={async (e) => {
    // Highlight clicked button
    handlePrimaryButtonClick(e.currentTarget);

    // Prevent navigation if errors exist
    if (error) {
      setError("Please resolve the current error before navigating to another page.");
      return;
    }

    navigate("/member-list-l", {
      state: {
        ...state,
        league_id: leagueId,
        league_name: leagueName,
        league_logo: leagueLogo,
      },
    });
  }}
>
  The League Member List
</button>

<button
  className="primary-btn"
  data-id="2"
  onClick={async (e) => {
    // Highlight clicked button
    handlePrimaryButtonClick(e.currentTarget);

    if (error) {
      setError("Please resolve the current error before navigating to another page.");
      return;
    }

    navigate("/TheClubListAddFed-League", {
      state: {
        ...state,
        league_id: leagueId,
        league_name: leagueName,
        league_logo: leagueLogo,
      },
    });
  }}
>
  The Club Member List
</button>

<button
  className="primary-btn"
  data-id="3"
  onClick={async (e) => {
    // Highlight clicked button
    handlePrimaryButtonClick(e.currentTarget);

    if (error) {
      setError("Please resolve the current error before navigating to another page.");
      return;
    }

    navigate("/TheAthleteListAdd-League", {
      state: {
        ...state,
        league_id: leagueId,
        league_name: leagueName,
        league_logo: leagueLogo,
      },
    });
  }}
>
  The Athlete List Add
</button>

          </div>
       

  
           <div className="form-table-wrapper"></div>
          <h2 className="form-title">Add Athlete</h2>
          
          {success && <div style={{ color: "green" }}>{success}</div>}
        <form onSubmit={handleSubmit} className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
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
            Role *
            <select value={role} onChange={(e) => setRole(e.target.value)} required>
              <option value="">-- Select --</option>
              {roles.map((r, i) => <option key={i} value={r}>{r}</option>)}
            </select>
          </label>

          <label>
            Blood Type *
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} required>
              <option value="">--</option>
              <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
              <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
            </select>
          </label>

          <label>
            National Identity Number *
            <input value={nid} onChange={(e) => setNid(e.target.value.replace(/\D/g, "").slice(0, 18))} maxLength={18} required />
            <small>18 digits required — must be unique.</small>
          </label>

          <label>
            Password *
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          <label>
            Confirm Password *
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </label>

          <label>
            Nationality *
            <select value={nationality} onChange={(e) => setNationality(e.target.value)} required>
              <option value="">-- Select --</option>
              {nationalities.map((n, i) => <option key={i} value={n}>{n}</option>)}
            </select>
          </label>

        <label>
                  Grade *
                  <select value={grade} onChange={(e) => setGrade(e.target.value)} required>
                    <option value="">-- Select --</option>
                    <option>Brown Belt</option>
                    <option>Black Belt</option>
                  </select>
                </label>

          <label>
            Genres *
            <select value={genres} onChange={(e) => setGenres(e.target.value)} required>
              <option value="">-- Select --</option>
              {genresList.map((g, i) => <option key={i} value={g}>{g}</option>)}
            </select>
          </label>

          <label>
            Categories *
            <select value={categories} onChange={(e) => setCategories(e.target.value)} required>
              <option value="">-- Select --</option>
              {categoriesList.map((c, i) => <option key={i} value={c}>{c}</option>)}
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
					  League *
					  <select
					    value={selectedLeagueId}
					    onChange={(e) => {
					      setSelectedLeagueId(e.target.value);
					      setSelectedClubId("");
					    }}
					    disabled // ⬅️ This makes it unchangeable
					    required
					  >
					    <option value="">-- Select League --</option>
					    {leagues.map((l) => (
					      <option key={l.id} value={l.id}>
					        {l.name_league}
					      </option>
					    ))}
					  </select>
					</label>
          <label>
            Club *
            <select value={selectedClubId} onChange={(e) => setSelectedClubId(e.target.value)} disabled={!selectedLeagueId && !clubId} required>
              <option value="">-- Select Club --</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name_club}</option>)}
            </select>
          </label>

          <label>
            Upload Photo *
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} required />
          </label>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
            <button type="submit" className="primary-b">Save Athlete</button>
            
          </div>
          <p style={{ gridColumn: "1 / -1", fontSize: "14px", color: "#666", marginTop: "10px" }}>
            All fields marked with an asterisk (*) must be filled in.
          </p>
        </form>
      </section>

      {/* search + table */}
      <section className="app-container" >
     
				<h2 className="form-title">List of Athletes</h2>
        <div className="form-grid">
           <label>
					  League
					  <select
					    value={selectedLeagueId}
					    onChange={(e) => {
					      setSelectedLeagueId(e.target.value);
					      setSelectedClubId("");
					    }}
					    disabled // ⬅️ This makes it unchangeable
					  >
					    <option value="">-- Select League --</option>
					    {leagues.map((l) => (
					      <option key={l.id} value={l.id}>
					        {l.name_league}
					      </option>
					    ))}
					  </select>
					</label>

          <label>
            Club:
            <select value={selectedClubId} onChange={(e) => setSelectedClubId(e.target.value)} disabled={!selectedLeagueId && !clubId}>
              <option value="">-- All Clubs --</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name_club}</option>)}
            </select>
          </label>

          <div>
            <div><h2 className="form-title">search Member</h2></div>
          </div>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by First Name, Last Name, or License Number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container" ref={tableRef} style={{ overflow: "auto" }}>
          <table className="athlete-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Last</th>
                <th>First</th>
                <th>DOB</th>
                <th>POB</th>
                <th>Role</th>
                <th>Blood</th>
                <th>NID</th>
                <th>Nationality</th>
                <th>Grade</th>
                <th>Renewal</th>
                <th>Year</th>
                <th>Genres</th>
                <th>Categories</th>
                <th>Weight</th>
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
              {searchFilteredAthletes.length === 0 ? (
                <tr><td colSpan={21}>No athletes found.</td></tr>
              ) : searchFilteredAthletes.map(a => (
                <tr key={a.id} onDoubleClick={() => handleExportPDF(a)} style={{ cursor: 'pointer' }}>
                  <td>{editingId === a.id ? <input value={editedAthlete.last_name || ""} onChange={e => setEditedAthlete({ ...editedAthlete, last_name: e.target.value })} /> : a.last_name}</td>
                  <td>{editingId === a.id ? <input value={editedAthlete.first_name || ""} onChange={e => setEditedAthlete({ ...editedAthlete, first_name: e.target.value })} /> : a.first_name}</td>
                  <td>{editingId === a.id ? <input type="date" value={editedAthlete.date_of_birth || ""} onChange={e => setEditedAthlete({ ...editedAthlete, date_of_birth: e.target.value })} /> : a.date_of_birth}</td>
                  <td>{editingId === a.id ? <input value={editedAthlete.place_of_birth || ""} onChange={e => setEditedAthlete({ ...editedAthlete, place_of_birth: e.target.value })} /> : a.place_of_birth}</td>

                  <td>{editingId === a.id ? (
                    <select value={editedAthlete.role || ""} onChange={e => setEditedAthlete({ ...editedAthlete, role: e.target.value })}>
                      <option value="">-- Select --</option>
                      {roles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                    </select>
                  ) : a.role}</td>

                  <td>{editingId === a.id ? (
                    <select value={editedAthlete.blood_type || ""} onChange={e => setEditedAthlete({ ...editedAthlete, blood_type: e.target.value })}>
                      <option value="">--</option>
                      <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                      <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                    </select>
                  ) : a.blood_type}</td>

                  <td>{a.national_id_number}</td>

                  <td>{editingId === a.id ? (
                    <select value={editedAthlete.nationality || ""} onChange={e => setEditedAthlete({ ...editedAthlete, nationality: e.target.value })}>
                      <option value="">--</option>
                      {nationalities.map((n, i) => <option key={i} value={n}>{n}</option>)}
                    </select>
                  ) : a.nationality}</td>

                  <td>{editingId === a.id ? (
                    <select value={editedAthlete.grade || ""} onChange={e => setEditedAthlete({ ...editedAthlete, grade: e.target.value })}>
                      <option value="">--</option>
                      {grades.map((g, i) => <option key={i} value={g}>{g}</option>)}
                    </select>
                  ) : a.grade}</td>

                  <td>{a.renewal}</td>
                  <td>{a.year}</td>

                  <td>{editingId === a.id ? (
                    <select value={editedAthlete.genres || ""} onChange={e => setEditedAthlete({ ...editedAthlete, genres: e.target.value })}>
                      <option value="">--</option>
                      {genresList.map((g, i) => <option key={i} value={g}>{g}</option>)}
                    </select>
                  ) : a.genres}</td>

                  <td>{editingId === a.id ? (
                    <select value={editedAthlete.categories || ""} onChange={e => setEditedAthlete({ ...editedAthlete, categories: e.target.value })}>
                      <option value="">--</option>
                      {categoriesList.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  ) : a.categories}</td>

                   {/* Weight */}
                      <td>
                        {editingId === a.id ? (
                          <select
                            value={editedAthlete.weight || ""}
                            onChange={(e) =>
                              setEditedAthlete({ ...editedAthlete, weight: e.target.value })
                            }
                            disabled={!editedAthlete.genres || !editedAthlete.categories}
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

                  <td>{a.license_number}</td>
                  <td>{a.registration_date}</td>
                  <td>{a.photos_url ? <img src={a.photos_url} alt={`${a.first_name} ${a.last_name}`} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} /> : "No Photo"}</td>
                  <td>{a.confirmation ? "✅" : "❌"}</td>
                  <td>{a.club_id}</td>
                  <td>{a.league_id}</td>

                  <td>
                    {editingId === a.id ? (
                      <>
                        <button className="primary-S" onClick={saveEdit}>Save</button>
                        <button className="secondary-btn" onClick={cancelEdit}>Cancel </button>
                      </>
                    ) : (
                      <>
                        <button className="primary-M" onClick={() => startEdit(a)}>Modify</button>
                        <button className="secondary-btn" onClick={() => deleteAthlete(a)}>Delete</button>
                        <button className={a.confirmation ? "cancel-btn" : "confirm-btn"} onClick={() => toggleAthleteConfirmation(a.id, a.confirmation)}>
                          {a.confirmation ? "Cancel Confirmation" : "Confirm"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            
        </div>
        
        <div className="export-buttons" style={{ margin: "12px 0", display: "flex", gap: 8 }}>
         <BackHomeButton />
          <button 
            className="primary-b" 
            onClick={handleGeneralPDFExport}
          >
            Export General PDF
          </button>
          <button 
            className="primary-b" 
            onClick={handleCategoryPDFExport}
          >
            Export by Category
          </button>
          <button 
            className="primary-b" 
            onClick={exportGradeRolePDF}
          >
            Export by Grade PDF
          </button>
        </div>
      </section>

      {/* Error and Success Overlays */}
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
      
      {/* Circle Loading */}
      {circleLoading && <CircleLoading />}
      
      <Navigation />

       <footer className="footer" style={{ backgroundColor: "red" }}>
        <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
      </footer>
    </div>
  );
}

