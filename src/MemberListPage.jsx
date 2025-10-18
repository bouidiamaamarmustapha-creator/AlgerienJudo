import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Navigation from "./Navigation";
import "./index.css";
import BackHomeButton from "./BackHomeButton";
import logo from "./assets/logo.png"; 
import { Shield, FileDown, Download } from "lucide-react";
import ExportDataButton from "./ExportDataButton";
import ExportRowButton from "./ExportRowButton";
import { useDragScroll } from './useDragScroll';
import ErrorOverlay from './components/ErrorOverlay';
import SuccessOverlay from './components/SuccessOverlay';
import BarLoading from './components/BarLoading';


export default function MemberListPage() {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedMember, setEditedMember] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);   // ✅ keep only this one

  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [publications, setPublications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] =
    useState("Algerian Judo Federation");
  const [isGreen, setIsGreen] = useState(true); // State to toggle border color

  const navigate = useNavigate();
  const tableRef = useDragScroll();

  const federationLogoPlaceholder = logo; // reuse your logo import

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

  // Fetch members from Supabase
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("members").select("*");
      if (error) {
        setError(error);
      } else {
        setMembers(data || []);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase.from("federationrole").select("*");
        if (error) {
          console.error("Error fetching roles:", error);
        } else {
          setRoles(data || []);
        }
      } catch (err) {
        console.error("Error fetching roles:", err);
      }
    };

    fetchRoles();
  }, []);

  // Delete member
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) console.error("Error deleting member:", error);
    else setMembers(members.filter((m) => m.id !== id));
  };

  // Enable edit mode
  const handleEdit = (member) => {
    setEditingId(member.id);
    setEditedMember({ ...member });
  };

  // Save changes
  const handleSave = async (id) => {
    const { error } = await supabase
        .from("members")
        .update({
          last_name: editedMember.last_name,
          first_name: editedMember.first_name,
          date_of_birth: editedMember.date_of_birth,
          place_of_birth: editedMember.place_of_birth,
          role_id: editedMember.role_id,
          blood_type: editedMember.blood_type,
          national_id_number: editedMember.national_id_number,
        })
        .eq("id", id);

    if (error) console.error("Error updating member:", error);
    else {
      setMembers(members.map((m) => (m.id === id ? editedMember : m)));
      setEditingId(null);
    }
  };

  // Handle input changes
  const handleChange = (e, field) => {
    setEditedMember({ ...editedMember, [field]: e.target.value });
  };

  const handlePrint = () => {
    window.print();
  };
  
  // Define columns for export
  const exportColumns = [
    { header: 'Role', field: 'role_name' },
    { header: 'Blood Type', field: 'blood_type' },
    { header: 'Last Name', field: 'last_name' },
    { header: 'First Name', field: 'first_name' },
    { header: 'Date of Birth', field: 'date_of_birth' },
    { header: 'Place of Birth', field: 'place_of_birth' },
    { header: 'National ID Number', field: 'national_id_number' },
    { header: 'License Number', field: 'license_number' },
    { header: 'Registration Date', field: 'registration_date' }
  ];

  const prepareExportData = () => {
    return members.map(member => {
      const role = roles.find(r => r.id === member.role_id);
      return {
        ...member,
        role_name: role ? role.federation_role : member.role_id || 'N/A'
      };
    });
  };

  if (error) {
    return <p>Error fetching members: {error.message}</p>;
  }

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
        <h2>Member List</h2>
        <div className="table-container" ref={tableRef}>
          <table className="athlete-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Blood Type</th>
              <th>Last Name</th>
              <th>First Name</th>
              <th>Date of Birth</th>
              <th>Place of Birth</th>
              <th>National ID Number</th>
              <th>License Number</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  {editingId === member.id ? (
                    <select
                      value={editedMember.role_id || ""}
                      onChange={(e) =>
                        setEditedMember({ ...editedMember, role_id: e.target.value })
                      }
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.federation_role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    (() => {
                      const role = roles.find(r => r.id === member.role_id);
                      return role ? role.federation_role : member.role_id || 'N/A';
                    })()
                  )}
                </td>
                <td>
                  {editingId === member.id ? (
                    <input
                      value={editedMember.blood_type || ""}
                      onChange={(e) => handleChange(e, "blood_type")}
                    />
                  ) : (
                    member.blood_type
                  )}
                </td>
                <td>
                  {editingId === member.id ? (
                    <input
                      value={editedMember.last_name || ""}
                      onChange={(e) => handleChange(e, "last_name")}
                    />
                  ) : (
                    member.last_name
                  )}
                </td>
                <td>
                  {editingId === member.id ? (
                    <input
                      value={editedMember.first_name || ""}
                      onChange={(e) => handleChange(e, "first_name")}
                    />
                  ) : (
                    member.first_name
                  )}
                </td>
                <td>
                  {editingId === member.id ? (
                    <input
                      type="date"
                      value={editedMember.date_of_birth || ""}
                      onChange={(e) => handleChange(e, "date_of_birth")}
                    />
                  ) : (
                    member.date_of_birth
                  )}
                </td>
                <td>
                  {editingId === member.id ? (
                    <input
                      value={editedMember.place_of_birth || ""}
                      onChange={(e) => handleChange(e, "place_of_birth")}
                    />
                  ) : (
                    member.place_of_birth
                  )}
                </td>
                <td>{member.national_id_number}</td>
                <td>{member.license_number}</td>
                <td>{member.registration_date}</td>
                <td>
                  {editingId === member.id ? (
                    <button className="primary-b" onClick={() => handleSave(member.id)}>
                      Save
                    </button>
                  ) : (
                    <>
                      <button className="primary-b" onClick={() => handleEdit(member)}>
                        Modify
                      </button>
                      <button className="secondary-btn" onClick={() => handleDelete(member.id)}>
                        Delete
                      </button>
                      <ExportRowButton 
                        data={member}
                        title={`Member - ${member.first_name} ${member.last_name}`}
                        buttonText={<FileDown size={16} />}
                        className="ml-1"
                        logoUrl={federationLogo || federationLogoPlaceholder}
                      />
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex items-center justify-between mb-4">
          <BackHomeButton />
          <div className="flex space-x-2">
            
            <ExportDataButton
              data={prepareExportData()}
              title={`${federationName} - Member List`}
              columns={exportColumns}
              filename="federation_members"
              buttonText="Export Data"
              pdfOptions={{
                orientation: 'landscape',
                logoUrl: federationLogo || federationLogoPlaceholder
              }}
            />
          </div>
        </div>
      </section>

      {/* Error Overlay */}
      {error && (
        <ErrorOverlay
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {loading && (
        <div>Loading...</div>
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
