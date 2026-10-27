import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: All Suppliers (Newest first, Rule 4.1)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();

    const suppliers = await prisma.suppliers.findMany({
      orderBy: { id: "desc" },
      include: {
        purchases: {
          select: {
            id: true,
            grand_subtotal: true,
            paid_amount: true,
            due_amount: true,
          },
        },
      },
    });

    let formatted = suppliers.map((s) => {
      const payableDue = parseFloat(s.purchase_payable_amount || "0");
      const totalPurchases = s.purchases.length;
      return {
        id: Number(s.id),
        supplier_id: s.supplier_id,
        name: s.name,
        company: s.company,
        mobile: s.mobile,
        address: s.address,
        email: s.email,
        img_url: s.img_url,
        purchase_payable_amount: payableDue,
        status: s.status || "active",
        total_purchases: totalPurchases,
        created_at: s.created_at,
      };
    });

    if (search) {
      formatted = formatted.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.company.toLowerCase().includes(search) ||
          s.mobile.includes(search) ||
          s.supplier_id.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Suppliers GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load suppliers" },
      { status: 500 }
    );
  }
}

// POST: Create Supplier
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 7);

    const body = await req.json();
    const { name, company, mobile, address, email, purchase_payable_amount, status } = body;

    if (!name || !company || !mobile) {
      return NextResponse.json(
        { status: "fail", message: "Supplier name, company, and mobile number are required" },
        { status: 400 }
      );
    }

    // Auto-generate Supplier ID: SUPP-XXXX
    const lastSupplier = await prisma.suppliers.findFirst({
      orderBy: { id: "desc" },
      select: { id: true, supplier_id: true },
    });

    let nextNumber = 1;
    if (lastSupplier && lastSupplier.supplier_id) {
      const match = lastSupplier.supplier_id.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      } else {
        nextNumber = Number(lastSupplier.id) + 1;
      }
    }

    const generatedSupplierId = `SUPP-${String(nextNumber).padStart(4, "0")}`;

    const newSupplier = await prisma.suppliers.create({
      data: {
        supplier_id: generatedSupplierId,
        name: name.trim(),
        company: company.trim(),
        mobile: mobile.trim(),
        address: (address || "").trim(),
        email: email ? email.trim() : null,
        purchase_payable_amount: String(purchase_payable_amount || "0"),
        status: status || "active",
        user_id: BigInt(userId),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Supplier created successfully",
      data: {
        ...newSupplier,
        id: Number(newSupplier.id),
        user_id: Number(newSupplier.user_id),
        purchase_payable_amount: parseFloat(newSupplier.purchase_payable_amount || "0"),
      },
    });

  } catch (error: any) {
    console.error("Supplier Create Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create supplier" },
      { status: 500 }
    );
  }
}
