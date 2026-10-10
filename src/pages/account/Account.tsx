import { useState } from "react";
import AppHeader from "../../components/AppHeader";
import PageTitle from "../../components/PageTitle";
import SetPasswordForm from "../../components/SetPasswordForm";
import { Section, TextField, secondaryButton } from "../../components/form";
import { useAuth } from "../../state/AuthContext";
import { supabase } from "../../lib/cloud/supabase";

const ROLE_LABELS = { rep: "Rep", manager: "Manager", admin: "Admin" };

// The signed-in user's name and password.
export default function Account() {
  const { profile, refreshProfile } = useAuth();
  const me = profile!;
  const [name, setName] = useState(me.full_name);
  const [status, setStatus] = useState("");

  async function saveName() {
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", me.id);
    setStatus(error ? "Couldn't save your name. Please try again." : "Name saved.");
    if (!error) await refreshProfile();
  }

  return (
    <div className="min-h-screen bg-canvas font-brand text-navy">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <PageTitle eyebrow={ROLE_LABELS[me.role]} title="Your account" subtitle={me.email} />
        <Section title="Your name" description="Shown to your manager and on proposals you share.">
          <TextField id="account-name" label="First and last name" value={name} onChange={setName} />
          <div className="flex items-center gap-3">
            <button type="button" className={secondaryButton} onClick={saveName} disabled={!name.trim()}>Save name</button>
            <p role="status" className="text-sm text-navy">{status}</p>
          </div>
        </Section>
        <Section title="Password" description="Change the password you sign in with.">
          <div className="max-w-sm"><SetPasswordForm /></div>
        </Section>
      </div>
    </div>
  );
}
