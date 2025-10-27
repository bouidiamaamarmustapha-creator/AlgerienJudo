import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import { Shield } from "lucide-react";
import { supabase } from "./supabaseClient";
import logo from "./assets/logo.png";
import PhotosLogoPublication from "./PhotosLogoPublication";
import { initializePrimaryButtons, handlePrimaryButtonClick } from './primaryButtonHandler';
import { exportToPDF, fetchClubNames, fetchLeagueNames } from "./ExportUtils";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import loadImage from 'blueimp-load-image';
import QRCode from 'qrcode';
import { useDragScroll } from './useDragScroll';
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from './components/BarLoading';
import CircleLoading from './components/CircleLoading';


export default function TheAthleteListAdd() {
  useEffect(() => {
    initializePrimaryButtons();
  }, []);
  const { state } = useLocation(); // optional: { club_id, league_id, member_id, ... }
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [publications, setPublications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] = useState("Algerian Judo Federation");
  const [isGreen, setIsGreen] = useState(true); // State to toggle border color
  const [loading, setLoading] = useState(true);
  const [circleLoading, setCircleLoading] = useState(false);

  // logged member (optional)
  const [member, setMember] = useState(null);

  // form (add athlete)
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

  // corrected: genres, categories, weight, weights
  const [genres, setGenres] = useState("");
  const [categories, setCategories] = useState("");
  const [weight, setWeight] = useState("");
  const [weights, setWeights] = useState([]);
  const [athletes, setAthletes] = useState([]);

  // selects source (only needed if user wants to change club/league from page)
  const [clubs, setClubs] = useState([]);
  const [leagues, setLeagues] = useState([]);

  // selected club/league (prefill from state if present)
  const [clubId, setClubId] = useState(state?.club_id ?? "");
  const [leagueId, setLeagueId] = useState(state?.league_id ?? "");
  const [clubName, setClubName] = useState("");
  const [leagueName, setLeagueName] = useState("");

  // edit state for table rows
  const [editingId, setEditingId] = useState(null);
  const [editedAthlete, setEditedAthlete] = useState({});

  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [allAthletes, setAllAthletes] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const tableRef = useDragScroll();

// Function to normalize image orientation using EXIF data with fallback
function normalizeImage(url) {
  return new Promise((resolve, reject) => {
    loadImage(
      url,
      (canvas) => {
        if (canvas.type === "error") {
          console.warn("EXIF processing failed, using original image:", url);
          resolve(url);
        } else {
          try {
            const dataURL = canvas.toDataURL("image/png");
            resolve(dataURL);
          } catch (error) {
            console.warn("Canvas conversion failed, using original image:", error);
            resolve(url);
          }
        }
      },
      { orientation: true, canvas: true, crossOrigin: 'anonymous' }
    );
  });
}


  // ✅ fetch publications from Supabase
  useEffect(() => {
    const fetchPublications = async () => {
      const { data, error } = await supabase
        .from("publications")
        .select("id, title, description, photo_url, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPublications(data);
      }
    };

    fetchPublications();
  }, []);

  useEffect(() => {
    const fetchLatestLogo = async () => {
      const { data, error } = await supabase
        .from("logo") // ✅ using the "logo" table we created
        .select("logo_url")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data.length > 0) {
        setFederationLogo(data[0].logo_url);
      }
    };

    fetchLatestLogo();
  }, []);
//fetchClubsAndLeagues
  useEffect(() => {
    const fetchClubsAndLeagues = async () => {
      try {
        const [{ data: clubsData, error: clubsError }, { data: leaguesData, error: leaguesError }] = await Promise.all([
          supabase.from("nameclub").select("id, name_club"),
          supabase.from("nameleague").select("id, name_league"),
        ]);

        if (clubsError || leaguesError) {
          console.error("Error fetching clubs/leagues:", clubsError || leaguesError);
        } else {
          console.log("Clubs:", clubsData);
          console.log("Leagues:", leaguesData);
          // set state here if you need
          setClubs(clubsData);
          setLeagues(leaguesData);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClubsAndLeagues();
  }, []);

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
          .from("categories") // ✅ table name
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

  // Fetch leagues and all athletes on mount
  useEffect(() => {
    const fetchLeaguesAndAthletes = async () => {
      try {
        // Leagues
        const { data: leaguesData, error: leaguesError } = await supabase
          .from("nameleague")
          .select("id, name_league");
        if (leaguesError) throw leaguesError;
        setLeagues(leaguesData || []);

        // All athletes
        const { data: athletesData, error: athletesError } = await supabase
          .from("athletes")
          .select("*");
        if (athletesError) throw athletesError;
        setAthletes(athletesData || []);
        setAllAthletes(athletesData || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchLeaguesAndAthletes();
  }, []);

  // Fetch clubs when a league is selected
  useEffect(() => {
    const fetchClubs = async () => {
      if (!selectedLeague) {
        setClubs([]);
        setSelectedClub("");
        setAthletes(allAthletes); // reset table to all athletes
        return;
      }

      try {
        const { data, error } = await supabase
          .from("nameclub")
          .select("id, name_club")
          .eq("league_i", Number(selectedLeague));
        if (error) throw error;
        setClubs(data || []);
        setSelectedClub("");

        // ✅ Immediately filter athletes by this league
        const leagueFiltered = allAthletes.filter(
          (a) => a.league_id === Number(selectedLeague) // convert to number
        );
        setAthletes(leagueFiltered);
      } catch (err) {
        console.error(err);
      }
    };

    fetchClubs();
  }, [selectedLeague]);

  // Fetch league name when selectedLeague changes
  useEffect(() => {
    const fetchLeagueName = async () => {
      if (!selectedLeague) { setLeagueName(""); return; }
      try {
        const { data, error } = await supabase
          .from("nameleague")
          .select("name_league")
          .eq("id", Number(selectedLeague))
          .single();
        if (!error) {
          setLeagueName(data?.name_league || "");
        }
      } catch (err) {
        console.error("Error fetching league name:", err);
      }
    };
    fetchLeagueName();
  }, [selectedLeague]);

  // Fetch club name when selectedClub changes
  useEffect(() => {
    const fetchClubName = async () => {
      if (!selectedClub) { setClubName(""); return; }
      try {
        const { data, error } = await supabase
          .from("nameclub")
          .select("name_club")
          .eq("id", Number(selectedClub))
          .single();
        if (!error) {
          setClubName(data?.name_club || "");
        }
      } catch (err) {
        console.error("Error fetching club name:", err);
      }
    };
    fetchClubName();
  }, [selectedClub]);

  // Filter athletes by league & club
  useEffect(() => {
    if (!selectedLeague && !selectedClub) {
      setAthletes(allAthletes); // show all
      return;
    }

    let filtered = allAthletes;

    if (selectedLeague) {
      filtered = filtered.filter(
        (a) => a.league_id === Number(selectedLeague) // convert to number
      );
    }

    if (selectedClub) {
      filtered = filtered.filter(
        (a) => a.club_id === Number(selectedClub) // convert to number
      );
    }

    setAthletes(filtered);
  }, [selectedLeague, selectedClub, allAthletes]);

  // helper: compute renewal number
  const getNextRenewal = async (nidVal, clubIdVal, leagueIdVal) => {
    try {
      const { count, error } = await supabase
        .from("athletes")
        .select("*", { count: "exact", head: true })
        .eq("national_id_number", nidVal)
        .eq("club_id", clubIdVal)
        .eq("league_id", leagueIdVal);
      if (error) {
        console.error("getNextRenewal count error", error);
        return 1;
      }
      return (count || 0) + 1;
    } catch (err) {
      console.error("getNextRenewal unexpected", err);
      return 1;
    }
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

      // Refresh table data
      const fetchData = async () => {
        try {
          setLoading(true);
          let query = supabase.from("athletes").select("*");
          if (selectedClub) {
            query = query.eq("club_id", Number(selectedClub));
          } else if (selectedLeague) {
            query = query.eq("league_id", Number(selectedLeague));
          }
          const { data, error } = await query.order("id", { ascending: false });
          if (error) throw error;
          const list = Array.isArray(data) ? data : [];
          setAthletes(list);
          setAllAthletes(list);
        } catch (err) {
          console.error("fetchData error", err);
          setError(err.message || String(err));
        } finally {
          setLoading(false);
        }
      };
      
      // Add athlete
      const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // validation (aligned with AthletePage.jsx)
        if (!firstName || !lastName) {
          setError("First name and Last name are required.");
          return;
        }
        if (!/^\d{18}$/.test(nid)) {
          setError("National ID (NID) must be exactly 18 digits.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        if (!selectedLeague && !leagueId) {
          setError("League must be selected or provided in state.");
          return;
        }
        if (!selectedClub && !clubId) {
          setError("Club must be selected or provided in state.");
          return;
        }

        // validate age for selected category
        const ageValidation = validateCategoryAge(dob, categories);
        if (!ageValidation.isValid) {
          setError(ageValidation.message);
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
            return;
          }
        }

        // Renewal validation: NID uniqueness in current season
        const currentYear = new Date().getFullYear();
        const year = `${currentYear}/${currentYear + 1}`;
        
        try {
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
            return;
          }
        } catch (err) {
          setError(err.message || String(err));
          return;
        }

        try {
          setLoading(true);
          setCircleLoading(true);
          const photoUrl = await handlePhotoUpload();
          const renewalNumber = await getNextRenewal(nid, clubId, leagueId);
          // Use the same year calculation as in validation

           // ✅ Insert new athlete
          const newAthlete = {
            last_name: lastName,
            first_name: firstName,
            date_of_birth: dob,
            place_of_birth: pob,
            role,
            blood_type: bloodType,
            national_id_number: nid,
            password,
            license_number: `ATH-${currentYear}-${Date.now()}`, // dynamic license
            registration_date: new Date().toISOString().split("T")[0],
            photos_url: photoUrl,
            nationality,
            grade,
            renewal: renewalNumber,
            confirmation: false,
            genres,
            categories: categories,
            weight,
            league_id: selectedLeague || leagueId,
            club_id: selectedClub || clubId,
            year,
          };

          const { error } = await supabase.from("athletes").insert([newAthlete]);
          if (error) {
            console.error("insert athlete error", error);
            alert("Error saving athlete: " + error.message);
          } else {
            // clear form (keep club/league context)
            setLastName("");
            setFirstName("");
            setDob("");
            setPob("");
            setRole("");
            setBloodType("");
            setNid("");
            setPassword("");
            setConfirmPassword("");
            setNationality("");
            setGrade("");
            setGenres("");
            setCategories("");
            setWeight("");
            setPhotoFile(null);

            // refresh the page to reset filters and show all leagues
            window.location.reload();
          }
        } catch (err) {
          console.error("handleSubmit error", err);
          alert("Unexpected error: " + err.message);
        } finally {
          setCircleLoading(false);
          setLoading(false);
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

      // Save changes
      const saveEdit = async () => {
        // validate age for selected category
        const ageValidation = validateCategoryAge(editedAthlete.date_of_birth, editedAthlete.categories);
        if (!ageValidation.isValid) {
          alert(ageValidation.message);
          return;
        }
        try {
          setCircleLoading(true);
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
            alert("Update failed: " + error.message);
          } else {
            await fetchData();
            cancelEdit();
          }
        } catch (err) {
          console.error("saveEdit error", err);
          alert("Unexpected error: " + err.message);
        } finally {
          setCircleLoading(false);
        }
      };

      // delete only same day allowed
      const deleteAthlete = async (a) => {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        if (a.registration_date !== today) {
          alert("You can only delete athletes the same day they were added.");
          return;
        }
        if (!window.confirm("Delete this athlete?")) return;
        try {
          const { error } = await supabase.from("athletes").delete().eq("id", a.id);
          if (error) throw error;
          await fetchData();
        } catch (err) {
          console.error("deleteAthlete error", err);
          alert("Error deleting athlete: " + err.message);
        }
      };

      // helper render for action buttons in row
      const ActionsCell = ({ a }) => {
        const today = new Date().toISOString().split("T")[0];
        const canDelete = a.registration_date === today;
        if (editingId === a.id) {
          return (
            <>
              <button className="primary-btn" onClick={() => saveEdit(a.id)}>
                Save
              </button>
              <button className="secondary-btn" onClick={cancelEdit}>
                Cancel
              </button>
            </>
          );
        }
        return (
          <>
            <button className="primary-btn" onClick={() => startEdit(a)}>
              Modify
            </button>

            <button
              className="secondary-btn"
              onClick={() => deleteAthlete(a)}
              disabled={!canDelete}
              title={!canDelete ? "Delete allowed only on the day of registration" : "Delete"}
            >
              Delete
            </button>
          </>
        );
      };

      // Define roles array
      const roles = ["Admin", "Coach", "Athlete"];
      const nationalities = ["Algerian", "Tunisian"];
      const grades = ["brown belt", "black belt"];
      const categoriesList = ["Benjamins", "Minimes", "Cadets", "Juniors", "Hopefuls", "Seniors", "Veterans"];
      const genresList = ["Men", "Women"];

  
  // confirmation
 const toggleAthleteConfirmation = async (athleteId, currentStatus) => {
  try {
    const { error } = await supabase
      .from("athletes")          // ✅ table for athletes
      .update({ confirmation: !currentStatus }) // toggle the boolean
      .eq("id", athleteId);      // target specific athlete

    if (error) throw error;

    // Update local state immediately
    setAthletes((prev) =>
      prev.map((a) =>
        a.id === athleteId ? { ...a, confirmation: !currentStatus } : a
      )
    );
  } catch (err) {
    setError(`Failed to update athlete confirmation: ${err.message}`);
  }
};


  // search
  const filteredAthletes = athletes.filter((a) => {
    const term = (searchTerm || "").toLowerCase();
    return (
      (a.first_name?.toLowerCase() ?? "").includes(term) ||
      (a.last_name?.toLowerCase() ?? "").includes(term) ||
      (a.national_id_number ?? "").includes(term)
    );
  });

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

    // Add athlete photo if available
    let startY = 70;
    if (data.photos_url) {
      try {
        const fixedPhoto = await normalizeImage(data.photos_url);
        const imageFormat = fixedPhoto.startsWith('data:') ? 'PNG' : 'JPEG';
        doc.addImage(fixedPhoto, imageFormat, 14, 45, 25, 20);
        startY = 70;
      } catch (error) {
        console.error('Error adding photo to PDF:', error);
        try {
          doc.addImage(data.photos_url, 'JPEG', 14, 45, 25, 20);
        } catch (fallbackError) {
          console.error('Fallback image addition also failed:', fallbackError);
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
      ['Renewal', data.renewal || ''],
      ['Club', fetchedClubName || `Club ID: ${data.club_id}`],
      ['League', fetchedLeagueName || `League ID: ${data.league_id}`],
      ['Confirmation', data.confirmation ? 'Confirmed' : 'Not Confirmed']
    ];
    
    // Add athlete information table
    autoTable(doc, {
      head: [['Field', 'Value']],
      body: athleteInfo,
      startY: startY,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 120 }
      }
    });

    // Add medical certificate text immediately after the table (higher up)
    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Medical certificate", 14, finalY + 10);

    // Add space for signature (closer to medical certificate text)
    doc.setDrawColor(0);
    doc.line(14, finalY + 25, 80, finalY + 25); // Signature line

    // Add club and league information below medical certificate
    doc.setFontSize(10);

    // Display club information
    if (data.club_id || fetchedClubName) {
      const displayClubName = fetchedClubName || `ID: ${data.club_id}`;
      doc.text(`Club: ${displayClubName}`, 14, finalY + 40);
      doc.text("Club Visa: _________________", 14, finalY + 50);
    }

    // Display league information
    if (data.league_id || fetchedLeagueName) {
      const displayLeagueName = fetchedLeagueName || `ID: ${data.league_id}`;
      doc.text(`League: ${displayLeagueName}`, 120, finalY + 40);
      doc.text("League Visa: _________________", 120, finalY + 50);
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
      
      // Add QR code at bottom right corner (smaller size: 15x15)
      doc.addImage(qrCodeDataURL, 'PNG', 170, finalY + 55, 15, 15);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

    // Save the PDF
    doc.save(`athlete_${data.first_name}_${data.last_name}_${data.id || 'record'}.pdf`);
  };

  // General PDF Export for all athletes (centered header style)
  const handleGeneralPDFExport = async () => {
    if (!filteredAthletes || filteredAthletes.length === 0) {
      alert('No athletes data available to export');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const startYear = new Date().getFullYear();
    const seasonYear = `${startYear}/${startYear + 1}`;

    // Header with federation, league, club, and logo
    let yPosition = addGeneralPDFHeader(doc, federationName, leagueName, clubName);

    // Title in red, centered
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(220, 53, 69);
    doc.text('Athletes - General Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });

    // Year under the title
    doc.setTextColor(0, 0, 0);
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Year: ${seasonYear}`, 20, yPosition);
    yPosition += 10;

    // Prepare table data (match desired columns)
    const tableData = filteredAthletes.map((athlete) => [
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
      (athlete.confirmation ? 'Yes' : 'No'),
      sanitizeText(athlete.license_number || '')
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [[
        'Last Name', 'First Name', 'DOB', 'POB', 'Blood Type',
        'Nationality', 'Grade', 'Gender', 'Category', 'Weight',
        'NID', 'Confirmation', 'License #'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontSize: 6, fontStyle: 'bold' },
      styles: { fontSize: 5, overflow: 'linebreak' },
      margin: { left: 10, right: 10 },
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
      },
      didDrawPage: function (data) {
        if (data.pageNumber > 1) {
          // Re-add header on subsequent pages for consistency
          addGeneralPDFHeader(doc, federationName, leagueName, clubName);
        }
      }
    });

    doc.save(`athletes_general_${seasonYear}.pdf`);
  };

  // Category-based PDF Export with hierarchical structure (Year > Club > Category > Gender > Weight)
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
      const cName = clubId ? (clubNames[clubId] || `Club ID: ${clubId}`) : 'Unknown Club';
      const category = athlete.categories || 'Uncategorized';
      const gender = athlete.genres || 'Unspecified';
      const weight = athlete.weight || 'Unspecified';
      
      if (!hierarchicalData[year]) {
        hierarchicalData[year] = {};
      }
      if (!hierarchicalData[year][cName]) {
        hierarchicalData[year][cName] = {};
      }
      if (!hierarchicalData[year][cName][category]) {
        hierarchicalData[year][cName][category] = {};
      }
      if (!hierarchicalData[year][cName][category][gender]) {
        hierarchicalData[year][cName][category][gender] = {};
      }
      if (!hierarchicalData[year][cName][category][gender][weight]) {
        hierarchicalData[year][cName][category][gender][weight] = [];
      }
      
      hierarchicalData[year][cName][category][gender][weight].push(athlete);
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
                      fillColor: [40, 40, 40], // Black headers
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

  useEffect(() => {
    const timeout = setTimeout(() => { }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);





  // Helper function to sanitize text for PDF (identical to AthletePage)
  const sanitizeText = (text) => {
    if (!text) return '';
    let cleanText = String(text)
      .replace(/Ø=UÈ/g, '')
      .replace(/Ø<ða/g, '')
      .replace(/Ø=Ud/g, '')
      .replace(/Ø-ÜÈ/g, '')
      .replace(/Ø-Üd/g, '')
      .replace(/Ø<Ða/g, '')
      .replace(/Ø<ßà/g, '')
      .replace(/%[0-9A-Fa-f]{2}/g, '')
      .replace(/% % %/g, '')
      .replace(/%%%/g, '')
      .replace(/%%/g, '')
      .replace(/%\s+%/g, '')
      .replace(/%+/g, '')
      .replace(/\s*%\s*/g, '')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\uFFFD/g, '')
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

  // Helper function to add general PDF header (identical to AthletePage)
  const addGeneralPDFHeader = (doc, federationNameParam, leagueNameParam, clubNameParam) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    if (federationLogo) {
      try {
        doc.addImage(federationLogo, 'PNG', pageWidth - 40, 15, 25, 25);
      } catch (e) {
        console.warn('Could not add federation logo:', e);
      }
    }
    const currentDate = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Print Date: ${currentDate}`, 15, 20);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(federationNameParam || 'Algerian Judo Federation'), pageWidth / 2, 25, { align: 'center' });
    let yPosition = 40;
    if (leagueNameParam) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`League: ${sanitizeText(leagueNameParam)}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }
    if (clubNameParam) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Club: ${sanitizeText(clubNameParam)}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }
    return yPosition + 2;
  };

  // Export Grade Role PDF function for athletes (mirrors AthletePage)
  const exportGradeRolePDF = async () => {
    try {
      // Fetch athletes based on selected club or league; fallback to all when none selected
      let athletesData = [];

      if (selectedClub) {
        const { data: clubAthletes, error: athletesError } = await supabase
          .from('athletes')
          .select('*')
          .eq('club_id', Number(selectedClub));
        if (athletesError) throw athletesError;
        athletesData = clubAthletes || [];
      } else if (selectedLeague) {
        const { data: leagueAthletes, error: athletesError } = await supabase
          .from('athletes')
          .select('*')
          .eq('league_id', Number(selectedLeague));
        if (athletesError) throw athletesError;
        athletesData = leagueAthletes || [];
      } else {
        // No selection: use the currently loaded list or fetch all
        athletesData = (Array.isArray(athletes) && athletes.length)
          ? athletes
          : (Array.isArray(allAthletes) ? allAthletes : []);

        if (!athletesData || athletesData.length === 0) {
          const { data: allData, error: allErr } = await supabase
            .from('athletes')
            .select('*');
          if (allErr) throw allErr;
          athletesData = allData || [];
        }
      }

      if (!athletesData || athletesData.length === 0) {
        alert('No athletes found');
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
      athletesData.forEach((athlete) => {
        const year = athlete.year || 'Unknown Year';
        const grade = athlete.grade || 'Unknown Grade';
        if (!athletesByYearAndGrade[year]) athletesByYearAndGrade[year] = {};
        if (!athletesByYearAndGrade[year][grade]) athletesByYearAndGrade[year][grade] = [];
        athletesByYearAndGrade[year][grade].push(athlete);
      });

      const sortedYears = Object.keys(athletesByYearAndGrade).sort();

      for (const year of sortedYears) {
        const yearGrades = athletesByYearAndGrade[year];

        // Add year header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Year: ${year}`, 20, yPosition);
        yPosition += 15;

        const sortedGrades = Object.keys(yearGrades).sort();

        for (const grade of sortedGrades) {
          const gradeAthletes = yearGrades[grade];

          const sortedAthletes = gradeAthletes.sort((a, b) => {
            const dateA = new Date(a.date_of_birth || '1900-01-01');
            const dateB = new Date(b.date_of_birth || '1900-01-01');
            return dateA - dateB;
          });

          // Grade header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`Grade: ${grade}`, 30, yPosition);
          yPosition += 10;

          const tableData = sortedAthletes.map((athlete) => [
            sanitizeText(athlete.last_name || ''),
            sanitizeText(athlete.first_name || ''),
            sanitizeText(athlete.date_of_birth || ''),
            sanitizeText(athlete.place_of_birth || ''),
            sanitizeText(athlete.blood_type || ''),
            sanitizeText(athlete.nationality || ''),
            sanitizeText(athlete.genres || ''),
            sanitizeText(athlete.categories || ''),
            sanitizeText(athlete.weight || ''),
            sanitizeText(athlete.national_id_number || ''),
            athlete.confirmation ? 'Yes' : 'No',
            sanitizeText(athlete.license_number || '')
          ]);

          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Gender', 'Category', 'Weight', 'NID', 'Confirmation', 'License #']],
            body: tableData,
            startY: yPosition,
            styles: { fontSize: 5, cellPadding: 1 },
            headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold', fontSize: 5 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 10, right: 10 },
            didDrawPage: function (data) {
              if (data.pageNumber > 1) {
                addGeneralPDFHeader(doc, federationName, leagueName, clubName);
              }
            }
          });

          yPosition = doc.lastAutoTable.finalY + 15;

          if (yPosition > doc.internal.pageSize.getHeight() - 80) {
            doc.addPage();
            yPosition = addGeneralPDFHeader(doc, federationName, leagueName, clubName);
            yPosition += 20;
          }
        }

        yPosition += 10;
      }

      const currentDate = new Date().getFullYear();
      const contextName = leagueName || clubName || 'athletes';
      doc.save(`${sanitizeText(contextName)}_grade_role_athletes_${currentDate}.pdf`);
    } catch (error) {
      console.error('Error exporting grade role PDF:', error);
      alert('Error exporting PDF. Please try again.');
    }
  };

  useEffect(() => { if (clubId && leagueId) { fetchData(); } }, [clubId, leagueId]);

  return (
    <div className="app-container">
      {loading && <BarLoading />}
      {/* HEADER */}
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

      {/* MAIN CONTENT */}
      <section className="app-container">
        <h2>Welcome to the Federation Account</h2>
        <p>This is the Federation Account page.</p>
				<div className="form-table-wrapper">
        <div className="sticky-button-bar">
          <BackHomeButton />
          <PhotosLogoPublication data-id="1" />
          <button className="primary-btn" data-id="2" onClick={() => navigate("/MemberListPageP")}>
            The Member List Add
          </button>
          <button
            className="primary-btn"
            data-id="3"
            onClick={(e) => {
              handlePrimaryButtonClick(e.currentTarget);
              navigate("/TheLeagueList-Add", {
                state: {
                  ...state,
                  league_id: state?.league_id ?? selectedLeague ?? "",
                  league_name: state?.league_name ?? "",
                  league_logo: state?.league_logo ?? "",
                },
              });
            }}
          >
            The League List Add
          </button>
          <button className="primary-btn" data-id="4" onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheClubListAdd-Fed"); }}>
            The Club List Add
          </button>
          <button className="primary-btn" data-id="5" onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheAthleteList-Add"); }}>
            The Athlete List Add
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
                <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}required>
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
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
              </label>

              <label>
                Confirm Password *
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required/>
              </label>

              {/* club/league selects: prefilled from state if present (disabled) */}
           <label>
            League *
            <select
              value={selectedLeague}
              onChange={(e) => {
                setSelectedLeague(e.target.value);
                setSelectedClub("");
              }}
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
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              disabled={!selectedLeague}
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

        {/* Athletes Table */}
        <h2 className="form-title">List Of Athletes</h2>

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
          </label>
         <div><h2 className="form-title">search Athlete</h2></div>
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
            {/* Selected summary above table */}
            <div style={{ marginBottom: 8, fontSize: 14 }}>
              <strong>Selected:</strong>
              {selectedLeague ? ` League: ${leagueName || 'ID ' + selectedLeague}` : ' All Leagues'}
              {selectedLeague && !selectedClub ? ' | All Clubs in League' : ''}
              {selectedClub ? ` | Club: ${clubName || 'ID ' + selectedClub}` : ''}
            </div>
            <table className="athlete-table">
              <thead style={{ backgroundColor: "#000", color: "#fff" }}>
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
                  <th>conf_request</th>
                  <th>Club ID</th>
                  <th>League ID</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredAthletes.length === 0 ? (
                  <tr>
                    <td colSpan={22}>No athletes found for this club/league.</td>
                  </tr>
                ) : (
								  filteredAthletes.map((a) => (
								    <tr key={a.id} onDoubleClick={() => handleExportPDF(a)} style={{ cursor: 'pointer' }}>
                      {/* Last */}
                      <td>
                        {editingId === a.id ? (
                          <input
                            value={editedAthlete.last_name || ""}
                            onChange={(e) => handleChange(e, "last_name")}
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

                      {/* Role */}
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
                              <option
                                key={i}
                                value={typeof r === "object" ? (r.club_role ?? r.name ?? "") : r}
                              >
                                {typeof r === "object" ? (r.club_role ?? r.name ?? "") : r}
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

                      {/* NID */}
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

                      {/* Renewal */}
                      <td>{a.renewal}</td>

                      {/* Year */}
                      <td>{a.year}</td>

                      {/* Genres */}
                      <td>
                        {editingId === a.id ? (
                          <select
                            value={editedAthlete.genres || ""}
                            onChange={(e) => {
                              setEditedAthlete({
                                ...editedAthlete,
                                genres: e.target.value,
                                weight: "",
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
                              setEditedAthlete({
                                ...editedAthlete,
                                categories: e.target.value,
                                weight: "",
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

                      {/* License */}
                      <td>{a.license_number}</td>

                      {/* Registration */}
                      <td>{a.registration_date}</td>

                      {/* Photos */}
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

                      {/* Confirmation */}
                      <td>{a.confirmation ? "✅" : "❌"}</td>
                      {/* conf_Request */}
                      <td>{a.confirmation_request ? "conf_request" : "conf_Not_request"}</td>

                      {/* Club ID */}
                      <td>{a.club_id}</td>

                      {/* League ID */}
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
                           <button
                              className={a.confirmation ? "cancel-btn" : "confirm-btn"}
                              disabled={(a.confirmation_request ? "conf_request" : "conf_Not_request") !== "conf_request"}
                              onClick={() => {
                                if ((a.confirmation_request ? "conf_request" : "conf_Not_request") !== "conf_request") {
                                  setError("you not confirme because is not requested");
                                  return;
                                }
                                toggleAthleteConfirmation(a.id, a.confirmation);
                              }}
                            >
                              {a.confirmation ? "Cancel Confirmation" : "Confirm"}
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
							  <BackHomeButton />
								<button className="primary-b"
									onClick={handleGeneralPDFExport}
									
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

      {/* Error and Success Overlays */}
      {error && (
        <ErrorOverlay
          error={error.message || error}
          onClose={() => setError("")}
        />
      )}
      {success && (
        <SuccessOverlay
          success={success}
          onClose={() => setSuccess("")}
        />
      )}
      {circleLoading && <CircleLoading message="Processing athlete data..." />}

      {/* NAVIGATION */}
      <Navigation />

      {/* FOOTER */}
      <footer className="footer" style={{ backgroundColor: "red" }}>
        <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
      </footer>
    </div>
  );
}
