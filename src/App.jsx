import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { PortalProvider, usePortal, homePath } from "./store.jsx";
import Layout from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import LogActivityPage from "./pages/LogActivityPage.jsx";
import ApprovalsPage from "./pages/ApprovalsPage.jsx";
import PayoutsPage from "./pages/PayoutsPage.jsx";
import AgentsPage from "./pages/AgentsPage.jsx";

/* Sends a signed-in user to their own start page if they open the other role's screen */
function Only({ role, children }) {
  const portal = usePortal();
  return portal.role === role ? children : <Navigate to={homePath(portal.role)} replace />;
}

function Home() {
  const { role } = usePortal();
  return <Navigate to={role ? homePath(role) : "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <PortalProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/log" element={<Only role="agent"><LogActivityPage /></Only>} />
            <Route path="/approvals" element={<Only role="admin"><ApprovalsPage /></Only>} />
            <Route path="/payouts" element={<PayoutsPage />} />
            <Route path="/agents" element={<Only role="admin"><AgentsPage /></Only>} />
          </Route>
          <Route path="*" element={<Home />} />
        </Routes>
      </PortalProvider>
    </BrowserRouter>
  );
}
