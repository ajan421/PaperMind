import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown, defaultMessage = 'An unexpected error occurred') => {
  console.error('API Error:', error);
  
  let message = defaultMessage;
  let title = 'Error';
  
  if (error instanceof ApiError) {
    message = error.message;
    title = `Error ${error.status || ''}`.trim();
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  toast({
    title,
    description: message,
    variant: 'destructive',
  });
};

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  defaultMessage?: string
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleApiError(error, defaultMessage);
      return null;
    }
  };
};

// Health check utilities
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await api.getHealth();
    return true;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

export const checkBackendConnectivity = async (): Promise<{
  isHealthy: boolean;
  services: {
    main: boolean;
    cag: boolean;
    insights: boolean;
  };
}> => {
  const results = {
    isHealthy: false,
    services: {
      main: false,
      cag: false,
      insights: false,
    },
  };

  try {
    // Check main API
    const mainHealth = await api.getHealth();
    results.services.main = mainHealth.status === 'healthy';
  } catch (error) {
    console.error('Main API health check failed:', error);
  }

  try {
    // Check CAG service
    const cagHealth = await api.getCAGHealth();
    results.services.cag = cagHealth.status === 'healthy';
  } catch (error) {
    console.error('CAG health check failed:', error);
  }

  try {
    // Check insights service
    const insightsStatus = await api.getInsightsStatus();
    results.services.insights = insightsStatus.availability;
  } catch (error) {
    console.error('Insights health check failed:', error);
  }

  results.isHealthy = Object.values(results.services).some(Boolean);
  return results;
};
