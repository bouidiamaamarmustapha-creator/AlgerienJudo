import { useNavigate } from "react-router-dom";

export default function TheClubListAddFedButton() {
  const navigate = useNavigate();

  return (
    <button className="primary-btn" onClick={() => navigate("/TheClubListAdd-Fed")}>
      Photos, Logo & Publications
    </button>
  );
}
