import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import PhotosLogoPublication from "./PhotosLogoPublication";
import { initializePrimaryButtons, handlePrimaryButtonClick } from './primaryButtonHandler';
import { Shield, Megaphone, Plus, Save, ArrowLeft, Edit, Trash2, Circle, Upload, Link as LinkIcon, FileText } from "lucide-react";
import { supabase } from "./supabaseClient";
import logo from "./assets/logo.png"; 
import { useDragScroll } from './useDragScroll';
import ErrorOverlay from './components/ErrorOverlay';
import BarLoading from './components/BarLoading';
import { loadCircleButtons, saveCircleButtons } from './ConfigService';

export default function PhotosLogoPublicationPage() {
  // Initialize active state for primary buttons
  useEffect(() => {
    initializePrimaryButtons();
  }, []);
  const { state } = useLocation();
      // ------------------- STATE -------------------
      const [logoFile, setLogoFile] = useState(null);
      const [logoUrl, setLogoUrl] = useState(null);

      const [photos, setPhotos] = useState([]);
      const [publications, setPublications] = useState([]);
      const [publica, setPublica] = useState([]);

      // Form states
      const [photoFile, setPhotoFile] = useState(null);
      const [publicationFile, setPublicationFile] = useState(null);
      const [publicaFile, setPublicaFile] = useState(null);

      const [title, setTitle] = useState("");
      const [description, setDescription] = useState("");

      const [publicaTitle, setPublicaTitle] = useState("");
      const [publicaDescription, setPublicaDescription] = useState("");

      const [publicationsTitle, setPublicationsTitle] = useState("");
      const [publicationsDescription, setPublicationsDescription] =
        useState("");

      const [logos, setLogos] = useState([]);

      const [loading, setLoading] = useState(true);
      const [error, setError] = useState("");

      // Debug loading state changes
      useEffect(() => {
        console.log('📊 Loading state changed to:', loading);
        if (loading) {
          console.log('🔄 BarLoading should be visible now');
        } else {
          console.log('✅ BarLoading should be hidden now');
        }
      }, [loading]);

      const [currentIndex, setCurrentIndex] = useState(0);

      // Drag scroll refs for multiple tables
      const logosTableRef = useDragScroll();
      const photosTableRef = useDragScroll();
      const publicationsTableRef = useDragScroll();
      const publicaTableRef = useDragScroll();
      const [federationLogo, setFederationLogo] = useState(null);
      const [federationName] = useState("Algerian Judo Federation");
      const [isGreen] = useState(true); // State to toggle border color

      const navigate = useNavigate();
      const [newAnnouncement, setNewAnnouncement] = useState('');
      const [bannerAnnouncements, setBannerAnnouncements] = useState([]);
      const [editingIndex, setEditingIndex] = useState(null);
      const [editingText, setEditingText] = useState('');

      // ✅ Circle Button Management State
      const [circleButtons, setCircleButtons] = useState([
        {
          id: 1,
          title: 'Official Website',
          description: 'Visit our main website',
          image: '',
          link: 'https://example.com',
          type: 'website'
        },
        {
          id: 2,
          title: 'Rules PDF',
          description: 'Download competition rules',
          image: '',
          link: '',
          type: 'pdf'
        },
        {
          id: 3,
          title: 'Training Center',
          description: 'Find training locations',
          image: '',
          link: 'https://maps.google.com',
          type: 'website'
        },
        {
          id: 4,
          title: 'Registration Form',
          description: 'Download registration form',
          image: '',
          link: '',
          type: 'pdf'
        },
        {
          id: 5,
          title: 'Contact Us',
          description: 'Get in touch with us',
          image: '',
          link: 'mailto:contact@judoalgeria.com',
          type: 'website'
        }
      ]);
      const [editingButtonIndex, setEditingButtonIndex] = useState(null);
      const [buttonImageFile, setButtonImageFile] = useState(null);
   

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

      // ✅ Load announcements from localStorage on component mount
      useEffect(() => {
        try {
          const savedAnnouncements = localStorage.getItem('algerian_judo_banner_announcements');
          if (savedAnnouncements) {
            const parsedAnnouncements = JSON.parse(savedAnnouncements);
            setBannerAnnouncements(parsedAnnouncements);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des annonces:', error);
        }
      }, []);

      // ✅ Fetch existing photos from DB
      const fetchPhotos = async () => {
        const { data, error } = await supabase
          .from("pub")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error) setPhotos(data);
      };

      // ✅ Delete photo
      const handleDeletePhoto = async (id) => {
        const { error } = await supabase.from("pub").delete().eq("id", id);
        if (!error) fetchPhotos();
      };



      // ✅ FETCH PUBLICATIONS
      const fetchPublications = async () => {
        const { data, error } = await supabase
          .from("publications")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error) setPublications(data);
      };

      // ✅ FETCH PUBLICA
      const fetchPublica = async () => {
        const { data, error } = await supabase
          .from("publica")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error) setPublica(data);
      };

      // Fetch all logos
      const fetchLogos = async () => {
        const { data, error } = await supabase
          .from("logo")
          .select("*")
          .order("id", { ascending: false });
        if (!error) setLogos(data);
      };

      // Upload logo
      const handleLogoUpload = async () => {
        if (!logoFile) {
          alert("Please select a logo first.");
          return;
        }

        setLoading(true);
        const fileName = `logo-${Date.now()}-${logoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("publications")
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) {
          alert("Upload failed: " + uploadError.message);
          setLoading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("publications")
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from("logo")
          .insert([{ logo_url: urlData.publicUrl }]);
        if (insertError) {
          alert("Failed to save to DB: " + insertError.message);
          setLoading(false);
          return;
        }

        setLogoFile(null);
        fetchLogos(); // refresh table
        setLoading(false);
      };

      // Delete logo
      const handleDeleteLogo = async (id) => {
        const { error } = await supabase.from("logo").delete().eq("id", id);
        if (error) alert("Error deleting logo: " + error.message);
        else fetchLogos();
      };

      // Make sure to call fetchLogos in useEffect
      useEffect(() => {
        const loadInitialData = async () => {
          console.log('🚀 Starting to load initial data...');
          const startTime = Date.now();
          
          try {
            console.log(' Fetching all data...');
            await Promise.all([
              fetchLogos(),
              fetchPhotos(),
              fetchPublications(),
              fetchPublica()
            ]);
            const endTime = Date.now();
            console.log(`✅ All data loaded successfully in ${endTime - startTime}ms`);
          } catch (error) {
            console.error('❌ Error loading data:', error);
            setError('Failed to load data. Please try again.');
          } finally {
            console.log('🏁 Setting loading to false');
            setLoading(false);
          }
        };
        
        loadInitialData();
      }, []);

      // ✅ Save Publication (to publications table)
      const handleSavePublication = async () => {
        if (!publicationFile) {
          alert("Please choose an image for publication.");
          return;
        }
        setLoading(true);
        const fileName = `publication-${Date.now()}-${publicationFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("publications")
          .upload(fileName, publicationFile, { upsert: true });

        if (uploadError) {
          alert("Publication upload failed: " + uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("publications")
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from("publications")
          .insert([
            {
              title: publicationsTitle,
              description: publicationsDescription,
              photo_url: urlData.publicUrl,
            },
          ]);

        if (insertError) {
          alert("Insert failed: " + insertError.message);
          setLoading(false);
          return;
        }

        setPublicationFile(null);
        setTitle("");
        setDescription("");
        fetchPublications();
        setLoading(false);
      };

      // ✅ Save Publica (to publica table)
      const handleSavePublica = async () => {
        if (!publicaFile) {
          alert("Please choose an image for publica.");
          return;
        }
        setLoading(true);
        const fileName = `publica-${Date.now()}-${publicaFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("publications")
          .upload(fileName, publicaFile, { upsert: true });

        if (uploadError) {
          alert("Publica upload failed: " + uploadError.message);
          setLoading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("publications")
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase.from("publica").insert([
          {
            title: publicaTitle,
            description: publicaDescription,
            photo_url: urlData.publicUrl,
          },
        ]);

        if (insertError) {
          alert("Insert failed: " + insertError.message);
          setLoading(false);
          return;
        }

        setPublicaFile(null);
        setPublicaTitle("");
        setPublicaDescription("");
        fetchPublica();
        setLoading(false);
      };

      // ✅ Delete Publication
      const handleDeletePublication = async (id) => {
        const { error } = await supabase
          .from("publications")
          .delete()
          .eq("id", id);
        if (!error) fetchPublications();
      };

      // ✅ Delete Publica
      const handleDeletePublica = async (id) => {
        const { error } = await supabase.from("publica").delete().eq("id", id);
        if (!error) fetchPublica();
      };

      // ✅ Update banner announcements
      const onUpdateBannerAnnouncements = (updatedAnnouncements) => {
        setBannerAnnouncements(updatedAnnouncements);
      };

  const handleAddAnnouncement = () => {
    if (newAnnouncement.trim()) {
      const updatedAnnouncements = [...bannerAnnouncements, newAnnouncement.trim()];
      onUpdateBannerAnnouncements(updatedAnnouncements);
      // Sauvegarde immédiate dans localStorage
      try {
        localStorage.setItem('algerian_judo_banner_announcements', JSON.stringify(updatedAnnouncements));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des annonces:', error);
      }
      setNewAnnouncement('');
      // Pas d'alerte - ajout silencieux
    }
  };

  const handleDeleteAnnouncement = (index) => {
    const updatedAnnouncements = bannerAnnouncements.filter((_, i) => i !== index);
    onUpdateBannerAnnouncements(updatedAnnouncements);
    // Sauvegarde immédiate dans localStorage
    try {
      localStorage.setItem('algerian_judo_banner_announcements', JSON.stringify(updatedAnnouncements));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des annonces:', error);
    }
    // Pas d'alerte - suppression silencieuse
  };

  const handleEditAnnouncement = (index) => {
    setEditingIndex(index);
    setEditingText(bannerAnnouncements[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingText.trim()) {
      const updatedAnnouncements = [...bannerAnnouncements];
      updatedAnnouncements[editingIndex] = editingText.trim();
      onUpdateBannerAnnouncements(updatedAnnouncements);
      // Sauvegarde immédiate dans localStorage
      try {
        localStorage.setItem('algerian_judo_banner_announcements', JSON.stringify(updatedAnnouncements));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des annonces:', error);
      }
      setEditingIndex(null);
      setEditingText('');
      // Pas d'alerte - modification silencieuse
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  // ✅ Circle Button Management Functions
  const handleUpdateCircleButton = (index, field, value) => {
    const updatedButtons = [...circleButtons];
    updatedButtons[index][field] = value;
    setCircleButtons(updatedButtons);
    // Save to localStorage
    try {
      localStorage.setItem('algerian_judo_circle_buttons', JSON.stringify(updatedButtons));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des boutons:', error);
    }
    // Persist to Supabase (best-effort)
    saveCircleButtons(updatedButtons);
  };

  const handleButtonImageUpload = async (index, file) => {
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `circle-button-${index}-${Date.now()}.${fileExt}`;
      const filePath = `circle-buttons/${fileName}`;

      const { data, error } = await supabase.storage
        .from('publications')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('publications')
        .getPublicUrl(filePath);

      handleUpdateCircleButton(index, 'image', publicUrl);
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'image:', error);
      alert('Erreur lors du téléchargement de l\'image: ' + error.message);
    }
  };

  const handlePdfUpload = async (index, file) => {
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `circle-button-pdf-${index}-${Date.now()}.${fileExt}`;
      const filePath = `pdfs/${fileName}`;

      const { data, error } = await supabase.storage
        .from('publications')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('publications')
        .getPublicUrl(filePath);

      handleUpdateCircleButton(index, 'link', publicUrl);
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      alert('Erreur lors du téléchargement du PDF: ' + error.message);
    }
  };

  // Load circle buttons from Supabase (with local fallback) on mount
  useEffect(() => {
    (async () => {
      try {
        const buttons = await loadCircleButtons();
        if (buttons && buttons.length > 0) {
          setCircleButtons(buttons);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des boutons:', error);
      }
    })();
  }, []);

  return (
        <>
          {loading && <BarLoading />}
          <section className="app-container">
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
            <section className="content">
              <h2>Welcome to the Federation Account</h2>
              <p>This is the Federation Account page.</p>
              <div className="sticky-button-bar">
                <BackHomeButton />
                <PhotosLogoPublication data-id="1" onLoadingStart={() => setLoading(true)} />
                <button className="primary-btn" data-id="2" onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/MemberListPageP"); }}>
                  The Member List Add
                </button>
                <button
                  className="primary-btn"
                  data-id="3"
                  onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheLeagueList-Add"); }}
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

              <div className="table-container" ref={logosTableRef}>
                <table className="athlete-table">
                  <thead>
                    <tr>
                      <th>Logo</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logos.length > 0 ? (
                      logos.map((l) => (
                        <tr key={l.id}>
                          <td>
                            {l.logo_url ? (
                              <img src={l.logo_url} alt="Logo" width="80" />
                            ) : (
                              "No logo"
                            )}
                          </td>
                          <td>
                            <button
                              className="primary-b"
                              onClick={() => handleDeleteLogo(l.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2">No logos found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="form-grid">
                <input
                  type="file"
                  onChange={(e) => setLogoFile(e.target.files[0])}
                />
                <button className="primary-b" onClick={handleLogoUpload}>
                  Upload Logo
                </button>
              </div>
              {/* Publications Table */}
              <h2>Update Federation Publication</h2>
              <div className="table-container" ref={publicationsTableRef}>
                <table className="athlete-table">
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Title</th>
                      <th>Description</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publications.length > 0 ? (
                      publications.map((p) => (
                        <tr key={p.id}>
                          <td>
                            {p.photo_url ? (
                              <img src={p.photo_url} alt={p.title} width="80" />
                            ) : (
                              "No photo"
                            )}
                          </td>
                          <td>{p.title}</td>
                          <td>{p.description}</td>
                          <td>{new Date(p.created_at).toLocaleString()}</td>
                          <td>
                            <button
                              className="primary-b"
                              onClick={() => handleDeletePublication(p.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">No publications found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Form to add new publication */}
              <div className="form-grid" style={{ marginTop: "1rem" }}>
                <input
                  type="file"
                  onChange={(e) => setPublicationFile(e.target.files[0])}
                />
                <input
                  type="text"
                  placeholder="Title"
                  value={publicationsTitle}
                  onChange={(e) => setPublicationsTitle(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={publicationsDescription}
                  onChange={(e) =>
                    setPublicationsDescription(e.target.value)
                  }
                />
                <button className="primary-b" onClick={handleSavePublication}>
                  Save Publication
                </button>
              </div>
              <h2>Federation Photos</h2>
              <div className="table-container" ref={photosTableRef}>
                <table className="athlete-table">
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {photos.length > 0 ? (
                      photos.map((p) => (
                        <tr key={p.id}>
                          <td>
                            {p.photo_url ? (
                              <img src={p.photo_url} alt="photo" width="80" />
                            ) : (
                              "No photo"
                            )}
                          </td>
                          <td>{new Date(p.created_at).toLocaleString()}</td>
                          <td>
                            <button
                              className="primary-b"
                              onClick={() => handleDeletePhoto(p.id, p.photo_url)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3">No photos found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="form-grid">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setPhotoFile(e.target.files[0]);
                      console.log("✅ File selected:", e.target.files[0].name);
                    }
                  }}
                />
                <button
                  className="primary-b"
                  onClick={async () => {
                    if (!photoFile) {
                      alert("⚠️ Please select a photo first.");
                      return;
                    }

                    console.log(" Uploading file:", photoFile.name);

                    const fileName = `photos/pub-${Date.now()}-${photoFile.name}`;

                    const { error: uploadError } = await supabase.storage
                      .from("publications")
                      .upload(fileName, photoFile, {
                        upsert: true,
                      });

                    if (uploadError) {
                      alert("Upload failed: " + uploadError.message);
                      return;
                    }

                    const { data: urlData } = supabase.storage
                      .from("publications")
                      .getPublicUrl(fileName);

                    const { error: insertError } = await supabase
                      .from("pub")
                      .insert([{ photo_url: urlData.publicUrl }]);

                    if (insertError) {
                      alert("Failed to save to DB: " + insertError.message);
                      return;
                    }

                    alert("Photo uploaded successfully!");
                    setPhotoFile(null);
                    fetchPhotos();
                  }}
                >
                  Save Photo
                </button>
              </div>
              <h2>PUBLICA UPLOAD (Add New Publication)</h2>
              <div className="table-container" ref={publicaTableRef}>
                <table className="athlete-table">
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Title</th>
                      <th>Description</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publica.length > 0 ? (
                      publica.map((p) => (
                        <tr key={p.id}>
                          <td>
                            {p.photo_url ? (
                              <img src={p.photo_url} alt={p.title} width="80" />
                            ) : (
                              "No photo"
                            )}
                          </td>
                          <td>{p.title}</td>
                          <td>{p.description}</td>
                          <td>{new Date(p.created_at).toLocaleString()}</td>
                          <td>
                            <button
                              className="primary-b"
                              onClick={() => handleDeletePublica(p.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">No publica entries found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="form-grid">
                <input
                  type="file"
                  onChange={(e) => setPublicaFile(e.target.files[0])}
                />
                <input
                  type="text"
                  placeholder="Title"
                  value={publicaTitle}
                  onChange={(e) => setPublicaTitle(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={publicaDescription}
                  onChange={(e) => setPublicaDescription(e.target.value)}
                />
                <button className="primary-b" onClick={handleSavePublica}>
                  Save Publica
                </button>
              </div>
            </section>
            <div className="form-grid">
             {/* Gestion des annonces publicitaires */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Megaphone className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">Gestion des Annonces Publicitaires</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouvelle annonce
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    className="w-full px-24 py-6 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 focus:border-purple-500 text-xl font-medium shadow-lg"
                    placeholder=" Your ad here announcement..."
                    style={{ minWidth: '600px', width: '100%' }}
                  />
                  <div className="flex justify-center">
                    <button className="primary-b px-8 py-4 text-lg font-semibold rounded-xl shadow-lg"
                      onClick={handleAddAnnouncement}
                      
                    >
                      <Plus className="w-6 h-6 mr-2" />
                      Ajouter l'annonce
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              <h3 className="font-semibold text-gray-800 mb-3">Annonces actuelles :</h3>
              {bannerAnnouncements.map((announcement, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <div className="flex space-x-2">
                        <button className="primary-S"
                          onClick={handleSaveEdit}
                          
                        >
                          <Save className="w-3 h-3" />
                          Sauvegarder
                        </button>
                        <button  className="secondary-btn"
                          onClick={handleCancelEdit}
                          
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex-1 mr-3">{announcement}</span>
                      <div className="flex space-x-1">
                        <button  className="primary-S"
                          onClick={() => handleEditAnnouncement(index)}
                          >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button className="secondary-btn"
                          onClick={() => handleDeleteAnnouncement(index)}
                          
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          </div>
           <div className="form-grid">
          {/* Gestion des boutons circulaires 3D */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Circle className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">Gestion des Boutons Circulaires 3D</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {circleButtons.map((button, index) => (
                <div key={button.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titre
                      </label>
                      <input
                        type="text"
                        value={button.title}
                        onChange={(e) => handleUpdateCircleButton(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Titre du bouton"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={button.description}
                        onChange={(e) => handleUpdateCircleButton(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Description du bouton"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={button.type}
                        onChange={(e) => handleUpdateCircleButton(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="website">Site Web</option>
                        <option value="pdf">Fichier PDF</option>
                      </select>
                    </div>

                    {button.type === 'website' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <LinkIcon className="w-4 h-4 inline mr-1" />
                          Lien du site web
                        </label>
                        <input
                          type="url"
                          value={button.link}
                          onChange={(e) => handleUpdateCircleButton(index, 'link', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://example.com"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <FileText className="w-4 h-4 inline mr-1" />
                          Fichier PDF
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              handlePdfUpload(index, file);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {button.link && (
                          <p className="text-xs text-green-600 mt-1">
                            PDF téléchargé avec succès
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Upload className="w-4 h-4 inline mr-1" />
                        Image du bouton
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handleButtonImageUpload(index, file);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {button.image && (
                        <div className="mt-2">
                          <img
                            src={button.image}
                            alt={button.title}
                            className="w-16 h-16 object-cover rounded-full border-2 border-gray-300"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
         </div>

          </section>
          {/* NAVIGATION */}
          <Navigation />
          {/* FOOTER */}
          <footer className="footer">
            <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
          </footer>
        </>
      );
    }
