"use client";

type Props = {
  id: string;
  email: string;
  role: string;
  approved: boolean;
  createdAt: string;
  isSelf: boolean;
};

export default function AdminUserRow({ id, email, role, approved, createdAt, isSelf }: Props) {
  return (
    <div className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-3">
      <div>
        <p className="text-sm font-medium">
          {email} {isSelf && <span className="text-xs text-neutral-500">(you)</span>}
        </p>
        <p className="text-xs text-neutral-500">
          {role} · {approved ? "approved" : <span className="text-yellow-500">pending</span>} · joined {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>

      {isSelf ? (
        <span className="text-xs text-neutral-600 px-3 py-1">owner</span>
      ) : (
        <div className="flex items-center gap-2">
          <form action={`/api/admin/users/${id}/${approved ? "revoke" : "approve"}`} method="POST">
            <button
              type="submit"
              className={`text-xs rounded px-3 py-1 ${approved ? "bg-yellow-900 text-yellow-300 hover:bg-yellow-800" : "bg-green-900 text-green-300 hover:bg-green-800"}`}
            >
              {approved ? "Revoke" : "Approve"}
            </button>
          </form>
          {!approved && (
            <form
              action={`/api/admin/users/${id}/delete`}
              method="POST"
              onSubmit={(e) => {
                if (!confirm(`Delete ${email}? They can re-register later.`)) e.preventDefault();
              }}
            >
              <button type="submit" className="text-xs rounded px-3 py-1 bg-red-950 text-red-400 hover:bg-red-900">
                Delete
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
