import { useState } from 'react';
import { Menu, Search, Bell, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NavigationDrawer } from './navigation-drawer';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
      {/* App Bar */}
      <header className="material-elevation-8 gradient-primary text-primary-foreground fixed top-0 left-0 right-0 z-30">
        <div className="px-4 h-16 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDrawerOpen(true)}
            className="mr-4 text-primary-foreground hover:bg-white/20 rounded-lg transition-all duration-200"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <h1 className="text-xl font-semibold flex items-center">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg mr-3 flex items-center justify-center">
              <span className="text-2xl">🧠</span>
            </div>
            PaperMind
          </h1>
          
          <div className="ml-auto flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        {children}
      </main>

    </div>
  );
}
