import {BrowserRouter as Router,Routes,Route,Navigate,useParams,} from "react-router-dom";
import React from "react";

// Context Providers
import { IDProvider } from "./context/IDContext";
import { RecordProvider } from "./context/RecordContext";
import { PickupStationProvider } from "./context/PickupStationContext";
import { NotifyProvider } from "./context/NotifyContext";   
import { AuthProvider } from "./context/AuthContext"; 
import {MaintenanceProvider,useMaintenance,} from "./context/MaintenanceContext";

// Layout
import MainLayout from "./layouts/MainLayout";

// Public & General Pages
import Home from "./pages/Home";
import FindMyID from "./pages/FindMyID";
import Payment from "./pages/Payment";
import PayToClaim from "./pages/PayToClaim"; 
import ClaimedIDDetails from "./pages/ClaimedIDDetails";
import NotifyMe from "./pages/NotifyMe";
import MaintenancePage from "./pages/MaintenancePage";

// Login Pages
import AdminLogin from "./pages/AdminLogin";
import StaffLogin from "./pages/StaffLogin";

// Staff Pages
import StaffDashboard from "./pages/StaffDashboard";
import StaffUpload from "./pages/StaffUpload";
import StaffManage from "./pages/StaffManage";
import StaffTrash from "./pages/StaffTrash";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminUpload from "./pages/AdminUpload";
import AdminManageIDs from "./pages/AdminManageIDs";
import AdminTrash from "./pages/AdminTrash";
import AddPickupStation from "./pages/AddPickupStation";
import ManagePickupStation from "./pages/ManagePickupStation";
import NotifyRequests from "./pages/NotifyRequests";
import AdminControlPanel from "./pages/AdminControlPanel";

// Auth + ProtectedRoute
import { ProtectedRoute } from "./routes/ProtectedRoute";

function ProtectedClaimedRoute() {
  const { idNumber } = useParams();

  const [loading, setLoading] =
    React.useState(true);

  const [allowed, setAllowed] =
    React.useState(false);

  React.useEffect(() => {

    if (!idNumber) {
      setLoading(false);
      return;
    }

    const checkRecord =
      async () => {

        try {

          const response =
            await fetch(
              `${import.meta.env.VITE_API_URL}/api/record/${idNumber}`
            );

          const data =
            await response.json();

          console.log(
            "🔥 PAYMENT CHECK:",
            data
          );

          if (
            data.success &&
            data.record &&
            data.record.status === "Paid"
          ) {
            setAllowed(true);
          }

        } catch (err) {

          console.error(
            "🔥 PAYMENT CHECK ERROR:",
            err
          );

        } finally {

          setLoading(false);

        }

      };

    checkRecord();

  }, [idNumber]);

  if (loading) {

    return (
      <div
        style={{
          color: "white",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Loading...
      </div>
    );

  }

  return allowed
    ? <ClaimedIDDetails />
    : <Navigate
        to={`/payment/${idNumber}`}
        replace
      />;
}

function AppContent() {

  const {
    maintenanceMode,
    loading,
  } = useMaintenance();

  if (loading) {
    return null;
  }

  if (maintenanceMode) {
  return (
    <AuthProvider>
  <PickupStationProvider>
    <RecordProvider>
      <NotifyProvider>
        <IDProvider>

              <Router>
                <Routes>

  <Route element={<MainLayout />}>

    <Route
      path="/admin/login"
      element={<AdminLogin />}
    />

    <Route
      path="/admin/dashboard"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/control-panel"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminControlPanel />
        </ProtectedRoute>
      }
    />

    <Route
      path="*"
      element={<MaintenancePage />}
    />

  </Route>

</Routes>
              </Router>

           </IDProvider>
             </NotifyProvider>
              </RecordProvider>
                </PickupStationProvider>
                  </AuthProvider>
  );
}

  return (
    <AuthProvider>
      <PickupStationProvider>
        <RecordProvider>
          <NotifyProvider>
           <IDProvider>
              <Router>
                <Routes>

                  {/* 🌍 Global Layout Wrapper */}
                  <Route element={<MainLayout />}>

                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/find-my-id" element={<FindMyID />} />
                    <Route path="/payment/:idNumber" element={<Payment />} />
                    <Route path="/pay-to-claim" element={<PayToClaim />} />
                    <Route path="/claimed/:idNumber" element={<ProtectedClaimedRoute />} />
                    <Route path="/notify-me" element={<NotifyMe />} />

                    {/* Login Routes */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/staff/login" element={<StaffLogin />} />

                    {/* Admin Routes */}
                    <Route
                      path="/admin/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/control-panel"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AdminControlPanel />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/upload-new-id"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AdminUpload />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/manage-ids"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AdminManageIDs />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/id-trash"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AdminTrash />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/add-pickup-station"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AddPickupStation />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/manage-pickup-station"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <ManagePickupStation />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/notify-requests"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <NotifyRequests />
                        </ProtectedRoute>
                      }
                    />

                    {/* Staff Routes */}
                    <Route
                      path="/staff/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={["staff"]}>
                          <StaffDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/staff/upload"
                      element={
                        <ProtectedRoute allowedRoles={["staff"]}>
                          <StaffUpload />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/staff/manage"
                      element={
                        <ProtectedRoute allowedRoles={["staff"]}>
                          <StaffManage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/staff/trash"
                      element={
                        <ProtectedRoute allowedRoles={["staff"]}>
                          <StaffTrash />
                        </ProtectedRoute>
                      }
                    />

                    {/* Fallback */}
                    <Route path="*" element={<h1>404 - Page Not Found</h1>} />

                  </Route>

                </Routes>
              </Router>
            </IDProvider>
              </NotifyProvider>
                </RecordProvider>
                  </PickupStationProvider>
                    </AuthProvider>
  );
}

export default function App() {
  return (
    <MaintenanceProvider>
      <AppContent />
    </MaintenanceProvider>
  );
}
