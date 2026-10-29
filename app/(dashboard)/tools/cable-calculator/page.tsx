"use client";

import { useState } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Calculator,
  Zap,
  RotateCcw,
  Scale,
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { CustomSelect } from "@/components/ui";

export interface CableSpec {
  size: string;
  nominalArea: number; // mm2
  currentCapEnclosed: number; // Amps enclosed in conduit (BDS 900 / IEC 60364-5-52 @ 30°C)
  currentCapFreeAir: number; // Amps clipped direct / open air
  resPerKm: number; // Ohm/km @ 20°C DC copper
  weightPer100m: number; // kg per 100 meters
  applications: string;
}

export const CABLE_STANDARDS: CableSpec[] = [
  { size: "1.0 RM BYA", nominalArea: 1.0, currentCapEnclosed: 11, currentCapFreeAir: 15, resPerKm: 18.1, weightPer100m: 1.4, applications: "Lighting & Exhaust Fans" },
  { size: "1.3 RM BYA", nominalArea: 1.3, currentCapEnclosed: 14, currentCapFreeAir: 18, resPerKm: 14.2, weightPer100m: 1.8, applications: "Lighting & Ceiling Fans" },
  { size: "1.5 RM BYA", nominalArea: 1.5, currentCapEnclosed: 17.5, currentCapFreeAir: 22, resPerKm: 12.1, weightPer100m: 2.1, applications: "5A/10A Sockets & Switchboards" },
  { size: "2.0 RM BYA", nominalArea: 2.0, currentCapEnclosed: 21, currentCapFreeAir: 26, resPerKm: 9.1, weightPer100m: 2.7, applications: "Computer, TV & General Appliances" },
  { size: "2.5 RM BYA", nominalArea: 2.5, currentCapEnclosed: 24, currentCapFreeAir: 30, resPerKm: 7.41, weightPer100m: 3.3, applications: "15A Power Outlets, Microwave" },
  { size: "3.0 RM BYA", nominalArea: 3.0, currentCapEnclosed: 28, currentCapFreeAir: 35, resPerKm: 6.1, weightPer100m: 4.0, applications: "Room AC (1.0 - 1.5 Ton), Geyser" },
  { size: "4.0 RM BYA", nominalArea: 4.0, currentCapEnclosed: 32, currentCapFreeAir: 40, resPerKm: 4.61, weightPer100m: 5.2, applications: "Heavy AC (2.0 Ton), Water Pump" },
  { size: "6.0 RM BYA", nominalArea: 6.0, currentCapEnclosed: 41, currentCapFreeAir: 51, resPerKm: 3.08, weightPer100m: 7.6, applications: "Sub-Distribution Board Main Feeder" },
  { size: "10.0 RM BYA", nominalArea: 10.0, currentCapEnclosed: 57, currentCapFreeAir: 70, resPerKm: 1.83, weightPer100m: 12.5, applications: "Main Meter to Distribution Panel" },
  { size: "16.0 RM BYA", nominalArea: 16.0, currentCapEnclosed: 76, currentCapFreeAir: 94, resPerKm: 1.15, weightPer100m: 19.8, applications: "Industrial Incomer / Floor Feeder" },
];

export default function CableCalculatorPage() {
  const [selectedCable, setSelectedCable] = useState("1.5 RM BYA");
  const [lengthMeters, setLengthMeters] = useState("65");
  const [currentAmps, setCurrentAmps] = useState("10");
  const [ratePerMeter, setRatePerMeter] = useState("48");
  const [phaseSystem, setPhaseSystem] = useState<"1P" | "3P">("1P");
  const [ambientTemp, setAmbientTemp] = useState<"30" | "35" | "40">("35");
  const [circuitType, setCircuitType] = useState<"lighting" | "power">("power");

  const cableData = CABLE_STANDARDS.find((c) => c.size === selectedCable) || CABLE_STANDARDS[2];

  const length = Math.max(0, parseFloat(lengthMeters) || 0);
  const amps = Math.max(0, parseFloat(currentAmps) || 0);
  const rate = Math.max(0, parseFloat(ratePerMeter) || 0);

  // Temperature correction factor for resistance: R_T = R_20 * [1 + 0.00393 * (T - 20)]
  const tempCorrection = ambientTemp === "40" ? 1.078 : ambientTemp === "35" ? 1.059 : 1.039;
  const effectiveResistancePerKm = cableData.resPerKm * tempCorrection;

  // Single Phase: V_drop = (2 * L * R * I) / 1000
  // Three Phase:  V_drop = (sqrt(3) * L * R * I) / 1000
  const nominalVoltage = phaseSystem === "1P" ? 230 : 400;
  const dropMultiplier = phaseSystem === "1P" ? 2 : Math.sqrt(3);

  const rawVoltageDrop = (dropMultiplier * (length / 1000) * effectiveResistancePerKm * amps);
  const voltageDrop = rawVoltageDrop.toFixed(2);
  const voltageDropPercent = nominalVoltage > 0 ? ((rawVoltageDrop / nominalVoltage) * 100).toFixed(1) : "0.0";

  // Estimated Cable Net Weight
  const estimatedWeightKg = ((length / 100) * cableData.weightPer100m).toFixed(2);

  // Total Price
  const totalPrice = length * rate;

  // Safety Suitability
  const maxAllowableDrop = circuitType === "lighting" ? 3.0 : 5.0;
  const isDropAcceptable = parseFloat(voltageDropPercent) <= maxAllowableDrop;
  const isAmpCapacitySafe = amps <= cableData.currentCapEnclosed;

  const handleReset = () => {
    setSelectedCable("1.5 RM BYA");
    setLengthMeters("65");
    setCurrentAmps("10");
    setRatePerMeter("48");
    setPhaseSystem("1P");
    setAmbientTemp("35");
    setCircuitType("power");
  };

  return (
    <div className="w-full space-y-4">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Cable Cut-Length & Voltage Drop Calculator
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Technical estimation tool for BDS 900 / IEC 60364-5-52 copper conductor sizing, length pricing, and voltage regulation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="h-[38px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Inputs</span>
        </button>
      </div>

      {/* 2. Main Two-Column Full-Width Grid (Inputs Left, Results Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sizing Inputs (7 Cols on LG) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-[#0B3D91] dark:text-blue-400 uppercase tracking-wider flex items-center gap-2 m-0">
              <Zap className="w-4 h-4 text-amber-500" />
              Cable Specifications & Parameters
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              Copper BYA Conductor
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Cable Size Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Cable Gauge / Size (BDS 900 Standard)
              </label>
              <CustomSelect
                options={CABLE_STANDARDS.map((c) => ({
                  value: c.size,
                  label: `${c.size} (${c.nominalArea} mm²) — ${c.currentCapEnclosed}A Max In-Conduit`,
                  subLabel: c.applications,
                }))}
                value={selectedCable}
                onChange={(val) => setSelectedCable(String(val))}
                placeholder="Choose Cable Size"
              />
            </div>

            {/* Length and Unit Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Required Cut Length (Meters)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={lengthMeters}
                  onChange={(e) => setLengthMeters(e.target.value)}
                  placeholder="e.g. 50, 65, 100"
                  className="w-full h-[42px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Unit Rate (৳ / Meter)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={ratePerMeter}
                  onChange={(e) => setRatePerMeter(e.target.value)}
                  placeholder="e.g. 48"
                  className="w-full h-[42px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>
            </div>

            {/* Expected Load Current and Phase System */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Expected Full Load Current (Amperes)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={currentAmps}
                  onChange={(e) => setCurrentAmps(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full h-[42px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Power System & Voltage
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPhaseSystem("1P")}
                    className={`h-[42px] rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      phaseSystem === "1P"
                        ? "bg-[#0B3D91] text-white border-[#0B3D91] shadow-xs"
                        : "bg-white dark:bg-[#1e293b] border-[#cbd5e1] dark:border-[#334155] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    1-Phase (230V)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhaseSystem("3P")}
                    className={`h-[42px] rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      phaseSystem === "3P"
                        ? "bg-[#0B3D91] text-white border-[#0B3D91] shadow-xs"
                        : "bg-white dark:bg-[#1e293b] border-[#cbd5e1] dark:border-[#334155] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    3-Phase (400V)
                  </button>
                </div>
              </div>
            </div>

            {/* Circuit Purpose & Ambient Temperature */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Circuit Purpose (Drop Limit)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCircuitType("lighting")}
                    className={`h-[36px] rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                      circuitType === "lighting"
                        ? "bg-[#1E65A0] text-white border-[#1E65A0] shadow-xs"
                        : "bg-white dark:bg-[#1e293b] border-[#cbd5e1] dark:border-[#334155] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Lighting (Max 3%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCircuitType("power")}
                    className={`h-[36px] rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                      circuitType === "power"
                        ? "bg-[#1E65A0] text-white border-[#1E65A0] shadow-xs"
                        : "bg-white dark:bg-[#1e293b] border-[#cbd5e1] dark:border-[#334155] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Power (Max 5%)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ambient Temperature (Bangladesh)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["30", "35", "40"] as const).map((temp) => (
                    <button
                      key={temp}
                      type="button"
                      onClick={() => setAmbientTemp(temp)}
                      className={`h-[36px] rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                        ambientTemp === temp
                          ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-slate-800 shadow-xs"
                          : "bg-white dark:bg-[#1e293b] border-[#cbd5e1] dark:border-[#334155] text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {temp}°C
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Calculation Engine Output (5 Cols on LG) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-blue-200 border-b border-white/15 pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Total Cut-Length Price
              </span>
              <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-mono text-white">
                {selectedCable}
              </span>
            </div>

            <div className="mt-3">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">
                {formatBdCurrency(totalPrice)}
              </span>
              <p className="text-xs text-blue-100 font-medium mt-1">
                For {length} meters @ {formatBdCurrency(rate)} / meter
              </p>
            </div>
          </div>

          {/* Technical Diagnostics */}
          <div className="space-y-2.5 pt-3 border-t border-white/20 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-white/10">
              <span className="text-blue-100">Estimated Cable Net Weight:</span>
              <span className="font-bold text-sm font-mono text-white flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-blue-300" />
                {estimatedWeightKg} kg
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-white/10">
              <span className="text-blue-100">
                Calculated Voltage Drop ({nominalVoltage}V {phaseSystem}):
              </span>
              <span className={`font-bold text-sm font-mono ${isDropAcceptable ? "text-amber-300" : "text-rose-300 font-black"}`}>
                {voltageDrop} V ({voltageDropPercent}%)
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-white/10">
              <span className="text-blue-100">Conductor Safe Capacity (In-Conduit):</span>
              <span className={`font-bold text-sm font-mono ${isAmpCapacitySafe ? "text-white" : "text-rose-300 font-black"}`}>
                {cableData.currentCapEnclosed} Amps {isAmpCapacitySafe ? "" : "(OVERLOAD!)"}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-white/10">
              <span className="text-blue-100">Allowed Drop Limit ({circuitType}):</span>
              <span className="font-bold text-sm font-mono text-white">
                Max {maxAllowableDrop}% ({((nominalVoltage * maxAllowableDrop) / 100).toFixed(1)}V)
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-blue-100">Suitability Status:</span>
              <span
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-xs ${
                  isDropAcceptable && isAmpCapacitySafe
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 text-white animate-pulse"
                }`}
              >
                {isDropAcceptable && isAmpCapacitySafe ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>SUITABLE (&le; {maxAllowableDrop}%)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>HIGH DROP / OVERLOAD</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="p-3 rounded-xl bg-black/20 border border-white/10 text-[11px] leading-relaxed text-blue-100">
            {isDropAcceptable && isAmpCapacitySafe ? (
              <p className="m-0">
                &bull; Voltage regulation is within acceptable engineering thresholds (&le; {maxAllowableDrop}%). Ensure proper grounding (ECC) is pulled alongside.
              </p>
            ) : (
              <p className="m-0 text-amber-200 font-semibold">
                &bull; Drop exceeds {maxAllowableDrop}% or current exceeds {cableData.currentCapEnclosed}A. Upsize to a larger conductor (e.g. next RM rating) to avoid equipment damage.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Full-Width Technical Conductor Reference Table (BDS 900 / IEC 60364) */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1E65A0]" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider m-0">
              BDS 900 / IEC Conductor Sizing Reference & Ampacity Table
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
            Copper Plain Annealed Conductors (PVC Insulated BYA)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                <th className="py-2.5 px-3.5">Cable Gauge</th>
                <th className="py-2.5 px-3.5 text-center">Nominal Area</th>
                <th className="py-2.5 px-3.5 text-center">Enclosed in Conduit</th>
                <th className="py-2.5 px-3.5 text-center">Clipped Direct</th>
                <th className="py-2.5 px-3.5 text-right">DC Resistance @ 20°C</th>
                <th className="py-2.5 px-3.5 text-right">Approx. Net Wt / 100m</th>
                <th className="py-2.5 px-3.5">Typical Applications</th>
                <th className="py-2.5 px-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {CABLE_STANDARDS.map((c) => {
                const isCurrent = c.size === selectedCable;
                return (
                  <tr
                    key={c.size}
                    className={`transition-colors ${
                      isCurrent
                        ? "bg-blue-50/70 dark:bg-blue-950/40 font-bold text-[#0B3D91] dark:text-blue-300"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                        {c.size}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono">{c.nominalArea} mm²</td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {c.currentCapEnclosed} A
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono">{c.currentCapFreeAir} A</td>
                    <td className="py-2.5 px-3.5 text-right font-mono">{c.resPerKm} &Omega;/km</td>
                    <td className="py-2.5 px-3.5 text-right font-mono">{c.weightPer100m} kg</td>
                    <td className="py-2.5 px-3.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {c.applications}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedCable(c.size)}
                        className={`h-6 px-2.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          isCurrent
                            ? "bg-[#0B3D91] text-white"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {isCurrent ? "Selected" : "Select"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Electrical Standards Disclaimer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <Info className="w-4 h-4 text-[#1E65A0] shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-700 dark:text-slate-300">Engineering Safety & Standards Disclaimer:</strong>{" "}
            Calculations are based on Ohm&apos;s Law and standard conductor resistance tables under BDS 900 / IEC 60364-5-52. Actual field installation safety requires verifying grouping derating factors, conduit fill capacity, short-circuit withstand rating, insulation class (PVC 70°C vs XLPE 90°C), and ambient conditions as mandated by the Bangladesh National Building Code (BNBC).
          </div>
        </div>
      </div>
    </div>
  );
}
