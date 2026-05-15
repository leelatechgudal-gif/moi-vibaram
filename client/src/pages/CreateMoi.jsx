import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { eventsAPI, transactionsAPI } from "../api/api";
import QrScanner from "./QrScanner";
import { numberToWords } from "../utils/numberToWords";
import { Plus, QrCode, ClipboardList, Gift, Coins, Banknote, Save, User, RefreshCw, Search, ArrowLeft, CalendarPlus } from "lucide-react";

const SEER_FIELDS = [
  { key: "dress", icon: "👗" },
  { key: "thattuVarisai", icon: "🍽️" },
  { key: "jewels", icon: "💍" },
  { key: "marakkal", icon: "🌾" },
  { key: "maalai", icon: "💐" },
  { key: "arisMootai", icon: "🌾" },
  { key: "paathirangal", icon: "🥘" },
  { key: "others", icon: "📦" },
];

const defaultSeer = () =>
  Object.fromEntries(
    SEER_FIELDS.map((f) => [f.key, { value: "", quantity: "", remarks: "" }]),
  );

export default function CreateMoi() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const fixedType = location.state?.fixedType || false;
  const initialType = location.state?.type || "received";

  const [events, setEvents] = useState([]);
  const [showSeer, setShowSeer] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    eventName: "",
    date: new Date().toISOString().slice(0, 10),
    location: "",
  });
  const [eventLoading, setEventLoading] = useState(false);

  const [form, setForm] = useState({
    eventId: "",
    eventName: "",
    initial: "",
    partyName: "",
    fatherName: "",
    motherName: "",
    spouseName: "",
    nickname: "",
    occupation: "",
    location: "",
    street: "",
    mobile: "",
    type: initialType,
    cashAmount: "",
    date: new Date().toISOString().slice(0, 10),
    thaiMama: false,
    labels: "",
    remarks: "",
    amountWordsLang: "en",
  });
  const [seerVarisai, setSeerVarisai] = useState(defaultSeer());

  const [persons, setPersons] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isNewPerson, setIsNewPerson] = useState(true);

  useEffect(() => {
    eventsAPI.getAll().then((res) => setEvents(res.data));
    transactionsAPI.getBalanceSheet().then((res) => setPersons(res.data));
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = persons.filter(
      (p) =>
        p.partyName?.toLowerCase().includes(q) ||
        p.mobile?.includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.spouseName?.toLowerCase().includes(q),
    );
    setSearchResults(results);
  }, [searchQuery, persons]);

  const handleSelectPerson = (p) => {
    setSelectedPerson(p);
    setIsNewPerson(false);
    const latestTx =
      p.transactions && p.transactions.length > 0 ? p.transactions[0] : {};
    setForm((f) => ({
      ...f,
      initial: latestTx.initial || p.initial || "",
      partyName: latestTx.partyName || p.partyName || "",
      mobile: latestTx.mobile || p.mobile || "",
      spouseName: latestTx.spouseName || p.spouseName || "",
      location: latestTx.location || p.location || "",
      fatherName: latestTx.fatherName || "",
      motherName: latestTx.motherName || "",
      nickname: latestTx.nickname || "",
      occupation: latestTx.occupation || "",
      street: latestTx.street || "",
      thaiMama: latestTx.thaiMama || false,
      labels: latestTx.labels
        ? Array.isArray(latestTx.labels)
          ? latestTx.labels.join(", ")
          : latestTx.labels
        : "",
    }));
    setSearchQuery("");
    setSearchResults([]);
  };

  useEffect(() => {
    if (location.state?.party) {
        handleSelectPerson(location.state.party);
    }
  }, [location.state?.party]);

  const handleCreateNewPerson = () => {
    setSelectedPerson(null);
    setIsNewPerson(true);
    setSearchQuery("");
    setSearchResults([]);
    setForm((f) => ({
      ...f,
      initial: "",
      partyName: searchQuery || "",
      mobile: "",
      spouseName: "",
      location: "",
      fatherName: "",
      motherName: "",
      nickname: "",
      occupation: "",
      street: "",
      thaiMama: false,
      labels: "",
    }));
  };

  const onChange = (e) => {
    const name = e.target.name;
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;

    if (name === "eventId" && value) {
      const selectedEvent = events.find((ev) => ev._id === value);
      if (selectedEvent && selectedEvent.date) {
        const formattedDate = new Date(selectedEvent.date).toISOString().slice(0, 10);
        setForm((f) => ({ ...f, [name]: value, date: formattedDate }));
        return;
      }
    }

    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSeerChange = (field, key, value) => {
    setSeerVarisai((s) => ({ ...s, [field]: { ...s[field], [key]: value } }));
  };

  const onQRScan = (data) => {
    try {
      const parsed = JSON.parse(data);
      setForm((f) => ({
        ...f,
        partyName: parsed.name || f.partyName,
        mobile: parsed.mobile || f.mobile,
        location: parsed.location || f.location,
        street: parsed.street || f.street,
      }));
      setShowScanner(false);
    } catch {
      setError("Invalid QR code");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm(t("confirmSaveMoi") || "Confirm saving this Moi entry?")) return;
    if (form.type === "received" && !form.eventId) {
      setError("Please select an event");
      return;
    }
    if (form.type === "paid" && !form.eventName) {
      setError("Please enter event name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        labels: form.labels ? form.labels.split(",").map((l) => l.trim()) : [],
        cashAmount: parseFloat(form.cashAmount) || 0,
        seerVarisai: showSeer
          ? Object.fromEntries(
              Object.entries(seerVarisai).map(([k, v]) => [
                k,
                {
                  value: parseFloat(v.value) || 0,
                  quantity: parseFloat(v.quantity) || 0,
                  remarks: v.remarks,
                },
              ]),
            )
          : undefined,
      };
      await transactionsAPI.create(payload);
      setSuccess("Moi entry saved successfully!");
      setTimeout(() => navigate("/balance-sheet"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setEventLoading(true);
    try {
      const fd = new FormData();
      Object.entries(eventFormData).forEach(([k, v]) => v && fd.append(k, v));
      const res = await eventsAPI.create(fd);
      setEvents([res.data, ...events]);
      setForm({ ...form, eventId: res.data._id });
      setShowEventModal(false);
      setEventFormData({
        eventName: "",
        date: new Date().toISOString().slice(0, 10),
        location: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create event");
    } finally {
      setEventLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} style={{ marginRight: 4 }} /> Back
          </button>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={28} /> {t("createMoi")}</h1>
            <div className="page-subtitle">Add a new Moi entry</div>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm no-print"
          onClick={() => setShowScanner(true)}
        >
          <QrCode size={16} style={{ marginRight: 4 }} /> Scan QR
        </button>
      </div>

      {showScanner && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowScanner(false)}
        >
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><QrCode size={20} /> Scan Party QR Code</div>
            <QrScanner
              onScan={onQRScan}
              onClose={() => setShowScanner(false)}
            />
          </div>
        </div>
      )}

      {showEventModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowEventModal(false)}
        >
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarPlus size={20} /> Create New Event
            </div>
            <form onSubmit={handleEventSubmit} className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Event Name *</label>
                <input
                  className="form-control"
                  value={eventFormData.eventName}
                  onChange={(e) => setEventFormData({ ...eventFormData, eventName: e.target.value })}
                  placeholder="e.g. My Son's Wedding"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Event Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={eventFormData.date || ''}
                  onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (typeof e.target.showPicker === 'function') {
                      try { e.target.showPicker(); } catch (err) {}
                    }
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  className="form-control"
                  value={eventFormData.location}
                  onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                  placeholder="Venue or City"
                />
              </div>
              <div className="flex gap-8" style={{ gridColumn: '1 / -1', marginTop: 16 }}>
                <button type="submit" className="btn btn-primary" disabled={eventLoading}>
                  {eventLoading ? <span className="spinner" /> : "Create Event"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEventModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit}>
        {/* Transaction & Event Details */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={20} /> Transaction Details
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">{t("eventName")} *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {form.type === "received" ? (
                  <>
                    <select
                      className="form-control"
                      name="eventId"
                      value={form.eventId}
                      onChange={onChange}
                      required
                      style={{ flex: 1 }}
                    >
                      <option value="">Select event...</option>
                      {events.map((e) => (
                        <option key={e._id} value={e._id}>
                          {e.eventName} —{" "}
                          {new Date(e.date).toLocaleDateString("en-IN")}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowEventModal(true)}
                      title="Add New Event"
                      style={{ padding: '8px 12px' }}
                    >
                      <Plus size={18} />
                    </button>
                  </>
                ) : (
                  <input
                    className="form-control"
                    name="eventName"
                    value={form.eventName}
                    onChange={onChange}
                    required
                    placeholder="Enter event name (e.g. Raj's Wedding)"
                  />
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t("type")} *</label>
              <select
                className="form-control"
                name="type"
                value={form.type}
                onChange={onChange}
                disabled={fixedType}
              >
                <option value="received">
                  {t("received")} (They gave me)
                </option>
                <option value="paid">{t("paid")} (I gave them)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t("date")}</label>
              <input
                className="form-control"
                name="date"
                type="date"
                value={form.date || ''}
                onChange={onChange}
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof e.target.showPicker === 'function') {
                    try { e.target.showPicker(); } catch (err) {}
                  }
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Banknote size={14} /> Cash {t("amount")} (₹) *</label>
              <input
                className="form-control"
                name="cashAmount"
                type="number"
                min="0"
                value={form.cashAmount}
                onChange={onChange}
                placeholder="0"
                required
              />
              {form.cashAmount && (
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 4,
                    color: "var(--primary)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ textTransform: "capitalize" }}>
                    {numberToWords(form.cashAmount, form.amountWordsLang)}
                  </span>
                  <select
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                    name="amountWordsLang"
                    value={form.amountWordsLang}
                    onChange={onChange}
                  >
                    <option value="en">EN</option>
                    <option value="ta">TA</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="error-msg" style={{ marginTop: 16 }}>
              {error}
            </div>
          )}
          {success && (
            <div className="success-msg" style={{ marginTop: 16 }}>
              {success}
            </div>
          )}

          {!isNewPerson && (
            <div className="flex gap-8" style={{ marginTop: 16 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : <><Save size={16} style={{ marginRight: 6 }} /> {t("save")} Moi</>}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
              >
                {t("cancel")}
              </button>
            </div>
          )}
        </div>

        {/* Personal Detail */}
        <details className="card" style={{ marginBottom: 16 }} open>
          <summary
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              listStyle: "none",
            }}
          >
            <h3 style={{ fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <User size={20} /> Personal Detail
            </h3>
            <div>
              {selectedPerson && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginRight: 12 }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleCreateNewPerson();
                  }}
                >
                  <RefreshCw size={14} style={{ marginRight: 4 }} /> Clear / New Person
                </button>
              )}
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                ▼ Toggle
              </span>
            </div>
          </summary>
          <div style={{ marginTop: 16 }}>
            {!selectedPerson && isNewPerson && (
              <div style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Search size={14} /> Search Existing Person (Name, Mobile, Location, Spouse)
                </label>
                <input
                  className="form-control"
                  placeholder="Start typing to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      marginTop: 8,
                      maxHeight: 250,
                      overflowY: "auto",
                      background: "var(--surface)",
                    }}
                  >
                    {searchResults.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 12,
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        onClick={() => handleSelectPerson(p)}
                        className="hover-bg"
                      >
                        <div>
                          <div
                            style={{ fontWeight: 600, color: "var(--primary)" }}
                          >
                            {p.initial ? `${p.initial} ` : ""}
                            {p.partyName}
                          </div>
                          <div
                            style={{ fontSize: 12, color: "var(--text-muted)" }}
                          >
                            {p.location || "Unknown Location"}{" "}
                            {p.mobile && `• 📞 ${p.mobile}`}{" "}
                            {p.spouseName && `• 💍 ${p.spouseName}`}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 12 }}>
                          <div className="text-success">
                            Paid: ₹{p.totalPaid || 0}
                          </div>
                          <div className="text-primary">
                            Recv: ₹{p.totalReceived || 0}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <div
                    style={{
                      padding: 12,
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    <div className="text-muted mb-8">
                      No person found matching "{searchQuery}"
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleCreateNewPerson}
                    >
                      <Plus size={14} style={{ marginRight: 4 }} /> Create New Person "{searchQuery}"
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedPerson && (
              <div
                style={{
                  background: "var(--glass)",
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 24,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <h4
                      style={{
                        margin: "0 0 4px 0",
                        color: "var(--primary)",
                        fontSize: 18,
                      }}
                    >
                      {selectedPerson.initial
                        ? `${selectedPerson.initial} `
                        : ""}
                      {selectedPerson.partyName}
                    </h4>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {selectedPerson.location}{" "}
                      {selectedPerson.mobile && `• ${selectedPerson.mobile}`}{" "}
                      {selectedPerson.spouseName &&
                        `• Spouse: ${selectedPerson.spouseName}`}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      background: "var(--surface)",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginBottom: 2,
                      }}
                    >
                      Net Balance
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color:
                          selectedPerson.balance >= 0
                            ? "var(--primary)"
                            : "var(--success)",
                      }}
                    >
                      {selectedPerson.balance >= 0
                        ? `+₹${selectedPerson.balance}`
                        : `-₹${Math.abs(selectedPerson.balance)}`}
                    </div>
                  </div>
                </div>

                {selectedPerson.transactions &&
                  selectedPerson.transactions.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 8,
                          color: "var(--text-muted)",
                        }}
                      >
                        Transaction History
                      </div>
                      <div
                        style={{
                          maxHeight: 150,
                          overflowY: "auto",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          background: "var(--surface)",
                        }}
                      >
                        <table
                          className="table"
                          style={{ fontSize: 12, margin: 0 }}
                        >
                          <thead
                            style={{
                              position: "sticky",
                              top: 0,
                              background: "var(--surface)",
                            }}
                          >
                            <tr>
                              <th>Event</th>
                              <th>Type</th>
                              <th>Amount</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPerson.transactions.map((t) => (
                              <tr key={t._id}>
                                <td>
                                  {t.eventId?.eventName || t.eventName || "—"}
                                </td>
                                <td>
                                  <span
                                    className={`badge ${t.type === "received" ? "badge-primary" : "badge-success"}`}
                                    style={{ fontSize: 10 }}
                                  >
                                    {t.type}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  ₹{t.cashAmount}
                                </td>
                                <td className="text-muted">
                                  {new Date(t.date).toLocaleDateString("en-IN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {(isNewPerson || selectedPerson) && (
              <div className="form-grid">
                <div className="form-group" style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: "0 0 80px" }}>
                    <label className="form-label">Initial</label>
                    <input
                      className="form-control"
                      name="initial"
                      value={form.initial}
                      onChange={onChange}
                      placeholder="A."
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">{t("partyName")} *</label>
                    <input
                      className="form-control"
                      name="partyName"
                      value={form.partyName}
                      onChange={onChange}
                      required
                      placeholder="Full name"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Father Name</label>
                  <input
                    className="form-control"
                    name="fatherName"
                    value={form.fatherName}
                    onChange={onChange}
                    placeholder="Father name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mother Name</label>
                  <input
                    className="form-control"
                    name="motherName"
                    value={form.motherName}
                    onChange={onChange}
                    placeholder="Mother name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("spouseName")} *</label>
                  <input
                    className="form-control"
                    name="spouseName"
                    value={form.spouseName}
                    onChange={onChange}
                    required
                    placeholder="Spouse name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("nickname")}</label>
                  <input
                    className="form-control"
                    name="nickname"
                    value={form.nickname}
                    onChange={onChange}
                    placeholder="Nickname"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("occupation")}</label>
                  <input
                    className="form-control"
                    name="occupation"
                    value={form.occupation}
                    onChange={onChange}
                    placeholder="Occupation"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("mobile")}</label>
                  <input
                    className="form-control"
                    name="mobile"
                    value={form.mobile}
                    onChange={onChange}
                    placeholder="Mobile number"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("location")} *</label>
                  <input
                    className="form-control"
                    name="location"
                    value={form.location}
                    onChange={onChange}
                    required
                    placeholder="Town/Village"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("street")}</label>
                  <input
                    className="form-control"
                    name="street"
                    value={form.street}
                    onChange={onChange}
                    placeholder="Street"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("remarks")}</label>
                  <input
                    className="form-control"
                    name="remarks"
                    value={form.remarks}
                    onChange={onChange}
                    placeholder="Any notes"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Labels (comma separated)</label>
                  <input
                    className="form-control"
                    name="labels"
                    value={form.labels}
                    onChange={onChange}
                    placeholder="e.g. VIP, Family"
                  />
                </div>
                <div
                  className="form-group"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      marginTop: 24,
                    }}
                  >
                    <input
                      type="checkbox"
                      name="thaiMama"
                      checked={form.thaiMama}
                      onChange={onChange}
                    />
                    <span style={{ fontWeight: 600 }}>
                      Thai Mama (தாய் மாமன்)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </details>

        {/* Seer Varisai */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="flex-between">
            <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={20} /> {t("seerVarisai")}</h3>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showSeer}
                onChange={(e) => setShowSeer(e.target.checked)}
              />
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Include gifts in kind
              </span>
            </label>
          </div>
          {showSeer && (
            <div className="seer-grid" style={{ marginTop: 16 }}>
              {SEER_FIELDS.map((f) => (
                <div
                  key={f.key}
                  style={{
                    background: "var(--glass)",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    {f.icon} {t(f.key)}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 6,
                    }}
                  >
                    <div>
                      <label
                        className="seer-item"
                        style={{ fontSize: 11, color: "var(--text-muted)" }}
                      >
                        Value (₹)
                      </label>
                      <input
                        className="form-control"
                        style={{ fontSize: 12, padding: "6px 8px" }}
                        type="number"
                        min="0"
                        value={seerVarisai[f.key].value}
                        onChange={(e) =>
                          onSeerChange(f.key, "value", e.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label
                        className="seer-item"
                        style={{ fontSize: 11, color: "var(--text-muted)" }}
                      >
                        Qty
                      </label>
                      <input
                        className="form-control"
                        style={{ fontSize: 12, padding: "6px 8px" }}
                        type="number"
                        min="0"
                        value={seerVarisai[f.key].quantity}
                        onChange={(e) =>
                          onSeerChange(f.key, "quantity", e.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <input
                    className="form-control"
                    style={{ fontSize: 12, padding: "6px 8px", marginTop: 6 }}
                    value={seerVarisai[f.key].remarks}
                    onChange={(e) =>
                      onSeerChange(f.key, "remarks", e.target.value)
                    }
                    placeholder="Remarks..."
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {isNewPerson && (
          <div className="card flex gap-8" style={{ marginBottom: 16 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : <><Save size={16} style={{ marginRight: 6 }} /> {t("save")} Moi</>}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              {t("cancel")}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
