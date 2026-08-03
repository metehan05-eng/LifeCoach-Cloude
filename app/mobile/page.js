"use client";
import dynamic from "next/dynamic";
import LoadingScreen from "@/components/ui/LoadingScreen";

const MobileApp = dynamic(() => import("@/components/mobile/MobileApp"), {
  ssr: false,
  loading: () => <LoadingScreen isLoading />,
});

export default function MobilePage() {
  return <MobileApp />;
}
