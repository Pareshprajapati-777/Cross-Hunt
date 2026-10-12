import React, { useState, useEffect } from 'react';
import {
  getAdminAnalytics,
  AdminAnalyticsResponse,
  AdminAnalyticsCharts
} from '../../api/dashboards';
import {
  TrendingUp,
  BarChart3,
  Anchor,
  Ship,
  Waves,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Calendar,
  Compass,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

type DateRangeOption = '7d' | '30d' | '6m' | '1y' | 'custom' | 'all';

interface AdminAnalyticsViewProps {
  initialData?: any;
}

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = () => {
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [revenueGranularity, setRevenueGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState<boolean>(false);
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState<boolean>(false);
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);

  const fetchAnalytics = (range: DateRangeOption, sDate?: string, eDate?: string, gran?: string) => {
    setLoading(true);
    getAdminAnalytics({
      range,
      start_date: sDate || undefined,
      end_date: eDate || undefined,
      granularity: gran || (range === '7d' || range === '30d' ? 'daily' : 'monthly'),
    })
      .then((res) => {
        setData(res);
        if (res.date_range?.granularity) {
          setRevenueGranularity(res.date_range.granularity as any);
        }
      })
      .catch((err) => console.error('Error fetching admin analytics:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics(dateRange, startDate, endDate, revenueGranularity);
  }, [dateRange]);

  const handleApplyCustomDates = () => {
    if (!startDate || !endDate) {
      alert('Please specify both Start Date and End Date.');
      return;
    }
    setDateRange('custom');
    fetchAnalytics('custom', startDate, endDate);
  };

  const handleGranularityToggle = (gran: 'daily' | 'weekly' | 'monthly') => {
    setRevenueGranularity(gran);
    fetchAnalytics(dateRange, startDate, endDate, gran);
  };

  const charts: AdminAnalyticsCharts | undefined = data?.charts;
  const kpis = data?.kpis;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. SPATIAL INTERACTIVE CONTROLS BAR & REAL-TIME SUMMARY */}
      <div className="spatial-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/15 via-cyan-500/10 to-blue-600/10 border border-sky-400/30 flex items-center justify-center text-sky-600 shrink-0 shadow-sm shadow-sky-500/10">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="spatial-badge spatial-badge-cyan">
                  <Sparkles className="w-3 h-3" /> Live Telemetry
                </span>
                {loading && (
                  <span className="text-xs font-semibold text-sky-600 animate-pulse">Syncing...</span>
                )}
              </div>
              <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight mt-0.5">
                Spatial Visual Analytics & Growth Trends
              </h2>
              <p className="text-xs text-slate-500">
                Multi-dimensional transactional metrics, fleet performance, and gross margin retention.
              </p>
            </div>
          </div>

          {/* Date Range & Custom Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner">
              {[
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: '6m', label: '6M' },
                { id: '1y', label: '1Y' },
                { id: 'all', label: 'All' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setDateRange(option.id as DateRangeOption)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dateRange === option.id
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs shadow-inner">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white"
              />
              <span className="text-slate-400 font-bold text-[10px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white"
              />
              <button
                onClick={handleApplyCustomDates}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold text-[11px] cursor-pointer transition shadow-md shadow-sky-600/20"
              >
                Filter
              </button>
            </div>

            <button
              onClick={() => fetchAnalytics(dateRange, startDate, endDate, revenueGranularity)}
              title="Refresh Visuals"
              className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Selected Period Spatial Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-3 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-50/60 to-slate-50/80 border border-sky-100 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-sky-800 tracking-wider block">Period Collections</span>
            <span className="text-xl font-black text-slate-900 font-mono-numbers block">
              {formatINR(kpis?.period_gross_revenue ?? kpis?.gross_revenue ?? 0)}
            </span>
            <p className="text-[10px] text-sky-700 font-semibold">Gross Customer Inflow</p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/70 to-teal-50/50 border border-emerald-200/80 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">Period Net Profit</span>
            <span className="text-xl font-black text-emerald-800 font-mono-numbers block">
              {formatINR(kpis?.period_platform_profit ?? kpis?.platform_profit ?? 0)}
            </span>
            <p className="text-[10px] text-emerald-700 font-semibold">15% Net Commission</p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/50 to-slate-50/80 border border-amber-100 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">Bookings Volume</span>
            <span className="text-xl font-black text-slate-900 font-mono-numbers block">
              {kpis?.period_bookings_count ?? ((kpis?.private_bookings || 0) + (kpis?.public_tours || 0))} orders
            </span>
            <p className="text-[10px] text-slate-500 font-medium">
              {kpis?.period_private_count ?? kpis?.private_bookings ?? 0} Charters · {kpis?.period_tour_count ?? 0} Tours
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Operations Health</span>
            <span className="text-xl font-black text-slate-900 font-mono-numbers block">
              {100 - (kpis?.cancellation_rate ?? 0)}%
            </span>
            <p className="text-[10px] text-emerald-600 font-bold">
              {kpis?.cancellation_rate ?? 0}% Cancellation Rate
            </p>
          </div>
        </div>
      </div>

      {/* 2. SPATIAL HERO CHART: REVENUE & PLATFORM PROFIT TRAJECTORY */}
      <div className="spatial-card spatial-card-hover rounded-3xl p-6 sm:p-8 space-y-5 border border-slate-200/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 shadow-sm shadow-sky-400/50" />
              <h3 className="text-xl font-bold font-display text-slate-900 tracking-tight">
                1. Revenue & Platform Profit Growth Trajectory
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Time-series progression: Gross customer booking volume compared directly against net retained platform profit.
            </p>
          </div>

          {/* Granularity Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto shadow-inner border border-slate-200/80">
            {(['daily', 'weekly', 'monthly'] as const).map((g) => (
              <button
                key={g}
                onClick={() => handleGranularityToggle(g)}
                className={`px-3.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                  revenueGranularity === g
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs font-bold pt-1">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-sky-400 to-cyan-500 shadow-sm shadow-sky-400/30" />
            <span className="text-slate-700">Gross Customer Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm shadow-emerald-400/30" />
            <span className="text-slate-700">Platform Net Profit</span>
          </div>
        </div>

        {renderRevenueTrendBarChart(charts?.revenue_trend || [])}
      </div>

      {/* 3. CORE DUAL ROW: BUSINESS MODEL SPLIT & BOOKING STATUS HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 2: PRIVATE VS PUBLIC BOOKINGS */}
        <div className="spatial-card spatial-card-hover rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <h3 className="text-lg font-bold font-display text-slate-900">
                  2. Business Model Split (Private vs Public)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Whole boat charter hire vs scheduled passenger tickets</p>
            </div>
            <span className="spatial-badge spatial-badge-amber">Volume Split</span>
          </div>
          {renderPrivateVsPublicChart(charts?.bookings_private_vs_public)}
        </div>

        {/* CHART 3: BOOKING STATUS DISTRIBUTION */}
        <div className="spatial-card spatial-card-hover rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                <h3 className="text-lg font-bold font-display text-slate-900">
                  3. Booking Status Health Distribution
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Confirmed, Completed, Pending & Cancelled ratios</p>
            </div>
            <span className="spatial-badge spatial-badge-cyan">Live Health</span>
          </div>
          {renderBookingStatusChart(charts?.booking_status_breakdown || [])}
        </div>
      </div>

      {/* 4. CORE DUAL ROW: TOP PERFORMING FLEET & DESTINATION DEMAND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 4: TOP PERFORMING SHIPS */}
        <div className="spatial-card spatial-card-hover rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                <h3 className="text-lg font-bold font-display text-slate-900">
                  4. Top Performing Fleet Ships
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Vessels generating the highest bookings & gross revenue</p>
            </div>
            <span className="spatial-badge spatial-badge-cyan">Leaderboard</span>
          </div>
          {renderShipPerformanceChart(charts?.ship_performance || [])}
        </div>

        {/* CHART 5: DESTINATION DEMAND ANALYSIS */}
        <div className="spatial-card spatial-card-hover rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50" />
                <h3 className="text-lg font-bold font-display text-slate-900">
                  5. Destination Demand Analysis
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Most requested cruise locations & sailing ports</p>
            </div>
            <span className="spatial-badge spatial-badge-emerald">Popular Routes</span>
          </div>
          {renderDestinationDemandChart(charts?.destination_analysis || [])}
        </div>
      </div>

      {/* 5. COLLAPSIBLE DEEP-DIVE ANALYTICS SECTION */}
      <div className="pt-2">
        <button
          onClick={() => setShowDetailedAnalytics(!showDetailedAnalytics)}
          className="w-full py-4 px-6 rounded-3xl spatial-card hover:border-slate-300 shadow-sm flex items-center justify-between text-slate-800 transition cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-sm font-bold block text-slate-900 font-display">
                {showDetailedAnalytics ? 'Hide Deep-Dive Fleet & Occupancy Analytics' : 'Explore Deep-Dive Fleet & Occupancy Analytics'}
              </span>
              <span className="text-[11px] text-slate-500">
                Public cruise seat occupancy, MoM growth rates, and vessel/port revenue shares
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100/90 px-3.5 py-1 rounded-full border border-slate-200">
              {showDetailedAnalytics ? 'Collapse' : 'Expand (4 Visuals)'}
            </span>
            {showDetailedAnalytics ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
          </div>
        </button>

        {showDetailedAnalytics && (
          <div className="space-y-6 pt-6 animate-fade-in">
            {/* DUAL ROW: TOUR OCCUPANCY & MONTHLY PROFIT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CHART 6: PUBLIC TOUR OCCUPANCY */}
              <div className="spatial-card rounded-3xl p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                      <h3 className="text-base font-bold font-display text-slate-900">
                        6. Public Tour Occupancy (Capacity vs Booked)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">Passenger tickets booked vs total boat capacity</p>
                  </div>
                  <span className="spatial-badge spatial-badge-cyan">
                    Avg: {charts?.public_tour_occupancy?.average_occupancy_rate || 0}%
                  </span>
                </div>
                {renderPublicTourOccupancyVisualChart(charts?.public_tour_occupancy)}
              </div>

              {/* CHART 7: PLATFORM PROFIT TREND */}
              <div className="spatial-card rounded-3xl p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h3 className="text-base font-bold font-display text-slate-900">
                        7. Platform Profit Monthly Margin
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">Monthly net commission earnings & profit margin %</p>
                  </div>
                  <span className="spatial-badge spatial-badge-emerald">Net Profit</span>
                </div>
                {renderPlatformProfitChart(charts?.platform_profit_trend || [])}
              </div>
            </div>

            {/* DUAL ROW: REVENUE BY SHIP & REVENUE BY DESTINATION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CHART 8: REVENUE BY SHIP */}
              <div className="spatial-card rounded-3xl p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <h3 className="text-base font-bold font-display text-slate-900">
                        8. Revenue by Ship
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">Gross revenue generated per vessel</p>
                  </div>
                  <span className="spatial-badge spatial-badge-cyan">INR (₹) Share</span>
                </div>
                {renderRevenueByShipChart(charts?.revenue_by_ship || [])}
              </div>

              {/* CHART 9: REVENUE BY DESTINATION */}
              <div className="spatial-card rounded-3xl p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                      <h3 className="text-base font-bold font-display text-slate-900">
                        9. Revenue by Destination
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">Gross maritime earnings by port / region</p>
                  </div>
                  <span className="spatial-badge spatial-badge-emerald">Geographic</span>
                </div>
                {renderRevenueByDestinationChart(charts?.revenue_by_destination || [])}
              </div>
            </div>

            {/* CHART 10: MONTHLY GROWTH RATE */}
            <div className="spatial-card rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <h3 className="text-lg font-bold font-display text-slate-900">
                      10. Month-over-Month Growth Performance
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Month-over-month revenue growth rate and booking volume trajectory.
                  </p>
                </div>
                <span className="spatial-badge spatial-badge-emerald">MoM Growth</span>
              </div>

              {renderMonthlyGrowthVisualChart(charts?.monthly_growth || [])}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ===========================================================================
  // SPATIAL VISUAL CHART RENDERERS (Glowing gradients, frosted glass tooltips)
  // ===========================================================================

  // CHART 1: REVENUE TREND DUAL BAR CHART (SPATIAL GRADIENT PILL BARS)
  function renderRevenueTrendBarChart(items: AdminAnalyticsCharts['revenue_trend']) {
    if (!items || items.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
          No revenue transactions found for this date range.
        </div>
      );
    }

    const maxRev = Math.max(...items.map((i) => i.gross_revenue), 1000);

    return (
      <div className="pt-4 pb-2">
        <div className="h-64 flex items-end justify-between gap-1.5 sm:gap-2.5 border-b border-slate-200/80 px-2">
          {items.map((m, idx) => {
            const revHeight = Math.max(5, Math.round((m.gross_revenue / maxRev) * 100));
            const profHeight = Math.max(3, Math.round((m.platform_profit / maxRev) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                {/* Floating Spatial Glass Tooltip */}
                <div className="absolute -top-20 opacity-0 group-hover:opacity-100 transition-all pointer-events-none spatial-glass-dark text-white text-[11px] rounded-2xl p-3 whitespace-nowrap z-40 shadow-2xl border border-white/15 scale-95 group-hover:scale-100">
                  <p className="font-bold text-white border-b border-white/10 pb-1 mb-1.5">
                    {m.label} · <span className="font-normal text-slate-300">{m.bookings_count} bookings</span>
                  </p>
                  <p className="text-cyan-300 font-mono-numbers font-bold">Gross: {formatINR(m.gross_revenue)}</p>
                  <p className="text-emerald-300 font-mono-numbers font-bold">Profit: {formatINR(m.platform_profit)}</p>
                </div>

                {/* Spatial Dual Bars */}
                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                  <div
                    className="w-1/2 spatial-bar-sky cursor-pointer"
                    style={{ height: `${revHeight}%` }}
                  />
                  <div
                    className="w-1/2 spatial-bar-emerald cursor-pointer"
                    style={{ height: `${profHeight}%` }}
                  />
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-2 block truncate max-w-[42px] sm:max-w-none text-center font-mono-numbers">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // CHART 2: PLATFORM PROFIT TREND
  function renderPlatformProfitChart(items: AdminAnalyticsCharts['platform_profit_trend']) {
    if (!items || items.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center bg-slate-50/70 rounded-2xl text-xs text-slate-400">
          No platform profit data recorded.
        </div>
      );
    }

    const maxProfit = Math.max(...items.map((i) => i.platform_profit), 1000);

    return (
      <div className="space-y-3 pt-2">
        <div className="h-52 flex items-end justify-between gap-2 border-b border-slate-200/80 px-2 pt-2">
          {items.map((m, idx) => {
            const barH = Math.max(5, Math.round((m.platform_profit / maxProfit) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-all pointer-events-none spatial-glass-dark text-white text-[11px] rounded-2xl p-2.5 whitespace-nowrap z-40 shadow-xl border border-white/15">
                  <p className="font-bold">{m.month_label}</p>
                  <p className="text-emerald-300 font-mono-numbers font-bold">Profit: {formatINR(m.platform_profit)}</p>
                  <p className="text-slate-300 font-mono-numbers text-[10px]">Margin: {m.margin_percentage}%</p>
                </div>

                <div
                  className="w-3/4 max-w-[34px] bg-gradient-to-t from-emerald-600 via-teal-500 to-cyan-300 rounded-t-lg transition-all duration-500 cursor-pointer hover:brightness-110 shadow-sm shadow-emerald-500/20"
                  style={{ height: `${barH}%` }}
                />
                <span className="text-[10px] font-bold text-slate-500 mt-2 block font-mono-numbers">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // CHART 3: PRIVATE VS PUBLIC BOOKINGS (SPATIAL INSET GAUGES)
  function renderPrivateVsPublicChart(breakdown?: AdminAnalyticsCharts['bookings_private_vs_public']) {
    if (!breakdown) {
      return <div className="text-xs text-slate-400 py-6 text-center">No bookings data.</div>;
    }

    const priv = breakdown.private;
    const tour = breakdown.public;

    return (
      <div className="space-y-5 pt-3">
        {/* Private */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-amber-800 flex items-center gap-1.5">
              <Anchor className="w-3.5 h-3.5 text-amber-600" />
              Private Charters ({priv.count} bookings)
            </span>
            <span className="text-slate-900 font-extrabold font-mono-numbers">{formatINR(priv.revenue)}</span>
          </div>
          <div className="w-full h-3 spatial-track">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700 shadow-sm shadow-amber-500/30"
              style={{ width: `${priv.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-mono-numbers">
            <span>{priv.tickets} passenger headcount</span>
            <span className="font-bold text-amber-700">{priv.percentage}% volume share</span>
          </div>
        </div>

        {/* Public */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-sky-800 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-sky-600" />
              Public Cruise Tours ({tour.count} reservations)
            </span>
            <span className="text-slate-900 font-extrabold font-mono-numbers">{formatINR(tour.revenue)}</span>
          </div>
          <div className="w-full h-3 spatial-track">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-700 shadow-sm shadow-sky-500/30"
              style={{ width: `${tour.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-mono-numbers">
            <span>{tour.tickets} passenger tickets</span>
            <span className="font-bold text-sky-700">{tour.percentage}% volume share</span>
          </div>
        </div>
      </div>
    );
  }

  // CHART 4: SHIP PERFORMANCE (SPATIAL LEADERBOARD)
  function renderShipPerformanceChart(ships: AdminAnalyticsCharts['ship_performance']) {
    if (!ships || ships.length === 0) {
      return (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/70 rounded-2xl">
          No ship booking transactions recorded in this period.
        </div>
      );
    }

    const maxCount = Math.max(...ships.map((s) => s.bookings_count), 1);

    return (
      <div className="space-y-3.5 pt-2">
        {ships.slice(0, 6).map((s, idx) => {
          const widthPct = Math.max(8, Math.round((s.bookings_count / maxCount) * 100));
          return (
            <div key={s.ship_id || idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center text-[10px] font-mono-numbers font-bold">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-slate-900 truncate">{s.ship_name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">({s.location})</span>
                </div>
                <div className="text-right shrink-0 font-mono-numbers">
                  <span className="font-black text-slate-900">{s.bookings_count} bookings</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">· {formatINR(s.revenue)}</span>
                </div>
              </div>
              <div className="w-full h-2 spatial-track">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 rounded-full transition-all duration-500 shadow-sm shadow-sky-500/20"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // CHART 5: DESTINATION DEMAND ANALYSIS
  function renderDestinationDemandChart(items: AdminAnalyticsCharts['destination_analysis']) {
    if (!items || items.length === 0) {
      return <div className="text-xs text-slate-400 py-6 text-center">No destination records.</div>;
    }

    return (
      <div className="space-y-3.5 pt-2">
        {items.map((d) => (
          <div key={d.destination} className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-900">{d.destination}</span>
              <span className="text-slate-700 font-mono-numbers">{d.bookings_count} bookings ({d.share_percentage}%)</span>
            </div>
            <div className="w-full h-2 spatial-track">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm shadow-teal-500/20"
                style={{ width: `${Math.max(2, d.share_percentage)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // CHART 6: PUBLIC TOUR OCCUPANCY
  function renderPublicTourOccupancyVisualChart(tourOccupancy?: AdminAnalyticsCharts['public_tour_occupancy']) {
    if (!tourOccupancy || !tourOccupancy.tours || tourOccupancy.tours.length === 0) {
      return (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/70 rounded-2xl">
          No public cruise departures scheduled.
        </div>
      );
    }

    return (
      <div className="space-y-3.5 pt-2">
        {tourOccupancy.tours.slice(0, 5).map((t) => (
          <div key={t.tour_id} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-900 truncate pr-2">{t.tour_title}</span>
              <span className="font-extrabold text-sky-800 shrink-0 font-mono-numbers">
                {t.booked_capacity} / {t.total_capacity} seats ({t.occupancy_percentage}%)
              </span>
            </div>
            <div className="w-full h-2 spatial-track">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  t.occupancy_percentage >= 80 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/20' 
                    : 'bg-gradient-to-r from-sky-500 to-cyan-400 shadow-sm shadow-sky-500/20'
                }`}
                style={{ width: `${Math.max(3, t.occupancy_percentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers">
              <span>{t.ship_name}</span>
              <span>{formatINR(t.revenue)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // CHART 7: BOOKING STATUS DISTRIBUTION
  function renderBookingStatusChart(items: AdminAnalyticsCharts['booking_status_breakdown']) {
    if (!items || items.length === 0) {
      return <div className="text-xs text-slate-400 py-6 text-center">No status data recorded.</div>;
    }

    return (
      <div className="space-y-3.5 pt-2">
        {items.map((st) => (
          <div key={st.status} className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="flex items-center gap-2 text-slate-800">
                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: st.color }} />
                <span>{st.label} ({st.count})</span>
              </span>
              <span className="text-slate-900 font-mono-numbers">{formatINR(st.revenue)}</span>
            </div>
            <div className="w-full h-2.5 spatial-track">
              <div
                className="h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${st.share_percentage}%`, backgroundColor: st.color }}
              />
            </div>
            <div className="text-right text-[10px] text-slate-400 font-mono-numbers">
              {st.share_percentage}% of total reservations
            </div>
          </div>
        ))}
      </div>
    );
  }

  // CHART 8: REVENUE BY SHIP
  function renderRevenueByShipChart(items: AdminAnalyticsCharts['revenue_by_ship']) {
    if (!items || items.length === 0) {
      return <div className="text-xs text-slate-400 py-6 text-center">No ship revenue recorded.</div>;
    }

    return (
      <div className="space-y-3.5 pt-2">
        {items.slice(0, 6).map((item) => (
          <div key={item.ship_id} className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-900 truncate pr-2">{item.ship_name}</span>
              <span className="text-sky-800 font-extrabold font-mono-numbers">{formatINR(item.revenue)}</span>
            </div>
            <div className="w-full h-2 spatial-track">
              <div
                className="h-full bg-gradient-to-r from-sky-600 to-cyan-500 rounded-full transition-all duration-500 shadow-sm shadow-sky-500/20"
                style={{ width: `${Math.max(2, item.share_percentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers">
              <span>{item.bookings_count} bookings</span>
              <span>{item.share_percentage}% of fleet revenue</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // CHART 9: REVENUE BY DESTINATION
  function renderRevenueByDestinationChart(items: AdminAnalyticsCharts['revenue_by_destination']) {
    if (!items || items.length === 0) {
      return <div className="text-xs text-slate-400 py-6 text-center">No destination revenue records.</div>;
    }

    return (
      <div className="space-y-3.5 pt-2">
        {items.map((d) => (
          <div key={d.destination} className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-900">{d.destination}</span>
              <span className="text-emerald-700 font-extrabold font-mono-numbers">{formatINR(d.revenue)}</span>
            </div>
            <div className="w-full h-2 spatial-track">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/20"
                style={{ width: `${Math.max(2, d.share_percentage)}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-slate-400 font-mono-numbers">
              {d.share_percentage}% of total revenue
            </div>
          </div>
        ))}
      </div>
    );
  }

  // CHART 10: MONTHLY GROWTH RATE
  function renderMonthlyGrowthVisualChart(items: AdminAnalyticsCharts['monthly_growth']) {
    if (!items || items.length === 0) {
      return <div className="text-xs text-slate-400 py-6 text-center">No monthly growth data.</div>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 pt-2">
        {items.map((m) => {
          const isPositive = m.revenue_growth_percentage >= 0;
          return (
            <div
              key={m.month_label}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-1.5 hover:border-slate-300 shadow-sm transition hover:-translate-y-1 duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">{m.month_label}</span>
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full font-mono-numbers ${
                    isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-rose-600" />
                  )}
                  {m.revenue_growth_percentage > 0 ? `+${m.revenue_growth_percentage}%` : `${m.revenue_growth_percentage}%`}
                </span>
              </div>
              <p className="text-base font-black text-slate-900 font-mono-numbers">{formatINR(m.revenue)}</p>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono-numbers">
                <span>{m.bookings_count} orders</span>
                <span className="text-emerald-700 font-bold">{formatINR(m.profit)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
};
