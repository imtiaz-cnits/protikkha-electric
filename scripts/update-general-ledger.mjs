import fs from "fs";

let code = fs.readFileSync("app/(dashboard)/reports/general-ledger/page.tsx", "utf8");

// Add CustomSelect import
if (!code.includes("CustomSelect")) {
  code = code.replace(
    'import { CustomDatePicker } from "@/components/ui/date-picker";',
    'import { CustomDatePicker } from "@/components/ui/date-picker";\nimport { CustomSelect } from "@/components/ui";'
  );
}

// Add search state if not present
if (!code.includes("const [search, setSearch]")) {
  code = code.replace(
    'const [searchCoa, setSearchCoa] = useState("");',
    'const [searchCoa, setSearchCoa] = useState("");\n  const [search, setSearch] = useState("");'
  );
}

// Update preset function
const oldPreset = `  const setPreset = (preset: "today" | "month" | "year") => {
    const tStr = new Date().toISOString().split("T")[0];
    if (preset === "today") {
      setStartDate(tStr);
      setEndDate(tStr);
    } else if (preset === "month") {
      setStartDate(firstDayStr);
      setEndDate(tStr);
    } else if (preset === "year") {
      const yearStart = \`\${new Date().getFullYear()}-01-01\`;
      setStartDate(yearStart);
      setEndDate(tStr);
    }
  };`;

const newPreset = `  const setPreset = (preset: "today" | "yesterday" | "7days" | "month") => {
    const tStr = new Date().toISOString().split("T")[0];
    if (preset === "today") {
      setStartDate(tStr);
      setEndDate(tStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "7days") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(past);
      setEndDate(tStr);
    } else if (preset === "month") {
      setStartDate(firstDayStr);
      setEndDate(tStr);
    }
  };`;

// Replace tab navigation
const startMarker = '{/* 4. Tab Navigation */}';
const endMarker = '{/* Tab 1: Trial Balance */}';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const newFilter = `{/* 4. Filters Bar matching Image 2 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search account, code, voucher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchCoa(e.target.value);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Custom Select Filter Dropdown for Tab Navigation */}
        <div className="w-full md:w-64">
          <CustomSelect
            value={activeTab}
            onChange={(val) => setActiveTab(val as any)}
            options={[
              { value: "tb", label: "Trial Balance (রেওয়ামিল)" },
              { value: "pl", label: "Profit & Loss Statement (লাভ-ক্ষতি)" },
              { value: "coa", label: "Chart of Accounts (হিসাব তালিকা)" },
              { value: "vouchers", label: "Recent Journal Vouchers (ভাউচার লগ)" },
            ]}
            placeholder="Select Statement / View"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
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
      </div>\n\n      `;

  code = code.replace(oldPreset, newPreset);
  code = code.substring(0, startIdx) + newFilter + code.substring(endIdx);
  fs.writeFileSync("app/(dashboard)/reports/general-ledger/page.tsx", code, "utf8");
  console.log("Updated general-ledger successfully!");
} else {
  console.error("Markers not found:", { startIdx, endIdx });
}

