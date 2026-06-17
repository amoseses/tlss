'use client';

import { useState } from 'react';
import { Trash2, Edit, UserPlus, Shield } from 'lucide-react';
import { AdminUser, adminRoles } from '../schema';

interface AdminManagementPanelProps {
  admins: AdminUser[];
  currentUserRole: string;
  onInviteAdmin?: (email: string, role: string) => void;
  onUpdateRole?: (userId: string, newRole: string) => void;
  onRemoveAdmin?: (userId: string) => void;
}

export function AdminManagementPanel({
  admins,
  currentUserRole,
  onInviteAdmin,
  onUpdateRole,
  onRemoveAdmin,
}: AdminManagementPanelProps) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(adminRoles.EDITOR);

  const canManageAdmins = currentUserRole === adminRoles.OWNER;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail && canManageAdmins) {
      onInviteAdmin?.(inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole(adminRoles.EDITOR);
      setShowInviteForm(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case adminRoles.OWNER:
        return 'bg-red-100 text-red-800';
      case adminRoles.ADMIN:
        return 'bg-blue-100 text-blue-800';
      case adminRoles.EDITOR:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Admin Management</h2>
        {canManageAdmins && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
          >
            <UserPlus size={18} />
            Invite Admin
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && canManageAdmins && (
        <form
          onSubmit={handleInvite}
          className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={adminRoles.EDITOR}>Editor</option>
              <option value={adminRoles.ADMIN}>Admin</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
            >
              Send Invite
            </button>
          </div>
        </form>
      )}

      {/* Admins Table */}
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Joined</th>
              {canManageAdmins && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-sm text-gray-900">{admin.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded ${getRoleBadgeColor(admin.role)}`}>
                    {admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      admin.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {admin.acceptedAt
                    ? new Date(admin.acceptedAt).toLocaleDateString()
                    : 'Pending'}
                </td>
                {canManageAdmins && (
                  <td className="px-4 py-3 text-sm">
                    {admin.role !== adminRoles.OWNER && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            onUpdateRole?.(admin.userId, admin.role === adminRoles.EDITOR ? adminRoles.ADMIN : adminRoles.EDITOR)
                          }
                          className="text-primary-600 hover:text-primary-700"
                          title="Change role"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => onRemoveAdmin?.(admin.userId)}
                          className="text-red-600 hover:text-red-700"
                          title="Remove admin"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield size={16} /> Owner
            </span>
            <ul className="text-gray-600 mt-2 text-xs space-y-1">
              <li>• Full access</li>
              <li>• Manage admins</li>
              <li>• View all orders</li>
            </ul>
          </div>
          <div>
            <span className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield size={16} /> Admin
            </span>
            <ul className="text-gray-600 mt-2 text-xs space-y-1">
              <li>• Edit products</li>
              <li>• View orders</li>
              <li>• Manage AutoGift</li>
            </ul>
          </div>
          <div>
            <span className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield size={16} /> Editor
            </span>
            <ul className="text-gray-600 mt-2 text-xs space-y-1">
              <li>• Edit products only</li>
              <li>• Upload images</li>
              <li>• No order access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
