import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, GripVertical, Mail } from "lucide-react";

export interface Signatory {
  id?: string;
  email: string;
  name: string;
  order_num: number;
  status?: string;
  color: string;
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

  const handleAdd = () => {
    if (!name.trim() || !email.trim()) return;
    
    onAdd({
      name: name.trim(),
      email: email.trim(),
      order_num: signatories.length + 1,
      color: colors[signatories.length % colors.length],
    });
    
    setName("");
    setEmail("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Signatories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {signatories.map((signatory, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors ${
                selectedSignatory === index
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent/50"
              }`}
              onClick={() => onSelectSignatory(selectedSignatory === index ? null : index)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <div
                className="h-4 w-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: signatory.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{signatory.name}</p>
                <p className="text-xs text-muted-foreground truncate">{signatory.email}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                #{signatory.order_num}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-3 border-t">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs">Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!name.trim() || !email.trim()}
            size="sm"
            className="w-full"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Signatory
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
