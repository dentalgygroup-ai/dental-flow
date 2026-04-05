import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Fetches SystemConfig for a clinic and returns memoized, pre-filtered arrays
 * for treatments, rejectionReasons, sources and patientTypes.
 */
export function useSystemConfig(clinicId) {
  const { data: systemConfig = [], refetch } = useQuery({
    queryKey: ['systemConfig', clinicId],
    queryFn: () => clinicId ? base44.entities.SystemConfig.filter({ clinic_id: clinicId }) : [],
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000,
  });

  const treatments = useMemo(
    () => systemConfig.filter(c => c.config_type === 'treatment' && c.is_active),
    [systemConfig]
  );

  const rejectionReasons = useMemo(
    () => systemConfig.filter(c => c.config_type === 'rejection_reason' && c.is_active),
    [systemConfig]
  );

  const sources = useMemo(
    () => systemConfig.filter(c => c.config_type === 'source' && c.is_active),
    [systemConfig]
  );

  const patientTypes = useMemo(
    () => systemConfig.filter(c => c.config_type === 'patient_type' && c.is_active),
    [systemConfig]
  );

  return { systemConfig, treatments, rejectionReasons, sources, patientTypes, refetch };
}