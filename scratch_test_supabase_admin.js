const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eslajmbvrqbkmsolffqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGFqbWJ2cnFia21zb2xmZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM2OTYwMCwiZXhwIjoyMDk1OTQ1NjAwfQ.S50IUQvwMH9gZa3LM2NCFOjaG9_eU0gK26oteNpKBps';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("1. Checking existing roles...");
  let { data: roles, error: rolesErr } = await supabase.from('roles').select('*');
  console.log("Roles:", roles, "Error:", rolesErr);

  let roleId;
  if (!roles || roles.length === 0) {
    console.log("2. Inserting a test role...");
    const { data: newRole, error: createRoleErr } = await supabase
      .from('roles')
      .insert({
        code: 'ROLE-001',
        name: 'Super Admin',
        description: 'Full Access',
        is_active: true,
        permissions: ['view-users']
      })
      .select()
      .single();
    
    console.log("New Role:", newRole, "Error:", createRoleErr);
    if (createRoleErr) return;
    roleId = newRole.id;
  } else {
    roleId = roles[0].id;
  }

  console.log("3. Creating auth user...");
  const tempEmail = `admin_test_${Date.now()}@cdntb.ca`;
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: tempEmail,
    password: 'TemporaryPassword123!',
    email_confirm: true
  });
  console.log("Auth user created:", authData?.user?.id, "Error:", authErr);
  if (authErr) return;

  const userId = authData.user.id;

  console.log("4. Inserting admin_user in DB...");
  const { data: adminUser, error: dbErr } = await supabase
    .from('admin_users')
    .insert({
      id: userId,
      email: tempEmail,
      full_name: 'Test Administrator',
      role_id: roleId,
      is_active: true,
      invite_status: 'pending'
    })
    .select()
    .single();

  console.log("Admin User record:", adminUser, "Error:", dbErr);

  // Clean up
  console.log("5. Cleaning up test auth user...");
  await supabase.auth.admin.deleteUser(userId);
}

test();
