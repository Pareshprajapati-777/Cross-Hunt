import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Users,
  Ship,
  Sparkles,
  ArrowDownToLine,
  BarChart3
} from 'lucide-react';
import {
  generateAdminReport,
  GeneratedReportResult
} from '../../api/dashboards';
import { formatINR } from '../../utils/currency';

type ReportType = 'financial_ledger' | 'bookings_manifest' | 'fleet_performance';

export const AdminReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('financial_ledger');
  const [preset, setPreset] = useState<string>('last_30_days');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [useCustomDates, setUseCustomDates] = useState(false);

  const [reportData, setReportData] = useState<GeneratedReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const res = await generateAdminReport({
        report_type: reportType,
        preset: useCustomDates ? undefined : preset,
        date_from: useCustomDates ? customFrom : undefined,
        date_to: useCustomDates ? customTo : undefined,
      });
      setReportData(res);
    } catch (err) {
      console.error('Failed to generate business report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateReport();
  }, [reportType, preset]);

  // CSV Export utility
  const handleExportCSV = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      alert('No data rows to export.');
      return;
    }

    const headers = reportData.columns;
    const keys = Object.keys(reportData.rows[0]);

    const csvRows: string[] = [];
    // Header row
    csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    // Data rows
    for (const row of reportData.rows) {
      const values = keys.map((key) => {
        const val = row[key] !== undefined && row[key] !== null ? String(row[key]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `cruise_hunt_${reportType}_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print utility
  const handlePrint = () => {
    window.print();
  };

  // Filter rows by search
  const filteredRows = (reportData?.rows || []).filter((row) => {
    if (!tableSearch.trim()) return true;
    const term = tableSearch.toLowerCase();
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. REPORT TYPE SELECTOR CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[
          {
            id: 'financial_ledger',
            title: 'Financial & Revenue Report',
            desc: 'Total sales, commissions, host payouts, refunds, and earnings',
            icon: DollarSign,
            color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
          },
          {
            id: 'bookings_manifest',
            title: 'Passenger & Trip Bookings',
            desc: 'Passenger party count, cabin packages, ticket codes, and status',
            icon: FileText,
            color: 'text-sky-600 bg-sky-50 border-sky-200',
          },
          {
            id: 'fleet_performance',
            title: 'Ship & Boat Performance',
            desc: 'Trips per boat, revenue per ship, and seat occupancy metrics',
            icon: Ship,
            color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = reportType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setReportType(item.id as ReportType);
              }}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition relative overflow-hidden ${
                isActive
                  ? 'bg-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs text-slate-900 leading-snug">{item.title}</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
            </button>
          );
        })}
      </div>

      {/* 2. DATE FILTER & EXPORT TOOLBAR */}
      <div className="spatial-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Preset Range Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold font-ui">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Period:
          </span>
          {[
            { id: 'last_7_days', label: 'Last 7 Days' },
            { id: 'last_30_days', label: 'Last 30 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_quarter', label: 'Last Quarter (90d)' },
            { id: 'year_to_date', label: 'Year to Date' },
            { id: 'all_time', label: 'All Time' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setUseCustomDates(false);
                setPreset(p.id);
              }}
              className={`px-3 py-1.5 rounded-xl cursor-pointer transition whitespace-nowrap ${
                !useCustomDates && preset === p.id
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}

          <button
            onClick={() => setUseCustomDates(!useCustomDates)}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition border ${
              useCustomDates
                ? 'bg-sky-50 text-sky-800 border-sky-300 font-bold'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Export & Actions */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={handleExportCSV}
            disabled={!reportData || reportData.rows.length === 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition disabled:opacity-50"
            title="Download CSV spreadsheet"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Export to CSV / Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleGenerateReport}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            title="Regenerate Live"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Pickers Drawer if activated */}
      {useCustomDates && (
        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 flex flex-wrap items-center gap-3 animate-in fade-in duration-150 text-xs">
          <div>
            <label className="text-[10px] font-bold uppercase text-sky-900 block mb-1">From Date</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-sky-300 bg-white text-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-sky-900 block mb-1">To Date</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-sky-300 bg-white text-slate-800"
            />
          </div>
          <button
            onClick={handleGenerateReport}
            className="px-4 py-2 mt-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer shadow-sm"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* 3. GENERATED REPORT PREVIEW CANVAS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Report Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider mb-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Verified Master Audit Record
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-serif">
              {reportData?.title || 'Business Analytics Report'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Period: <span className="font-bold text-slate-800">{reportData?.range_label || 'All Time'}</span> • Generated: {reportData?.generated_at}
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter within generated table..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs w-60 bg-slate-50 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* SUMMARY KPI BAR (Specific to Report Type) */}
        {reportData?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
            {Object.entries(reportData.summary).map(([key, val]) => (
              <div key={key} className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-base font-black text-slate-900 font-mono-numbers block">
                  {typeof val === 'number' && key.toLowerCase().includes('total') && !key.toLowerCase().includes('count') && !key.toLowerCase().includes('vessels') && !key.toLowerCase().includes('passengers') && !key.toLowerCase().includes('users') && !key.toLowerCase().includes('bookings')
                    ? formatINR(val)
                    : typeof val === 'number' && key.toLowerCase().includes('profit')
                    ? formatINR(val)
                    : String(val)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* REPORT DATA TABLE */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  {reportData?.columns.map((col, idx) => (
                    <th key={idx} className="py-3 px-4 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-ui">
                {loading ? (
                  <tr>
                    <td colSpan={reportData?.columns.length || 6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
                      Synthesizing enterprise report data...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={reportData?.columns.length || 6} className="py-12 text-center text-slate-400">
                      No records found for the selected filter and period.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition">
                      {Object.values(row).map((val: any, cIdx) => (
                        <td key={cIdx} className="py-3 px-4 whitespace-nowrap">
                          {typeof val === 'number' && (String(val).length > 3 || Object.keys(row)[cIdx].includes('amount') || Object.keys(row)[cIdx].includes('price') || Object.keys(row)[cIdx].includes('revenue') || Object.keys(row)[cIdx].includes('payout') || Object.keys(row)[cIdx].includes('commission') || Object.keys(row)[cIdx].includes('profit')) ? (
                            <span className="font-mono font-bold text-slate-900">
                              {formatINR(val)}
                            </span>
                          ) : val === 'CONFIRMED' || val === 'PAID' || val === 'Active' || val === 'Verified' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {val}
                            </span>
                          ) : val === 'CANCELLED' || val === 'FAILED' || val === 'Blocked' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              {val}
                            </span>
                          ) : val === 'PENDING' || val === 'Pending Payout' || val === 'Unverified' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              {val}
                            </span>
                          ) : (
                            <span className="text-slate-700">{String(val)}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <span>Showing {filteredRows.length} total entries</span>
          <span>Cruise Hunt Executive Analytics Engine • RFC 4180 Certified CSV</span>
        </div>
      </div>
    </div>
  );
};
