import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./App.css";
import {
  Activity,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Home,
  Lightbulb,
  Menu,
  MessageSquareText,
  Moon,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const API_URL = "https://ai-sentiment-analyzer-ko7j.onrender.com";

const defaultSettings = {
  animations: true,
  compactMode: false,
};

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
  },
  {
    id: "text-analysis",
    label: "Text Analysis",
    icon: MessageSquareText,
  },
  {
    id: "csv-analysis",
    label: "CSV Analysis",
    icon: FileText,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    id: "insights",
    label: "AI Insights",
    icon: Lightbulb,
  },
  {
    id: "history",
    label: "History",
    icon: Clock3,
  },
];

function App() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("sentiment-theme") === "dark";
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("sentiment-settings");
      return saved
        ? { ...defaultSettings, ...JSON.parse(saved) }
        : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [csvResult, setCsvResult] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("sentiment-history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");

  const [activeSection, setActiveSection] = useState("dashboard");

  const textRef = useRef(null);
  const csvRef = useRef(null);
  const analyticsRef = useRef(null);
  const insightsRef = useRef(null);
  const historyRef = useRef(null);
  const dashboardRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("sentiment-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem(
      "sentiment-settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(
      "sentiment-history",
      JSON.stringify(history)
    );
  }, [history]);

  useEffect(() => {
    const sections = [
      dashboardRef.current,
      textRef.current,
      csvRef.current,
      analyticsRef.current,
      insightsRef.current,
      historyRef.current,
    ].filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          );

        if (visible.length > 0) {
          setActiveSection(
            visible[0].target.dataset.section
          );
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0.1, 0.25, 0.5],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id) => {
    const sectionMap = {
      dashboard: dashboardRef,
      "text-analysis": textRef,
      "csv-analysis": csvRef,
      analytics: analyticsRef,
      insights: insightsRef,
      history: historyRef,
    };

    const ref = sectionMap[id];

    if (ref?.current) {
      ref.current.scrollIntoView({
        behavior: settings.animations
          ? "smooth"
          : "auto",
        block: "start",
      });
    }

    setActiveSection(id);
    setMobileOpen(false);
  };

  const analyzeText = async () => {
    if (!text.trim()) {
      alert("Please enter some text first.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/predict`,
        {
          text: text.trim(),
        }
      );

      if (response.data.error) {
        alert(response.data.error);
        return;
      }

      const newResult = response.data;

      setResult(newResult);

      const historyItem = {
        id: Date.now(),
        text: newResult.text,
        sentiment: newResult.sentiment,
        confidence: newResult.confidence,
        source: "Text Analysis",
        createdAt: new Date().toISOString(),
      };

      setHistory((prev) => [
        historyItem,
        ...prev,
      ].slice(0, 100));
    } catch (error) {
      console.error(error);

      alert(
        "Unable to connect to backend. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a CSV file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setCsvLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/predict-csv`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.error) {
        alert(response.data.error);
        return;
      }

      setCsvResult(response.data);

      const validResults = response.data.results.filter(
        (item) => item.sentiment !== "unknown"
      );

      const newHistoryItems = validResults.map(
        (item, index) => ({
          id:
            Date.now() +
            index +
            Math.random(),
          text: item.text,
          sentiment: item.sentiment,
          confidence: item.confidence,
          source: "CSV Analysis",
          createdAt: new Date().toISOString(),
        })
      );

      setHistory((prev) =>
        [...newHistoryItems, ...prev].slice(
          0,
          100
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        "Unable to process CSV. Make sure the backend is running."
      );
    } finally {
      setCsvLoading(false);

      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const downloadCsvReport = () => {
    if (
      !csvResult ||
      !csvResult.results ||
      csvResult.results.length === 0
    ) {
      return;
    }

    const headers = [
      "Text",
      "Sentiment",
      "Confidence",
    ];

    const rows = csvResult.results.map((item) => [
      `"${String(item.text || "").replace(
        /"/g,
        '""'
      )}"`,
      item.sentiment,
      item.confidence,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "sentiment-analysis-report.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear analysis history?"
    );

    if (!confirmed) return;

    setHistory([]);
  };

  const clearAllData = () => {
    const confirmed = window.confirm(
      "This will remove your saved history, current results and CSV results. Continue?"
    );

    if (!confirmed) return;

    setHistory([]);
    setResult(null);
    setCsvResult(null);
    setText("");
    setHistorySearch("");
    setHistoryFilter("all");
  };

  const resetPreferences = () => {
    setDark(false);
    setSettings(defaultSettings);
  };

  const toggleSetting = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const analyticsStats = useMemo(() => {
    const historyResults = history.filter(
      (item) => item.sentiment !== "unknown"
    );

    const csvResults =
      csvResult?.results?.filter(
        (item) => item.sentiment !== "unknown"
      ) || [];

    const sourceData =
      csvResults.length > 0
        ? csvResults
        : historyResults;

    const total = sourceData.length;

    const positive = sourceData.filter(
      (item) => item.sentiment === "positive"
    ).length;

    const neutral = sourceData.filter(
      (item) => item.sentiment === "neutral"
    ).length;

    const negative = sourceData.filter(
      (item) => item.sentiment === "negative"
    ).length;

    const averageConfidence =
      total > 0
        ? (
            sourceData.reduce(
              (sum, item) =>
                sum +
                Number(item.confidence || 0),
              0
            ) / total
          ).toFixed(1)
        : 0;

    const percentages = {
      positive:
        total > 0
          ? ((positive / total) * 100).toFixed(1)
          : 0,

      neutral:
        total > 0
          ? ((neutral / total) * 100).toFixed(1)
          : 0,

      negative:
        total > 0
          ? ((negative / total) * 100).toFixed(1)
          : 0,
    };

    let dominantSentiment = "No data";

    if (total > 0) {
      const values = {
        positive,
        neutral,
        negative,
      };

      dominantSentiment = Object.entries(values).sort(
        (a, b) => b[1] - a[1]
      )[0][0];
    }

    return {
      total,
      positive,
      neutral,
      negative,
      averageConfidence,
      percentages,
      dominantSentiment,
    };
  }, [history, csvResult]);

  const sentimentChartData = [
    {
      name: "Positive",
      value: analyticsStats.positive,
    },
    {
      name: "Neutral",
      value: analyticsStats.neutral,
    },
    {
      name: "Negative",
      value: analyticsStats.negative,
    },
  ];

  const activityData = useMemo(() => {
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();

      date.setDate(
        date.getDate() - i
      );

      const key = date.toISOString().slice(0, 10);

      const count = history.filter((item) => {
        if (!item.createdAt) return false;

        return (
          item.createdAt.slice(0, 10) ===
          key
        );
      }).length;

      days.push({
        label: date.toLocaleDateString(
          "en-US",
          {
            weekday: "short",
          }
        ),
        count,
      });
    }

    return days;
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        !historySearch.trim() ||
        item.text
          ?.toLowerCase()
          .includes(
            historySearch.toLowerCase()
          );

      const matchesFilter =
        historyFilter === "all" ||
        item.sentiment === historyFilter;

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [
    history,
    historySearch,
    historyFilter,
  ]);

  const aiInsight = useMemo(() => {
    const total = analyticsStats.total;

    if (!total) {
      return {
        title: "Waiting for analysis",
        text:
          "Run a text analysis or upload a CSV dataset to generate AI-powered sentiment insights.",
        type: "neutral",
      };
    }

    const {
      positive,
      negative,
      neutral,
      averageConfidence,
    } = analyticsStats;

    if (
      positive > negative &&
      positive > neutral
    ) {
      return {
        title: "Positive sentiment detected",
        text: `Your analyzed data contains more positive feedback than negative or neutral feedback. Average model confidence is ${averageConfidence}%.`,
        type: "positive",
      };
    }

    if (
      negative > positive &&
      negative > neutral
    ) {
      return {
        title: "Negative feedback detected",
        text: `Negative sentiment currently represents the largest group in your analyzed data. Average model confidence is ${averageConfidence}%.`,
        type: "negative",
      };
    }

    return {
      title: "Mixed sentiment pattern",
      text: `Your dataset contains a mixed sentiment distribution. Positive, neutral and negative feedback are relatively varied. Average model confidence is ${averageConfidence}%.`,
      type: "neutral",
    };
  }, [analyticsStats]);

  const sentimentClass = (sentiment) => {
    if (sentiment === "positive") {
      return "positive";
    }

    if (sentiment === "negative") {
      return "negative";
    }

    return "neutral";
  };

  const getSentimentEmoji = (sentiment) => {
    if (sentiment === "positive") {
      return "😊";
    }

    if (sentiment === "negative") {
      return "😞";
    }

    return "😐";
  };

  return (
    <div
      className={`app-shell ${
        dark ? "dark" : ""
      } ${
        settings.compactMode
          ? "compact-mode"
          : ""
      } ${
        !settings.animations
          ? "reduce-motion"
          : ""
      }`}
    >
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

      <aside
        className={`sidebar ${
          mobileOpen
            ? "sidebar-open"
            : ""
        }`}
      >
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <Brain size={23} />
            </div>

            <div>
              <h2>Sentiment AI</h2>
              <span>Analytics Platform</span>
            </div>
          </div>

          <button
            className="mobile-close"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">
          WORKSPACE
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  activeSection === item.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  scrollToSection(
                    item.id
                  )
                }
              >
                <Icon size={18} />

                <span>{item.label}</span>

                {activeSection ===
                  item.id && (
                  <span className="nav-active-dot" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="ai-status-card">
            <div className="status-icon">
              <ShieldCheck size={18} />
            </div>

            <div>
              <strong>AI Model Online</strong>
              <span>
                TF-IDF + Logistic Regression
              </span>
            </div>
          </div>

          <button
            className="sidebar-settings-button"
            onClick={() =>
              setSettingsOpen(true)
            }
          >
            <Settings size={17} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() =>
                setMobileOpen(true)
              }
            >
              <Menu size={22} />
            </button>

            <div>
              <span className="topbar-label">
                AI SENTIMENT PLATFORM
              </span>

              <h1>
                Intelligent Feedback
                Analysis
              </h1>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-button"
              title={
                dark
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              onClick={() =>
                setDark((prev) => !prev)
              }
            >
              {dark ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </button>

            <button
              className="icon-button"
              title="Settings"
              onClick={() =>
                setSettingsOpen(true)
              }
            >
              <Settings size={19} />
            </button>
          </div>
        </header>

        {/* DASHBOARD */}

        <section
          ref={dashboardRef}
          data-section="dashboard"
          id="dashboard"
          className="page-section"
        >
          <div className="hero-card">
            <div className="hero-content">
              <div className="hero-badge">
                <Sparkles size={15} />
                AI-POWERED NLP
              </div>

              <h2>
                Turn raw feedback into
                <span> actionable insight.</span>
              </h2>

              <p>
                Analyze customer feedback,
                reviews and social media
                content using machine
                learning-powered sentiment
                classification.
              </p>

              <div className="hero-actions">
                <button
                  className="primary-button"
                  onClick={() =>
                    scrollToSection(
                      "text-analysis"
                    )
                  }
                >
                  <Zap size={17} />
                  Analyze Text
                </button>

                <button
                  className="secondary-button"
                  onClick={() =>
                    scrollToSection(
                      "csv-analysis"
                    )
                  }
                >
                  <Upload size={17} />
                  Upload CSV
                </button>
              </div>
            </div>

            <div className="hero-visual">
              <div className="ai-orbit">
                <div className="orbit-ring ring-one" />
                <div className="orbit-ring ring-two" />
                <div className="orbit-ring ring-three" />

                <div className="ai-core">
                  <Brain size={48} />
                </div>

                <div className="orbit-dot dot-one" />
                <div className="orbit-dot dot-two" />
                <div className="orbit-dot dot-three" />
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Activity size={20} />
              </div>

              <div>
                <span>Total Analyses</span>
                <strong>
                  {analyticsStats.total}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <CheckCircle2 size={20} />
              </div>

              <div>
                <span>Positive</span>
                <strong>
                  {analyticsStats.positive}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <MessageSquareText
                  size={20}
                />
              </div>

              <div>
                <span>Neutral</span>
                <strong>
                  {analyticsStats.neutral}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <BarChart3 size={20} />
              </div>

              <div>
                <span>Avg. Confidence</span>
                <strong>
                  {analyticsStats.averageConfidence}
                  %
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* TEXT ANALYSIS */}

        <section
          ref={textRef}
          data-section="text-analysis"
          id="text-analysis"
          className="page-section"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                NLP ANALYZER
              </span>

              <h2>Text Sentiment Analysis</h2>

              <p>
                Enter any customer review,
                comment or feedback and let
                the AI classify its sentiment.
              </p>
            </div>
          </div>

          <div className="analyzer-grid">
            <div className="analyzer-card">
              <div className="card-header">
                <div>
                  <h3>Enter Text</h3>
                  <span>
                    Write or paste your
                    feedback below
                  </span>
                </div>

                <MessageSquareText
                  size={22}
                />
              </div>

              <textarea
                value={text}
                onChange={(event) =>
                  setText(event.target.value)
                }
                placeholder="Example: I absolutely love this product. The quality is amazing..."
                className="text-input"
              />

              <div className="input-footer">
                <span>
                  {text.length} characters
                </span>

                <button
                  className="primary-button"
                  onClick={analyzeText}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={17} />
                      Analyze Sentiment
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="result-card">
              {!result ? (
                <div className="empty-result">
                  <div className="empty-icon">
                    <Brain size={28} />
                  </div>

                  <h3>AI Result</h3>

                  <p>
                    Your sentiment prediction
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="result-content">
                  <div className="result-header">
                    <div>
                      <span className="section-kicker">
                        PREDICTION
                      </span>

                      <h3>
                        Sentiment Result
                      </h3>
                    </div>

                    <div
                      className={`sentiment-badge ${sentimentClass(
                        result.sentiment
                      )}`}
                    >
                      {getSentimentEmoji(
                        result.sentiment
                      )}

                      {result.sentiment}
                    </div>
                  </div>

                  <div className="result-main">
                    <div className="confidence-circle">
                      <div>
                        <strong>
                          {result.confidence}%
                        </strong>

                        <span>
                          confidence
                        </span>
                      </div>
                    </div>

                    <div className="result-summary">
                      <h4>
                        Model Prediction
                      </h4>

                      <p>
                        The AI model classified
                        this text as{" "}
                        <strong>
                          {result.sentiment}
                        </strong>
                        .
                      </p>
                    </div>
                  </div>

                  {result.probabilities && (
                    <div className="probability-section">
                      <h4>
                        Sentiment Probabilities
                      </h4>

                      {Object.entries(
                        result.probabilities
                      ).map(
                        ([
                          sentiment,
                          probability,
                        ]) => (
                          <div
                            className="probability-row"
                            key={sentiment}
                          >
                            <div>
                              <span>
                                {sentiment}
                              </span>

                              <strong>
                                {probability}%
                              </strong>
                            </div>

                            <div className="progress-track">
                              <div
                                className={`progress-fill ${sentimentClass(
                                  sentiment
                                )}`}
                                style={{
                                  width: `${probability}%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CSV ANALYSIS */}

        <section
          ref={csvRef}
          data-section="csv-analysis"
          id="csv-analysis"
          className="page-section"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                BULK PROCESSING
              </span>

              <h2>CSV Sentiment Analysis</h2>

              <p>
                Upload a CSV containing
                customer feedback and analyze
                multiple rows at once.
              </p>
            </div>
          </div>

          <div className="csv-card">
            <div className="csv-upload">
              <div className="upload-icon">
                <Upload size={30} />
              </div>

              <h3>
                Upload your CSV dataset
              </h3>

              <p>
                Supported text columns:
                <strong>
                  {" "}
                  text, review, comment,
                  message
                </strong>
              </p>

              <label className="upload-button">
                <Upload size={17} />
                {csvLoading
                  ? "Processing..."
                  : "Choose CSV File"}

                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  hidden
                />
              </label>
            </div>

            {csvResult && (
              <div className="csv-results">
                <div className="csv-summary">
                  <div>
                    <span>File</span>
                    <strong>
                      {csvResult.filename}
                    </strong>
                  </div>

                  <div>
                    <span>Total Rows</span>
                    <strong>
                      {csvResult.total_rows}
                    </strong>
                  </div>

                  <div>
                    <span>Analyzed</span>
                    <strong>
                      {csvResult.analyzed_rows}
                    </strong>
                  </div>

                  <div>
                    <span>Positive</span>
                    <strong>
                      {
                        csvResult.summary
                          .positive
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Neutral</span>
                    <strong>
                      {
                        csvResult.summary
                          .neutral
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Negative</span>
                    <strong>
                      {
                        csvResult.summary
                          .negative
                      }
                    </strong>
                  </div>
                </div>

                <div className="csv-table-wrapper">
                  <table className="csv-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Text</th>
                        <th>Sentiment</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>

                    <tbody>
                      {csvResult.results.map(
                        (item, index) => (
                          <tr key={index}>
                            <td>
                              {index + 1}
                            </td>

                            <td className="table-text">
                              {item.text ||
                                "Empty text"}
                            </td>

                            <td>
                              <span
                                className={`table-sentiment ${sentimentClass(
                                  item.sentiment
                                )}`}
                              >
                                {item.sentiment}
                              </span>
                            </td>

                            <td>
                              {item.confidence}%
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="csv-actions">
                  <button
                    className="secondary-button"
                    onClick={
                      downloadCsvReport
                    }
                  >
                    <FileText size={17} />
                    Download Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ANALYTICS */}

        <section
          ref={analyticsRef}
          data-section="analytics"
          id="analytics"
          className="page-section"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                DATA INTELLIGENCE
              </span>

              <h2>Advanced Analytics</h2>

              <p>
                Understand sentiment
                distribution and analysis
                activity.
              </p>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card chart-card">
              <div className="card-header">
                <div>
                  <h3>
                    Sentiment Distribution
                  </h3>

                  <span>
                    Based on analyzed data
                  </span>
                </div>

                <BarChart3 size={21} />
              </div>

              {analyticsStats.total === 0 ? (
                <div className="analytics-empty">
                  No analytics data yet.
                </div>
              ) : (
                <div className="donut-layout">
                  <div className="donut-chart">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <PieChart>
                        <Pie
                          data={
                            sentimentChartData
                          }
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={4}
                        >
                          <Cell />
                          <Cell />
                          <Cell />
                        </Pie>

                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="donut-center">
                      <strong>
                        {analyticsStats.total}
                      </strong>

                      <span>analyses</span>
                    </div>
                  </div>

                  <div className="chart-legend">
                    <div>
                      <span className="legend-dot positive" />
                      <span>Positive</span>
                      <strong>
                        {
                          analyticsStats
                            .percentages
                            .positive
                        }%
                      </strong>
                    </div>

                    <div>
                      <span className="legend-dot neutral" />
                      <span>Neutral</span>
                      <strong>
                        {
                          analyticsStats
                            .percentages
                            .neutral
                        }%
                      </strong>
                    </div>

                    <div>
                      <span className="legend-dot negative" />
                      <span>Negative</span>
                      <strong>
                        {
                          analyticsStats
                            .percentages
                            .negative
                        }%
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="analytics-card activity-card">
              <div className="card-header">
                <div>
                  <h3>
                    Analysis Activity
                  </h3>

                  <span>
                    Last 7 days
                  </span>
                </div>

                <Activity size={21} />
              </div>

              <div className="activity-chart">
                {activityData.map(
                  (item) => {
                    const max =
                      Math.max(
                        ...activityData.map(
                          (entry) =>
                            entry.count
                        ),
                        1
                      );

                    const height =
                      item.count === 0
                        ? 8
                        : Math.max(
                            12,
                            (item.count /
                              max) *
                              100
                          );

                    return (
                      <div
                        className="activity-column"
                        key={item.label}
                      >
                        <div className="activity-value">
                          {item.count}
                        </div>

                        <div className="activity-bar-wrapper">
                          <div
                            className="activity-bar"
                            style={{
                              height: `${height}%`,
                            }}
                          />
                        </div>

                        <span>
                          {item.label}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          <div className="analytics-metrics">
            <div className="metric-card">
              <span>Dominant Sentiment</span>
              <strong>
                {analyticsStats.dominantSentiment}
              </strong>
            </div>

            <div className="metric-card">
              <span>Positive Rate</span>
              <strong>
                {analyticsStats.percentages.positive}
                %
              </strong>
            </div>

            <div className="metric-card">
              <span>Negative Rate</span>
              <strong>
                {analyticsStats.percentages.negative}
                %
              </strong>
            </div>

            <div className="metric-card">
              <span>Model Confidence</span>
              <strong>
                {analyticsStats.averageConfidence}
                %
              </strong>
            </div>
          </div>
        </section>

        {/* AI INSIGHTS */}

        <section
          ref={insightsRef}
          data-section="insights"
          id="insights"
          className="page-section"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                AI INTERPRETATION
              </span>

              <h2>AI Insights</h2>

              <p>
                A quick interpretation of your
                current sentiment data.
              </p>
            </div>
          </div>

          <div
            className={`insight-card ${aiInsight.type}`}
          >
            <div className="insight-icon">
              <Lightbulb size={27} />
            </div>

            <div className="insight-content">
              <div className="insight-title">
                <Sparkles size={16} />
                <span>
                  AI GENERATED INSIGHT
                </span>
              </div>

              <h3>
                {aiInsight.title}
              </h3>

              <p>
                {aiInsight.text}
              </p>
            </div>
          </div>

          <div className="insight-grid">
            <div className="insight-mini-card">
              <div>
                <CheckCircle2 size={20} />
              </div>

              <span>Positive Feedback</span>

              <strong>
                {analyticsStats.positive}
              </strong>

              <small>
                {analyticsStats.percentages
                  .positive}
                % of analyzed data
              </small>
            </div>

            <div className="insight-mini-card">
              <div>
                <Activity size={20} />
              </div>

              <span>Neutral Feedback</span>

              <strong>
                {analyticsStats.neutral}
              </strong>

              <small>
                {analyticsStats.percentages
                  .neutral}
                % of analyzed data
              </small>
            </div>

            <div className="insight-mini-card">
              <div>
                <RotateCcw size={20} />
              </div>

              <span>Negative Feedback</span>

              <strong>
                {analyticsStats.negative}
              </strong>

              <small>
                {analyticsStats.percentages
                  .negative}
                % of analyzed data
              </small>
            </div>
          </div>
        </section>

        {/* HISTORY */}

        <section
          ref={historyRef}
          data-section="history"
          id="history"
          className="page-section"
        >
          <div className="section-heading history-heading">
            <div>
              <span className="section-kicker">
                ANALYSIS LOG
              </span>

              <h2>Analysis History</h2>

              <p>
                Review previously analyzed
                text and CSV records.
              </p>
            </div>

            {history.length > 0 && (
              <button
                className="danger-button"
                onClick={clearHistory}
              >
                <Trash2 size={16} />
                Clear History
              </button>
            )}
          </div>

          <div className="history-card">
            <div className="history-toolbar">
              <div className="history-search">
                <Search size={17} />

                <input
                  value={historySearch}
                  onChange={(event) =>
                    setHistorySearch(
                      event.target.value
                    )
                  }
                  placeholder="Search analyzed text..."
                />
              </div>

              <div className="history-filter">
                <Filter size={16} />

                <select
                  value={historyFilter}
                  onChange={(event) =>
                    setHistoryFilter(
                      event.target.value
                    )
                  }
                >
                  <option value="all">
                    All Sentiments
                  </option>

                  <option value="positive">
                    Positive
                  </option>

                  <option value="neutral">
                    Neutral
                  </option>

                  <option value="negative">
                    Negative
                  </option>
                </select>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="history-empty">
                <div>
                  <Clock3 size={26} />
                </div>

                <h3>
                  No analysis history
                </h3>

                <p>
                  Your completed analyses
                  will appear here.
                </p>
              </div>
            ) : (
              <div className="history-list">
                {filteredHistory.map(
                  (item) => (
                    <div
                      className="history-item"
                      key={item.id}
                    >
                      <div
                        className={`history-sentiment-icon ${sentimentClass(
                          item.sentiment
                        )}`}
                      >
                        {getSentimentEmoji(
                          item.sentiment
                        )}
                      </div>

                      <div className="history-text">
                        <p>
                          {item.text}
                        </p>

                        <span>
                          {item.source ||
                            "Analysis"}
                          {" • "}
                          {item.createdAt
                            ? new Date(
                                item.createdAt
                              ).toLocaleString()
                            : ""}
                        </span>
                      </div>

                      <div className="history-result">
                        <span
                          className={`table-sentiment ${sentimentClass(
                            item.sentiment
                          )}`}
                        >
                          {item.sentiment}
                        </span>

                        <strong>
                          {item.confidence}%
                        </strong>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        <footer className="footer">
          <div>
            <Brain size={18} />
            <span>
              AI Sentiment Analyzer
            </span>
          </div>

          <span>
            Built with Python, FastAPI,
            React & Machine Learning
          </span>
        </footer>
      </main>

      {/* SETTINGS MODAL */}

      {settingsOpen && (
        <div
          className="settings-modal-backdrop"
          onClick={() =>
            setSettingsOpen(false)
          }
        >
          <div
            className="settings-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="settings-modal-header">
              <div>
                <span className="section-kicker">
                  PREFERENCES
                </span>

                <h2>Settings</h2>
              </div>

              <button
                className="icon-button"
                onClick={() =>
                  setSettingsOpen(false)
                }
              >
                <X size={19} />
              </button>
            </div>

            <div className="settings-list">
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-icon">
                    {dark ? (
                      <Moon size={18} />
                    ) : (
                      <Sun size={18} />
                    )}
                  </div>

                  <div>
                    <strong>
                      Dark Mode
                    </strong>

                    <span>
                      Change the application
                      appearance
                    </span>
                  </div>
                </div>

                <button
                  className={`toggle ${
                    dark ? "on" : ""
                  }`}
                  onClick={() =>
                    setDark(
                      (prev) => !prev
                    )
                  }
                >
                  <span />
                </button>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-icon">
                    <Sparkles size={18} />
                  </div>

                  <div>
                    <strong>
                      Animations
                    </strong>

                    <span>
                      Enable smooth UI
                      transitions
                    </span>
                  </div>
                </div>

                <button
                  className={`toggle ${
                    settings.animations
                      ? "on"
                      : ""
                  }`}
                  onClick={() =>
                    toggleSetting(
                      "animations"
                    )
                  }
                >
                  <span />
                </button>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-icon">
                    <BarChart3 size={18} />
                  </div>

                  <div>
                    <strong>
                      Compact Mode
                    </strong>

                    <span>
                      Reduce spacing for
                      more information
                    </span>
                  </div>
                </div>

                <button
                  className={`toggle ${
                    settings.compactMode
                      ? "on"
                      : ""
                  }`}
                  onClick={() =>
                    toggleSetting(
                      "compactMode"
                    )
                  }
                >
                  <span />
                </button>
              </div>
            </div>

            <div className="settings-danger">
              <div>
                <strong>
                  Application Data
                </strong>

                <span>
                  Remove saved analysis
                  history and current data.
                </span>
              </div>

              <button
                className="danger-button"
                onClick={clearAllData}
              >
                <Trash2 size={16} />
                Clear Data
              </button>
            </div>

            <div className="settings-footer">
              <button
                className="secondary-button"
                onClick={resetPreferences}
              >
                <RotateCcw size={16} />
                Reset Preferences
              </button>

              <button
                className="primary-button"
                onClick={() =>
                  setSettingsOpen(false)
                }
              >
                <CheckCircle2 size={16} />
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;