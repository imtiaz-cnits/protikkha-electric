import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Single Supplier with Purchases
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplierId = BigInt(id);

    const supplier = await prisma.suppliers.findUnique({
      where: { id: supplierId },
      include: {
        purchases: {
          orderBy: { id: "desc" },
          take: 50,
        },
        supplier_due_collections: {
          orderBy: { id: "desc" },
          take: 50,
        },
        purchase_returns: {
          orderBy: { id: "desc" },
          take: 50,
          include: {
            products: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ status: "fail", message: "Supplier not found" }, { status: 404 });
    }

    const currentPayable = parseFloat(supplier.purchase_payable_amount || "0");
    const totalPurchases = supplier.purchases.length;
    const totalPurchaseAmount = supplier.purchases.reduce((acc, p) => acc + (parseFloat(p.grand_subtotal || "0") || 0), 0);
    const totalPaidAmount = supplier.purchases.reduce((acc, p) => acc + (parseFloat(p.paid_amount || "0") || 0), 0);
    const totalPurchaseDue = supplier.purchases.reduce((acc, p) => acc + (parseFloat(p.due_amount || "0") || 0), 0);

    return NextResponse.json({
      status: "success",
      data: {
        ...supplier,
        id: Number(supplier.id),
        purchase_payable_amount: currentPayable,
        kpi: {
          total_purchases: totalPurchases,
          total_purchase_amount: totalPurchaseAmount,
          total_paid_amount: totalPaidAmount,
          total_purchase_due: totalPurchaseDue,
          current_payable: currentPayable,
        },
        purchases: supplier.purchases.map((p) => ({
          ...p,
          id: Number(p.id),
          grand_subtotal: parseFloat(p.grand_subtotal || "0"),
          paid_amount: parseFloat(p.paid_amount || "0"),
          due_amount: parseFloat(p.due_amount || "0"),
        })),
        supplier_due_collections: supplier.supplier_due_collections.map((dc) => ({
          ...dc,
          id: Number(dc.id),
          paid_amount: parseFloat(dc.paid_amount || "0"),
          discount_amount: parseFloat(dc.discount_amount || "0"),
          due_amount: parseFloat(dc.due_amount || "0"),
          purchase_payable_amount: parseFloat(dc.purchase_payable_amount || "0"),
        })),
        purchase_returns: supplier.purchase_returns.map((pr) => ({
          id: Number(pr.id),
          purchase_id: Number(pr.purchase_id),
          product_id: Number(pr.product_id),
          product_name: pr.products?.product_name || "N/A",
          product_code: pr.products?.product_code,
          amount: Number(pr.amount || 0),
          quantity: pr.quantity,
          date: pr.date,
          created_at: pr.created_at,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

// PUT: Update Supplier
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplierId = BigInt(id);
    const body = await req.json();

    const { name, company, mobile, address, email, purchase_payable_amount, status } = body;

    const updated = await prisma.suppliers.update({
      where: { id: supplierId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        company: company !== undefined ? company.trim() : undefined,
        mobile: mobile !== undefined ? mobile.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        email: email !== undefined ? (email ? email.trim() : null) : undefined,
        purchase_payable_amount:
          purchase_payable_amount !== undefined ? String(purchase_payable_amount) : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Supplier updated successfully",
      data: {
        ...updated,
        id: Number(updated.id),
        user_id: Number(updated.user_id),
        purchase_payable_amount: parseFloat(updated.purchase_payable_amount || "0"),
      },
    });

  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

// DELETE: Delete Supplier
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplierId = BigInt(id);

    // Check if supplier has purchases
    const purchaseCount = await prisma.purchases.count({
      where: { supplier_id: supplierId },
    });

    if (purchaseCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete supplier with ${purchaseCount} associated purchase records.`,
        },
        { status: 400 }
      );
    }

    const dueCount = await prisma.supplier_due_collections.count({
      where: { supplier_id: supplierId },
    });
    if (dueCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete supplier with ${dueCount} associated due payment records.`,
        },
        { status: 400 }
      );
    }

    const returnCount = await prisma.purchase_returns.count({
      where: { supplier_id: supplierId },
    });
    if (returnCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete supplier with ${returnCount} associated purchase return records.`,
        },
        { status: 400 }
      );
    }

    await prisma.suppliers.delete({
      where: { id: supplierId },
    });

    return NextResponse.json({
      status: "success",
      message: "Supplier deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
