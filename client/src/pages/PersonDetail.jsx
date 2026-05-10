import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { transactionsAPI } from "../api/api";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import TransactionHistory from "../components/TransactionHistory";
import SeerVarisaiHistory from "../components/SeerVarisaiHistory";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Printer, Gift, Coins } from "lucide-react";

export default function PersonDetail() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  const partyName = searchParams.get("partyName");
  const mobile = searchParams.get("mobile");
  const spouseName = searchParams.get("spouseName");
  const location = searchParams.get("location");
  const type = searchParams.get("type");

  useEffect(() => {
    const params = {};
    if (partyName) params.partyName = partyName;
    if (mobile) params.mobile = mobile;
    if (spouseName) params.spouseName = spouseName;
    if (location) params.location = location;

    transactionsAPI
      .getPersonDetail(params)
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [partyName, mobile, spouseName, location]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm(t("confirmDeleteTransaction") || "Are you sure you want to delete this transaction?")) return;
    try {
      await transactionsAPI.delete(id);
      const params = {};
      if (partyName) params.partyName = partyName;
      if (mobile) params.mobile = mobile;
      if (spouseName) params.spouseName = spouseName;
      if (location) params.location = location;
      
      const res = await transactionsAPI.getPersonDetail(params);
      setData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to delete transaction");
    }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  if (loading)
    return (
      <div className="flex-center" style={{ height: "80vh" }}>
        <span className="spinner" />
      </div>
    );
  if (!data) return <div className="container">Person not found</div>;

  const { person, transactions, totalReceived, totalPaid, balance } = data;

  return (
    <div className="container">
      <div className="page-header no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} style={{ marginRight: 4 }} /> {t("back")}
          </button>
          <div>
            <h1 className="page-title">{person.name || person.partyName}</h1>
            <div className="page-subtitle">Transaction history & balance</div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handlePrint}>
          <Printer size={16} style={{ marginRight: 4 }} /> {t("print")}
        </button>
      </div>

      <div ref={printRef} className="print-container" style={{ padding: '20px 0' }}>
        <div className="card no-print" style={{ marginBottom: 24 }}>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div style={{ textAlign: "left" }}>
              <div
                className="text-muted"
                style={{ fontSize: 12, marginBottom: 4 }}
              >
                TOTAL LIABILITY
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 24,
                  color:
                    balance > 0
                      ? "var(--danger)"
                      : balance < 0
                        ? "var(--success)"
                        : "var(--text-muted)",
                }}
              >
                {fmt(Math.abs(balance))}
                <span style={{ fontSize: 14, marginLeft: 6, fontWeight: 500 }}>
                  {balance > 0
                    ? "(You owe them)"
                    : balance < 0
                      ? "(They owe you)"
                      : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="divider" style={{ margin: "20px 0" }} />

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
          >
            <div
              className="stat-card"
              style={{
                background: "rgba(52, 211, 153, 0.05)",
                borderColor: "rgba(52, 211, 153, 0.2)",
              }}
            >
              <div className="stat-label" style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
                <Gift size={16} /> Total Received
              </div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {fmt(totalReceived)}
              </div>
            </div>
            <div
              className="stat-card"
              style={{
                background: "rgba(139, 92, 246, 0.05)",
                borderColor: "rgba(139, 92, 246, 0.2)",
              }}
            >
              <div className="stat-label" style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: 6 }}>
                <Coins size={16} /> Total Paid (Invested)
              </div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {fmt(totalPaid)}
              </div>
            </div>
          </div>
        </div>

        <TransactionHistory 
          transactions={transactions} 
          type={type} 
          person={person} 
          user={user}
          totalPaid={totalPaid}
          totalReceived={totalReceived}
          balance={balance}
          onDelete={handleDeleteTransaction} 
        />

        <SeerVarisaiHistory 
          transactions={transactions} 
          person={person} 
        />
      </div>
    </div>
  );
}
