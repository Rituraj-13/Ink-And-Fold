import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./components/Landing";
import SignupPage from "./components/Signup";
import SigninPage from "./components/Signin";
import BlogsPage from "./components/Blogs";
import BlogDetail from "./components/BlogDetail";
import WritePage from "./components/Write";
import EditPage from "./components/Edit";
import MyPostsPage from "./components/MyPosts";
import VerifyOtpPage from "./components/VerifyOtp";
import AdminDashboard from "./components/Admin";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  return token ? <>{children}</> : <Navigate to="/signin" replace />;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/signin" replace />;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.userType === "ADMIN" || payload.UserType === "ADMIN") {
      return <>{children}</>;
    }
  } catch (e) {
    console.error("Invalid token in AdminRoute:", e);
  }
  return <Navigate to="/blogs" replace />;
}

// Pages that render their own top bar (no shared Navbar)
function StandaloneRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone pages with their own top bar */}
        <Route
          path="/write"
          element={
            <StandaloneRoute>
              <WritePage />
            </StandaloneRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <StandaloneRoute>
              <EditPage />
            </StandaloneRoute>
          }
        />

        {/* All other pages share the Navbar */}
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/signin" element={<SigninPage />} />
                <Route path="/verify-otp" element={<VerifyOtpPage />} />
                <Route
                  path="/blogs"
                  element={
                    <ProtectedRoute>
                      <BlogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/blog/:id"
                  element={
                    <ProtectedRoute>
                      <BlogDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-posts"
                  element={
                    <ProtectedRoute>
                      <MyPostsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminProtectedRoute>
                      <AdminDashboard />
                    </AdminProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
