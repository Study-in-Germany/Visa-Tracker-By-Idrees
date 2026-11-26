"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import Select, { Option } from "@/components/ui/Select";
import { useSession } from "@/hooks/useSession";

interface StudentCard {
  id: string;
  applicantId: string;
  displayName: string;
  university?: string;
  program?: string;
  degreeLevel?: string;
  intakeSeason?: string;
  intakeYear?: number;
  originCity?: string;
  destinationCity?: string;
  consulate?: string;
  visaStatus?: string;
  inGermany: boolean;
  bio?: string;
  visibility: "NAMED" | "ANONYMOUS" | "PRIVATE";
  allowMessages: boolean;
  isSelf: boolean;
}

interface Recommendations {
  sameUniversity: StudentCard[];
  sameCity: StudentCard[];
  sameIntake: StudentCard[];
  recentlyJoined: StudentCard[];
}

const DEGREE_LEVEL_OPTIONS: Option[] = [
  { value: "", label: "All Degree Levels" },
  { value: "Master's", label: "Master's Degree" },
  { value: "Bachelor's", label: "Bachelor's Degree" },
  { value: "PhD / Research", label: "PhD / Doctorate" },
  { value: "Studienkolleg", label: "Studienkolleg / Prep" },
];

const INTAKE_SEASON_OPTIONS: Option[] = [
  { value: "", label: "All Intakes" },
  { value: "Winter", label: "Winter Semester" },
  { value: "Summer", label: "Summer Semester" },
];

const CONSULATE_OPTIONS: Option[] = [
  { value: "", label: "All Consulates" },
  { value: "Islamabad", label: "Islamabad Embassy" },
  { value: "Karachi", label: "Karachi Consulate" },
];

const INTAKE_YEAR_OPTIONS: Option[] = [
  { value: "", label: "All Years" },
  { value: "2027", label: "2027" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
];

export default function StudentConnectPage() {
  const router = useRouter();
  const session = useSession();

  // Directory filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedDegreeLevel, setSelectedDegreeLevel] = useState("");
  const [selectedIntakeSeason, setSelectedIntakeSeason] = useState("");
  const [selectedIntakeYear, setSelectedIntakeYear] = useState("");
  const [selectedOriginCity, setSelectedOriginCity] = useState("");
  const [selectedDestinationCity, setSelectedDestinationCity] = useState("");
  const [selectedConsulate, setSelectedConsulate] = useState("");
  const [onlyInGermany, setOnlyInGermany] = useState(false);
  const [onlyOpenToMessages, setOnlyOpenToMessages] = useState(false);

  // Pagination & items
  const [students, setStudents] = useState<StudentCard[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [trackerDefaults, setTrackerDefaults] = useState<any>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [profileFormSuccess, setProfileFormSuccess] = useState<string | null>(null);

  // Profile form fields
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formUniversity, setFormUniversity] = useState("");
  const [formProgram, setFormProgram] = useState("");
  const [formDegreeLevel, setFormDegreeLevel] = useState("Master's");
  const [formIntakeSeason, setFormIntakeSeason] = useState("Winter");
  const [formIntakeYear, setFormIntakeYear] = useState(2026);
  const [formOriginCity, setFormOriginCity] = useState("");
  const [formDestinationCity, setFormDestinationCity] = useState("");
  const [formConsulate, setFormConsulate] = useState("Islamabad");
  const [formInGermany, setFormInGermany] = useState(false);
  const [formBio, setFormBio] = useState("");
  const [formVisibility, setFormVisibility] = useState<"NAMED" | "ANONYMOUS" | "PRIVATE">("NAMED");
  const [formAllowMessages, setFormAllowMessages] = useState(true);

  // University autocomplete suggestions
  const [uniSuggestions, setUniSuggestions] = useState<any[]>([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Load current user profile if signed in
  const loadMyProfile = useCallback(() => {
    if (session.signedIn && session.role === "applicant") {
      fetch("/api/connect/profile")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setMyProfile(data.profile);
            setTrackerDefaults(data.trackerDefaults);
            if (data.profile) {
              setFormDisplayName(data.profile.displayName || "");
              setFormUniversity(data.profile.university || "");
              setFormProgram(data.profile.program || "");
              setFormDegreeLevel(data.profile.degreeLevel || "Master's");
              setFormIntakeSeason(data.profile.intakeSeason || "Winter");
              setFormIntakeYear(data.profile.intakeYear || 2026);
              setFormOriginCity(data.profile.originCity || "");
              setFormDestinationCity(data.profile.destinationCity || "");
              setFormConsulate(data.profile.consulate || "Islamabad");
              setFormInGermany(data.profile.inGermany || false);
              setFormBio(data.profile.bio || "");
              setFormVisibility(data.profile.visibility || "NAMED");
              setFormAllowMessages(data.profile.allowMessages !== false);
            } else if (data.trackerDefaults) {
              setFormDisplayName(data.trackerDefaults.suggestedName || "");
              setFormUniversity(data.trackerDefaults.university || "");
              setFormProgram(data.trackerDefaults.program || "");
              setFormOriginCity(data.trackerDefaults.originCity || "");
              setFormConsulate(data.trackerDefaults.consulate || "Islamabad");
            }
          }
        })
        .catch(() => {});
    }
  }, [session.signedIn, session.role]);

  useEffect(() => {
    loadMyProfile();
  }, [loadMyProfile]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (selectedUniversity) params.set("university", selectedUniversity);
    if (selectedDegreeLevel) params.set("degreeLevel", selectedDegreeLevel);
    if (selectedIntakeSeason) params.set("intakeSeason", selectedIntakeSeason);
    if (selectedIntakeYear) params.set("intakeYear", selectedIntakeYear);
    if (selectedOriginCity) params.set("originCity", selectedOriginCity);
    if (selectedDestinationCity) params.set("destinationCity", selectedDestinationCity);
    if (selectedConsulate) params.set("consulate", selectedConsulate);
    if (onlyInGermany) params.set("inGermany", "true");
    if (onlyOpenToMessages) params.set("allowMessages", "true");
    params.set("page", String(currentPage));
    params.set("pageSize", "12");
    if (currentPage === 1 && session.signedIn) {
      params.set("recommendations", "true");
    }

    try {
      const res = await fetch(`/api/connect/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.items || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.recommendations) {
          setRecommendations(data.recommendations);
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQuery,
    selectedUniversity,
    selectedDegreeLevel,
    selectedIntakeSeason,
    selectedIntakeYear,
    selectedOriginCity,
    selectedDestinationCity,
    selectedConsulate,
    onlyInGermany,
    onlyOpenToMessages,
    currentPage,
    session.signedIn,
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle University Search Suggestions
  const handleUniSearch = async (val: string) => {
    setFormUniversity(val);
    if (val.length >= 2) {
      try {
        const res = await fetch(`/api/connect/universities?q=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setUniSuggestions(data.items || []);
        }
      } catch {}
    } else {
      setUniSuggestions([]);
    }
  };

  const handlePreFillDefaults = () => {
    if (trackerDefaults) {
      if (!formDisplayName && trackerDefaults.suggestedName) setFormDisplayName(trackerDefaults.suggestedName);
      if (trackerDefaults.university) setFormUniversity(trackerDefaults.university);
      if (trackerDefaults.program) setFormProgram(trackerDefaults.program);
      if (trackerDefaults.originCity) setFormOriginCity(trackerDefaults.originCity);
      if (trackerDefaults.consulate) setFormConsulate(trackerDefaults.consulate);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileFormError(null);
    setProfileFormSuccess(null);

    try {
      const res = await fetch("/api/connect/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: formDisplayName,
          university: formUniversity,
          program: formProgram,
          degreeLevel: formDegreeLevel,
          intakeSeason: formIntakeSeason,
          intakeYear: formIntakeYear,
          originCity: formOriginCity,
          destinationCity: formDestinationCity,
          consulate: formConsulate,
          inGermany: formInGermany,
          bio: formBio,
          visibility: formVisibility,
          allowMessages: formAllowMessages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile.");
      setMyProfile(data.profile);
      setProfileFormSuccess("Profile saved successfully!");
      fetchStudents();
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileFormSuccess(null);
      }, 1000);
    } catch (err: any) {
      setProfileFormError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendMessage = async (student: StudentCard) => {
    if (!session.signedIn) {
      router.push("/dashboard");
      return;
    }

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientProfileId: student.id }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) {
        router.push(`/messages?conversationId=${data.conversationId}`);
      } else {
        alert(data.error || "Unable to start conversation with this student.");
      }
    } catch {
      alert("Error initiating conversation.");
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedUniversity("");
    setSelectedDegreeLevel("");
    setSelectedIntakeSeason("");
    setSelectedIntakeYear("");
    setSelectedOriginCity("");
    setSelectedDestinationCity("");
    setSelectedConsulate("");
    setOnlyInGermany(false);
    setOnlyOpenToMessages(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery ||
    selectedUniversity ||
    selectedDegreeLevel ||
    selectedIntakeSeason ||
    selectedIntakeYear ||
    selectedOriginCity ||
    selectedDestinationCity ||
    selectedConsulate ||
    onlyInGermany ||
    onlyOpenToMessages;

  return (
    <>
      <PageHeader
        title="Student Connect & Networking Directory"
        description="Discover and connect with Pakistani students heading to your German university, intake semester, or destination city."
        actions={
          session.signedIn ? (
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="btn-primary text-xs flex items-center gap-2 py-1.5 px-3 cursor-pointer shadow-sm"
            >
              <Icon name="user" size={14} />
              <span>{myProfile ? "Edit My Profile" : "Join Directory"}</span>
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <Icon name="key" size={14} />
              <span>Sign In to Network</span>
            </Link>
          )
        }
      />

      {/* Recommendations Carousel */}
      {session.signedIn && recommendations && (
        <section className="mb-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-mute flex items-center gap-2">
              <Icon name="users" size={14} className="text-blue-500" />
              <span>Recommended Peer Connections</span>
            </h3>
            <span className="text-xs text-mute">Matched by university and intake</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ...(recommendations.sameUniversity.length > 0
                ? recommendations.sameUniversity
                : recommendations.recentlyJoined),
            ]
              .slice(0, 4)
              .map((student) => (
                <div
                  key={`rec-${student.id}`}
                  className="card p-4 flex flex-col justify-between hover:border-line-strong transition-all bg-card"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-paper-sunk text-ink-900 font-bold flex items-center justify-center text-xs flex-shrink-0">
                        {student.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-ink-900 truncate">
                          {student.displayName}
                        </h4>
                        <p className="text-[11px] text-mute truncate">
                          {student.university || "German University"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {student.destinationCity && (
                        <span className="bg-paper-sunk text-ink-800 px-2 py-0.5 rounded">
                          📍 {student.destinationCity}
                        </span>
                      )}
                      {student.intakeSeason && (
                        <span className="bg-paper-sunk text-ink-800 px-2 py-0.5 rounded">
                          🎓 {student.intakeSeason} {student.intakeYear}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-line mt-2 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-mute font-medium">
                      {student.inGermany ? "🇩🇪 In Germany" : "🇵🇰 In Pakistan"}
                    </span>
                    {!student.isSelf && student.allowMessages && (
                      <button
                        onClick={() => handleSendMessage(student)}
                        className="font-semibold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Message</span>
                        <Icon name="send" size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Filter and Search Bar */}
      <div className="card p-4 sm:p-5 mb-8 space-y-3.5 bg-paper-raised">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Main Search Input */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="Search by university, program, city, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-8 text-xs placeholder:text-mute"
            />
            <div className="absolute left-2.5 top-2.5 text-mute">
              <Icon name="search" size={14} />
            </div>
          </div>

          {/* Custom Select: Degree Level */}
          <div>
            <Select
              value={selectedDegreeLevel}
              onChange={(v) => {
                setSelectedDegreeLevel(v);
                setCurrentPage(1);
              }}
              options={DEGREE_LEVEL_OPTIONS}
              label="Degree Level"
              placeholder="All Degree Levels"
            />
          </div>

          {/* Custom Select: Intake Season */}
          <div>
            <Select
              value={selectedIntakeSeason}
              onChange={(v) => {
                setSelectedIntakeSeason(v);
                setCurrentPage(1);
              }}
              options={INTAKE_SEASON_OPTIONS}
              label="Intake Season"
              placeholder="All Intakes"
            />
          </div>
        </div>

        {/* Secondary Filters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-1 text-xs">
          <input
            type="text"
            placeholder="Dest. City (Munich)"
            value={selectedDestinationCity}
            onChange={(e) => {
              setSelectedDestinationCity(e.target.value);
              setCurrentPage(1);
            }}
            className="input text-xs"
          />
          <input
            type="text"
            placeholder="Origin City (Lahore)"
            value={selectedOriginCity}
            onChange={(e) => {
              setSelectedOriginCity(e.target.value);
              setCurrentPage(1);
            }}
            className="input text-xs"
          />
          <Select
            value={selectedConsulate}
            onChange={(v) => {
              setSelectedConsulate(v);
              setCurrentPage(1);
            }}
            options={CONSULATE_OPTIONS}
            label="Consulate"
            placeholder="Consulate: All"
          />
          <Select
            value={selectedIntakeYear}
            onChange={(v) => {
              setSelectedIntakeYear(v);
              setCurrentPage(1);
            }}
            options={INTAKE_YEAR_OPTIONS}
            label="Intake Year"
            placeholder="Year: All"
          />

          <label className="flex items-center gap-2 cursor-pointer bg-card border border-line-strong rounded-lg px-2.5 py-1.5 min-h-[38px]">
            <input
              type="checkbox"
              checked={onlyInGermany}
              onChange={(e) => {
                setOnlyInGermany(e.target.checked);
                setCurrentPage(1);
              }}
              className="accent-ink-800"
            />
            <span className="truncate text-ink-900">In Germany</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-card border border-line-strong rounded-lg px-2.5 py-1.5 min-h-[38px]">
            <input
              type="checkbox"
              checked={onlyOpenToMessages}
              onChange={(e) => {
                setOnlyOpenToMessages(e.target.checked);
                setCurrentPage(1);
              }}
              className="accent-ink-800"
            />
            <span className="truncate text-ink-900">Open to Chat</span>
          </label>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line text-xs">
            <span className="text-mute">
              Filtered results ({totalCount} students found)
            </span>
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Icon name="close" size={12} />
              <span>Reset all filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Directory Cards Grid */}
      {loading ? (
        <div className="card p-12 text-center text-xs text-mute space-y-2 bg-card">
          <div className="w-5 h-5 border-2 border-ink-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading student profiles...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="card p-12 text-center space-y-3 bg-paper-raised border-dashed border-line">
          <div className="w-10 h-10 rounded-full bg-paper-sunk text-mute flex items-center justify-center mx-auto">
            <Icon name="users" size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-ink-900 text-sm">No Student Profiles Found</h4>
            <p className="text-xs text-mute max-w-sm mx-auto">
              No public profiles match the current filter criteria. Broaden your search or join the directory!
            </p>
          </div>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="btn-secondary text-xs py-1.5 px-3">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {students.map((student) => {
            const initials = student.displayName.slice(0, 2).toUpperCase();
            return (
              <div
                key={student.id}
                className="card p-5 flex flex-col justify-between hover:border-line-strong transition-all bg-card"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-paper-sunk text-ink-900 font-bold flex items-center justify-center text-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-sm text-ink-900 truncate">
                            {student.displayName}
                          </h4>
                          {student.isSelf && (
                            <span className="text-[10px] bg-paper-sunk text-ink-800 px-1.5 py-0.2 rounded font-medium">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-mute truncate">
                          {student.program || "Student Applicant"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        student.inGermany
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-paper-sunk text-mute border-line"
                      }`}
                    >
                      {student.inGermany ? "🇩🇪 In Germany" : "🇵🇰 In Pakistan"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-ink-900 font-medium">
                      <Icon name="school" size={13} className="text-mute flex-shrink-0" />
                      <span className="truncate">{student.university || "University pending"}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-mute text-[11px]">
                      {student.degreeLevel && (
                        <span className="bg-paper-raised border border-line px-2 py-0.5 rounded">
                          {student.degreeLevel}
                        </span>
                      )}
                      {student.intakeSeason && (
                        <span className="bg-paper-raised border border-line px-2 py-0.5 rounded">
                          {student.intakeSeason} {student.intakeYear}
                        </span>
                      )}
                      {student.consulate && (
                        <span className="bg-paper-raised border border-line px-2 py-0.5 rounded">
                          {student.consulate} Embassy
                        </span>
                      )}
                    </div>
                  </div>

                  {(student.originCity || student.destinationCity) && (
                    <div className="flex items-center gap-2 text-xs text-mute bg-paper-raised p-2 rounded-lg border border-line">
                      <span className="truncate text-ink-800 font-medium">
                        {student.originCity || "Pakistan"}
                      </span>
                      <Icon name="arrowRight" size={11} className="text-mute flex-shrink-0" />
                      <span className="truncate text-ink-800 font-medium">
                        {student.destinationCity || "Germany"}
                      </span>
                    </div>
                  )}

                  {student.bio && (
                    <p className="text-xs text-mute leading-relaxed line-clamp-2">
                      "{student.bio}"
                    </p>
                  )}
                </div>

                <div className="pt-3.5 border-t border-line mt-3.5 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-mute">
                    {student.allowMessages ? (
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Open to chat
                      </span>
                    ) : (
                      <span>Networking only</span>
                    )}
                  </div>

                  {!student.isSelf && student.allowMessages ? (
                    <button
                      onClick={() => handleSendMessage(student)}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Icon name="send" size={11} />
                      <span>Message</span>
                    </button>
                  ) : student.isSelf ? (
                    <button
                      onClick={() => setIsProfileModalOpen(true)}
                      className="text-xs text-blue-500 font-semibold hover:underline cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mb-10">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-mute px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 bg-card shadow-xl border-line-strong">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink-900">
                  {myProfile ? "Edit Student Networking Profile" : "Join Student Connect Directory"}
                </h3>
                <p className="text-xs text-mute">
                  Connect with fellow Pakistani students attending your university.
                </p>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-mute hover:text-ink-900 p-1 rounded-md"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {trackerDefaults && (
              <div className="p-3 bg-paper-raised border border-line rounded-lg flex items-center justify-between text-xs">
                <span className="text-mute">
                  Import details from your visa tracker entry?
                </span>
                <button
                  type="button"
                  onClick={handlePreFillDefaults}
                  className="font-semibold text-blue-500 hover:underline flex-shrink-0 ml-2"
                >
                  Import Details
                </button>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              {profileFormError && (
                <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg">
                  {profileFormError}
                </div>
              )}
              {profileFormSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                  {profileFormSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="label">Display Name *</label>
                <input
                  type="text"
                  required
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="input text-xs"
                  placeholder="e.g. Ahmed Raza"
                />
              </div>

              <div className="space-y-1 relative">
                <label className="label">German University</label>
                <input
                  type="text"
                  value={formUniversity}
                  onChange={(e) => handleUniSearch(e.target.value)}
                  className="input text-xs"
                  placeholder="e.g. TU Chemnitz, TU Munich..."
                />
                {uniSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-line-strong rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {uniSuggestions.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setFormUniversity(u.name);
                          if (u.city && !formDestinationCity) setFormDestinationCity(u.city);
                          setUniSuggestions([]);
                        }}
                        className="p-2.5 hover:bg-paper-sunk cursor-pointer border-b border-line last:border-0"
                      >
                        <p className="font-semibold text-ink-900">{u.name}</p>
                        <p className="text-[11px] text-mute">📍 {u.city}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="label">Degree Program</label>
                  <input
                    type="text"
                    value={formProgram}
                    onChange={(e) => setFormProgram(e.target.value)}
                    className="input text-xs"
                    placeholder="e.g. Computer Science M.Sc."
                  />
                </div>
                <div className="space-y-1">
                  <label className="label">Degree Level</label>
                  <Select
                    value={formDegreeLevel}
                    onChange={setFormDegreeLevel}
                    options={DEGREE_LEVEL_OPTIONS.filter((o) => o.value !== "")}
                    label="Degree Level"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="label">Intake Season</label>
                  <Select
                    value={formIntakeSeason}
                    onChange={setFormIntakeSeason}
                    options={INTAKE_SEASON_OPTIONS.filter((o) => o.value !== "")}
                    label="Intake Season"
                  />
                </div>
                <div className="space-y-1">
                  <label className="label">Intake Year</label>
                  <input
                    type="number"
                    value={formIntakeYear}
                    onChange={(e) => setFormIntakeYear(parseInt(e.target.value) || 2026)}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="label">Origin City (PK)</label>
                  <input
                    type="text"
                    value={formOriginCity}
                    onChange={(e) => setFormOriginCity(e.target.value)}
                    className="input text-xs"
                    placeholder="e.g. Lahore, Karachi"
                  />
                </div>
                <div className="space-y-1">
                  <label className="label">Destination City (DE)</label>
                  <input
                    type="text"
                    value={formDestinationCity}
                    onChange={(e) => setFormDestinationCity(e.target.value)}
                    className="input text-xs"
                    placeholder="e.g. Chemnitz, Munich"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="label">Bio</label>
                  <span className="text-[10px] text-mute">{formBio.length} / 300</span>
                </div>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  className="input text-xs resize-none"
                  placeholder="Looking forward to connecting with batchmates heading to Chemnitz!"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formInGermany}
                  onChange={(e) => setFormInGermany(e.target.checked)}
                  className="accent-ink-800"
                />
                <span className="text-ink-900 font-medium">Already in Germany</span>
              </label>

              {/* Visibility Options */}
              <div className="space-y-1.5 pt-2 border-t border-line">
                <label className="label">Profile Visibility</label>
                <div className="space-y-1.5">
                  {[
                    { val: "NAMED", title: "Public with Display Name", desc: "Shows your name, university, and bio in the directory." },
                    { val: "ANONYMOUS", title: "Anonymous Public Profile", desc: "Hides your name and displays 'Student #XXXX'." },
                    { val: "PRIVATE", title: "Private Profile", desc: "Hides your profile completely from the community directory." },
                  ].map((opt) => (
                    <label
                      key={opt.val}
                      className="flex items-start gap-2.5 p-2 rounded-lg border border-line bg-paper-raised cursor-pointer hover:border-line-strong"
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={opt.val}
                        checked={formVisibility === opt.val}
                        onChange={() => setFormVisibility(opt.val as any)}
                        className="mt-0.5 accent-ink-800"
                      />
                      <div>
                        <span className="font-semibold text-ink-900 block">{opt.title}</span>
                        <span className="text-[11px] text-mute">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formAllowMessages}
                  onChange={(e) => setFormAllowMessages(e.target.checked)}
                  className="accent-ink-800"
                />
                <span className="text-ink-900 font-medium">
                  Allow fellow students to message me
                </span>
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn-primary py-1.5 px-4 text-xs font-semibold"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
