import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// GET /api/roles
export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    // Fetch roles
    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("roles")
      .select("*")
      .order("created_at", { ascending: true });

    if (rolesErr) throw rolesErr;

    // Fetch admin_users to calculate count
    const { data: admins, error: adminsErr } = await supabaseAdmin
      .from("admin_users")
      .select("role_id");

    if (adminsErr) throw adminsErr;

    // Map database structures to frontend expectations
    const mappedRoles = (roles || []).map((role) => {
      const count = (admins || []).filter((admin) => admin.role_id === role.id).length;
      return {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description || "",
        isActive: role.is_active,
        permissions: role.permissions || [],
        adminCount: count,
      };
    });

    return NextResponse.json({ roles: mappedRoles });
  } catch (error: any) {
    console.error("GET /api/roles failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/roles
export async function POST(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const { name, description, isActive, permissions } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    // Generate unique role code
    const { data: existingRoles, error: codeErr } = await supabaseAdmin
      .from("roles")
      .select("code");

    if (codeErr) throw codeErr;

    let nextNum = 1;
    if (existingRoles && existingRoles.length > 0) {
      const nums = existingRoles.map((r) => {
        const match = r.code.match(/ROLE-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    const code = `ROLE-${String(nextNum).padStart(3, "0")}`;

    const { data, error } = await supabaseAdmin
      .from("roles")
      .insert({
        code,
        name,
        description,
        is_active: isActive ?? true,
        permissions: permissions || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      role: {
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description || "",
        isActive: data.is_active,
        permissions: data.permissions || [],
        adminCount: 0,
      },
    });
  } catch (error: any) {
    console.error("POST /api/roles failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/roles
export async function PATCH(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const { id, name, description, isActive, permissions } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.is_active = isActive;
    if (permissions !== undefined) updates.permissions = permissions;

    const { data, error } = await supabaseAdmin
      .from("roles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      role: {
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description || "",
        isActive: data.is_active,
        permissions: data.permissions || [],
      },
    });
  } catch (error: any) {
    console.error("PATCH /api/roles failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/roles
export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    // Check if there are admin users referencing this role
    const { data: admins, error: adminsErr } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .eq("role_id", id)
      .limit(1);

    if (adminsErr) throw adminsErr;

    if (admins && admins.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete role because it is assigned to one or more admin users." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("roles").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/roles failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
