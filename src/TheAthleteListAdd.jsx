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
import QRCode from 'qrcode';
import { useDragScroll } from './useDragScroll';
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from './components/BarLoading';


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
          .eq("league_id", selectedLeague);
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
      
      // Add athlete
      const handleSubmit = async (e) => {
        e.preventDefault();
				setError("");
        setSuccess("");
				
        // validation
        if (!/^\d{18}$/.test(nid)) {
          alert("National ID Number must be exactly 18 digits (numbers only).");
          return;
        }
        if (password !== confirmPassword) {
          alert("Passwords do not match.");
          return;
        }
         if (!selectedLeague || !selectedClub) {
		    setError("Club and League must be set before adding a member.");
		    return;
		  		}
				if (
			    !firstName || !lastName || !dob || !pob ||
			    !roleId || !password || !confirmPassword
			  ) {
			    setError("Please fill in all required fields.");
			    return;
			  }

        // validate age for selected category
        const ageValidation = validateCategoryAge(dob, categories);
        if (!ageValidation.isValid) {
          setError(ageValidation.message);
          return;
        }

        // Renewal validation: Check if athlete exists and validate NID consistency for the same year
        const currentYear = new Date().getFullYear();
        const year = `${currentYear}/${currentYear + 1}`;
        
        try {
          // Check if there's already an athlete with this NID in the current year
          const { data: existingInCurrentYear, error: currentYearError } = await supabase
            .from("athletes")
            .select("id, first_name, last_name, national_id_number")
            .eq("national_id_number", nid)
            .eq("year", year);
          
          if (currentYearError) {
            throw currentYearError;
          }
          
          if (existingInCurrentYear && existingInCurrentYear.length > 0) {
            setError("An athlete with this National ID is already registered for this season.");
            return;
          }
          
          // Check if this athlete (by name) exists with a different NID in the current year
          const { data: existingByName, error: nameError } = await supabase
            .from("athletes")
            .select("id, first_name, last_name, national_id_number")
            .eq("first_name", firstName)
            .eq("last_name", lastName)
            .eq("year", year);
          
          if (nameError) {
            throw nameError;
          }
          
          if (existingByName && existingByName.length > 0) {
            const existingAthlete = existingByName[0];
            if (existingAthlete.national_id_number !== nid) {
              setError(`Athlete ${firstName} ${lastName} is already registered for this season with a different National ID (${existingAthlete.national_id_number}). Please use the same National ID for renewal.`);
              return;
            }
          }
          
        } catch (err) {
          setError(err.message || String(err));
          return;
        }

        try {
          setLoading(true);
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
            league_id: selectedLeague,
  					club_id: selectedClub,
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

            // refresh athletes table
            await fetchData();
          }
        } catch (err) {
          console.error("handleSubmit error", err);
          alert("Unexpected error: " + err.message);
        } finally {
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

        // Renewal validation for editing: Check if athlete name change conflicts with existing NID
        const currentYear = new Date().getFullYear();
        const year = `${currentYear}/${currentYear + 1}`;
        
        try {
          // Check if this athlete (by new name) exists with a different NID in the current year
          const { data: existingByName, error: nameError } = await supabase
            .from("athletes")
            .select("id, first_name, last_name, national_id_number")
            .eq("first_name", editedAthlete.first_name)
            .eq("last_name", editedAthlete.last_name)
            .eq("year", year)
            .neq("id", editingId); // Exclude the current athlete being edited
          
          if (nameError) {
            alert("Error checking athlete data: " + nameError.message);
            return;
          }
          
          if (existingByName && existingByName.length > 0) {
            const existingAthlete = existingByName[0];
            if (existingAthlete.national_id_number !== editedAthlete.national_id_number) {
              alert(`Athlete ${editedAthlete.first_name} ${editedAthlete.last_name} is already registered for this season with a different National ID (${existingAthlete.national_id_number}). Please use the same National ID for renewal.`);
              return;
            }
          }
          
        } catch (err) {
          alert("Error validating renewal: " + (err.message || String(err)));
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
          alert("Update failed: " + error.message);
        } else {
          // refresh list
          await fetchData();
          cancelEdit();
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
    const term = searchTerm.toLowerCase();
    return (
      a.first_name.toLowerCase().includes(term) ||
      a.last_name.toLowerCase().includes(term) ||
      a.national_id_number.includes(term)
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
    let startY = 45;
    if (data.photos_url) {
      try {
        doc.addImage(data.photos_url, 'PNG', 14, 45, 25, 20);
        startY = 70;
      } catch (error) {
        console.error('Error adding photo to PDF:', error);
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
      headStyles: { fillColor: [220, 53, 69] },
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
        width: 120,
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
    doc.save(`athlete_${data.first_name}_${data.last_name}.pdf`);
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

    // Add table
    autoTable(doc, {
      head: [['Last', 'First', 'DOB', 'POB', 'Role', 'Blood', 'NID', 'Nationality', 'Grade', 'Renewal', 'Year', 'Gender', 'Category', 'Weight', 'License #', 'Registration', 'Confirmed', 'Club', 'League']],
      body: tableData,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [220, 53, 69] },
      styles: { fontSize: 8 },
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
    const currentYear = new Date().getFullYear();

    // Helper function to add federation header
    const addFederationHeader = () => {
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Algerian Judo Federation', 14, 15);

      doc.setFontSize(14);
      doc.text(`Year: ${currentYear}`, 14, 25);

      if (federationLogo) {
        try {
          doc.addImage(federationLogo, 'PNG', 250, 10, 25, 25);
        } catch (error) {
          console.error('Error adding logo to PDF:', error);
        }
      }

      doc.setFontSize(16);
      doc.text('Athletes List - Hierarchical by Category', 14, 35);
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

    // Create hierarchical data structure: Category > Gender > Weight
    const hierarchicalData = filteredAthletes.reduce((acc, athlete) => {
      const category = athlete.categories || 'Uncategorized';
      const gender = athlete.genres || 'Unspecified';
      const weight = athlete.weight || 'No Weight';

      if (!acc[category]) acc[category] = {};
      if (!acc[category][gender]) acc[category][gender] = {};
      if (!acc[category][gender][weight]) acc[category][gender][weight] = [];

      acc[category][gender][weight].push(athlete);
      return acc;
    }, {});

    // Helper function to prepare athlete data for table
    const prepareAthleteData = (athletes) => {
      return athletes.map((athlete) => [
        athlete.last_name || '',
        athlete.first_name || '',
        athlete.date_of_birth || '',
        athlete.national_id_number || '',
        athlete.nationality || '',
        athlete.grade || '',
        athlete.license_number || '',
        athlete.confirmation ? 'Yes' : 'No',
        clubNames[athlete.club_id] || `Club ID: ${athlete.club_id}`,
        leagueNames[athlete.league_id] || `League ID: ${athlete.league_id}`
      ]);
    };

    let currentY = 45;
    let isFirstPage = true;

    // Process hierarchical data
    Object.entries(hierarchicalData).forEach(([category, genders]) => {
      // Add category header
      if (!isFirstPage) {
        doc.addPage();
        addFederationHeader();
        currentY = 45;
      }
      isFirstPage = false;

      doc.setFontSize(16);
      doc.setTextColor(220, 53, 69);
      doc.text(`CATEGORY: ${category}`, 14, currentY);
      currentY += 15;

      Object.entries(genders).forEach(([gender, weights]) => {
        // Add gender header with indentation
        doc.setFontSize(14);
        doc.setTextColor(0, 123, 255);
        doc.text(`  Gender: ${gender}`, 20, currentY);
        currentY += 10;

        Object.entries(weights).forEach(([weight, athletes]) => {
          // Add weight header with more indentation
          doc.setFontSize(12);
          doc.setTextColor(40, 167, 69);
          doc.text(`    Weight: ${weight}`, 30, currentY);
          currentY += 5;

          // Check if we need a new page
          if (currentY > 180) {
            doc.addPage();
            addFederationHeader();
            currentY = 45;
            
            // Repeat context headers on new page
            doc.setFontSize(14);
            doc.setTextColor(220, 53, 69);
            doc.text(`CATEGORY: ${category} (continued)`, 14, currentY);
            currentY += 10;
            doc.setTextColor(0, 123, 255);
            doc.text(`  Gender: ${gender} (continued)`, 20, currentY);
            currentY += 10;
            doc.setTextColor(40, 167, 69);
            doc.text(`    Weight: ${weight} (continued)`, 30, currentY);
            currentY += 5;
          }

          // Add table for this weight class with indentation
          const athleteData = prepareAthleteData(athletes);
          
          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'NID', 'Nationality', 'Grade', 'License #', 'Confirmed', 'Club', 'League']],
            body: athleteData,
            startY: currentY,
            margin: { left: 35 }, // Indent the table
            theme: 'grid',
            headStyles: { 
              fillColor: [40, 167, 69],
              fontSize: 9
            },
            styles: { 
              fontSize: 8,
              cellPadding: 2
            },
            columnStyles: {
              0: { cellWidth: 20 }, // Last Name
              1: { cellWidth: 20 }, // First Name
              2: { cellWidth: 18 }, // DOB
              3: { cellWidth: 25 }, // NID
              4: { cellWidth: 18 }, // Nationality
              5: { cellWidth: 15 }, // Grade
              6: { cellWidth: 20 }, // License #
              7: { cellWidth: 15 }, // Confirmed
              8: { cellWidth: 30 }, // Club
              9: { cellWidth: 30 }  // League
            }
          });

          currentY = doc.lastAutoTable.finalY + 10;
        });
        currentY += 5; // Extra space after gender section
      });
      currentY += 10; // Extra space after category section
    });

    // Save the PDF
    doc.save(`athletes_hierarchical_${currentYear}.pdf`);
  };

  useEffect(() => {
    const timeout = setTimeout(() => { }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);





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
                Last Name
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>

              <label>
                First Name
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>

              <label>
                Date of Birth
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
              </label>

              <label>
                Place of Birth
                <input value={pob} onChange={(e) => setPob(e.target.value)} required />
              </label>

              <label>
                Nationality
                <select value={nationality} onChange={(e) => setNationality(e.target.value)}>
                  <option value="">-- Select --</option>
                  {nationalities.map((n, i) => (
                    <option key={i} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Grade
                <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                  <option value="">-- Select --</option>
                  {grades.map((g, i) => (
                    <option key={i} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Genres
                <select value={genres} onChange={(e) => setGenres(e.target.value)} required>
                  <option value="">-- Select --</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                </select>
              </label>

              <label>
                Categories
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
                Weight
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
                National ID Number
                <input value={nid} onChange={(e) => setNid(e.target.value.replace(/\D/g, ""))} maxLength={18} required />
                <small>18 digits required</small>
              </label>

              <label>
                Blood Type
                <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
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
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>

              <label>
                Confirm Password
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </label>

              {/* club/league selects: prefilled from state if present (disabled) */}
           <label>
            League:
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
            Club:
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
                Upload Athlete Photo
                <input type="file" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
              </label>

              <div className="btn-row">
                <button type="submit" className="primary-b">
                  Save Athlete
                </button>
                <BackHomeButton />
              </div>
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

          {/* PDF Export Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginTop: '10px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleGeneralPDFExport}
              disabled={loading || filteredAthletes.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || filteredAthletes.length === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || filteredAthletes.length === 0 ? 0.6 : 1,
                fontSize: '14px'
              }}
            >
              {loading ? 'Exporting...' : 'Export PDF (General)'}
            </button>
            <button
              onClick={handleCategoryPDFExport}
              disabled={loading || filteredAthletes.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || filteredAthletes.length === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || filteredAthletes.length === 0 ? 0.6 : 1,
                fontSize: '14px'
              }}
            >
              {loading ? 'Exporting...' : 'Export PDF (by Category)'}
            </button>
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
                {athletes.length === 0 ? (
								  <tr>
								    <td colSpan={21}>No athletes found for this club/league.</td>
								  </tr>
								) : (
								  athletes.map((a) => (
								    <tr key={a.id} onClick={() => handleExportPDF(a)} style={{ cursor: 'pointer' }}>
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

                      {/* Club ID */}
                      <td>{a.club_id}</td>

                      {/* League ID */}
                      <td>{a.league_id}</td>

                      {/* Actions */}
                      <td>
                        {editingId === a.id ? (
                          <>
                            <button className="primary-b" onClick={saveEdit}>Save</button>
                            <button className="secondary-btn" onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="primary-b" onClick={() => startEdit(a)}>Modify</button>
                            <button className="secondary-btn" onClick={() => deleteAthlete(a.id)}>Delete</button>
                           <button
											        className={a.confirmation ? "cancel-btn" : "confirm-btn"}
											        onClick={() => toggleAthleteConfirmation(a.id, a.confirmation)}
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

      {/* NAVIGATION */}
      <Navigation />

      {/* FOOTER */}
      <footer className="footer" style={{ backgroundColor: "red" }}>
        <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
      </footer>
    </div>
  );
}
