import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserPlus,
  faXmark,
  faLock,
  faChevronUp,
  faChevronDown,
  faEnvelopeOpenText,
  faPenNib,
} from "@fortawesome/free-solid-svg-icons";
import { Switch } from "@/components/ui/switch";
import { MAX_SIGNERS } from "@/lib/signing/workflow";

export type SignatoryRole = "signer" | "cc";

export interface Signatory {
  id?: string;
  email: string;
  name: string;
  /** Signing step. Signers sharing a step sign at the same time; copy recipients are saved as 0. */
  order_num: number;
  status?: string;
  color: string;
  role?: SignatoryRole;
  access_code?: string;
  passcode?: string;
  signature_data?: string | null;
  signed_at?: string | null;
}

interface SignatoryManagerProps {
  signatories: Signatory[];
  onAdd: (signatory: Omit<Signatory, "id" | "status">) => void;
  onRemove: (index: number) => void;
  onReorder: (signatories: Signatory[]) => void;
  selectedSignatory: number | null;
  onSelectSignatory: (index: number | null) => void;
  /** When on, signers go step by step; when off, everyone signs at the same time. */
  signInOrder?: boolean;
  onSignInOrderChange?: (checked: boolean) => void;
}

export const signatoryColors = [
  "hsl(200, 98%, 39%)",
  "hsl(142, 76%, 36%)",
  "hsl(262, 83%, 58%)",
  "hsl(24, 100%, 50%)",
  "hsl(340, 82%, 52%)",
];

const inputClass =
  "rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-[#73c41d] focus-visible:border-[#73c41d] focus-visible:ring-offset-0 placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 h-9.5 text-xs transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]";

/** Renumbers steps 1..n in list order (used when ordering is switched on or rows move). */
export function renumberSteps(list: Signatory[]): Signatory[] {
  let step = 0;
  return list.map((s) => (s.role === "cc" ? s : { ...s, order_num: ++step }));
}

export function SignatoryManager({
  signatories,
  onAdd,
  onRemove,
  onReorder,
  selectedSignatory,
  onSelectSignatory,
  signInOrder = false,
  onSignInOrderChange,
}: SignatoryManagerProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SignatoryRole>("signer");
  const [accessCode, setAccessCode] = useState("");
  const [passcode, setPasscode] = useState("");

  const signerCount = signatories.filter((s) => s.role !== "cc").length;
  const atSignerLimit = role === "signer" && signerCount >= MAX_SIGNERS;
  const emailTaken = signatories.some((s) => s.email.toLowerCase() === email.trim().toLowerCase());

  const handleAdd = () => {
    if (!name.trim() || !email.trim() || atSignerLimit || emailTaken) return;

    const lastStep = Math.max(0, ...signatories.filter((s) => s.role !== "cc").map((s) => s.order_num));
    onAdd({
      name: name.trim(),
      email: email.trim(),
      role,
      order_num: role === "cc" ? 0 : signInOrder ? lastStep + 1 : 1,
      color: signatoryColors[signatories.length % signatoryColors.length],
      access_code: role === "signer" ? accessCode.trim() || undefined : undefined,
      passcode: role === "signer" ? passcode.trim() || undefined : undefined,
    });

    setName("");
    setEmail("");
    setAccessCode("");
    setPasscode("");
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= signatories.length) return;
    const next = [...signatories];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(signInOrder ? renumberSteps(next) : next);
    if (selectedSignatory === index) onSelectSignatory(target);
  };

  const setStep = (index: number, step: number) => {
    const clamped = Math.max(1, Math.min(MAX_SIGNERS, Math.round(step) || 1));
    onReorder(signatories.map((s, i) => (i === index ? { ...s, order_num: clamped } : s)));
  };

  return (
    <Card className="border-slate-100/80 dark:border-slate-800 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] bg-white dark:bg-slate-900 overflow-hidden transition-colors">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Recipients</span>
          <span className="normal-case tracking-normal font-semibold text-slate-400">
            {signerCount} of {MAX_SIGNERS} signers
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        {onSignInOrderChange && (
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="sign-in-order-toggle" className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Set signing order
              </Label>
              <p className="text-[10px] text-slate-400 dark:text-slate-550 leading-normal">
                {signInOrder
                  ? "Signers go one step at a time. Give two signers the same step number to have them sign at the same time."
                  : "Everyone gets the link at once and can sign in any order."}
              </p>
            </div>
            <Switch id="sign-in-order-toggle" checked={signInOrder} onCheckedChange={onSignInOrderChange} />
          </div>
        )}

        {signatories.length > 0 && (
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
            {signatories.map((signatory, index) => {
              const isSelected = selectedSignatory === index;
              const isCc = signatory.role === "cc";
              return (
                <div
                  key={`${signatory.email}-${index}`}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-[#73c41d] bg-[#73c41d]/[0.02] dark:bg-[#73c41d]/[0.04] shadow-[0_2px_8px_rgba(91, 161, 20,0.05)]"
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900"
                  }`}
                  onClick={() => !isCc && onSelectSignatory(isSelected ? null : index)}
                >
                  <div className="flex flex-col shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label={`Move ${signatory.name} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="text-slate-300 hover:text-slate-500 disabled:opacity-30 dark:text-slate-600 dark:hover:text-slate-400"
                    >
                      <FontAwesomeIcon icon={faChevronUp} className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${signatory.name} down`}
                      disabled={index === signatories.length - 1}
                      onClick={() => move(index, 1)}
                      className="text-slate-300 hover:text-slate-500 disabled:opacity-30 dark:text-slate-600 dark:hover:text-slate-400"
                    >
                      <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
                    </button>
                  </div>

                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: isCc ? "hsl(215, 16%, 57%)" : signatory.color }}
                  >
                    {signatory.name.slice(0, 1).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-bold text-[13px] truncate transition-colors leading-tight ${
                        isSelected ? "text-slate-800 dark:text-slate-100 font-extrabold" : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {signatory.name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 leading-normal">
                      {signatory.email} {signatory.access_code ? `🔑 Code: ${signatory.access_code}` : ""}
                    </p>
                    {signatory.passcode && signatory.passcode !== signatory.access_code && (
                      <div className="flex items-center gap-1.5 mt-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-100/50 dark:border-amber-900/30 text-[9px] font-bold w-fit">
                        <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5 shrink-0" />
                        Passcode: {signatory.passcode}
                      </div>
                    )}
                  </div>

                  {isCc ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-extrabold px-1.5 py-0 border-slate-100/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-md shadow-none shrink-0"
                    >
                      Gets a copy
                    </Badge>
                  ) : signInOrder ? (
                    <label
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-400 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Step
                      <input
                        type="number"
                        min={1}
                        max={MAX_SIGNERS}
                        value={signatory.order_num}
                        onChange={(e) => setStep(index, Number(e.target.value))}
                        aria-label={`Signing step for ${signatory.name}`}
                        className="w-11 h-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-center text-[11px] font-extrabold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#73c41d]"
                      />
                    </label>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-extrabold px-1.5 py-0 border-slate-100/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-md shadow-none shrink-0"
                    >
                      Signer
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${signatory.name}`}
                    className="h-6 w-6 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-955/20 shrink-0 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className={`space-y-3.5 ${signatories.length > 0 ? "pt-4 border-t border-slate-100 dark:border-slate-800" : ""}`}>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "signer", label: "Needs to sign", icon: faPenNib },
              { value: "cc", label: "Receives a copy", icon: faEnvelopeOpenText },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                aria-pressed={role === opt.value}
                className={`flex items-center justify-center gap-1.5 rounded-xl border h-9 text-[11px] font-bold transition-all ${
                  role === opt.value
                    ? "border-[#73c41d] text-[#16a34a] bg-[#73c41d]/[0.06]"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                <FontAwesomeIcon icon={opt.icon} className="h-3 w-3" />
                {opt.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Name</Label>
            <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className={inputClass}
            />
            {emailTaken && email.trim() && (
              <p className="text-[10px] font-semibold text-rose-500">This person is already on the list.</p>
            )}
          </div>
          {role === "signer" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="accessCode" className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Access Code (Optional)
                </Label>
                <Input id="accessCode" placeholder="e.g. 123456" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="passcode" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-slate-400" /> Access Passcode (Optional)
                </Label>
                <Input id="passcode" type="password" placeholder="e.g. 123456" value={passcode} onChange={(e) => setPasscode(e.target.value)} className={inputClass} />
              </div>
            </>
          )}
          {atSignerLimit && (
            <p className="text-[10px] font-semibold text-amber-600">A document can have up to {MAX_SIGNERS} signers.</p>
          )}
          <Button
            onClick={handleAdd}
            disabled={!name.trim() || !email.trim() || atSignerLimit || emailTaken}
            className="w-full rounded-full bg-[#73c41d] hover:bg-[#477c13] disabled:hover:bg-[#73c41d] text-white font-bold h-9.5 text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#73c41d]/20 mt-1"
          >
            <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5" />
            {role === "cc" ? "Add Copy Recipient" : "Add Signer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
