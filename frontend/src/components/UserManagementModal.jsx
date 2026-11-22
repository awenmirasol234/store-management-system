import { useEffect, useState } from "react";
import { Plus, Shield, UserCheck, UserX, Users } from "lucide-react";
import { api } from "../api.js";
import { Badge } from "./Badge.jsx";
import { Button } from "./Button.jsx";
import { ErrorBanner } from "./ErrorBanner.jsx";
import { Modal } from "./Modal.jsx";

export function UserManagementModal(props) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("CASHIER");
  const [newPin, setNewPin] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    if (!props.open) {
      return;
    }
    setLoading(true);
    setErrorBanner("");
    try {
      const data = await api.listUsers();
      setUsers(data);
    } catch (error) {
      setErrorBanner(error.message || "Failed to load staff list");
    } finally {
      setLoading(false);
    }
  }

  useEffect(
    function init() {
      if (props.open) {
        loadUsers();
        setShowAddForm(false);
      }
    },
    [props.open]
  );

  async function handleCreateUser(e) {
    if (e) {
      e.preventDefault();
    }
    const trimmedUsername = newUsername.trim();
    const trimmedFullName = newFullName.trim();
    if (!trimmedUsername) {
      setErrorBanner("Staff username is required");
      return;
    }
    if (!trimmedFullName) {
      setErrorBanner("Staff full name is required");
      return;
    }
    if (!newPin || newPin.length < 4 || newPin.length > 8) {
      setErrorBanner("PIN must be 4 to 8 digits");
      return;
    }

    setCreating(true);
    setErrorBanner("");

    try {
      await api.createUser({
        username: trimmedUsername,
        full_name: trimmedFullName,
        role: newRole,
        pin: newPin
      });
      setNewUsername("");
      setNewFullName("");
      setNewPin("");
      setShowAddForm(false);
      await loadUsers();
    } catch (error) {
      setErrorBanner(error.message || "Failed to create staff member");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(user) {
    setErrorBanner("");
    try {
      await api.updateUser(user.user_id, {
        is_active: !user.is_active
      });
      await loadUsers();
    } catch (error) {
      setErrorBanner(error.message || "Failed to update staff member");
    }
  }

  let errorElement = null;
  if (errorBanner) {
    errorElement = <ErrorBanner message={errorBanner} />;
  }

  let addCashierButton = null;
  if (!showAddForm) {
    addCashierButton = (
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={function () {
          setShowAddForm(true);
        }}
        className="gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Cashier
      </Button>
    );
  }

  let addFormElement = null;
  if (showAddForm) {
    let saveButtonText = "Save Staff Member";
    if (creating) {
      saveButtonText = "Creating...";
    }

    addFormElement = (
      <form
        onSubmit={handleCreateUser}
        className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3"
      >
        <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
          <span className="text-xs font-bold text-blue-950">Add New Staff Member</span>
          <button
            type="button"
            onClick={function () {
              setShowAddForm(false);
            }}
            className="text-2xs text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Username
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={function (e) {
                setNewUsername(e.target.value);
              }}
              placeholder="e.g. cashier1"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={newFullName}
              onChange={function (e) {
                setNewFullName(e.target.value);
              }}
              placeholder="e.g. Juan dela Cruz"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">Role</label>
            <select
              value={newRole}
              onChange={function (e) {
                setNewRole(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="CASHIER">CASHIER (POS &amp; Returns)</option>
              <option value="OWNER">OWNER (Full Admin Access)</option>
            </select>
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Security PIN (4-8 digits)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={newPin}
              onChange={function (e) {
                setNewPin(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="••••"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={function () {
              setShowAddForm(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={creating}>
            {saveButtonText}
          </Button>
        </div>
      </form>
    );
  }

  let staffListContent = null;
  if (loading) {
    staffListContent = (
      <div className="p-6 text-center text-xs text-slate-400">Loading staff accounts...</div>
    );
  } else if (users.length === 0) {
    staffListContent = (
      <div className="p-6 text-center text-xs text-slate-400">No staff members found.</div>
    );
  } else {
    staffListContent = users.map(function renderUserRow(user) {
      const isSelf = props.currentUser && props.currentUser.user_id === user.user_id;
      let roleBadgeTone = "blue";
      if (user.role === "CASHIER") {
        roleBadgeTone = "amber";
      }

      let activeTone = "red";
      let activeLabel = "Inactive";
      let toggleLabel = "Activate";
      if (user.is_active) {
        activeTone = "green";
        activeLabel = "Active";
        toggleLabel = "Deactivate";
      }

      let youBadge = null;
      if (isSelf) {
        youBadge = (
          <span className="text-3xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
            You
          </span>
        );
      }

      let toggleButton = null;
      if (!isSelf) {
        toggleButton = (
          <button
            type="button"
            onClick={function () {
              handleToggleActive(user);
            }}
            className="text-2xs font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            {toggleLabel}
          </button>
        );
      }

      return (
        <div
          key={user.user_id}
          className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  {user.full_name}
                </span>
                {youBadge}
              </div>
              <div className="text-2xs text-slate-400">@{user.username}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge tone={roleBadgeTone}>{user.role}</Badge>
            <Badge tone={activeTone}>{activeLabel}</Badge>
            {toggleButton}
          </div>
        </div>
      );
    });
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Staff & User Management"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {errorElement}

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Manage cashier and owner accounts with terminal PIN access.
          </div>
          {addCashierButton}
        </div>

        {addFormElement}

        {/* Staff List */}
        <div className="divide-y divide-[#E9E9E9] rounded-xl border border-[#E9E9E9] bg-white overflow-hidden">
          {staffListContent}
        </div>
      </div>
    </Modal>
  );
}
