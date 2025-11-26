import { create } from 'zustand';

interface ModelState {
    selectedModel: string;
    providerStatus: Map<string, boolean>;

    setSelectedModel: (model: string) => void;
    setProviderStatus: (status: Map<string, boolean>) => void;
    updateProviderStatus: (provider: string, isAvailable: boolean) => void;
}

export const useModelStore = create<ModelState>((set) => ({
    selectedModel: 'gemini-pro',
    providerStatus: new Map(),

    setSelectedModel: (model) => set({ selectedModel: model }),

    setProviderStatus: (status) => set({ providerStatus: status }),

    updateProviderStatus: (provider, isAvailable) => set((state) => {
        const newStatus = new Map(state.providerStatus);
        newStatus.set(provider, isAvailable);
        return { providerStatus: newStatus };
    })
}));
