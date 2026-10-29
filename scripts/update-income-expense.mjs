import fs from "fs";

let code = fs.readFileSync("app/(dashboard)/reports/income-expense/page.tsx", "utf8");

// Add Search icon import if not present
if (!code.includes("Search,")) {
  code = code.replace('import {\n  Scale,', 'import {\n  Scale,\n  Search,');
}

// Add search state
if (!code.includes("const [search, setSearch]")) {
  code = code.replace(
    'const [endDate, setEndDate] = useState(todayStr);',
    'const [endDate, setEndDate] = useState(todayStr);\n  const [search, setSearch] = useState("");'
  );
}

// Update presets
const oldPreset = `  const setPreset = (preset: "today" | "month" | "last30") => {
    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "month") {
      setStartDate(firstDayStr);
      setEndDate(todayStr);
    } else if (preset === "last30") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      setStartDate(past30);
      setEndDate(todayStr);
    }
  };`;

const newPreset = `  const setPreset = (preset: "today" | "yesterday" | "7days" | "month") => {
    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "7days") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(past);
      setEndDate(todayStr);
    } else if (preset === "month") {
      setStartDate(firstDayStr);
      setEndDate(todayStr);
    }
  };`;

// Filter bar
const oldFilter = `{/* 3. Date Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="w-[135px]">
            <CustomDatePicker
              value={startDate}
              onChange={(d) => setStartDate(d)}
              placeholder="From Date"
            />
          </div>
          <span className="text-xs text-slate-400">to</span>
          <div className="w-[135px]">
            <CustomDatePicker
              value={endDate}
              onChange={(d) => setEndDate(d)}
              placeholder="To Date"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPreset("today")}
            className="h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
          >
            Today
          </button>
          <button
            onClick={() => setPreset("month")}
            className="h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
          >
            This Month
          </button>
          <button
            onClick={() => setPreset("last30")}
            className="h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
          >
            Last 30 Days
          </button>
        </div>
      </div>`;

const newFilter = `{/* 3. Filters Bar matching Image 2 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search particular, expense, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-[130px]">
              <CustomDatePicker
                value={startDate}
                onChange={(d) => setStartDate(d)}
                placeholder="From Date"
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <div className="w-[130px]">
              <CustomDatePicker
                value={endDate}
                onChange={(d) => setEndDate(d)}
                placeholder="To Date"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreset("today")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setPreset("yesterday")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Yesterday
            </button>
            <button
              onClick={() => setPreset("7days")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              7 Days
            </button>
            <button
              onClick={() => setPreset("month")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              This Month
            </button>
          </div>
        </div>
      </div>`;

let normCode = code.replace(/\r\n/g, "\n");
normCode = normCode.replace(oldPreset.replace(/\r\n/g, "\n"), newPreset.replace(/\r\n/g, "\n"));
normCode = normCode.replace(oldFilter.replace(/\r\n/g, "\n"), newFilter.replace(/\r\n/g, "\n"));

fs.writeFileSync("app/(dashboard)/reports/income-expense/page.tsx", normCode, "utf8");
console.log("Updated income-expense successfully!");

