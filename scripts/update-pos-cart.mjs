import fs from "fs";

let code = fs.readFileSync("app/pos/page.tsx", "utf8");

const target = `<td className="py-2 text-right text-slate-700 dark:text-slate-300 font-mono font-medium">
                              {item.selling_price.toFixed(2)}
                            </td>`;

const replacement = `<td className="py-2 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.selling_price}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  updatePrice(item.product_id, isNaN(val) ? 0 : val);
                                }}
                                className="w-20 h-7 text-right text-xs font-bold font-mono px-2 rounded-md border-2 border-red-500 dark:border-red-600 focus:border-red-600 focus:ring-1 focus:ring-red-600 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-2xs"
                              />
                            </td>`;

const normalizedCode = code.replace(/\r\n/g, "\n");
const normalizedTarget = target.replace(/\r\n/g, "\n");
const normalizedReplacement = replacement.replace(/\r\n/g, "\n");

if (normalizedCode.includes(normalizedTarget)) {
  const result = normalizedCode.replace(normalizedTarget, normalizedReplacement);
  fs.writeFileSync("app/pos/page.tsx", result, "utf8");
  console.log("Successfully updated editable price in POS cart!");
} else {
  console.error("Target not found!");
}

