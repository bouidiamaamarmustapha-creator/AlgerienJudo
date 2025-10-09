import { useNavigate } from "react-router-dom";

    export default function BackHomeButton() {
      const navigate = useNavigate();

      return (
        <button className="secondary-btn" onClick={() => navigate("/")}>
          Back to Home
        </button>
      );
    }
