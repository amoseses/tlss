"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  managerSetUserBannedAction,
  managerSetUserRoleAction,
} from "@/app/actions/manager-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Profile, UserRole } from "@/types/database";

type Props = {
  user: Profile;
  currentUserId: string;
};

export function ManagerUserActions({ user, currentUserId }: Props) {
  const [pending, startTransition] = useTransition();
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState(user.ban_reason ?? "");
  const isSelf = user.id === currentUserId;

  function onRoleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      try {
        await managerSetUserRoleAction(user.id, value as UserRole);
        toast.success("Role updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update role");
      }
    });
  }

  function onBanToggle(banned: boolean) {
    startTransition(async () => {
      try {
        await managerSetUserBannedAction(user.id, banned, banned ? banReason : undefined);
        toast.success(banned ? "Account banned" : "Account unbanned");
        setBanOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update ban status");
      }
    });
  }

  if (isSelf) {
    return <span className="text-muted-foreground text-xs">You</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select defaultValue={user.role} onValueChange={onRoleChange} disabled={pending || user.is_banned}>
        <SelectTrigger className="h-8 w-[120px] rounded-lg text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="customer">Buyer</SelectItem>
          <SelectItem value="staff">Seller</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>

      {user.is_banned ? (
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-lg text-xs"
          disabled={pending}
          onClick={() => onBanToggle(false)}
        >
          Unban
        </Button>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          className="h-8 rounded-lg text-xs"
          disabled={pending}
          onClick={() => setBanOpen(true)}
        >
          Ban
        </Button>
      )}

      {user.is_banned ? (
        <Badge variant="destructive" className="rounded-lg">
          Banned
        </Badge>
      ) : null}

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ban {user.email}?</DialogTitle>
            <DialogDescription>
              This user will be signed out and blocked from using GIVIT.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`ban-reason-${user.id}`}>Reason (optional)</Label>
            <Textarea
              id={`ban-reason-${user.id}`}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Policy violation, fraud, etc."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => onBanToggle(true)}
              className="rounded-lg"
            >
              Confirm ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
