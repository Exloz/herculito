import { useCallback, useEffect, useState } from 'react';
import { fetchAdminOverview } from '../../../shared/api/dataApi';
import type { AdminOverview } from '../../../shared/types';
import { toUserMessage } from '../../../shared/lib/errorMessages';

export const useAdminOverview = (enabled: boolean) => {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const overview = await fetchAdminOverview();
      setData(overview);
      setError(null);
    } catch (error) {
      setError(toUserMessage(error, 'No se pudieron cargar los datos de administracion.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh
  };
};
