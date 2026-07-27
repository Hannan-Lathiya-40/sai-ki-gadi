import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    const {
      status,
      membership_type,
      membership_duration_days,
      welcome_completed,
      admin_remarks,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (typeof status === "boolean") {
      updateData.status = status;
    }

    if (typeof welcome_completed === "boolean") {
      updateData.welcome_completed = welcome_completed;
    }

    if (typeof admin_remarks === "string") {
      updateData.admin_remarks = admin_remarks;
    }

    if (membership_type) {
      const allowedMemberships = ["regular", "gold"];

      if (!allowedMemberships.includes(membership_type)) {
        return NextResponse.json(
          {
            error: "Invalid membership type",
          },
          {
            status: 400,
          },
        );
      }

      updateData.membership_type = membership_type;

      if (membership_type === "gold") {
        const days = Number(membership_duration_days || 30);

        const startDate = new Date();

        const endDate = new Date();

        endDate.setDate(endDate.getDate() + days);

        updateData.membership_started_at = startDate.toISOString();

        updateData.membership_expires_at = endDate.toISOString();

        updateData.membership_duration_days = days;
      } else {
        updateData.membership_started_at = null;

        updateData.membership_expires_at = null;

        updateData.membership_duration_days = null;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("UPDATE USER ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await context.params;

    const { error } = await supabaseAdmin.from("users").delete().eq("id", id);

    if (error) {
      console.error("DELETE USER ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}
