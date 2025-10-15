import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileInput, GitBranch, CheckCircle2, Download } from "lucide-react";
import { NodeType } from "@/types/workflow";

interface NodeToolbarProps {
  onAddNode: (type: NodeType) => void;
}

const nodeTypes: Array<{ type: NodeType; label: string; icon: any; description: string }> = [
  { type: "input", label: "Input", icon: FileInput, description: "Start" },
  { type: "rule", label: "Rule", icon: GitBranch, description: "Add condition" },
  { type: "approval", label: "Approval", icon: CheckCircle2, description: "approval" },
  { type: "export", label: "Export", icon: Download, description: "Export results" },
];

export const NodeToolbar = ({ onAddNode }: NodeToolbarProps) => {
  return (
    <Card className="p-4 border-border bg-card">
      <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
        Add Node
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {nodeTypes.map(({ type, label, icon: Icon, description }) => (
          <Button
            key={type}
            variant="outline"
            className="h-auto flex-col items-start p-3 hover:bg-secondary/50"
            onClick={() => onAddNode(type)}
          >
            <div className="flex items-center gap-2 mb-1 w-full">
              <Icon className="w-4 h-4" />
              <span className="font-medium text-sm">{label}</span>
            </div>
            <span className="text-xs text-muted-foreground text-left">
              {description}
            </span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
