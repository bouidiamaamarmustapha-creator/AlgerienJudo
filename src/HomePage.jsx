import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient"; // ✅ load publications
import Navigation from "./Navigation";
import { Shield } from "lucide-react";
import FederationPage from "./FederationPage";
import AthletePage from "./AthletePage";
import AmateurSportsClubPage from "./AmateurSportsClubPage";
import Athlete from "./Athlete";
import BarBoxButton from "./BarBoxButton";
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from './components/BarLoading';
import AnimatedBanner from './AnimatedBanner';
import CircleButton from './CircleButton';
import AthleteB from './AthleteB';
import logo from './assets/logo.png';

export default function HomePage() {
  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [publications, setPublications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] =
    useState("Algerian Judo Federation");
  const [isGreen, setIsGreen] = useState(true); // State to toggle border color
  const [photos, setPhotos] = useState([]);
  const [publica, setPublica] = useState([]); // [ADDED] State for publica
  const [announcements, setAnnouncements] = useState([]); // [ADDED] State for announcements
  const [circleButtons, setCircleButtons] = useState([]); // [ADDED] State for circle buttons
  const autoRotateRef = useRef(null);

  const navigate = useNavigate();
	const [bgImage, setBgImage] = useState("");
	const [fullscreenData, setFullscreenData] = useState(null);

 

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

  useEffect(() => {
    const fetchPhotos = async () => {
      const { data, error } = await supabase
        .from("pub")
        .select("photo_url")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPhotos(data);
      }
    };

    fetchPhotos();
  }, []);

  // ✅ [ADDED] Fetch publica data
  useEffect(() => {
    const fetchPublicaData = async () => {
      const { data, error } = await supabase
        .from("publica")
        .select("title, description, photo_url")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPublica(data);
      }
    };

    fetchPublicaData();
  }, []);

  // ✅ [ADDED] Load announcements from localStorage
  useEffect(() => {
    try {
      const savedAnnouncements = localStorage.getItem('algerian_judo_banner_announcements');
      if (savedAnnouncements) {
        const parsedAnnouncements = JSON.parse(savedAnnouncements);
        setAnnouncements(parsedAnnouncements);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des annonces:', error);
    }
  }, []);

  // ✅ [ADDED] Load circle buttons from localStorage
  useEffect(() => {
    try {
      const savedButtons = localStorage.getItem('algerian_judo_circle_buttons');
      if (savedButtons) {
        const parsedButtons = JSON.parse(savedButtons);
        setCircleButtons(parsedButtons);
      } else {
        // Default buttons if none saved
        setCircleButtons([
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
      }
    } catch (error) {
      console.error('Erreur lors du chargement des boutons:', error);
    }
  }, []);

  // auto-advance carousel
  useEffect(() => {
    if (publications.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % publications.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [publications]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % publications.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + publications.length) % publications.length);
  };
	//this effect to close on Esc or Space
useEffect(() => {
  const handleKey = (e) => {
    if ((e.key === "Escape" || e.code === "Space") && fullscreenData) {
      setFullscreenData(null);
    }
  };
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [fullscreenData]);

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
          
        
          
<div style={{ height: "08rem" }}></div>
          {/* SHOWCASE HERO */}
          <section
         
            id="showcase"
            style={{
  backgroundImage: photos.length > 0
    ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${photos[0].photo_url})`
    : "none",
  backgroundSize: "cover",
  backgroundPosition: "center",
  color: "white",
  padding: "6rem 0",
  textAlign: "center",
  height: "200px",
  boxShadow: "0 15px 35px rgba(0, 0, 0, 0.6), 0 8px 15px rgba(0, 0, 0, 0.3)",
  transform: "perspective(1000px) rotateX(2deg) rotateY(-2deg)",
  transition: "transform 0.5s ease, box-shadow 0.5s ease",
}}
onMouseMove={(e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * 5; // tilt range
  const rotateY = ((x - centerX) / centerX) * -5;
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}}
onMouseLeave={(e) => {
  e.currentTarget.style.transform =
    "perspective(1000px) rotateX(2deg) rotateY(-2deg)";
}}

          >
            <h1>Welcome to the Federation</h1>
            <p>Promoting Judo Excellence in Algeria</p>
          </section>
<div style={{ height: "03rem" }}></div>
          {/* ✅ 3D CIRCLE BUTTONS SECTION */}
          <section >
            <div className="circle-buttons-container">
              {circleButtons.map((button) => (
                <CircleButton
                  key={button.id}
                  title={button.title}
                  description={button.description}
                  image={button.image}
                  link={button.link}
                  type={button.type}
                />
              ))}
            </div>
          </section>

					<div style={{ height: "6rem" }}></div>
            {/* ANIMATED BANNER FOR ANNOUNCEMENTS */}
          {announcements.length > 0 && (
            <AnimatedBanner announcements={announcements} />
          )}
          <div style={{ height: "6rem" }}></div>
         {/* ✅ 3D CAROUSEL SECTION */}
<section
   className="carousel-section"
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
        onMouseMove={(e) => {
          if (!cardRef.current) return;
          const rect = cardRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = (y - centerY) / 10;
          const rotateY = (centerX - x) / 10;
          cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }}
        onMouseLeave={() => {
          if (cardRef.current) {
            cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
          }
        }}
        onMouseDown={(e) => (window.dragStart = e.clientX)}
        onMouseUp={(e) => {
          if (!window.dragStart) return;
          const diff = e.clientX - window.dragStart;
          if (diff > 50) prevSlide();
          if (diff < -50) nextSlide();
          window.dragStart = null;
        }}
        onTouchStart={(e) => (window.touchStart = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (!window.touchStart) return;
        const diff = e.changedTouches[0].clientX - window.touchStart;
        if (diff > 50) prevSlide();
        if (diff < -50) nextSlide();
        window.touchStart = null;
      }}
    >
      <button className="carousel-button left" onClick={prevSlide}>❮</button>
  <div className="carousel-track">
    {publications.map((pub, index) => {
      const offset = (index - currentIndex + publications.length) % publications.length;
      let position = "";

      if (offset === 0) position = "active";
      else if (offset === 1) position = "next";
      else if (offset === publications.length - 1) position = "prev";
      else position = "hidden";

      return (
        <div
  key={pub.id}
  className={`carousel-slide ${position}`}
  onClick={() => {
    if (position === "active") {
      setFullscreenData({
        photo: pub.photo_url,
        title: pub.title,
        description: pub.description
      });
    }
  }}
>
           <img src={pub.photo_url} alt={pub.title} className="carousel-image" />

  {/* ⬇️ TITLE + DESCRIPTION OVERLAY */}
  <div className="carousel-caption">
    <h3>{pub.title}</h3>
    <p>{pub.description}</p>
  </div>
        </div>
      );
    })}
  </div>

  <button className="carousel-button right" onClick={nextSlide}>❯</button>

  {/* ✅ fullscreen overlay wrapped INSIDE section so no JSX error */}
  {fullscreenData && (
    <div
      className="fullscreen-overlay"
      onClick={() => setFullscreenData(null)}
    >
      <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={() => setFullscreenData(null)}>×</button>
        <img src={fullscreenData.photo} alt={fullscreenData.title} className="fullscreen-image" />
        <div className="fullscreen-text">
          <h2>{fullscreenData.title}</h2>
          <p>{fullscreenData.description}</p>
        </div>
      </div>
    </div>
  )}
</section>


<div style={{ height: "50rem" }}></div>
<AthleteB/>
<div style={{ height: "8rem" }}></div>

					
          {/* MOVING IMAGE (Latest Publica) */}
<div className="moving-image-container">
  <div className="moving-image-track">
    {publica.length > 0 ? (
      publica.map((pub, index) => (
        <div key={index} className="moving-image-card">
          <img src={pub.photo_url} alt={pub.title} onError={(e)=>{e.currentTarget.src=logo;}} />
          <div className="moving-image-overlay">
            <h3>{pub.title}</h3>
            <p>{pub.description}</p>
          </div>
        </div>
      ))
    ) : (
      <div className="moving-image-card">
        <img
          src={logo}
          alt="Judo athletes"
        />
        <div className="moving-image-overlay">
          <h3>Welcome to the Federation</h3>
          <p>Promoting Judo Excellence in Algeria</p>
        </div>
      </div>
    )}
  </div>
</div>
					<div style={{ height: "5rem" }}></div>

          <BarBoxButton />

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
          <footer className="footer">
            <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
          </footer>
        </div>
      );
    }
