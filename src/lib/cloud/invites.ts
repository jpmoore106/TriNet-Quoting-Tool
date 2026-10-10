import { supabase } from "./supabase";
import type { Role } from "../../state/AuthContext";

export type Invite = { email: string; full_name: string; role: Role; manager_id: string | null; created_at: string };

export async function listInvites(): Promise<Invite[]> {
  const { data, error } = await supabase.from("invites").select("email,full_name,role,manager_id,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invite[];
}

export async function saveInvite(invite: Pick<Invite, "email" | "full_name" | "role" | "manager_id">) {
  const { error } = await supabase.from("invites").upsert({ ...invite, email: invite.email.trim().toLowerCase() });
  if (error) throw error;
}

export async function deleteInvite(email: string) {
  const { error } = await supabase.from("invites").delete().eq("email", email);
  if (error) throw error;
}

const ROLE_WORDS: Record<Role, string> = { rep: "a rep", manager: "a manager", admin: "an admin" };

// The email an admin sends to someone they've invited.
export function inviteEmail(invite: Pick<Invite, "email" | "full_name" | "role">, from: string) {
  const site = window.location.origin;
  const first = invite.full_name.trim().split(/\s+/)[0];
  const subject = "You're invited to the TriNet Quoting Tool";
  const body = [
    `Hi${first ? ` ${first}` : ""},`,
    "",
    `I've set you up as ${ROLE_WORDS[invite.role]} on the TriNet Quoting Tool. To get started:`,
    "",
    `1. Go to ${site}/login`,
    `2. Click "Set up your password with an email code"`,
    `3. Enter ${invite.email} and the 6-digit code we email you (check spam if it doesn't arrive in a minute)`,
    "4. Create your password. After that, sign in with your email and password.",
    "",
    "The tool is in testing, so please use fake data only for now.",
    "",
    from,
  ].join("\n");
  return { subject, body, mailto: `mailto:${encodeURIComponent(invite.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}
