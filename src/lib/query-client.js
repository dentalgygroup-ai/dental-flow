import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: true,
			retry: 1,
			staleTime: 0,
			gcTime: 5 * 60 * 1000,
		},
	},
});