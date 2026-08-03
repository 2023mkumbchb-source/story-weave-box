import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ShieldCheck, MonitorSmartphone, Pencil, Check, LogOut, KeyRound, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  AccountInfo, deviceId, fetchAccount, forgetDevice, normalizePassCode, readStoredPass, renamePassCode, useAccess, verifyCode,
} from "@/lib/access";
import { toast } from "@/hooks/use-toast";

/** Subscriber account page: plan, pass code, devices and sign-out. */
export default function Account() {
  const { user, signOut } = useAuth();
  const access = useAccess();
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchAccount(readStoredPass()?.code);
    setInfo(res);
    setNewCode(res.code || "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, user?.id]);

  const link = async () => {
    setBusy(true);
    const res = await verifyCode(codeInput);
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Could not link that code", description: res.error, variant: "destructive" });
      return;
    }
    access.applyPass(res.pass!);
    toast({ title: "Subscription linked" });
    load();
  };

  const rename = async () => {
    if (!info?.code) return;
    setBusy(true);
    const res = await renamePassCode(info.code, newCode);
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Could not change the code", description: res.error, variant: "destructive" });
      return;
    }
    access.applyPass(res.pass!);
    toast({ title: "Code updated" });
    load();
  };

  const removeDevice = async (id: string) => {
    if (!info?.code) return;
    setBusy(true);
    const ok = await forgetDevice(info.code, id);
    setBusy(false);
    toast({ title: ok ? "Device removed" : "Could not remove that device", variant: ok ? undefined : "destructive" });
    load();
  };

  const thisDevice = deviceId();

  return (
    <div className="mx-auto min-h-[65vh] max-w-2xl px-5 py-10">
      <Helmet>
        <title>My account | Ompath Study</title>
        <meta name="description" content="Manage your Ompath Study subscription, pass code and signed-in devices." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <h1 className="font-serif text-3xl font-bold text-foreground">My account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {user?.email ? `Signed in as ${user.email}` : "You are browsing as a guest."}
      </p>

      {!user && (
        <Link
          to="/login"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <ShieldCheck className="h-4 w-4" /> Sign in with Google or email
        </Link>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : info?.found ? (
        <>
          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Subscription
            </p>
            <p className="mt-2 font-serif text-xl font-bold text-foreground">{info.plan}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {info.expired
                ? `Expired on ${new Date(info.expires_at!).toLocaleDateString()}`
                : `Active until ${new Date(info.expires_at!).toLocaleDateString()}`}
              {info.allow_download ? " · PDF handouts included" : ""}
            </p>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Pencil className="h-3.5 w-3.5" /> Your pass code
            </p>
            <div className="flex gap-2">
              <input
                value={newCode}
                onChange={(e) => setNewCode(normalizePassCode(e.target.value))}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm font-bold text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={rename}
                disabled={busy || !newCode || newCode === info.code}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> Save
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Codes are matched loosely — capitals, spaces and dashes don’t matter when you sign in.
            </p>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <MonitorSmartphone className="h-3.5 w-3.5" /> Devices ({info.devices?.length ?? 0} of {info.device_limit})
            </p>
            <ul className="divide-y divide-border">
              {(info.devices || []).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-foreground">
                    {d.label}
                    {d.id === thisDevice && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">This device</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDevice(d.id)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </li>
              ))}
              {!(info.devices || []).length && <li className="py-2 text-sm text-muted-foreground">No devices registered yet.</li>}
            </ul>
          </section>
        </>
      ) : (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" /> No subscription found on this account
          </p>
          <p className="mb-3 text-sm text-muted-foreground">
            Already paid? Enter your pass code to link it to this account and device.
          </p>
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(normalizePassCode(e.target.value))}
              placeholder="OM-XXXXXXXX"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={link}
              disabled={busy || !codeInput}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Link
            </button>
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {access.hasPass && (
          <button
            type="button"
            onClick={() => { access.signOutPass(); toast({ title: "Pass removed from this device" }); load(); }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign this device out of the pass
          </button>
        )}
        {user && (
          <button
            type="button"
            onClick={async () => { await signOut(); toast({ title: "Signed out" }); }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out of my account
          </button>
        )}
      </div>
    </div>
  );
}