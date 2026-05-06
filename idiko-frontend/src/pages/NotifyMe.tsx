import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRecords } from "../context/RecordContext";

export default function NotifyMe() {
  const { addNotifyRequest } = useRecords();
  const location = useLocation();
  const navigate = useNavigate();

  const prefilled = (location.state as any)?.formData || {};
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    fullName: prefilled.fullName || "",
    idNumber: prefilled.idNumber || "",
    dob: prefilled.dob || "",
    sex: prefilled.sex || "",
    district: prefilled.district || "",
    primaryPhone: "",
    secondaryPhone: "",
    email: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedForm = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      matched: false,
      status: "pending",

      ...form,

      fullName: form.fullName.trim().toUpperCase(),
      idNumber: form.idNumber.replace(/\s+/g, ""),
      primaryPhone: form.primaryPhone.replace(/\s+/g, ""),
      secondaryPhone: form.secondaryPhone.replace(/\s+/g, ""),
      email: form.email.trim().toLowerCase(),

      dob: form.dob.includes("/")
        ? form.dob.split("/").reverse().join("-")
        : form.dob,
    };

    const added = addNotifyRequest(normalizedForm);

    if (!added) {
      alert("⚠️ You already requested notification for this ID.");
      return;
    }

    setSaved(true);
  };

  const containerStyle: React.CSSProperties = {
    color: "white",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    textAlign: "center",
  };

  const formStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    width: "300px",
    gap: "12px",
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #555",
    backgroundColor: "#222",
    color: "white",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "12px",
    marginTop: "10px",
    backgroundColor: "#444",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  };

  const backLinkStyle: React.CSSProperties = {
    marginTop: "15px",
    color: "white",
    textDecoration: "none",
    cursor: "pointer",
    textAlign: "center",
    background: "none",
    border: "none",
    fontSize: "16px",
  };

  if (saved) {
    return (
      <div style={containerStyle}>
        <h1>✅ Notification request saved</h1>
        <button onClick={() => navigate("/find-my-id")} style={backLinkStyle}>
          &lt; Back to Find My ID
        </button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div style={containerStyle}>
        <h1>😞 Sorry, ID not found</h1>
        <button
          style={{ ...buttonStyle, backgroundColor: "green", marginTop: "20px" }}
          onClick={() => setShowForm(true)}
        >
          Notify me if ID found
        </button>
        <button onClick={() => navigate("/find-my-id")} style={backLinkStyle}>
          &lt; Back to Find My ID
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1>Notify Me If ID Found</h1>
      <form style={formStyle} onSubmit={handleSubmit}>
        <input type="text" name="fullName" placeholder="Full Names (as in the ID card)" value={form.fullName} onChange={handleChange} style={inputStyle} readOnly />
        <input type="text" name="idNumber" placeholder="ID Number" value={form.idNumber} onChange={handleChange} style={inputStyle} readOnly />
        <input type="text" name="dob" placeholder="Date of Birth (dd/mm/yyyy)" value={form.dob} onChange={handleChange} style={inputStyle} readOnly />
        <input type="text" name="sex" placeholder="Sex" value={form.sex} onChange={handleChange} style={inputStyle} readOnly />
        <input type="text" name="district" placeholder="District of Birth" value={form.district} onChange={handleChange} style={inputStyle} readOnly />
        <input type="text" name="primaryPhone" placeholder="Primary Phone" value={form.primaryPhone} onChange={handleChange} style={inputStyle} required />
        <input type="text" name="secondaryPhone" placeholder="Secondary Phone" value={form.secondaryPhone} onChange={handleChange} style={inputStyle} />
        <input type="email" name="email" placeholder="Email (optional)" value={form.email} onChange={handleChange} style={inputStyle} />
        <button type="submit" style={{ ...buttonStyle, backgroundColor: "green" }}>Notify Me</button>
        <button type="button" onClick={() => navigate("/find-my-id")} style={backLinkStyle}>
          &lt; Back to Find My ID
        </button>
      </form>
    </div>
  );
}
