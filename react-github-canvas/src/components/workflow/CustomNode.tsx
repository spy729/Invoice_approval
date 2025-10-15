import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { FileInput, GitBranch, CheckCircle2, Download, Play, XCircle, Clock } from "lucide-react";
import { NodeType, NodeStatus } from "@/types/workflow";
import { cn } from "@/lib/utils";

const nodeIcons: Record<NodeType, any> = {
  input: FileInput,
  rule: GitBranch,
  approval: CheckCircle2,
  export: Download,
};

const nodeColors: Record<NodeType, string> = {
  input: "border-primary/50 bg-primary/5",
  rule: "border-github-warning/50 bg-github-warning/5",
  approval: "border-github-success/50 bg-github-success/5",
  export: "border-accent/50 bg-accent/5",
};

const statusIcons: Record<NodeStatus, any> = {
  idle: null,
  running: Play,
  success: CheckCircle2,
  failed: XCircle,
  pending: Clock,
};

const statusColors: Record<NodeStatus, string> = {
  idle: "",
  running: "text-primary animate-pulse",
  success: "text-github-success",
  failed: "text-github-danger",
  pending: "text-github-warning",
};

export const CustomNode = memo(({ data, type }: NodeProps) => {
  const Icon = nodeIcons[type as NodeType];
  const status = data.status as NodeStatus || "idle";
  const StatusIcon = statusIcons[status];
  
  return (
    <Card className={cn(
      "min-w-[200px] border-2 transition-all hover:shadow-lg",
      nodeColors[type as NodeType]
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary" />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-foreground/70" />
            <span className="font-medium text-sm uppercase tracking-wide text-foreground/70">
              {type}
            </span>
          </div>
          {StatusIcon && <StatusIcon className={cn("w-4 h-4", statusColors[status])} />}
        </div>
        
        <div className="text-foreground font-semibold">{data.label}</div>
        
        {data.config && (
          <div className="mt-2 text-xs text-muted-foreground">
            {Object.keys(data.config).length} settings
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary" />
    </Card>
  );
});

CustomNode.displayName = "CustomNode";
