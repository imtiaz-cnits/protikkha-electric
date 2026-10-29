import fs from "fs";

let code = fs.readFileSync("app/(dashboard)/reports/stock-out/page.tsx", "utf8");

// Add CustomSelect & CustomDatePicker imports
if (!code.includes("CustomSelect")) {
  code = code.replace(
    'import { Pagination } from "@/components/ui";',
    'import { Pagination, CustomSelect } from "@/components/ui";\nimport { CustomDatePicker } from "@/components/ui/date-picker";'
  );
}

// Add startDate, endDate, presets
if (!code.includes("startDate")) {
  code = code.replace(
    'const [search, setSearch] = useState("");',
    `const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const setPreset = (preset: "today" | "yesterday" | "7days" | "month" | "all") => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setStartDate(y.toISOString().split("T")[0]);
      setEndDate(y.toISOString().split("T")[0]);
    } else if (preset === "7days") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(past);
      setEndDate(todayStr);
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
    setCurrentPage(1);
  };`
  );
}

// Replace the filter bar block
const startMarker = '{/* 4. Filter Tabs & Search Controls */}';
const endMarker = '{/* 5. Desktop Critical Inventory Table';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const newFilter = `{/* 4. Filters Bar matching Image 2 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search product name, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Custom Select Filter Dropdown */}
        <div className="w-full md:w-52">
          <CustomSelect
            value={activeTab}
            onChange={(val) => {
              setActiveTab(val as any);
              setCurrentPage(1);
            }}
            options={[
              { value: "critical", label: "Critical Shortage" },
              { value: "out_of_stock", label: "Out of Stock (0)" },
              { value: "low_stock", label: "Low Stock (1-5)" },
              { value: "all", label: "All Catalog" },
            ]}
            placeholder="Stock Status"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-[130px]">
              <CustomDatePicker
                value={startDate}
                onChange={(d) => {
                  setStartDate(d);
                  setCurrentPage(1);
                }}
                placeholder="From Date"
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <div className="w-[130px]">
              <CustomDatePicker
                value={endDate}
                onChange={(d) => {
                  setEndDate(d);
                  setCurrentPage(1);
                }}
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
      </div>\n\n      `;

  code = code.substring(0, startIdx) + newFilter + code.substring(endIdx);
  fs.writeFileSync("app/(dashboard)/reports/stock-out/page.tsx", code, "utf8");
  console.log("Updated stock-out successfully!");
} else {
  console.error("Markers not found:", { startIdx, endIdx });
}
