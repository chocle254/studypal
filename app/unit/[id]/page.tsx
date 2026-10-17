import { Suspense } from "react";
import UnitView from "@/components/UnitView";

export default function UnitPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-24 grid place-items-center">
          <div className="w-10 h-10 rounded-full bg-sage-soft animate-breathe" />
        </div>
      }
    >
      <UnitView />
    </Suspense>
  );
}
