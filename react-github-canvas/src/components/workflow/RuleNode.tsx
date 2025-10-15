import { memo, useState, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { GitBranch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface RuleNodeProps extends NodeProps {
  updateNode?: (id: string, data: any) => void;
}

const RuleNode = memo(({ id, data, updateNode }: RuleNodeProps) => {
  const [rules, setRules] = useState<Array<{ field: string; operator: string; value: string }>>(data.config?.rules || [ { field: "", operator: "", value: "" } ]);

  useEffect(() => {
    setRules(data.config?.rules || [ { field: "", operator: "", value: "" } ]);
  }, [data.config?.rules]);

  const handleRuleChange = (idx: number, key: string, value: string) => {
    setRules(prev => {
      const updated = [...prev];
      updated[idx][key] = value;
      return updated;
    });
  };

  const handleAddRule = () => {
    setRules(prev => [...prev, { field: "", operator: "", value: "" }]);
  };

  const handleRemoveRule = (idx: number) => {
    setRules(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  const handleSaveRules = () => {
    if (updateNode) {
      updateNode(id, {
        ...data,
        config: { ...data.config, rules },
      });
    }
  };

  return (
    <Card className="min-w-[260px] border-2 border-yellow-400/50 bg-yellow-50/10 transition-all hover:shadow-lg">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-5 h-5 text-foreground/70" />
          <span className="font-medium text-sm uppercase tracking-wide text-foreground/70">
            Rule
          </span>
        </div>
        <div className="text-foreground font-semibold mb-2">
          {data.label || "Rule Node"}
        </div>
        <div className="mb-2">
          <Label>Rules</Label>
          {rules.map((rule, idx) => (
            <div key={idx} className="flex gap-2 items-center mb-2">
              <Input
                value={rule.field}
                onChange={e => handleRuleChange(idx, "field", e.target.value)}
                placeholder="Field (e.g., amount)"
                className="w-1/4"
              />
              <Input
                value={rule.operator}
                onChange={e => handleRuleChange(idx, "operator", e.target.value)}
                placeholder="Operator (e.g., >)"
                className="w-1/4"
              />
              <Input
                value={rule.value}
                onChange={e => handleRuleChange(idx, "value", e.target.value)}
                placeholder="Value (e.g., 5000)"
                className="w-1/4"
              />
              <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveRule(idx)} disabled={rules.length === 1}>
                <span className="sr-only">Remove</span>
                <GitBranch className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={handleAddRule}>Add Rule</Button>
        </div>
        <Button type="button" className="w-full mt-2" onClick={handleSaveRules}>Save Rules</Button>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary" />
    </Card>
  );
});

RuleNode.displayName = "RuleNode";
export default RuleNode;
