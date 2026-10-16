import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { OptionField, Options } from "@/lib/pdftools/core";

const selectCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring";

export function OptionsForm({ fields, value, onChange, idPrefix = "opt" }: { fields: OptionField[]; value: Options; onChange: (o: Options) => void; idPrefix?: string }) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  const visible = fields.filter((f) => !f.showIf || f.showIf(value));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {visible.map((f) => {
        const id = `${idPrefix}-${f.key}`;
        const wide = f.type === "textarea" || f.type === "checkbox" || f.type === "image" || f.type === "pages";
        if (f.type === "checkbox") {
          return (
            <label key={f.key} htmlFor={id} className="flex items-start gap-2.5 text-sm sm:col-span-2">
              <Checkbox id={id} checked={!!value[f.key]} onCheckedChange={(c) => set(f.key, c === true)} className="mt-0.5" />
              <span>
                {f.label}
                {f.help && <span className="block text-xs text-muted-foreground">{f.help}</span>}
              </span>
            </label>
          );
        }
        return (
          <div key={f.key} className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
            <Label htmlFor={id}>{f.label}</Label>
            {f.type === "select" ? (
              <select id={id} className={selectCls} value={String(value[f.key] ?? f.choices[0]?.value ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                {f.choices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <Textarea id={id} rows={4} placeholder={f.placeholder} value={String(value[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
            ) : f.type === "color" ? (
              <div className="flex items-center gap-2">
                <input id={id} type="color" value={String(value[f.key] ?? "#000000")} onChange={(e) => set(f.key, e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-input bg-background p-1" />
                <span className="font-mono text-xs text-muted-foreground">{String(value[f.key] ?? "")}</span>
              </div>
            ) : f.type === "image" ? (
              <div className="flex items-center gap-3">
                <Input
                  id={id}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const r = new FileReader();
                    r.onload = () => set(f.key, String(r.result));
                    r.readAsDataURL(file);
                  }}
                />
                {typeof value[f.key] === "string" && value[f.key] ? <img src={String(value[f.key])} alt="" className="h-10 w-auto rounded border" /> : null}
              </div>
            ) : (
              <div className="relative">
                <Input
                  id={id}
                  type={f.type === "number" ? "number" : f.type === "password" ? "password" : f.type === "date" ? "datetime-local" : "text"}
                  min={f.type === "number" ? f.min : undefined}
                  max={f.type === "number" ? f.max : undefined}
                  step={f.type === "number" ? f.step ?? "any" : undefined}
                  placeholder={"placeholder" in f ? f.placeholder : undefined}
                  autoComplete={f.type === "password" ? "new-password" : "off"}
                  value={value[f.key] === undefined || value[f.key] === null ? "" : String(value[f.key])}
                  onChange={(e) => set(f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                  className={f.type === "number" && f.suffix ? "pr-12" : undefined}
                />
                {f.type === "number" && f.suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{f.suffix}</span>}
              </div>
            )}
            {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          </div>
        );
      })}
    </div>
  );
}
