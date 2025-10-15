import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";
import { RunViewer } from "@/components/workflow/RunViewer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Workflow, Play, History, LogOut, User } from "lucide-react";
import { WorkflowRun } from "@/types/workflow";
import { fetchRuns } from "@/lib/runApi";

const Index = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("builder");
  const [loadedWorkflow, setLoadedWorkflow] = useState<any | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };
  
  // Real run history state
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  useEffect(() => {
    fetchRuns().then(setRuns).catch(() => setRuns([]));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Build and automate your approval workflows
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{user?.name}</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {user?.role}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-73px)]">
        <div className="border-b border-border bg-card px-6">
          <TabsList className="bg-transparent">
            <TabsTrigger value="builder" className="gap-2">
              <Workflow className="w-4 h-4" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="runs" className="gap-2">
              <History className="w-4 h-4" />
              Run History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="builder" className="h-full m-0">
          <WorkflowBuilder workflow={loadedWorkflow} />
        </TabsContent>

        <TabsContent value="runs" className="h-full m-0 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <RunViewer
              runs={runs}
              onOpenWorkflow={wf => {
                setLoadedWorkflow(wf);
                setActiveTab("builder");
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
