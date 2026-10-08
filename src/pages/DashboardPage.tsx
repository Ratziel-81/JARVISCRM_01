import FeaturedOffers from "../components/dashboard/FeaturedOffers";
import HeroBanner from "../components/dashboard/HeroBanner";
import IntelligenceMap from "../components/dashboard/IntelligenceMap";
import KPICard from "../components/dashboard/KPICard";
import KPIOverview from "../components/dashboard/KPIOverview";
import RecentActivity from "../components/dashboard/RecentActivity";
import RecentClients from "../components/dashboard/RecentClients";
import SalesChart from "../components/dashboard/SalesChart";
import SalesPipeline from "../components/dashboard/SalesPipeline";
import UpcomingActions from "../components/dashboard/UpcomingActions";
import { useEffect, useState } from "react";
import { kpiCards, type KpiCard } from "../data/mockData";
import { api } from "../lib/api";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KpiCard[]>(kpiCards);

  useEffect(() => {
    let vivo = true;
    api
      .kpiCards()
      .then((d) => {
        if (vivo && Array.isArray(d) && d.length > 0) setKpis(d);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="min-w-0 space-y-4">
      <HeroBanner />

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-5 xl:grid-cols-3">
          {kpis.map((k, i) => (
            <KPICard key={k.id} kpi={k} index={i} />
          ))}
        </div>

        {/* pipeline + actividad */}
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <SalesPipeline />
          <RecentActivity />
        </div>

        {/* chart + kpi overview + ofertas */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <div className="lg:col-span-2 2xl:col-span-1">
            <SalesChart />
          </div>
          <KPIOverview />
          <FeaturedOffers />
        </div>

        {/* acciones + clientes + mapa */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <UpcomingActions />
          <RecentClients />
          <div className="lg:col-span-2 2xl:col-span-1">
            <IntelligenceMap />
          </div>
        </div>
    </div>
  );
}
