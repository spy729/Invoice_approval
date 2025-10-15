import { UserMenu } from './UserMenu';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Workflow Builder</h1>
          </div>
          <div className="flex items-center gap-4">
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}