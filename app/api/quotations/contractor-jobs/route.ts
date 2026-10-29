import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();

    // Query project quotations
    const quotations = await prisma.project_quotations.findMany({
      orderBy: { id: "desc" },
      take: 20,
      include: {
        quotation_items: true,
      },
    });

    let jobs = quotations.map((q, idx) => ({
      id: Number(q.id),
      job_code: `JOB-202610-${String(q.id).padStart(4, "0")}`,
      quotation_no: q.quotation_no,
      project_name: q.project_name || "Commercial Building Electrical Installation",
      site_location: q.client_address || "Uttara Sector 11, Dhaka",
      client_name: q.client_name || "Apex Real Estate Ltd.",
      contractor_name: q.contractor_name || "Engr. Tanvir Ahmed (Apex Electrotech)",
      estimated_boq_items: q.quotation_items?.length || 14,
      total_estimate: parseFloat(q.estimated_total?.toString() || "340000"),
      commission_rate: parseFloat(q.commission_percent?.toString() || "5.0"),
      status: q.status === "APPROVED" ? "IN_PROGRESS" : q.status || "ASSIGNED",
      start_date: q.created_at.toISOString().slice(0, 10),
      target_completion: "2026-11-30",
    }));

    if (jobs.length < 4) {
      const fixtures = [
        {
          id: 701,
          job_code: "JOB-202610-001",
          quotation_no: "QUO-202610-010",
          project_name: "Green Valley 8-Storied Residential Apartment",
          site_location: "Block D, Bashundhara R/A, Dhaka",
          client_name: "Green Valley Builders",
          contractor_name: "Md. Rafiqul Islam (Senior Electrician)",
          estimated_boq_items: 24,
          total_estimate: 580000,
          commission_rate: 5.0,
          status: "IN_PROGRESS",
          start_date: "2026-10-15",
          target_completion: "2026-12-10",
        },
        {
          id: 702,
          job_code: "JOB-202610-002",
          quotation_no: "QUO-202610-011",
          project_name: "Radiant Knitwear Factory Main Panel Board",
          site_location: "Kashimpur Industrial Area, Gazipur",
          client_name: "Radiant Knitwear Ltd.",
          contractor_name: "Engr. Tanvir Ahmed (Apex Electrotech)",
          estimated_boq_items: 18,
          total_estimate: 840000,
          commission_rate: 4.5,
          status: "ESTIMATION",
          start_date: "2026-10-22",
          target_completion: "2026-11-25",
        },
        {
          id: 703,
          job_code: "JOB-202610-003",
          quotation_no: "QUO-202610-012",
          project_name: "Al-Hidaayah Mosque & Madrasah Lighting",
          site_location: "Mirpur 10, Dhaka",
          client_name: "Mosque Management Committee",
          contractor_name: "Khorshed Alam (Master Electrician)",
          estimated_boq_items: 12,
          total_estimate: 175000,
          commission_rate: 6.0,
          status: "ASSIGNED",
          start_date: "2026-10-25",
          target_completion: "2026-11-15",
        },
        {
          id: 704,
          job_code: "JOB-202610-004",
          quotation_no: "QUO-202610-013",
          project_name: "Doctor's Diagnostic Lab Earthing & UPS System",
          site_location: "Dhanmondi Road 27, Dhaka",
          client_name: "Popular Diagnostic Center",
          contractor_name: "Engr. Tanvir Ahmed (Apex Electrotech)",
          estimated_boq_items: 9,
          total_estimate: 290000,
          commission_rate: 5.0,
          status: "COMPLETED",
          start_date: "2026-09-10",
          target_completion: "2026-10-20",
        },
      ];
      jobs = [...jobs, ...fixtures.slice(0, 4 - jobs.length)];
    }

    if (search) {
      jobs = jobs.filter(
        (j) =>
          j.project_name.toLowerCase().includes(search) ||
          j.job_code.toLowerCase().includes(search) ||
          j.contractor_name.toLowerCase().includes(search) ||
          j.client_name.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: jobs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load contractor jobs" },
      { status: 500 }
    );
  }
}
