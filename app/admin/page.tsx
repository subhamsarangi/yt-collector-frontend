import { supabaseAdmin } from "@/lib/supabase/server";
import CookieUpload from "@/components/CookieUpload";

export const revalidate = 0;

export default async function AdminPage() {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, approved, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Admin</h1>

      <CookieUpload />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-400">Users</h2>
        {users?.map((u) => (
          <div key={u.id} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium">{u.email}</p>
              <p className="text-xs text-neutral-500">{u.role} · joined {new Date(u.created_at).toLocaleDateString()}</p>
            </div>
            <form action={`/api/admin/users/${u.id}/${u.approved ? "revoke" : "approve"}`} method="POST">
              <button type="submit"
                className={`text-xs rounded px-3 py-1 ${u.approved ? "bg-red-900 text-red-300 hover:bg-red-800" : "bg-green-900 text-green-300 hover:bg-green-800"}`}>
                {u.approved ? "Revoke" : "Approve"}
              </button>
            </form>
          </div>
        ))}
        {!users?.length && <p className="text-neutral-500 text-sm">No users yet.</p>}
      </div>
    </div>
  );
}
