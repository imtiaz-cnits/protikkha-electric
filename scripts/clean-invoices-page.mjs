import fs from "fs";

let code = fs.readFileSync("app/(dashboard)/invoices/page.tsx", "utf8");

// Remove imports
code = code.replace(/import\s+{\s*ChallanModal\s*}\s*from\s*["']@\/components\/challan\/challan-modal["'];?\r?\n?/, "");
code = code.replace(/import\s+{\s*CancelTilesModal\s*}\s*from\s*["']@\/components\/invoices\/cancel-tiles-modal["'];?\r?\n?/, "");

// Remove state variables
code = code.replace(/\/\/ Challan Modal State[\s\S]*?const \[challanOrderId, setChallanOrderId\] = useState<number \| null>\(null\);?\r?\n?/, "");
code = code.replace(/const \[isCancelTilesModalOpen, setIsCancelTilesModalOpen\] = useState\(false\);?\r?\n?/, "");
code = code.replace(/const \[invoiceForCancel, setInvoiceForCancel\] = useState<Invoice \| null>\(null\);?\r?\n?/, "");

// Remove onOpenChallan and onCancelTiles in desktop InvoiceActionMenu
code = code.replace(/onOpenChallan=\{[\s\S]*?\}\r?\n?\s*/g, "");
code = code.replace(/onCancelTiles=\{[\s\S]*?\}\r?\n?\s*/g, "");

// Remove mobile Challan button
code = code.replace(/{\/\* Challan Button \*\/}[\s\S]*?{\s*inv\.has_challan \? "Challan" : inv\.has_pending_tiles \? "Dispatch Tiles" : "Challan"\s*}[\s\S]*?<\/button>\s*\)\s*}/g, "");

// Remove modal header Challan button
code = code.replace(/\{Boolean\(selectedInvoice\.has_tiles[\s\S]*?<span>Challan<\/span>[\s\S]*?<\/button>\s*\)\s*\}/g, "");

// Remove thermal receipt onOpenChallan
code = code.replace(/onOpenChallan=\{\(oid\) => \{[\s\S]*?\}\}/g, "");

// Remove ChallanModal and CancelTilesModal JSX
code = code.replace(/{\/\* 8\. DELIVERY CHALLAN MODAL \*\/}[\s\S]*?onChallanGenerated=\{\(\) => loadInvoices\(\)\}\s*\/>\s*\)\s*}/g, "");
code = code.replace(/{\/\* 9\. CANCEL TILES MODAL \*\/}[\s\S]*?<CancelTilesModal[\s\S]*?\/>/g, "");

fs.writeFileSync("app/(dashboard)/invoices/page.tsx", code, "utf8");
console.log("Cleaned invoices page successfully!");

