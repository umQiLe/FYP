import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { auth, logout } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import LoginPage from "./components/LoginPage";
import LecturerView from "./components/LecturerView";
import StudentView from "./components/StudentView";
import Header from "./components/Header";
import Footer from "./components/Footer";
import StatisticsPage from "./components/StatisticsPage";
import LecturerLayout from "./layouts/LecturerLayout";
import { Toaster } from "sonner";

import Logo from "./assets/UMPTT Logo";

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  const toggleTheme = () => {
    setIsDark((prevIsDark) => {
      const newIsDark = !prevIsDark;
      localStorage.setItem("theme", newIsDark ? "dark" : "light");
      return newIsDark;
    });
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        if (
          currentUser.email.endsWith("@siswa.um.edu.my") ||
          currentUser.email.endsWith("@siswa-old.um.edu.my")
        ) {
          setRole("student");
        } else if (
          currentUser.email.endsWith("@um.edu.my") ||
          currentUser.email.endsWith("@gmail.com")
        ) {
          setRole("lecturer");
        } else {
          setRole("unauthorized");
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Logo className="w-24 h-24 text-primary animate-pulse" />
        <p className="mt-4 text-lg font-medium text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-dvh items-stretch">
        <main className="flex-grow">
          <LoginPage />
        </main>

        <Footer />
      </div>
    );
  }

  if (role === "unauthorized") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-100 text-red-700">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p>Your email ({user.email}) is not authorized.</p>
        <button
          onClick={() => logout()}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <Toaster />
      {role === "student" ? (
        <StudentView
          user={user}
          isDark={isDark}
          toggleTheme={toggleTheme}
          role={role}
        />
      ) : (
        <>
          <Header
            user={user}
            isDark={isDark}
            toggleTheme={toggleTheme}
            role={role}
          />
          <main className="flex flex-grow">
            <Routes>
              <Route element={<LecturerLayout user={user} />}>
                <Route path="/" element={<LecturerView />} />
                <Route path="/profile" element={<div>Profile Page</div>} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/settings" element={<div>Settings Page</div>} />
              </Route>
            </Routes>
          </main>
        </>
      )}
      <Footer />
    </div>
  );
}

export default App;
