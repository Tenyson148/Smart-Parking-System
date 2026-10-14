import React, { useState, useEffect } from 'react';
import {
  api,
  SystemStatus,
  DashboardData,
  Slot,
  Customer,
  Vehicle,
  Pass,
  PaymentRecord,
  ReportsData,
  TestSuiteResponse
} from './api';
import confetti from 'canvas-confetti';
import {
  Car,
  Bike,
  Truck,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Receipt,
  Clock,
  DollarSign,
  Search,
  Plus,
  RefreshCw,
  Terminal,
  ShieldCheck,
  FileText,
  Printer,
  ChevronRight,
  Database
} from 'lucide-react';

type Tab = 'dashboard' | 'gate' | 'slots' | 'passes' | 'customers' | 'payments' | 'reports' | 'tests';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [testResults, setTestResults] = useState<TestSuiteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals & form state
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState<any | null>(null);
  const [showReserveModal, setShowReserveModal] = useState<Slot | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<any | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  // Forms
  const [entryPlate, setEntryPlate] = useState('');
  const [entrySlotId, setEntrySlotId] = useState<number | ''>('');

  const [reserveCustomerId, setReserveCustomerId] = useState<number | ''>('');
  const [reserveVehicleId, setReserveVehicleId] = useState<number | ''>('');
  const [reserveStart, setReserveStart] = useState('');
  const [reserveEnd, setReserveEnd] = useState('');

  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'upi'>('upi');

  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');

  const [vehCustomerId, setVehCustomerId] = useState<number | ''>('');
  const [vehPlate, setVehPlate] = useState('');
  const [vehType, setVehType] = useState<'two_wheeler' | 'four_wheeler' | 'heavy_vehicle' | 'ev'>('four_wheeler');
  const [vehModel, setVehModel] = useState('');

  const [passCustomerId, setPassCustomerId] = useState<number | ''>('');
  const [passVehicleId, setPassVehicleId] = useState<number | ''>('');
  const [passType, setPassType] = useState<'daily' | 'weekly' | 'monthly' | 'vip'>('monthly');
  const [passPrice, setPassPrice] = useState<number>(300);

  // Slot search & filters
  const [slotTypeFilter, setSlotTypeFilter] = useState('');
  const [slotFloorFilter, setSlotFloorFilter] = useState('');
  const [slotStatusFilter, setSlotStatusFilter] = useState('');

  // Initial load
  useEffect(() => {
    refreshAll();
  }, []);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [st, db, sl, cu, ve, pa, py, rp] = await Promise.all([
        api.getStatus(),
        api.getDashboard(),
        api.getSlots(),
        api.getCustomers(),
        api.getVehicles(),
        api.getPasses(),
        api.getPayments(),
        api.getReports()
      ]);
      setStatus(st);
      setDashboard(db);
      setSlots(sl);
      setCustomers(cu);
      setVehicles(ve);
      setPasses(pa);
      setPayments(py);
      setReports(rp);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 6000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Actions
  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryPlate || !entrySlotId) return;
    try {
      const res = await api.recordEntry({ license_plate: entryPlate, slot_id: Number(entrySlotId) });
      showNotification(`Vehicle entry recorded for ${entryPlate} into Slot #${entrySlotId}.${res.hasActivePass ? ' Valid pass recognized (Zero parking fee)!' : ''}`);
      setShowEntryModal(false);
      setEntryPlate('');
      setEntrySlotId('');
      refreshAll();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleExit = async (sessionId: number) => {
    try {
      const res = await api.recordExit({ session_id: sessionId });
      setShowExitModal(null);
      refreshAll();
      if (res.session.total_amount > 0 && res.session.payment_status === 'unpaid') {
        // Open payment modal immediately
        setShowPaymentModal(res.session);
        setPayAmount(res.session.total_amount);
      } else {
        showNotification(`Vehicle exited. Duration: ${res.session.duration_hours} hr(s). Status: Paid (Pass/Zero balance)`);
      }
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReserveModal || !reserveCustomerId || !reserveVehicleId || !reserveStart || !reserveEnd) return;
    try {
      await api.reserveSlot({
        customer_id: Number(reserveCustomerId),
        vehicle_id: Number(reserveVehicleId),
        slot_id: showReserveModal.id,
        start_time: reserveStart,
        end_time: reserveEnd
      });
      showNotification(`Slot ${showReserveModal.slot_number} reserved successfully!`);
      setShowReserveModal(null);
      setReserveCustomerId('');
      setReserveVehicleId('');
      refreshAll();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal || !payAmount) return;
    try {
      const res = await api.recordPayment({
        session_id: showPaymentModal.id,
        amount: Number(payAmount),
        payment_method: payMethod
      });
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
      showNotification(`Payment of $${Number(payAmount).toFixed(2)} recorded! Receipt: ${res.payment.receipt_number}`);
      setShowPaymentModal(null);
      setSelectedReceipt({
        ...res.payment,
        total_amount: showPaymentModal.total_amount,
        duration_hours: showPaymentModal.duration_hours,
        hourly_rate: showPaymentModal.hourly_rate,
        license_plate: showPaymentModal.license_plate,
        slot_number: showPaymentModal.slot_number,
        entry_time: showPaymentModal.entry_time,
        exit_time: showPaymentModal.exit_time
      });
      setPayAmount('');
      refreshAll();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCustomer({ name: custName, phone: custPhone, email: custEmail });
      showNotification(`Customer '${custName}' registered successfully`);
      setShowCustomerModal(false);
      setCustName('');
      setCustPhone('');
      setCustEmail('');
      refreshAll();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehCustomerId) return;
    try {
      await api.createVehicle({
        customer_id: Number(vehCustomerId),
        license_plate: vehPlate,
        vehicle_type: vehType,
        brand_model: vehModel
      });
      showNotification(`Vehicle ${vehPlate} registered successfully`);
      setShowVehicleModal(false);
      setVehPlate('');
      setVehModel('');
      setVehCustomerId('');
      refreshAll();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passCustomerId || !passVehicleId) return;
    const start = new Date().toISOString().split('T')[0];
    const expiry = new Date();
    if (passType === 'daily') expiry.setDate(expiry.getDate() + 1);
    else if (passType === 'weekly') expiry.setDate(expiry.getDate() + 7);
    else if (passType === 'monthly') expiry.setDate(expiry.getDate() + 30);
    else expiry.setDate(expiry.getDate() + 90);

    try {
      await api.createPass({
        customer_id: Number(passCustomerId),
        vehicle_id: Number(passVehicleId),
        pass_type: passType,
        price: Number(passPrice),
        start_date: start,
        end_date: expiry.toISOString().split('T')[0]
      });
      showNotification(`Active ${passType.toUpperCase()} pass issued!`);
      setShowPassModal(false);
      refreshAll();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const runVerificationSuite = async () => {
    setLoading(true);
    try {
      const res = await api.runTestSuite();
      setTestResults(res);
      if (res.all_passed) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
        showNotification(`All ${res.total_tests} Review 3 automated tests PASSED successfully!`);
      } else {
        showNotification(`${res.passed_tests} of ${res.total_tests} tests passed. Check details.`, true);
      }
      refreshAll();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const formatVehicleType = (type: string) => {
    switch (type) {
      case 'two_wheeler':
        return <span className="inline-flex items-center gap-1.5"><Bike className="w-3.5 h-3.5" /> 2-Wheeler</span>;
      case 'four_wheeler':
        return <span className="inline-flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> 4-Wheeler</span>;
      case 'heavy_vehicle':
        return <span className="inline-flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Heavy/Truck</span>;
      case 'ev':
        return <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium"><Zap className="w-3.5 h-3.5 text-emerald-600" /> EV Station</span>;
      default:
        return type;
    }
  };

  // Filtered slots
  const filteredSlots = slots.filter(s => {
    if (slotTypeFilter && s.slot_type !== slotTypeFilter) return false;
    if (slotFloorFilter && s.floor !== slotFloorFilter) return false;
    if (slotStatusFilter && s.status !== slotStatusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast alerts */}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium leading-relaxed">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-rose-400 hover:text-rose-700 font-bold">×</button>
        </div>
      )}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium leading-relaxed">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-400 hover:text-emerald-700 font-bold">×</button>
        </div>
      )}

      {/* Top Bar Contract (Brand, Nav links, 1 Primary Action) */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8 sticky top-0 z-40">
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            ParkFlow <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">Review 3 Edition</span>
          </span>
          <span className="hidden lg:inline text-xs text-slate-500 font-mono">
            {status?.engine === 'mysql_ready' ? 'MySQL Connected' : 'Relational Engine: In-Memory / Strict MySQL Schema'}
          </span>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium text-slate-600 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'gate', label: 'Gate Entry/Exit' },
            { id: 'slots', label: 'Slots & Reserve' },
            { id: 'passes', label: 'Passes' },
            { id: 'customers', label: 'Customers & Cars' },
            { id: 'payments', label: 'Payments' },
            { id: 'reports', label: 'Reports' },
            { id: 'tests', label: 'Review 3 Tests' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowEntryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Record Entry
          </button>
          <button
            onClick={refreshAll}
            title="Refresh Data"
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* Quick KPI Strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs font-medium text-slate-500">Total Capacity</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">{dashboard?.total_slots || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Across 3 Parking Floors</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs font-medium text-slate-500">Live Occupied</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-700 mt-1">{dashboard?.occupied || 0}</div>
            <div className="text-xs text-slate-500 mt-1">{dashboard?.occupancy_rate || 0}% Occupancy Rate</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs font-medium text-slate-500">Available Slots</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">{dashboard?.available || 0}</div>
            <div className="text-xs text-slate-500 mt-1">{dashboard?.reserved || 0} Reserved Slots</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs font-medium text-slate-500">Total Revenue Collected</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              ${reports?.revenue.total.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Hourly + Passes</div>
          </div>
        </section>

        {/* ---------------- TAB 1: DASHBOARD ---------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Floor Occupancy Breakdown */}
              <div className="lg:col-span-1 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Occupancy by Floor</h3>
                <div className="space-y-3">
                  {dashboard && Object.entries(dashboard.floor_breakdown).map(([floor, data]) => {
                    const pct = data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0;
                    return (
                      <div key={floor} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-700">
                          <span className="font-medium">{floor}</span>
                          <span className="font-mono tabular-nums text-slate-500">{data.occupied} / {data.total} slots ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Slot Allocation Types</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Bike className="w-3.5 h-3.5" /> 2-Wheeler</span>
                      <span className="font-mono font-bold text-slate-900">
                        {slots.filter(s => s.slot_type === 'two_wheeler' && s.status === 'available').length} free
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> 4-Wheeler</span>
                      <span className="font-mono font-bold text-slate-900">
                        {slots.filter(s => s.slot_type === 'four_wheeler' && s.status === 'available').length} free
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Heavy</span>
                      <span className="font-mono font-bold text-slate-900">
                        {slots.filter(s => s.slot_type === 'heavy_vehicle' && s.status === 'available').length} free
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-emerald-600" /> EV Station</span>
                      <span className="font-mono font-bold text-slate-900">
                        {slots.filter(s => s.slot_type === 'ev' && s.status === 'available').length} free
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Parked Vehicles List */}
              <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Currently Parked Vehicles</h3>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">{dashboard?.active_sessions.length || 0} active</span>
                </div>

                {dashboard?.active_sessions.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    No vehicles currently parked. Use "Record Entry" to check in a vehicle.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Vehicle Plate</th>
                          <th className="py-2.5 px-3">Slot</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Entry Time</th>
                          <th className="py-2.5 px-3">Pass / Rate</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dashboard?.active_sessions.map(sess => (
                          <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">{sess.license_plate}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-700">{sess.slot_number} ({sess.floor})</td>
                            <td className="py-2.5 px-3 text-slate-600">{formatVehicleType(sess.vehicle_type)}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                              {new Date(sess.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-3">
                              {sess.has_active_pass ? (
                                <span className="text-emerald-700 font-medium">Valid Pass (Free)</span>
                              ) : (
                                <span className="font-mono tabular-nums text-slate-600">${sess.hourly_rate}/hr</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleExit(sess.id)}
                                className="px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded transition-colors"
                              >
                                Process Exit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- TAB 2: GATE ENTRY / EXIT ---------------- */}
        {activeTab === 'gate' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Quick Vehicle Entry Form */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-semibold text-slate-900">Vehicle Entry Check-in</h3>
              </div>
              <p className="text-xs text-slate-500">
                Registers vehicle arrival, verifies customer pass validity, and assigns an available compatible parking slot.
              </p>

              <form onSubmit={handleEntry} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Registered Vehicle or Enter Plate</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. KA-01-AB-1234"
                      value={entryPlate}
                      onChange={e => setEntryPlate(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md uppercase font-mono"
                    />
                    <select
                      onChange={e => setEntryPlate(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-700"
                    >
                      <option value="">Quick Select</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.license_plate}>
                          {v.license_plate} ({v.brand_model})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Available Slot</label>
                  <select
                    required
                    value={entrySlotId}
                    onChange={e => setEntrySlotId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  >
                    <option value="">Select an available slot...</option>
                    {slots
                      .filter(s => s.status === 'available')
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.slot_number} - {s.floor} ({s.slot_type}) - ${s.hourly_rate}/hr
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
                >
                  Confirm Entry & Allocate Slot
                </button>
              </form>
            </div>

            {/* Quick Vehicle Exit Card */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-semibold text-slate-900">Vehicle Exit & Automatic Billing</h3>
              </div>
              <p className="text-xs text-slate-500">
                Calculates total parking duration, applies slot hourly rate, checks for active passes, and generates the payment balance.
              </p>

              {dashboard?.active_sessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-md">
                  No active vehicles parked in the lot.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {dashboard?.active_sessions.map(sess => (
                    <div key={sess.id} className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900 font-mono text-sm">{sess.license_plate}</div>
                        <div className="text-xs text-slate-500">
                          Slot {sess.slot_number} · In since {new Date(sess.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleExit(sess.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors whitespace-nowrap"
                      >
                        Calculate Bill & Exit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ---------------- TAB 3: SLOTS & RESERVATION ---------------- */}
        {activeTab === 'slots' && (
          <div className="space-y-6">
            
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Filter Slots:</span>
                <select
                  value={slotFloorFilter}
                  onChange={e => setSlotFloorFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
                >
                  <option value="">All Floors</option>
                  <option value="Floor 1">Floor 1</option>
                  <option value="Floor 2">Floor 2</option>
                  <option value="Floor 3">Floor 3</option>
                </select>

                <select
                  value={slotTypeFilter}
                  onChange={e => setSlotTypeFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
                >
                  <option value="">All Vehicle Types</option>
                  <option value="two_wheeler">2-Wheeler</option>
                  <option value="four_wheeler">4-Wheeler</option>
                  <option value="heavy_vehicle">Heavy/Truck</option>
                  <option value="ev">EV Station</option>
                </select>

                <select
                  value={slotStatusFilter}
                  onChange={e => setSlotStatusFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
                >
                  <option value="">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="occupied">Occupied</option>
                </select>

                {(slotFloorFilter || slotTypeFilter || slotStatusFilter) && (
                  <button
                    onClick={() => { setSlotFloorFilter(''); setSlotTypeFilter(''); setSlotStatusFilter(''); }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Showing {filteredSlots.length} of {slots.length} slots
              </div>
            </div>

            {/* Visual Slots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredSlots.map(slot => {
                const isAvail = slot.status === 'available';
                const isOccupied = slot.status === 'occupied';
                const isReserved = slot.status === 'reserved';

                return (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-lg border transition-all ${
                      isAvail
                        ? 'bg-white border-emerald-200 hover:border-emerald-400'
                        : isOccupied
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-base font-bold font-mono text-slate-900">{slot.slot_number}</div>
                        <div className="text-xs text-slate-500">{slot.floor}</div>
                      </div>
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                        isAvail ? 'text-emerald-700' : isOccupied ? 'text-rose-700' : 'text-amber-700'
                      }`}>
                        {slot.status}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-slate-600">
                      {formatVehicleType(slot.slot_type)}
                    </div>

                    <div className="mt-2 text-xs font-mono font-medium text-slate-700">
                      ${slot.hourly_rate.toFixed(2)}/hr
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                      {isAvail ? (
                        <button
                          onClick={() => {
                            setShowReserveModal(slot);
                            const now = new Date();
                            const future = new Date();
                            future.setHours(future.getHours() + 2);
                            setReserveStart(now.toISOString().slice(0, 16));
                            setReserveEnd(future.toISOString().slice(0, 16));
                          }}
                          className="w-full py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          Reserve Slot
                        </button>
                      ) : (
                        <div className="w-full text-center py-1 text-[11px] text-slate-400 font-mono">
                          {isOccupied ? 'In Active Use' : 'Reserved'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- TAB 4: PASS MANAGEMENT ---------------- */}
        {activeTab === 'passes' && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Pass Management (Req 4)</h3>
                <p className="text-xs text-slate-500">Long-term subscription passes offering complimentary or flat-rate parking access.</p>
              </div>
              <button
                onClick={() => setShowPassModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Issue New Pass
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Pass ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Vehicle Plate</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Price Paid</th>
                    <th className="py-2.5 px-3">Valid Range</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {passes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">No passes issued yet.</td>
                    </tr>
                  ) : (
                    passes.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">PASS-#{p.id}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{p.customer_name} ({p.customer_phone})</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{p.license_plate}</td>
                        <td className="py-2.5 px-3 uppercase font-semibold text-slate-700">{p.pass_type}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">${p.price.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {p.start_date} to {p.end_date}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`text-[11px] font-semibold ${p.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {p.is_active ? 'Active' : 'Expired'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- TAB 5: CUSTOMERS & VEHICLES CRUD ---------------- */}
        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Customers CRUD */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Customers (CRUD)</h3>
                  <p className="text-xs text-slate-500">Customer directory with relational vehicle links</p>
                </div>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                >
                  + Add Customer
                </button>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3 text-right">Vehicles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{c.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{c.phone}</td>
                        <td className="py-2.5 px-3 text-slate-600">{c.email}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                          {c.vehicle_count || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vehicles CRUD */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Vehicles (CRUD)</h3>
                  <p className="text-xs text-slate-500">Vehicle master linked to customer IDs with unique plates</p>
                </div>
                <button
                  onClick={() => setShowVehicleModal(true)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                >
                  + Add Vehicle
                </button>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Plate</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Model</th>
                      <th className="py-2 px-3 text-right">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicles.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{v.license_plate}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatVehicleType(v.vehicle_type)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{v.brand_model}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{v.customer_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ---------------- TAB 6: PAYMENTS & RECEIPTS ---------------- */}
        {activeTab === 'payments' && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Payments & Receipts (Req 5)</h3>
                <p className="text-xs text-slate-500">Audit trail of parking session fee collections and printable receipts</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Session</th>
                    <th className="py-2.5 px-3">Vehicle Plate</th>
                    <th className="py-2.5 px-3">Slot</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">No payment records yet.</td>
                    </tr>
                  ) : (
                    payments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.receipt_number}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">Session #{p.session_id}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{p.license_plate}</td>
                        <td className="py-2.5 px-3 text-slate-600">{p.slot_number}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">${p.amount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 uppercase text-slate-700 font-medium">{p.payment_method}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {new Date(p.payment_time).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="px-2 py-1 text-xs text-slate-700 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                          >
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- TAB 7: REPORTS ---------------- */}
        {activeTab === 'reports' && reports && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Occupancy Report */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Occupancy Distribution</h3>
                <div className="text-3xl font-bold font-mono text-slate-900">
                  {reports.occupancy.rate}%
                </div>
                <div className="text-xs text-slate-500">
                  {reports.occupancy.occupied} of {reports.occupancy.total} slots currently occupied
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {Object.entries(reports.occupancy.by_type).map(([type, d]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span className="text-slate-600">{type.replace('_', ' ')}</span>
                      <span className="font-mono text-slate-900 font-medium">{d.occupied} / {d.total} occupied</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration Report */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Parking Duration Analysis</h3>
                <div className="text-3xl font-bold font-mono text-slate-900">
                  {reports.duration.average_hours} <span className="text-sm font-normal text-slate-500">hrs avg</span>
                </div>
                <div className="text-xs text-slate-500">
                  Based on {reports.duration.total_completed_sessions} completed vehicle stays
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {Object.entries(reports.duration.buckets).map(([bucket, count]) => (
                    <div key={bucket} className="flex justify-between text-xs">
                      <span className="text-slate-600">{bucket}</span>
                      <span className="font-mono text-slate-900 font-medium">{count} stays</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue Report */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Revenue Breakdown</h3>
                <div className="text-3xl font-bold font-mono text-emerald-700">
                  ${reports.revenue.total.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  Total revenue across hourly billing & long-term passes
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Hourly Stays</span>
                    <span className="font-mono text-slate-900 font-medium">${reports.revenue.hourly_parking.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Pass Subscriptions</span>
                    <span className="font-mono text-slate-900 font-medium">${reports.revenue.passes.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">Payment Modes:</div>
                  {Object.entries(reports.revenue.by_method).map(([m, amt]) => (
                    <div key={m} className="flex justify-between text-xs pl-2">
                      <span className="uppercase text-slate-600">{m}</span>
                      <span className="font-mono text-slate-800">${amt.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ---------------- TAB 8: REVIEW 3 TEST RUNNER & MYSQL SCRIPTS ---------------- */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            
            {/* Header with Run button */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Review 3 Automated Verification Test Runner</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Executes automated workflow scenarios covering all 8 requirements, proving valid operations and demonstrating rejected invalid operations.
                </p>
              </div>
              <button
                onClick={runVerificationSuite}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs whitespace-nowrap self-start sm:self-auto"
              >
                <Terminal className="w-4 h-4" />
                {loading ? 'Executing Test Scenarios...' : 'Run Automated Test Suite'}
              </button>
            </div>

            {/* Test Results Display */}
            {testResults && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 rounded-lg border bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {testResults.all_passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600" />
                    )}
                    <span className="text-sm font-bold text-slate-900">
                      {testResults.passed_tests} / {testResults.total_tests} Tests Passed
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      (Executed at {new Date(testResults.timestamp).toLocaleTimeString()})
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    testResults.all_passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {testResults.all_passed ? 'ALL INVARIANTS VERIFIED' : 'TEST FAILURES DETECTED'}
                  </span>
                </div>

                <div className="space-y-3">
                  {testResults.tests.map(t => (
                    <div
                      key={t.id}
                      className={`p-4 rounded-lg border bg-white transition-all ${
                        t.passed ? 'border-slate-200' : 'border-rose-300 bg-rose-50/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-500">#{t.id}</span>
                            <span className="text-sm font-semibold text-slate-900">{t.scenario}</span>
                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                              t.type === 'positive' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {t.type === 'positive' ? 'Happy Path' : 'Constraint Rejection'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">{t.requirement}</div>
                        </div>

                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
                          t.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {t.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {t.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                        <div>
                          <span className="font-semibold text-slate-600">Expected: </span>
                          <span className="text-slate-700">{t.expected}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600">Actual: </span>
                          <span className={t.passed ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'}>{t.actual}</span>
                        </div>
                      </div>

                      <div className="mt-2 p-2 bg-slate-50 rounded text-[11px] font-mono text-slate-600 overflow-x-auto">
                        <span className="text-slate-400 select-none">SQL / Rule: </span>
                        {t.sqlStatement}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standalone Testing Files Information */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-700" />
                <h4 className="text-sm font-semibold text-slate-900">Local MySQL & Python Testing Assets</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                As required, complete standalone files have been generated in your workspace so you can test directly against your personal MySQL database and execute tests with Python:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-900 font-mono">schema.sql</div>
                  <div className="text-slate-500">MySQL 8.0+ DDL with Foreign Keys, Check Constraints, and Seed Slots.</div>
                  <div className="text-[11px] font-mono text-slate-700 pt-1">mysql -u root -p &lt; schema.sql</div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-900 font-mono">test_suite.py</div>
                  <div className="text-slate-500">Automated Python test runner verifying all 8 Review 3 tests against your local MySQL.</div>
                  <div className="text-[11px] font-mono text-slate-700 pt-1">python test_suite.py --user root</div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-900 font-mono">backend.py</div>
                  <div className="text-slate-500">Standalone Python/Flask backend connecting to MySQL on localhost:3306.</div>
                  <div className="text-[11px] font-mono text-slate-700 pt-1">python backend.py</div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Refer to <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">LOCAL_TESTING_GUIDE.md</code> for exact command-line steps.
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ---------------- MODALS ---------------- */}

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-slate-900">Vehicle Entry Check-in</h3>
              <button onClick={() => setShowEntryModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <form onSubmit={handleEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle License Plate</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DL-01-AB-1234"
                  value={entryPlate}
                  onChange={e => setEntryPlate(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Available Parking Slot</label>
                <select
                  required
                  value={entrySlotId}
                  onChange={e => setEntrySlotId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                >
                  <option value="">Select slot...</option>
                  {slots.filter(s => s.status === 'available').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.slot_number} ({s.floor}) - {s.slot_type} - ${s.hourly_rate}/hr
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                >
                  Confirm Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Reserve Slot {showReserveModal.slot_number}</h3>
                <div className="text-xs text-slate-500">{showReserveModal.floor} · {formatVehicleType(showReserveModal.slot_type)} · ${showReserveModal.hourly_rate}/hr</div>
              </div>
              <button onClick={() => setShowReserveModal(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleReservation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer</label>
                <select
                  required
                  value={reserveCustomerId}
                  onChange={e => {
                    setReserveCustomerId(Number(e.target.value));
                    setReserveVehicleId('');
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                >
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Vehicle</label>
                <select
                  required
                  value={reserveVehicleId}
                  onChange={e => setReserveVehicleId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                >
                  <option value="">Select vehicle...</option>
                  {vehicles
                    .filter(v => reserveCustomerId ? v.customer_id === reserveCustomerId : true)
                    .map(v => (
                      <option key={v.id} value={v.id}>
                        {v.license_plate} ({v.vehicle_type}) - {v.brand_model}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={reserveStart}
                    onChange={e => setReserveStart(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={reserveEnd}
                    onChange={e => setReserveEnd(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
                <strong>Strict Rule:</strong> Slot collision checks prevent overlapping bookings and incompatible vehicle types.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReserveModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-slate-900">Record Payment & Issue Receipt</h3>
              <button onClick={() => setShowPaymentModal(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Session ID:</span>
                <span className="font-mono font-semibold">#{showPaymentModal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration Parked:</span>
                <span className="font-mono">{showPaymentModal.duration_hours} hour(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rate:</span>
                <span className="font-mono">${showPaymentModal.hourly_rate}/hr</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Due:</span>
                <span className="font-mono">${(showPaymentModal.total_amount - showPaymentModal.amount_paid).toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Rule: Cannot exceed outstanding balance of ${(showPaymentModal.total_amount - showPaymentModal.amount_paid).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['upi', 'card', 'cash'] as const).map(method => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPayMethod(method)}
                      className={`py-2 text-xs font-semibold uppercase rounded border transition-colors ${
                        payMethod === method
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="text-center pb-2 border-b border-slate-200">
              <div className="text-lg font-bold tracking-tight text-slate-900">PARKFLOW PARKING RECEIPT</div>
              <div className="text-[11px] text-slate-500">Official Payment Voucher (Review 3 Evaluation)</div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Session ID:</span>
                <span>#{selectedReceipt.session_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date/Time:</span>
                <span>{new Date(selectedReceipt.payment_time).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="uppercase font-semibold">{selectedReceipt.payment_method}</span>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle:</span>
                  <span className="font-bold">{selectedReceipt.license_plate || 'Recorded'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Slot Number:</span>
                  <span>{selectedReceipt.slot_number || 'Standard'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span>{selectedReceipt.duration_hours || 1} hour(s)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-900 flex justify-between text-sm font-bold text-slate-900">
                <span>TOTAL PAID:</span>
                <span>${selectedReceipt.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-slate-900">Add New Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Unique)</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={custEmail}
                  onChange={e => setCustEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-slate-900">Register New Vehicle</h3>
              <button onClick={() => setShowVehicleModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Owner</label>
                <select
                  required
                  value={vehCustomerId}
                  onChange={e => setVehCustomerId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                >
                  <option value="">Select Customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">License Plate (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KA-05-MN-5678"
                  value={vehPlate}
                  onChange={e => setVehPlate(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Classification</label>
                <select
                  value={vehType}
                  onChange={e => setVehType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                >
                  <option value="four_wheeler">4-Wheeler (Car / SUV)</option>
                  <option value="two_wheeler">2-Wheeler (Bike / Scooter)</option>
                  <option value="heavy_vehicle">Heavy Vehicle (Truck / Bus)</option>
                  <option value="ev">Electric Vehicle (EV)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brand & Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Toyota Camry"
                  value={vehModel}
                  onChange={e => setVehModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                >
                  Register Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pass Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-slate-900">Issue Parking Pass</h3>
              <button onClick={() => setShowPassModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreatePass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer</label>
                <select
                  required
                  value={passCustomerId}
                  onChange={e => {
                    setPassCustomerId(Number(e.target.value));
                    setPassVehicleId('');
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                >
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle</label>
                <select
                  required
                  value={passVehicleId}
                  onChange={e => setPassVehicleId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                >
                  <option value="">Select vehicle...</option>
                  {vehicles
                    .filter(v => passCustomerId ? v.customer_id === passCustomerId : true)
                    .map(v => (
                      <option key={v.id} value={v.id}>{v.license_plate} ({v.brand_model})</option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pass Duration</label>
                  <select
                    value={passType}
                    onChange={e => {
                      const t = e.target.value as any;
                      setPassType(t);
                      if (t === 'daily') setPassPrice(50);
                      else if (t === 'weekly') setPassPrice(150);
                      else if (t === 'monthly') setPassPrice(500);
                      else setPassPrice(1200);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                  >
                    <option value="daily">Daily ($50)</option>
                    <option value="weekly">Weekly ($150)</option>
                    <option value="monthly">Monthly ($500)</option>
                    <option value="vip">VIP Quarterly ($1200)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    required
                    value={passPrice}
                    onChange={e => setPassPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                >
                  Issue Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
