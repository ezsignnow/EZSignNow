import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, GripVertical, Mail, Lock } from "lucide-react";

export interface Signatory {
  id?: string;
  email: string;
  name: string;
  order_num: number;
  status?: string;
  color: string;
  access_code?: string;
  passcode?: string;
}

interface SignatoryManagerProps {
  signatories: Signatory[];
  onAdd: (signatory: Omit<Signatory, "id" | "status">) => void;
  onRemove: (index: number) => void;
  onReorder: (signatories: Signatory[]) => void;
  selectedSignatory: number | null;
  onSelectSignatory: (index: number | null) => void;
}

const colors = [
  "hsl(200, 98%, 39%)",
  "hsl(142, 76%, 36%)",
  "hsl(262, 83%, 58%)",
  "hsl(24, 100%, 50%)",
  "hsl(340, 82%, 52%)",
];

export function SignatoryManager({
  signatories,
  onAdd,
  onRemove,
  selectedSignatory,
  onSelectSignatory,
}: SignatoryManagerProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [passcode, setPasscode] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !email.trim()) return;
    
    onAdd({
      name: name.trim(),
      email: email.trim(),
      order_num: signatories.length + 1,
      color: colors[signatories.length % colors.length],
      access_code: accessCode.trim() || undefined,
      passcode: passcode.trim() || undefined,
    });
    
    setName("");
    setEmail("");
    setAccessCode("");
    setPasscode("");
  };

  return (
    <Card className="border-slate-100/80 dark:border-slate-800 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] bg-white dark:bg-slate-900 overflow-hidden transition-colors">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Signatories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        {signatories.length > 0 && (
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
            {signatories.map((signatory, index) => {
              const isSelected = selectedSignatory === index;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-[#258ffb] bg-[#258ffb]/[0.02] dark:bg-[#258ffb]/[0.04] shadow-[0_2px_8px_rgba(37,143,251,0.05)]"
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900"
                  }`}
                  onClick={() => onSelectSignatory(isSelected ? null : index)}
                >
                  <GripVertical className="h-4 w-4 text-slate-300 dark:text-slate-700 hover:text-slate-400 dark:hover:text-slate-550 shrink-0" />
                  
                  {/* Colorful Avatar Circle */}
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: signatory.color }}
                  >
                    {signatory.name.slice(0, 1).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-[13px] truncate transition-colors leading-tight ${isSelected ? "text-slate-800 dark:text-slate-100 font-extrabold" : "text-slate-700 dark:text-slate-300"}`}>
                      {signatory.name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 leading-normal">
                      {signatory.email} {signatory.access_code ? `🔑 Code: ${signatory.access_code}` : ""}
                    </p>
                    {signatory.passcode && (
                      <div className="flex items-center gap-1.5 mt-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-100/50 dark:border-amber-900/30 text-[9px] font-bold w-fit">
                        <Lock className="h-2.5 w-2.5 shrink-0" />
                        Passcode: {signatory.passcode}
                      </div>
                    )}
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className="text-[10px] font-extrabold px-1.5 py-0 border-slate-100/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-md shadow-none shrink-0"
                  >
                    #{signatory.order_num}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-955/20 shrink-0 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className={`space-y-3.5 ${signatories.length > 0 ? "pt-4 border-t border-slate-100 dark:border-slate-800" : ""}`}>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-[#258ffb] focus-visible:border-[#258ffb] focus-visible:ring-offset-0 placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 h-9.5 text-xs transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-[#258ffb] focus-visible:border-[#258ffb] focus-visible:ring-offset-0 placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 h-9.5 text-xs transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accessCode" className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Access Code (Optional)</Label>
            <Input
              id="accessCode"
              placeholder="e.g. 123456"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-[#258ffb] focus-visible:border-[#258ffb] focus-visible:ring-offset-0 placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 h-9.5 text-xs transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="passcode" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Lock className="h-3 w-3 text-slate-400" /> Access Passcode (Optional)
            </Label>
            <Input
              id="passcode"
              type="password"
              placeholder="e.g. 123456"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-[#258ffb] focus-visible:border-[#258ffb] focus-visible:ring-offset-0 placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 h-9.5 text-xs transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!name.trim() || !email.trim()}
            className="w-full rounded-full bg-[#258ffb] hover:bg-[#1d7ee6] disabled:hover:bg-[#258ffb] text-white font-bold h-9.5 text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#258ffb]/20 mt-1"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Signatory
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
