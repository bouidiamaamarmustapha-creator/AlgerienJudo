import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import { Shield } from "lucide-react";
import { supabase } from "./supabaseClient";
import PhotosLogoPublication from "./PhotosLogoPublication";
import logo from "./assets/logo.png";
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from './components/BarLoading';


export default function FederationPage() {
  const [publications, setPublications] = useState([]);
  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] = useState("Algerian Judo Federation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();
  const federationLogoPlaceholder = logo;

  // ✅ Fetch publications from Supabase
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

  // ✅ Fetch latest federation logo from Supabase
  useEffect(() => {
    const fetchLatestLogo = async () => {
      const { data, error } = await supabase
        .from("logo")
        .select("logo_url")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setFederationLogo(data[0].logo_url);
      }
    };

    fetchLatestLogo();
  }, []);

  return (
    <div className="app-container">
      <header className="bg-white text-gray-800 p-6 shadow-lg border-b-4 border-red-500">{/* HEADER */}
        <div className="container mx-auto">
          <div className="federation-header">
            {federationLogo ? (
              <img
                src={federationLogo}
                alt="Logo Fédération"
                className="federation-logo"
              />
            ) : (
              <img
                src={federationLogoPlaceholder}
                alt="Logo Fédération"
                className="federation-logo"
              />
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
          <PhotosLogoPublication onLoadingStart={() => setLoading(true)} />
          <button
            className="primary-btn"
            onClick={() => {
              setLoading(true);
              navigate("/MemberListPageP");
            }}
          >
            The Member List Add
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              setLoading(true);
              navigate("/TheClubListAdd-Fed");
            }}
          >
            The Club List Add
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              setLoading(true);
              navigate("/TheAthleteList-Add");
            }}
          >
            The Athlete List Add
          </button>
        </div>
      </section>

      {/* Transparent Error/Success Overlay System */}
      {error && (
        <ErrorOverlay 
          message={error} 
          onClose={() => setError("")} 
        />
      )}
      {success && (
        <SuccessOverlay 
          message={success} 
          onClose={() => setSuccess("")} 
        />
      )}

      {loading && <BarLoading />}

      {/* NAVIGATION */}
      <Navigation />

      {/* FOOTER */}
      <footer className="footer" style={{ backgroundColor: "red" }}>
        <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
      </footer>
    </div>
  );
}
