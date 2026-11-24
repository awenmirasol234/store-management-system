import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../api.js";
import { Badge } from "./Badge.jsx";
import { Button } from "./Button.jsx";
import { ErrorBanner } from "./ErrorBanner.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";
import { Select } from "./Select.jsx";

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
        className="rounded-2xl border border-[#E9E9E9] bg-[#EEEEED]/40 p-4 space-y-3.5"
      >
        <div className="flex items-center justify-between border-b border-[#E9E9E9] pb-2">
          <span className="text-xs font-bold text-[#171717]">Add New Staff Member</span>
          <button
            type="button"
            onClick={function () {
              setShowAddForm(false);
            }}
            className="text-2xs text-[#777777] hover:text-[#171717] cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Username"
            value={newUsername}
            onChange={function (e) {
              setNewUsername(e.target.value);
            }}
            placeholder="e.g. cashier1"
            required={true}
          />

          <Input
            label="Full Name"
            value={newFullName}
            onChange={function (e) {
              setNewFullName(e.target.value);
            }}
            placeholder="e.g. Juan dela Cruz"
            required={true}
          />

          <Select
            label="Role"
            value={newRole}
            onChange={function (e) {
              setNewRole(e.target.value);
            }}
          >
            <option value="CASHIER">CASHIER (POS &amp; Returns)</option>
            <option value="OWNER">OWNER (Full Admin Access)</option>
          </Select>

          <Input
            label="Security PIN (4-8 digits)"
            type="password"
            inputMode="numeric"
            maxLength={8}
            mono={true}
            value={newPin}
            onChange={function (e) {
              setNewPin(e.target.value.replace(/\D/g, ""));
            }}
            placeholder="••••"
            required={true}
          />
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
      <div className="p-6 text-center text-xs text-[#777777]">Loading staff accounts...</div>
    );
  } else if (users.length === 0) {
    staffListContent = (
      <div className="p-6 text-center text-xs text-[#777777]">No staff members found.</div>
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
          <span className="text-3xs bg-[#EEEEED] text-[#171717] px-1.5 py-0.5 rounded-md font-medium border border-[#E9E9E9]">
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
            className="text-2xs font-medium text-[#777777] hover:text-[#171717] underline cursor-pointer transition-colors"
          >
            {toggleLabel}
          </button>
        );
      }

      return (
        <div
          key={user.user_id}
          className="flex items-center justify-between p-3.5 hover:bg-[#EEEEED]/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEEEED] text-xs font-bold text-[#171717]">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#171717]">
                  {user.full_name}
                </span>
                {youBadge}
              </div>
              <div className="text-2xs text-[#777777]">@{user.username}</div>
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
      size="lg"
    >
      <div className="space-y-4">
        {errorElement}

        <div className="flex items-center justify-between">
          <div className="text-xs text-[#777777]">
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
