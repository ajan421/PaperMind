import { X, Home, Bot, Mic, BarChart3, FileText, MessageSquare, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'wouter';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/research-assistant', label: 'Research Assistant', icon: Bot },
  { href: '/podcast-generator', label: 'Podcast Generator', icon: Mic },
  { href: '/gap-analyzer', label: 'Research Gap Analyzer', icon: BarChart3 },
  { href: '/systematic-review', label: 'Systematic Review', icon: FileText },
  { href: '/cag-system', label: 'CAG System', icon: MessageSquare },
  { href: '/research-insights', label: 'Research Insights', icon: TrendingUp },
];

export function NavigationDrawer({ isOpen, onClose }: NavigationDrawerProps) {
  const [location] = useLocation();

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity',
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <nav
        className={cn(
          'fixed top-0 left-0 h-full w-80 glass-effect material-elevation-8 z-50 transition-transform duration-300 overflow-y-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 border-b border-white/20 dark:border-gray-700/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">PaperMind</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-white/20 dark:hover:bg-gray-700/20 rounded-lg">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        'flex items-center p-4 rounded-xl transition-all duration-200 cursor-pointer group',
                        isActive
                          ? 'gradient-primary text-white shadow-lg'
                          : 'hover:bg-white/40 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-200 hover:shadow-md hover:scale-105'
                      )}
                      onClick={onClose}
                    >
                      <Icon className={cn(
                        "h-5 w-5 mr-3 transition-transform duration-200",
                        !isActive && "group-hover:scale-110"
                      )} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
