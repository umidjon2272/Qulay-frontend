import Hero from "./components/Hero/Hero";
import Stats from "./components/Stats/Stats";
import QuickActions from "./components/QuickActions/QuickActions";
import RecentFiles from "./components/RecentFiles/RecentFiles";
import RecentActivity from "./components/RecentActivity/RecentActivity";
import MobileHomeDetails from "./components/MobileHomeDetails/MobileHomeDetails";
import MobileDashboardHome from "./components/MobileDashboardHome/MobileDashboardHome";

import "./Dashboard.scss";
import Integrations from "../Integrations/Integrations";

const Dashboard = () => {
  return (
    <main className="dashboard__main">
      <MobileDashboardHome />
      <Hero />

      <Stats />

      <QuickActions />

      <MobileHomeDetails />

      <Integrations dashboard />

      <RecentFiles />

      <RecentActivity />
    </main>
  );
};

export default Dashboard;
