import {create} from "zustand"
import {persist} from "zustand/middleware"

const useUserStore = create(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: null,
            setUserPhoneData: (userData) => set({user: userData, isAuthenticated: true}),
            clearUser: () => set({step: 1, isAuthenticated: null}),
        }),
        {
            name: "user-storage",
            getStorage: () => localStorage
        },
    )
);

export default useUserStore;