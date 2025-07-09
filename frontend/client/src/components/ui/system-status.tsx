import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw, WifiOff } from 'lucide-react';
import { checkBackendConnectivity } from '@/lib/error-handling';

interface SystemStatusProps {
  compact?: boolean;
}

export function SystemStatus({ compact = false }: SystemStatusProps) {
  const [isManualCheck, setIsManualCheck] = useState(false);

  const { data: systemHealth, isLoading, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: checkBackendConnectivity,
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const handleManualRefresh = async () => {
    setIsManualCheck(true);
    await refetch();
    setIsManualCheck(false);
  };

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-600" />
    );
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor(systemHealth?.isHealthy || false)}`} />
        <span className="text-xs text-muted-foreground">
          {systemHealth?.isHealthy ? 'All Systems Online' : 'Service Issues'}
        </span>
        {(isLoading || isManualCheck) && (
          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">System Status</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading || isManualCheck}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isManualCheck) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!systemHealth && isLoading ? (
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking system status...</span>
          </div>
        ) : !systemHealth ? (
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">Unable to check system status</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Health</span>
              <Badge variant={systemHealth.isHealthy ? 'default' : 'destructive'}>
                {systemHealth.isHealthy ? 'Healthy' : 'Issues Detected'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemHealth.services.main)}
                  <span className="text-sm">Core API</span>
                </div>
                <Badge variant={systemHealth.services.main ? 'outline' : 'destructive'}>
                  {systemHealth.services.main ? 'Online' : 'Offline'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemHealth.services.cag)}
                  <span className="text-sm">CAG System</span>
                </div>
                <Badge variant={systemHealth.services.cag ? 'outline' : 'destructive'}>
                  {systemHealth.services.cag ? 'Online' : 'Offline'}
                </Badge>
              </div>
            </div>

            {!systemHealth.isHealthy && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium">Service Degradation Detected</p>
                    <p className="text-orange-700 mt-1">
                      Some services may be temporarily unavailable. Please try again later or contact support if issues persist.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
