import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Shell } from "@/components/Shell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRealtimeInvalidation } from "@/hooks/useEntities";
import Onboarding from "@/pages/Onboarding";
import Graveyard from "@/pages/Graveyard";
import Boardroom from "@/pages/Boardroom";
import Signals from "@/pages/Signals";
import CRM from "@/pages/CRM";
import Feedback from "@/pages/Feedback";
import Coach from "@/pages/Coach";
import Sprint from "@/pages/Sprint";
import Auth from "@/pages/Auth";
import Landing from "@/pages/Landing";
import ShareFeedback from "@/pages/Feedback2";
import Evidence from "@/pages/Evidence";
import Analytics from "@/pages/Analytics";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true } },
});

function LiveSync({ children }: { children: React.ReactNode }) {
  useRealtimeInvalidation();
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<Landing />} />
          <Route path="/share" element={<ShareFeedback />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            element={
              <ProtectedRoute>
                <LiveSync>
                  <Shell />
                </LiveSync>
              </ProtectedRoute>
            }
          >
            <Route index element={<Onboarding />} />
            <Route path="graveyard" element={<Graveyard />} />
            <Route path="boardroom" element={<Boardroom />} />
            <Route path="signals" element={<Signals />} />
            <Route path="crm" element={<CRM />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="coach" element={<Coach />} />
            <Route path="evidence" element={<Evidence />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="sprint" element={<Sprint />} />
          </Route>
        </Routes>
        <SpeedInsights />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
