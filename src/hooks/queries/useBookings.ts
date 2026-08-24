import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getBookingById, getMyBookings, getMyProviderBookings } from '../../lib/bookings';

export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'me'],
    queryFn: () => getMyBookings(),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useProviderBookings() {
  return useQuery({
    queryKey: ['bookings', 'provider'],
    queryFn: () => getMyProviderBookings(),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useBooking(id?: string) {
  return useQuery({
    queryKey: ['bookings', id],
    queryFn: () => (id ? getBookingById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });
}
