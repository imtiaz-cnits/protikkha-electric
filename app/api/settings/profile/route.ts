import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let storeSettings = {
  shop_name: "Protikkha Electric",
  tagline: "Retail & Wholesale Electrical & Machinery Supply",
  phone: "01711-000000",
  email: "info@protikkhaelectric.com",
  address: "Shop # 12-14, Nawabpur Road, Dhaka-1100, Bangladesh",
  bin_vat_no: "BIN-002948123-0101",
  currency: "BDT (৳)",
  invoice_prefix: "PE-INV-",
  challan_prefix: "PE-CHL-",
  default_warranty_months: 12,
  drum_deposit_default: 3000,
  thermal_paper_size: "80mm",
  show_bangla_font: true,
};

export async function GET() {
  return NextResponse.json({
    status: "success",
    data: storeSettings,
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    storeSettings = {
      ...storeSettings,
      ...body,
    };
    return NextResponse.json({
      status: "success",
      message: "Store profile settings updated successfully",
      data: storeSettings,
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
